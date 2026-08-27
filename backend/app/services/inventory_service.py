import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    InventoryTransaction,
    Product,
    Purchase,
    Sale,
    SaleItem,
)


class InsufficientStockError(HTTPException):
    def __init__(self, product_name: str, available: int, requested: int):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for '{product_name}'. Available: {available}, Requested: {requested}",
        )


def process_stock_adjustment(
    db: Session,
    product_id: int,
    quantity: int,
    tx_type: str,
    reference: str,
    user_name: str,
    notes: str,
    reason_category: str = "CORRECTION",
):
    """
    Atomic transaction executor for stock changes using row-level locking (.with_for_update()).
    Logs exact quantity_before and quantity_after snapshots.
    """
    product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    quantity_before = product.stock_quantity
    new_quantity = quantity_before + quantity
    if new_quantity < 0:
        raise InsufficientStockError(product.name, product.stock_quantity, abs(quantity))

    # Update product quantity
    product.stock_quantity = new_quantity
    quantity_after = new_quantity

    # Create transaction audit record with before/after snapshots
    tx = InventoryTransaction(
        product_id=product_id,
        type=tx_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason_category=reason_category,
        reference=reference,
        user_name=user_name,
        notes=notes,
        created_at=datetime.now(UTC),
    )
    db.add(tx)
    return product


def process_sale_transaction(db: Session, customer_id: int, items: list, payment_method: str, user_name: str):
    """
    Processes a complete sale atomically.
    Validates available stock for all items, creates Sale + SaleItems, decrements stock with row locking, and logs snapshots.
    """
    try:
        # Ensure customer exists or auto-provision walk-in customer record
        if customer_id:
            cust = db.query(Customer).filter(Customer.id == customer_id).first()
            if not cust:
                cust = Customer(
                    id=customer_id,
                    name=f"Customer {customer_id}",
                    email=f"customer_{customer_id}@ims.local",
                )
                db.add(cust)
                db.flush()

        total_amount = 0.0
        sale_items_data = []

        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")

            # Check available quantity (stock_quantity - reserved_quantity)
            available = product.available_quantity
            if available < item.quantity:
                raise InsufficientStockError(product.name, available, item.quantity)

            line_total = item.quantity * product.selling_price
            total_amount += line_total
            sale_items_data.append((product, item.quantity, product.selling_price))

        grand_total = total_amount * 1.08  # 8% Tax

        invoice_num = f"INV-2026-{int(datetime.now(UTC).timestamp())}-{uuid.uuid4().hex[:6]}"
        sale = Sale(
            invoice_number=invoice_num,
            customer_id=customer_id,
            total_amount=grand_total,
            payment_status="PAID",
            payment_method=payment_method,
            created_at=datetime.now(UTC),
            created_by=user_name,
        )
        db.add(sale)
        db.flush()

        for product, qty, price in sale_items_data:
            s_item = SaleItem(sale_id=sale.id, product_id=product.id, quantity=qty, unit_price=price)
            db.add(s_item)

            process_stock_adjustment(
                db=db,
                product_id=product.id,
                quantity=-qty,
                tx_type="SALE",
                reference=invoice_num,
                user_name=user_name,
                notes=f"POS Sale to Customer #{customer_id}",
                reason_category="POS_SALE",
            )

        db.commit()
        db.refresh(sale)
        return sale

    except Exception:
        db.rollback()
        raise


def process_receive_purchase(db: Session, purchase_id: int, user_name: str = "System Operator"):
    """
    Receives a Purchase Order, increments inventory stock with before/after snapshots, and marks PO RECEIVED.
    """
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    if purchase.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="Purchase Order has already been received.")

    for p_item in purchase.items:
        process_stock_adjustment(
            db=db,
            product_id=p_item.product_id,
            quantity=p_item.quantity,
            tx_type="PURCHASE",
            reference=purchase.po_number,
            user_name=user_name,
            notes=f"Goods received from Supplier #{purchase.supplier_id}",
            reason_category="STOCK_RECEIVE",
        )

    purchase.status = "RECEIVED"
    purchase.received_at = datetime.now(UTC)
    db.commit()
    db.refresh(purchase)
    return purchase


# Alias for backwards compatibility
receive_purchase_order = process_receive_purchase


def reconcile_inventory_balance(db: Session, product_id: int) -> dict:
    """
    Double-Entry Style Inventory Reconciliation Engine:
    Calculates expected stock from audit transaction ledger deltas and compares against product.stock_quantity.
    Returns reconciliation report.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    txs = (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.product_id == product_id)
        .order_by(InventoryTransaction.id.asc())
        .all()
    )
    if not txs:
        return {
            "product_id": product_id,
            "product_sku": product.sku,
            "current_stock": product.stock_quantity,
            "calculated_stock": product.stock_quantity,
            "discrepancy": 0,
            "reconciled": True,
        }

    # Verify chain of transactions: tx[n].quantity_after == tx[n+1].quantity_before
    chain_valid = True
    for i in range(len(txs) - 1):
        if txs[i].quantity_after != txs[i + 1].quantity_before:
            chain_valid = False
            break

    last_tx_after = txs[-1].quantity_after
    discrepancy = product.stock_quantity - last_tx_after

    return {
        "product_id": product_id,
        "product_sku": product.sku,
        "current_stock": product.stock_quantity,
        "last_ledger_stock": last_tx_after,
        "ledger_entries_count": len(txs),
        "chain_valid": chain_valid,
        "discrepancy": discrepancy,
        "reconciled": (discrepancy == 0 and chain_valid),
    }
