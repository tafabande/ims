from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Sale, SaleItem, ReturnOrder, ReturnItem, Product
from app.services.inventory_service import process_stock_adjustment
from datetime import datetime, timezone
import uuid

def process_return_order(db: Session, return_data, user_name: str = "System Operator") -> ReturnOrder:
    sale = db.query(Sale).filter(Sale.id == return_data.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Original Sale Invoice not found")

    return_code = f"RET-2026-{uuid.uuid4().hex[:5].upper()}"
    total_refund = 0.0

    return_order = ReturnOrder(
        return_code=return_code,
        sale_id=sale.id,
        customer_id=sale.customer_id,
        total_refund_amount=0.0,
        reason_category=return_data.reason_category,
        is_damaged=return_data.is_damaged,
        restock_approved=return_data.restock_approved,
        approved_by_emp_id=return_data.approved_by_emp_id,
        status="COMPLETED",
        created_at=datetime.now(timezone.utc)
    )
    db.add(return_order)
    db.flush()

    for item in return_data.items:
        line_refund = item.quantity * item.refund_unit_price
        total_refund += line_refund

        ret_item = ReturnItem(
            return_order_id=return_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            refund_unit_price=item.refund_unit_price,
            restockable=item.restockable
        )
        db.add(ret_item)

        # Inventory Ledger adjustment
        if item.restockable:
            # Re-enter inventory (+quantity)
            process_stock_adjustment(
                db=db,
                product_id=item.product_id,
                quantity=item.quantity,
                tx_type="RETURN",
                reference=return_code,
                user_name=user_name,
                notes=f"Customer Return - Restocked from Sale #{sale.invoice_number}",
                reason_category=return_data.reason_category
            )
        else:
            # Record damage write-off audit (0 net quantity change to usable stock)
            process_stock_adjustment(
                db=db,
                product_id=item.product_id,
                quantity=0,
                tx_type="DAMAGE",
                reference=return_code,
                user_name=user_name,
                notes=f"Customer Return - Damaged Write-off from Sale #{sale.invoice_number}",
                reason_category="RETURN_WRITE_OFF"
            )

    return_order.total_refund_amount = round(total_refund, 2)
    db.commit()
    db.refresh(return_order)
    return return_order

def get_returns(db: Session):
    return db.query(ReturnOrder).order_by(ReturnOrder.id.desc()).all()

def get_return_by_id(db: Session, return_id: int) -> ReturnOrder:
    ret = db.query(ReturnOrder).filter(ReturnOrder.id == return_id).first()
    if not ret:
        raise HTTPException(status_code=404, detail="Return Order not found")
    return ret
