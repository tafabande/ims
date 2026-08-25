import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import ApprovalRequest, User

def create_approval_request(
    db: Session,
    request_type: str,
    requester_id: int,
    entity_name: Optional[str] = None,
    entity_id: Optional[int] = None,
    amount: Optional[float] = None,
    notes: Optional[str] = None,
    payload_json: Optional[str] = None
) -> ApprovalRequest:
    """
    Submit a stateful approval request.
    Assigns risk level based on requested action and financial threshold:
    - CRITICAL: PRODUCT_DELETE, BELOW_MARGIN_SALE
    - HIGH: REFUND > $500, STOCK_ADJUSTMENT > $500
    - MEDIUM: PRICE_CHANGE, REFUND <= $500, STOCK_ADJUSTMENT <= $500
    """
    request_code = f"APR-2026-{uuid.uuid4().hex[:6].upper()}"
    
    # Calculate Risk Level
    risk_level = "MEDIUM"
    if request_type in ["PRODUCT_DELETE", "BELOW_MARGIN_SALE"]:
        risk_level = "CRITICAL"
    elif amount and amount > 500:
        risk_level = "HIGH"

    approval_req = ApprovalRequest(
        request_code=request_code,
        request_type=request_type,
        requester_id=requester_id,
        status="PENDING",
        risk_level=risk_level,
        entity_name=entity_name,
        entity_id=entity_id,
        amount=amount,
        notes=notes,
        payload_json=payload_json,
        created_at=datetime.now(timezone.utc)
    )
    db.add(approval_req)
    db.commit()
    db.refresh(approval_req)
    return approval_req

def approve_request(db: Session, request_id: int, approver_id: int) -> ApprovalRequest:
    """
    Approve an outstanding request adhering strictly to the FOUR-EYES PRINCIPLE:
    - The person requesting the action CANNOT approve their own request (requester_id != approver_id).
    """
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot approve request with status '{req.status}'.")

    # FOUR-EYES PRINCIPLE ENFORCEMENT
    if req.requester_id == approver_id:
        raise HTTPException(
            status_code=403,
            detail="Four-Eyes Principle Violation: Requester cannot approve their own request. Independent review required."
        )

    req.status = "APPROVED"
    req.approver_id = approver_id
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return req

def reject_request(db: Session, request_id: int, approver_id: int, rejection_reason: str) -> ApprovalRequest:
    """
    Reject an outstanding approval request.
    """
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    
    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot reject request with status '{req.status}'.")

    req.status = "REJECTED"
    req.approver_id = approver_id
    req.rejection_reason = rejection_reason
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return req

def list_approval_requests(db: Session, status_filter: Optional[str] = None) -> List[ApprovalRequest]:
    query = db.query(ApprovalRequest)
    if status_filter:
        query = query.filter(ApprovalRequest.status == status_filter)
    return query.order_by(ApprovalRequest.created_at.desc()).all()
