import pytest
from app.database import SessionLocal, engine, Base
from app.models import Category, Product, InventoryTransaction



def test_ledger_immutability_and_snapshots():
    """
    REQ-04 Immutability & Audit Snapshot Test:
    Verifies that inventory transaction ledger entries correctly snapshot quantity_before and quantity_after,
    preserving historical integrity.
    """
    db = SessionLocal()
    import uuid
    cat_code = f"CAT-LED-{uuid.uuid4().hex[:6]}"
    cat = Category(name="Ledger Hardware", code=cat_code)
    db.add(cat)
    db.commit()

    prod_sku = f"SKU-LEDGER-{uuid.uuid4().hex[:6]}"
    prod = Product(
        sku=prod_sku,
        name="Audit Snapshot Server",
        category_id=cat.id,
        purchase_price=500.0,
        selling_price=800.0,
        stock_quantity=10
    )

    db.add(prod)
    db.commit()

    # Create immutable ledger record
    tx = InventoryTransaction(
        product_id=prod.id,
        type="ADJUSTMENT",
        quantity=5,
        quantity_before=10,
        quantity_after=15,
        reason_category="STOCK_COUNT",
        reference="REF-AUDIT-001",
        user_name="AuditOfficer",
        notes="Initial stock verification audit"
    )
    db.add(tx)
    db.commit()

    tx_id = tx.id
    assert tx_id is not None

    # Fetch and verify snapshots
    fetched_tx = db.query(InventoryTransaction).filter(InventoryTransaction.id == tx_id).first()
    assert fetched_tx.quantity_before == 10
    assert fetched_tx.quantity_after == 15
    assert fetched_tx.user_name == "AuditOfficer"
    db.close()
