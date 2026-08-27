from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permission
from app.models import GoodsReceipt
from app.schemas import (
    GoodsReceiptCreate,
    GoodsReceiptResponse,
    SupplierReturnCreate,
    SupplierReturnResponse,
    ThreeWayMatchRequest,
    ThreeWayMatchResponse,
)
from app.services import procurement_service

router = APIRouter(prefix="/api/procurement", tags=["Procurement, GRN & Receiving"])


@router.post("/receive", response_model=GoodsReceiptResponse, status_code=status.HTTP_201_CREATED)
def receive_goods_against_po(
    data: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:receive")),  # Staff counter or Receiving staff
):
    """
    Step 1: Receiving staff creates Goods Receipt Note (GRN) upon physical delivery.
    Status set to PENDING_VERIFICATION.
    """
    items_dicts = [item.model_dump() for item in data.items]
    return procurement_service.receive_goods(
        db=db,
        po_id=data.po_id,
        supplier_id=data.supplier_id,
        items_data=items_dicts,
        store_id=data.store_id,
        warehouse_id=data.warehouse_id,
        staff_user_id=1,
        delivery_note_ref=data.delivery_note_ref,
        notes=data.notes,
    )


@router.post("/grn/{grn_id}/verify", response_model=GoodsReceiptResponse)
def verify_and_approve_grn(
    grn_id: int,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")),  # Manager or App Admin
):
    """
    Step 2: Store Manager verifies GRN and approves accepted stock into physical inventory (+stock).
    """
    manager_id = 2  # Manager user ID
    return procurement_service.verify_and_approve_grn(db, grn_id, manager_id)


@router.get("/grn", response_model=list[GoodsReceiptResponse])
def list_goods_receipts(
    po_id: int | None = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    query = db.query(GoodsReceipt)
    if po_id:
        query = query.filter(GoodsReceipt.po_id == po_id)
    return query.order_by(GoodsReceipt.created_at.desc()).all()


@router.post(
    "/returns",
    response_model=SupplierReturnResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier_return(
    data: SupplierReturnCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:receive")),  # Staff or Manager
):
    """
    Create a Supplier Return for rejected or damaged goods.
    """
    return procurement_service.create_supplier_return(
        db=db,
        grn_id=data.grn_id,
        supplier_id=data.supplier_id,
        reason=data.reason,
        items_data=data.items,
    )


@router.post("/three-way-match", response_model=ThreeWayMatchResponse)
def perform_three_way_match(
    data: ThreeWayMatchRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("reports:read")),
):
    """
    Three-Way Matching Verification (PO vs GRN Accepted Qty vs Supplier Invoice).
    Places invoice on PAYMENT_HOLD if mismatch detected.
    """
    inv = procurement_service.perform_three_way_matching(
        db=db,
        po_id=data.po_id,
        supplier_invoice_code=data.supplier_invoice_code,
        billed_quantity=data.billed_quantity,
        billed_unit_cost=data.billed_unit_cost,
    )

    # Fetch PO and accepted GRN quantities for response audit detail
    from app.models import Purchase

    po = db.query(Purchase).filter(Purchase.id == data.po_id).first()
    ordered_qty = sum(pi.quantity for pi in po.items) if po else 0
    agreed_cost = po.items[0].unit_price if po and po.items else 0.0

    accepted_grns = (
        db.query(GoodsReceipt).filter(GoodsReceipt.po_id == data.po_id, GoodsReceipt.status == "ACCEPTED").all()
    )
    accepted_qty = sum(gri.accepted_quantity for g in accepted_grns for gri in g.items)

    return ThreeWayMatchResponse(
        invoice_id=inv.id,
        po_id=data.po_id,
        three_way_match_status=inv.three_way_match_status,
        status=inv.status,
        mismatch_reason=inv.mismatch_reason,
        ordered_qty=ordered_qty,
        accepted_qty=accepted_qty,
        billed_qty=data.billed_quantity,
        agreed_unit_cost=agreed_cost,
        billed_unit_cost=data.billed_unit_cost,
    )
