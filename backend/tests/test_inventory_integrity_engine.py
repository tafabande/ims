import uuid
from datetime import UTC, datetime, timedelta

from app.database import SessionLocal
from app.models import (
    Category,
    InventoryTransaction,
    Product,
    Store,
    Supplier,
)
from app.services import integrity_service


def test_inventory_integrity_equation_and_anomaly_detection():
    """
    Test continuous Inventory Integrity Equation verification:
    Opening + Receipts + Returns - Sales - Damages - Adjustments = Expected Stock.
    Verifies that variance triggers an Anomaly and Investigation Case with risk score.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    cat = Category(name=f"Integrity Cat {unique_suffix}", code=f"CAT-INT-{unique_suffix}")
    sup = Supplier(name=f"Integrity Sup {unique_suffix}")
    db.add_all([cat, sup])
    db.flush()

    # Create Product with physical system stock = 64
    prod = Product(
        sku=f"COKE-{unique_suffix}",
        name="Coca-Cola 500ml",
        category_id=cat.id,
        supplier_id=sup.id,
        purchase_price=0.50,
        selling_price=1.00,
        stock_quantity=64,  # Actual System Stock = 64
        reorder_level=10,
        barcode=f"1920-{unique_suffix}",
    )
    db.add(prod)
    db.flush()

    # Record ledger transactions:
    # Opening 0 + Receipts 50 + Returns 2 - Sales 80 - Damages 3 = Expected 69
    tx1 = InventoryTransaction(product_id=prod.id, type="RECEIVING", quantity=50, reference="PO-101")
    tx2 = InventoryTransaction(product_id=prod.id, type="RETURN", quantity=2, reference="RET-101")
    tx3 = InventoryTransaction(product_id=prod.id, type="SALE", quantity=-80, reference="INV-101")
    tx4 = InventoryTransaction(product_id=prod.id, type="DAMAGE", quantity=-3, reference="DMG-101")
    tx5 = InventoryTransaction(product_id=prod.id, type="ADJUSTMENT", quantity=-2, reference="ADJ-101")
    tx6 = InventoryTransaction(product_id=prod.id, type="ADJUSTMENT", quantity=-1, reference="ADJ-102")
    tx7 = InventoryTransaction(product_id=prod.id, type="ADJUSTMENT", quantity=-1, reference="ADJ-103")
    db.add_all([tx1, tx2, tx3, tx4, tx5, tx6, tx7])
    db.commit()

    # Run continuous integrity evaluation
    anomaly = integrity_service.evaluate_inventory_integrity(db, prod.id)

    assert anomaly is not None
    assert anomaly.expected_stock == -35  # (0 + 50 + 2 - 80 - 3 - 4) = -35
    assert anomaly.variance == anomaly.expected_stock - prod.stock_quantity
    assert anomaly.risk_score > 0.0
    assert anomaly.status in ["OPEN", "RESOLVED"]

    db.close()


def test_explain_this_number_data_lineage():
    """
    Test "Explain This Number" business and data lineage breakdown engine for Stock and Margin.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    cat = Category(name=f"Lineage Cat {unique_suffix}", code=f"CAT-LIN-{unique_suffix}")
    sup = Supplier(name=f"Lineage Sup {unique_suffix}")
    db.add_all([cat, sup])
    db.flush()

    prod = Product(
        sku=f"PROD-LIN-{unique_suffix}",
        name="Enterprise Server Unit",
        category_id=cat.id,
        supplier_id=sup.id,
        purchase_price=800.0,
        selling_price=1200.0,
        stock_quantity=15,
        barcode=f"9921-{unique_suffix}",
    )
    db.add(prod)
    db.commit()

    # Test Stock Lineage
    stock_lineage = integrity_service.get_explainable_number_lineage(db, "STOCK", str(prod.id))
    assert stock_lineage["entity_type"] == "STOCK"
    assert stock_lineage["current_value"] == 15
    assert len(stock_lineage["lineage_items"]) == 7

    # Test Margin Lineage
    margin_lineage = integrity_service.get_explainable_number_lineage(db, "MARGIN", str(prod.id))
    assert margin_lineage["entity_type"] == "MARGIN"
    assert "$400.00" in margin_lineage["current_value"]

    db.close()


def test_digital_stock_reservation_and_expiration():
    """
    Test digital stock reservation concurrency locks and expiration handling.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    cat = Category(name=f"Res Cat {unique_suffix}", code=f"CAT-RES-{unique_suffix}")
    sup = Supplier(name=f"Res Sup {unique_suffix}")
    db.add_all([cat, sup])
    db.flush()

    prod = Product(
        sku=f"RES-{unique_suffix}",
        name="Reserved Laptop",
        category_id=cat.id,
        supplier_id=sup.id,
        purchase_price=500.0,
        selling_price=750.0,
        stock_quantity=50,
        barcode=f"7721-{unique_suffix}",
    )
    db.add(prod)
    db.commit()

    from app.models import Cart

    store = Store(
        store_code=f"STR-{unique_suffix}",
        name=f"Store {unique_suffix}",
        address="123 Street",
        phone="123",
        email="s@s.com",
        status="ACTIVE",
    )
    db.add(store)
    db.flush()

    cart = Cart(
        cart_code=f"CART-{unique_suffix}",
        store_id=store.id,
        status="ACTIVE",
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(cart)
    db.commit()

    # 1. Reserve 10 units for 15 minutes
    res = integrity_service.create_stock_reservation(
        db=db,
        product_id=prod.id,
        quantity=10,
        cart_id=cart.id,
        store_id=store.id,
        duration_minutes=15,
    )

    assert res.reservation_code.startswith("RES-2026-")
    assert res.reserved_quantity == 10
    assert res.status == "ACTIVE"

    # 2. Check Available Stock: 50 Physical - 10 Reserved = 40 Available
    available = integrity_service.get_available_stock(db, prod.id)
    assert available == 40

    # 3. Simulate expired reservation
    res.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()

    # 4. Check Available Stock after automatic expiration release
    available_after_exp = integrity_service.get_available_stock(db, prod.id)
    assert available_after_exp == 50  # Released back to 50

    db.close()


def test_ble_device_location_tracking_and_mismatch():
    """
    Test IoT BLE device location tracking signals and physical location mismatch detection.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    cat = Category(name=f"BLE Cat {unique_suffix}", code=f"CAT-BLE-{unique_suffix}")
    sup = Supplier(name=f"BLE Sup {unique_suffix}")
    db.add_all([cat, sup])
    db.flush()

    prod = Product(
        sku=f"BLE-{unique_suffix}",
        name="Smart IoT Tagged Item",
        category_id=cat.id,
        supplier_id=sup.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=100,
        barcode=f"5521-{unique_suffix}",
    )
    db.add(prod)
    db.commit()

    # Tag expected at Shelf A3, but detected at Shelf B2
    ble = integrity_service.update_ble_location_tracking(
        db=db,
        tag_id=f"TAG-{unique_suffix}",
        product_id=prod.id,
        expected_location="Shelf A3",
        detected_location="Shelf B2",
        rssi_dbm=-68,
        confidence_percentage=85.0,
    )

    assert ble.has_mismatch == True
    assert ble.expected_location == "Shelf A3"
    assert ble.detected_location == "Shelf B2"

    db.close()
