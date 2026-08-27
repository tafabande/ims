from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Purchase, PurchaseItem
from app.schemas import PurchaseCreate, PurchaseResponse
from app.services.iam_service import require_permission
from app.services.inventory_service import receive_purchase_order

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])

VALID_PO_TRANSITIONS = {
    "DRAFT": ["SUBMITTED", "CANCELLED"],
    "SUBMITTED": ["APPROVED", "CANCELLED"],
    "APPROVED": ["ORDERED", "CANCELLED"],
    "ORDERED": ["RECEIVED", "CANCELLED"],
    "RECEIVED": ["CLOSED"],
    "CLOSED": [],
    "CANCELLED": [],
}


class POStateTransitionRequest(BaseModel):
    target_status: str
    reason: str | None = "State transition requested"


@router.get("/", response_model=list[PurchaseResponse])
def get_purchases(
    page: int = 1,
    limit: int = 50,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Paginated Purchase Orders endpoint with status filtering.
    """
    skip = (max(1, page) - 1) * max(1, min(limit, 100))
    query = db.query(Purchase)
    if status:
        query = query.filter(Purchase.status == status.upper())
    return query.order_by(Purchase.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase_in: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("purchases:create")),
):
    po_num = f"PO-2026-{int(datetime.utcnow().timestamp())}"
    total_amount = sum(item.quantity * item.unit_price for item in purchase_in.items)

    po = Purchase(
        po_number=po_num,
        supplier_id=purchase_in.supplier_id,
        status="DRAFT",  # Enforce DRAFT initial state
        total_amount=total_amount,
        created_at=datetime.utcnow(),
    )
    db.add(po)
    db.flush()

    for item in purchase_in.items:
        p_item = PurchaseItem(
            purchase_id=po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(p_item)

    db.commit()
    db.refresh(po)
    return po


@router.post("/{purchase_id}/transition", response_model=PurchaseResponse)
def transition_purchase_state(
    purchase_id: int,
    req: POStateTransitionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("purchases:create")),
):
    """
    Purchase Order State Machine transition handler with state jump validation.
    """
    po = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not po:
        raise HTTPException(status_code=404, detail=f"Purchase Order #{purchase_id} not found.")

    current = po.status
    target = req.target_status.upper()
    allowed = VALID_PO_TRANSITIONS.get(current, [])

    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PO state transition: Cannot transition {po.po_number} from '{current}' to '{target}'. Allowed target states from '{current}' are: {allowed}.",
        )

    # Special handling when transitioning to RECEIVED
    if target == "RECEIVED" and current != "RECEIVED":
        return receive_purchase_order(
            db=db,
            purchase_id=purchase_id,
            user_name=current_user.get("user_id", "Procurement Manager"),
        )

    po.status = target
    if target == "RECEIVED":
        po.received_at = datetime.utcnow()

    db.commit()
    db.refresh(po)
    return po


@router.post("/{purchase_id}/receive", response_model=PurchaseResponse)
def receive_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("inventory:adjust")),
):
    po = receive_purchase_order(
        db=db,
        purchase_id=purchase_id,
        user_name=current_user.get("user_id", "Procurement Manager"),
    )
    return po
