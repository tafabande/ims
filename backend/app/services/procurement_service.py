import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    GoodsReceipt,
    GoodsReceiptItem,
    InventoryTransaction,
    Product,
    Purchase,
    SupplierInvoice,
    SupplierReturn,
    SupplierReturnItem,
)


def receive_goods(
    db: Session,
    po_id: int,
    supplier_id: int,
    items_data: list[dict[str, Any]],
    store_id: int | None = None,
    warehouse_id: int | None = None,
    staff_user_id: int | None = None,
    delivery_note_ref: str | None = None,
    notes: str | None = None,
) -> GoodsReceipt:
    """
    Step 1: Physical Goods Receiving (GRN Creation).
    Staff physically receives delivery note & counts items.
    GRN status set to PENDING_VERIFICATION.
    DOES NOT YET INCREASE INVENTORY STOCK.
    """
    po = db.query(Purchase).filter(Purchase.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    grn_code = f"GRN-2026-{uuid.uuid4().hex[:6].upper()}"
    grn = GoodsReceipt(
        grn_code=grn_code,
        po_id=po_id,
        supplier_id=supplier_id,
        store_id=store_id,
        warehouse_id=warehouse_id,
        received_by_staff_id=staff_user_id,
        status="PENDING_VERIFICATION",
        delivery_note_ref=delivery_note_ref,
        notes=notes,
        created_at=datetime.now(UTC),
    )
    db.add(grn)
    db.flush()

    for item in items_data:
        grn_item = GoodsReceiptItem(
            grn_id=grn.id,
            product_id=item["product_id"],
            received_quantity=item["received_quantity"],
            accepted_quantity=item["accepted_quantity"],
            rejected_quantity=item.get("rejected_quantity", 0),
            damaged_quantity=item.get("damaged_quantity", 0),
            unit_cost=item["unit_cost"],
            batch_number=item.get("batch_number"),
            expiry_date=item.get("expiry_date"),
            storage_location=item.get("storage_location"),
            rejection_reason=item.get("rejection_reason"),
            notes=item.get("notes"),
        )
        db.add(grn_item)

    # Update PO status to PARTIALLY_RECEIVED
    po.status = "PARTIALLY_RECEIVED"

    db.commit()
    db.refresh(grn)
    return grn


def verify_and_approve_grn(db: Session, grn_id: int, manager_user_id: int) -> GoodsReceipt:
    """
    Step 2: Manager Verification & Stock Increment.
    Manager verifies delivery note vs actual goods.
    Increases Inventory Stock strictly by ACCEPTED_QUANTITY (+accepted_quantity).
    Creates immutable InventoryTransaction logs.
    Updates PO status to FULLY_RECEIVED if total accepted/received meets ordered quantity.
    """
    grn = db.query(GoodsReceipt).filter(GoodsReceipt.id == grn_id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt Note (GRN) not found.")

    if grn.status == "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail="GRN is already verified and accepted into inventory.",
        )

    now = datetime.now(UTC)
    grn.status = "ACCEPTED"
    grn.verified_by_manager_id = manager_user_id
    grn.verified_at = now

    # Execute Inventory Transactions for ACCEPTED QUANTITY ONLY!
    for item in grn.items:
        if item.accepted_quantity > 0:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                prev_stock = product.stock_quantity
                product.stock_quantity += item.accepted_quantity

                # Immutable Inventory Transaction Log
                tx = InventoryTransaction(
                    product_id=product.id,
                    type="RECEIVE",
                    quantity=item.accepted_quantity,
                    notes=f"Goods Receipt {grn.grn_code} Verification: Accepted {item.accepted_quantity} units into stock (prev: {prev_stock}, new: {product.stock_quantity}). Batch: {item.batch_number or 'N/A'}",
                    created_at=now,
                )
                db.add(tx)

    # Check overall PO completion status across all GRNs for this PO
    po = db.query(Purchase).filter(Purchase.id == grn.po_id).first()
    if po:
        total_ordered = sum(pi.quantity for pi in po.items)

        # Calculate total received across all accepted GRNs for this PO
        all_grns = db.query(GoodsReceipt).filter(GoodsReceipt.po_id == po.id, GoodsReceipt.status == "ACCEPTED").all()

        total_received_so_far = sum(gri.received_quantity for g in all_grns for gri in g.items)

        if total_received_so_far >= total_ordered:
            po.status = "FULLY_RECEIVED"
        else:
            po.status = "PARTIALLY_RECEIVED"

    db.commit()
    db.refresh(grn)
    return grn


def create_supplier_return(
    db: Session,
    grn_id: int,
    supplier_id: int,
    reason: str,
    items_data: list[dict[str, Any]],
) -> SupplierReturn:
    """
    Create a Supplier Return for rejected or damaged goods.
    """
    return_code = f"RET-2026-{uuid.uuid4().hex[:6].upper()}"
    ret = SupplierReturn(
        return_code=return_code,
        grn_id=grn_id,
        supplier_id=supplier_id,
        status="AUTHORISED",
        reason=reason,
        created_at=datetime.now(UTC),
        authorized_at=datetime.now(UTC),
    )
    db.add(ret)
    db.flush()

    for item in items_data:
        ret_item = SupplierReturnItem(
            return_id=ret.id,
            grn_item_id=item["grn_item_id"],
            product_id=item["product_id"],
            returned_quantity=item["returned_quantity"],
            return_reason=item.get("return_reason", reason),
        )
        db.add(ret_item)

    db.commit()
    db.refresh(ret)
    return ret


def perform_three_way_matching(
    db: Session,
    po_id: int,
    supplier_invoice_code: str,
    billed_quantity: int,
    billed_unit_cost: float,
) -> SupplierInvoice:
    """
    Three-Way Matching Control Engine:
    Compares:
    1. Purchase Order (Ordered Quantity & Agreed Unit Cost)
    2. Goods Receipts (Accepted Quantity)
    3. Supplier Invoice (Billed Quantity & Billed Unit Cost)

    If discrepancy found -> Invoice placed on PAYMENT_HOLD.
    """
    po = db.query(Purchase).filter(Purchase.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found.")

    sum(pi.quantity for pi in po.items)
    po_agreed_cost = po.items[0].unit_price if po.items else 0.0

    # Calculate total accepted quantity across GRNs
    accepted_grns = db.query(GoodsReceipt).filter(GoodsReceipt.po_id == po.id, GoodsReceipt.status == "ACCEPTED").all()

    accepted_qty = sum(gri.accepted_quantity for g in accepted_grns for gri in g.items)

    qty_mismatch = billed_quantity != accepted_qty
    cost_mismatch = abs(billed_unit_cost - po_agreed_cost) > 0.01

    three_way_status = "MATCHED"
    status = "APPROVED_FOR_PAYMENT"
    mismatch_reason = None

    if qty_mismatch and cost_mismatch:
        three_way_status = "MISMATCH_BOTH"
        status = "PAYMENT_HOLD"
        mismatch_reason = f"Quantity & Unit Cost Mismatch: Billed {billed_quantity} units @ ${billed_unit_cost:.2f}, but accepted GRN qty is {accepted_qty} and agreed PO cost is ${po_agreed_cost:.2f}."
    elif qty_mismatch:
        three_way_status = "MISMATCH_QTY"
        status = "PAYMENT_HOLD"
        mismatch_reason = f"Quantity Mismatch: Billed {billed_quantity} units, but accepted GRN qty is {accepted_qty}."
    elif cost_mismatch:
        three_way_status = "MISMATCH_COST"
        status = "PAYMENT_HOLD"
        mismatch_reason = f"Unit Cost Mismatch: Billed unit cost is ${billed_unit_cost:.2f}, but agreed PO cost is ${po_agreed_cost:.2f}."

    total_billed_amount = billed_quantity * billed_unit_cost

    inv = SupplierInvoice(
        invoice_code=supplier_invoice_code,
        po_id=po_id,
        supplier_id=po.supplier_id,
        billed_quantity=billed_quantity,
        billed_unit_cost=billed_unit_cost,
        total_billed_amount=total_billed_amount,
        status=status,
        three_way_match_status=three_way_status,
        mismatch_reason=mismatch_reason,
        created_at=datetime.now(UTC),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv
