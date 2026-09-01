import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ReturnItem, ReturnOrder, Sale, SaleItem
from app.services.inventory_service import process_stock_adjustment


def process_return_order(
    db: Session,
    return_data,
    user_name: str = "System Operator",
    user_emp_id: int | None = None,
) -> ReturnOrder:
    # Lock Sale header exclusively with .with_for_update() to prevent race conditions on return balances
    sale = db.query(Sale).filter(Sale.id == return_data.sale_id).with_for_update().first()
    if not sale:
        raise HTTPException(status_code=404, detail="Original Sale Invoice not found")

    # Separation of Duties (SoD) check: Requester cannot approve their own refund
    if return_data.approved_by_emp_id and user_emp_id and return_data.approved_by_emp_id == user_emp_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Separation of Duties Violation: Requester cannot approve their own refund order.",
        )

    return_code = f"RET-2026-{uuid.uuid4().hex[:6].upper()}"
    total_refund = 0.0

    # Validate each return line item against original sale invoice items
    for item in return_data.items:
        sale_item = (
            db.query(SaleItem).filter(SaleItem.sale_id == sale.id, SaleItem.product_id == item.product_id).first()
        )

        if not sale_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product ID {item.product_id} was not part of original Sale #{sale.invoice_number}.",
            )

        # Check previously refunded quantity for this sale item
        previously_refunded = (
            db.query(func.sum(ReturnItem.quantity))
            .join(ReturnOrder)
            .filter(
                ReturnOrder.sale_id == sale.id,
                ReturnItem.product_id == item.product_id,
                ReturnOrder.status != "REJECTED",
            )
            .scalar()
            or 0
        )

        remaining_refundable = sale_item.quantity - previously_refunded
        if item.quantity > remaining_refundable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested refund quantity ({item.quantity}) exceeds remaining refundable balance ({remaining_refundable}) for product ID {item.product_id}.",
            )

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
        created_at=datetime.now(UTC),
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
            restockable=item.restockable,
        )
        db.add(ret_item)

        # Inventory Ledger Disposition Routing: RESTOCK vs DAMAGED / SCRAPPED / NO_RETURN
        if item.restockable:
            # RESTOCK Disposition: Re-enter available usable inventory (+quantity)
            process_stock_adjustment(
                db=db,
                product_id=item.product_id,
                quantity=item.quantity,
                tx_type="RETURN",
                reference=return_code,
                user_name=user_name,
                notes=f"Customer Return (Disposition: RESTOCK) from Sale #{sale.invoice_number}",
                reason_category=return_data.reason_category,
            )
        else:
            # DAMAGED / SCRAPPED Disposition: Record audit ledger trace without increasing usable stock
            process_stock_adjustment(
                db=db,
                product_id=item.product_id,
                quantity=0,
                tx_type="DAMAGE",
                reference=return_code,
                user_name=user_name,
                notes=f"Customer Return (Disposition: DAMAGED/WRITE-OFF) from Sale #{sale.invoice_number}",
                reason_category="RETURN_WRITE_OFF",
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
