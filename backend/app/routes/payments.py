from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    POPReviewRequest,
    POPSubmitRequest,
    POPVerificationResponse,
)
from app.services import payment_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/payments", tags=["Payment Options & Proof of Payment (POP)"])


@router.get("/methods", response_model=list[PaymentMethodResponse])
def get_payment_methods(
    active_only: bool = True,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read")),  # All authenticated roles
):
    """
    Get configured payment options (EcoCash, Merchant Till #, InnBucks, ZIPIT, Cash).
    Includes merchant number, merchant name, and markup fee percentage.
    """
    return payment_service.list_payment_methods(db, active_only)


@router.post(
    "/methods",
    response_model=PaymentMethodResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_option(
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")),  # Manager or App Admin
):
    """
    Configure a new payment option dynamically (e.g. EcoCash Merchant 304891 with 2.5% markup).
    """
    return payment_service.create_payment_method(
        db=db,
        code=data.code,
        name=data.name,
        type=data.type or "MOBILE_MONEY",
        merchant_number=data.merchant_number,
        merchant_name=data.merchant_name,
        markup_percentage=data.markup_percentage or 0.0,
        instructions=data.instructions,
        requires_pop=data.requires_pop if data.requires_pop is not None else True,
    )


@router.post(
    "/submit-pop",
    response_model=POPVerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_proof_of_payment(
    data: POPSubmitRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read")),
):
    """
    Submit Proof of Payment (POP) transaction reference & receipt file storage key.
    Calculates markup fee and puts POP into PENDING_VERIFICATION queue.
    """
    return payment_service.submit_proof_of_payment(
        db=db,
        payment_method_id=data.payment_method_id,
        transaction_reference=data.transaction_reference,
        base_amount=data.base_amount,
        sale_id=data.sale_id,
        pop_file_key=data.pop_file_key,
    )


@router.get("/verification-queue", response_model=list[POPVerificationResponse])
def get_pop_verification_queue(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")),  # Manager or Staff
):
    """
    View queue of submitted Proofs of Payment awaiting manager/staff verification.
    """
    return payment_service.list_pop_queue(db, status_filter)


@router.post("/verify/{pop_id}", response_model=POPVerificationResponse)
def verify_proof_of_payment(
    pop_id: int,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")),  # Manager or Staff
):
    """
    Verify Proof of Payment transaction reference. Automatically updates associated sale payment status to PAID.
    """
    verifier_id = 2  # Manager user ID
    return payment_service.verify_pop(db, pop_id, verifier_id)


@router.post("/reject/{pop_id}", response_model=POPVerificationResponse)
def reject_proof_of_payment(
    pop_id: int,
    data: POPReviewRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")),
):
    """
    Reject Proof of Payment with reason.
    """
    verifier_id = 2
    return payment_service.reject_pop(
        db,
        pop_id,
        verifier_id,
        data.rejection_reason or "Invalid transaction reference",
    )
