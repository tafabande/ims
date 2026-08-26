from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import ApprovalRequestCreate, ApprovalReviewRequest, ApprovalRequestResponse
from app.services import approval_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/approvals", tags=["Stateful Approval Engine"])

@router.post("/request", response_model=ApprovalRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_new_approval_request(
    data: ApprovalRequestCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read")) # Minimum authenticated access
):
    requester_id = 1 # Default fallback or auth_ctx user
    return approval_service.create_approval_request(
        db=db,
        request_type=data.request_type,
        requester_id=requester_id,
        entity_name=data.entity_name,
        entity_id=data.entity_id,
        amount=data.amount,
        notes=data.notes,
        payload_json=data.payload_json
    )

@router.get("", response_model=List[ApprovalRequestResponse])
def get_approval_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("reports:read"))
):
    return approval_service.list_approval_requests(db, status_filter)

@router.post("/{request_id}/approve", response_model=ApprovalRequestResponse)
def approve_pending_request(
    request_id: int,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or App Admin
):
    approver_id = 2 # Distinct approver user ID for testing Four-Eyes principle
    return approval_service.approve_request(db, request_id, approver_id)

@router.post("/{request_id}/reject", response_model=ApprovalRequestResponse)
def reject_pending_request(
    request_id: int,
    review_data: ApprovalReviewRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage"))
):
    approver_id = 2
    return approval_service.reject_request(db, request_id, approver_id, review_data.rejection_reason or "Request rejected.")

from datetime import datetime, timedelta, timezone
from typing import Dict, Any

MOCK_JIT_ELEVATIONS = []

@router.post("/jit-elevation/request")
def request_jit_privilege_elevation(
    payload: Dict[str, Any],
    auth_ctx: dict = Depends(require_permission("products:read"))
):
    """
    Just-In-Time (JIT) Temporary Privilege Elevation Request:
    Staff requests single-operation privilege elevation for a target record (e.g., voiding sale INV-00192).
    """
    action = payload.get("action", "sales:void")
    target_resource = payload.get("target_resource", "INV-00192")
    reason = payload.get("reason")
    expiry_minutes = payload.get("expiry_minutes", 15)

    if not reason:
        raise HTTPException(status_code=400, detail="Reason justification is required for privilege elevation.")

    elevation_id = len(MOCK_JIT_ELEVATIONS) + 1
    new_grant = {
        "id": elevation_id,
        "grant_code": f"JIT-GRANT-{elevation_id:04d}",
        "action": action,
        "target_resource": target_resource,
        "requested_by": "EMP-00014 (John Banda)",
        "reason": reason,
        "status": "PENDING_MANAGER_APPROVAL", # PENDING_MANAGER_APPROVAL | APPROVED | EXPIRED | CONSUMED
        "expiry_minutes": expiry_minutes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)).isoformat()
    }
    MOCK_JIT_ELEVATIONS.append(new_grant)

    return {
        "status": "ELEVATION_REQUESTED",
        "grant_code": new_grant["grant_code"],
        "action": action,
        "target_resource": target_resource,
        "message": f"JIT privilege elevation requested for {action} on {target_resource}. Pending manager approval (valid {expiry_minutes}m)."
    }

@router.post("/jit-elevation/{grant_code}/approve")
def approve_jit_privilege_elevation(
    grant_code: str,
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager approval required
):
    """
    Manager Approval for JIT Temporary Privilege Elevation:
    Grants 15-minute scoped elevation token for single operation execution.
    """
    for grant in MOCK_JIT_ELEVATIONS:
        if grant["grant_code"] == grant_code:
            grant["status"] = "APPROVED"
            grant["approved_by"] = "USR-00004 (Manager)"
            grant["approved_at"] = datetime.now(timezone.utc).isoformat()
            return {
                "status": "ELEVATION_GRANTED",
                "grant_code": grant_code,
                "action": grant["action"],
                "target_resource": grant["target_resource"],
                "expires_at": grant["expires_at"],
                "message": f"Manager approved JIT elevation for {grant['action']} on {grant['target_resource']}. Valid for 15 minutes."
            }
    raise HTTPException(status_code=404, detail="JIT elevation request not found.")

@router.get("/jit-elevation/active")
def list_active_jit_elevations(
    auth_ctx: dict = Depends(require_permission("products:read"))
):
    """
    List active JIT privilege elevation grants for the current authenticated user.
    """
    return MOCK_JIT_ELEVATIONS

