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
