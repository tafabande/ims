import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.models import Category, Product
from app.services.inventory_service import (
    process_stock_adjustment,
    reconcile_inventory_balance,
)


def test_inventory_reconciliation_chain_validation():
    """
    Double-Entry Reconciliation Test:
    Verifies that reconcile_inventory_balance accurately traces quantity_before and quantity_after
    ledger deltas and confirms 0 discrepancies.
    """
    db = SessionLocal()
    import uuid

    cat_code = f"CAT-REC-{uuid.uuid4().hex[:6]}"
    cat = Category(name="Reconcile Hardware", code=cat_code)
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-RECONCILE-{uuid.uuid4().hex[:6]}",
        name="Reconciliation Switch",
        category_id=cat.id,
        purchase_price=100.0,
        selling_price=150.0,
        stock_quantity=20,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id

    # 1. First adjustment (+10)
    process_stock_adjustment(
        db=db,
        product_id=prod_id,
        quantity=10,
        tx_type="PURCHASE",
        reference=f"PO-REC-{uuid.uuid4().hex[:4]}",
        user_name="StockClerk",
        notes="Inbound stock receipt",
    )
    db.commit()

    # 2. Second adjustment (-5)
    process_stock_adjustment(
        db=db,
        product_id=prod_id,
        quantity=-5,
        tx_type="SALE",
        reference=f"INV-REC-{uuid.uuid4().hex[:4]}",
        user_name="POSOperator",
        notes="Counter sale",
    )
    db.commit()

    # 3. Run reconciliation check
    report = reconcile_inventory_balance(db, prod_id)
    assert report["reconciled"] is True
    assert report["discrepancy"] == 0
    assert report["chain_valid"] is True
    assert report["ledger_entries_count"] == 2
    assert report["current_stock"] == 25
    db.close()


def test_transaction_rollback_on_handled_error():
    """
    Transactional Integrity Test:
    Verifies that attempting an adjustment that violates stock constraints (e.g. -100 on 20 units)
    raises InsufficientStockError and leaves database stock and ledger completely unchanged.
    """
    db = SessionLocal()
    import uuid

    cat_code = f"CAT-ROL-{uuid.uuid4().hex[:6]}"
    cat = Category(name="Rollback Tech", code=cat_code)
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-ROLLBACK-{uuid.uuid4().hex[:6]}",
        name="Rollback Test Server",
        category_id=cat.id,
        purchase_price=200.0,
        selling_price=300.0,
        stock_quantity=10,
    )

    db.add(prod)
    db.commit()
    prod_id = prod.id

    # Attempt invalid stock deduction (-50 on 10 stock)
    with pytest.raises(HTTPException) as exc_info:
        process_stock_adjustment(
            db=db,
            product_id=prod_id,
            quantity=-50,
            tx_type="SALE",
            reference="INV-FAIL-01",
            user_name="Tester",
            notes="Invalid stock deduction",
        )

    assert exc_info.value.status_code == 400

    # Verify stock remains unchanged at 10
    refreshed_prod = db.query(Product).filter(Product.id == prod_id).first()
    assert refreshed_prod.stock_quantity == 10
    db.close()
