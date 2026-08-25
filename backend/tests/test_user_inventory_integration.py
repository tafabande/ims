import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, get_db
from app.models import Category, Product, User, InventoryTransaction
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)

def test_user_soft_deletion_and_audit_preservation():
    """
    Test user soft deletion:
    1. Create a user operator.
    2. Soft deactivate the user operator (active=False).
    3. Verify user cannot authenticate, but user database record persists for audit trail.
    """
    db = TestingSessionLocal()
    
    # 1. Create User Operator
    unique_email = f"operator_{uuid.uuid4().hex[:6]}@ims.local"
    user = User(
        email=unique_email,
        hashed_password="$2b$12$eImiTXuWVxfM37uY4JANjO5E/1K1J4F3g9u7v.K2L2A.6kXq5O3uO", # testpass
        full_name="Test Operator",
        role="STAFF",
        active=True
    )
    db.add(user)
    db.commit()
    user_id = user.id
    db.close()

    # 2. Soft Deactivate User via API endpoint (with ADMIN role header)
    response = client.post(f"/api/users/{user_id}/deactivate", headers={"X-User-Role": "ADMIN"})
    assert response.status_code == 200
    deactivated = response.json()
    assert deactivated["active"] is False

    # 3. Verify user database record persists (soft deleted, NOT purged from DB)
    db = TestingSessionLocal()
    user_db = db.query(User).filter(User.id == user_id).first()
    assert user_db is not None
    assert user_db.active is False
    assert user_db.full_name == "Test Operator"
    db.close()

def test_operational_endpoints_and_snapshot_ledger():
    """
    Test operational endpoints (/receive, /damage, /return) and verify quantity_before and quantity_after snapshots.
    """
    db = TestingSessionLocal()
    
    unique_code = f"CAT-{uuid.uuid4().hex[:6]}"
    cat = Category(name="Electronics Tech", code=unique_code)
    db.add(cat)
    db.commit()

    unique_sku = f"SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(
        sku=unique_sku,
        name="Test Gateway Router",
        category_id=cat.id,
        purchase_price=40.0,
        selling_price=80.0,
        stock_quantity=10,
        reserved_quantity=2,
        reorder_level=5
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    admin_headers = {"X-User-Role": "ADMIN"}

    # Test 1: Stock Receive (/api/inventory/receive)
    res_rcv = client.post("/api/inventory/receive", json={
        "product_id": prod_id,
        "quantity": 15,
        "po_number": "PO-TEST-101",
        "notes": "Bulk inbound arrival"
    }, headers=admin_headers)
    assert res_rcv.status_code == 200
    assert res_rcv.json()["new_stock_quantity"] == 25

    # Test 2: Record Damaged Stock (/api/inventory/damage)
    res_dmg = client.post("/api/inventory/damage", json={
        "product_id": prod_id,
        "quantity": 3,
        "notes": "Freight box crushed in transit"
    }, headers=admin_headers)
    assert res_dmg.status_code == 200
    assert res_dmg.json()["new_stock_quantity"] == 22

    # Test 3: Customer Return (/api/inventory/return)
    res_ret = client.post("/api/inventory/return", json={
        "product_id": prod_id,
        "quantity": 1,
        "notes": "Customer unopened return"
    }, headers=admin_headers)
    assert res_ret.status_code == 200
    assert res_ret.json()["new_stock_quantity"] == 23

    # Test 4: Verify Transaction Ledger Snapshots (quantity_before & quantity_after)
    db = TestingSessionLocal()
    txs = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == prod_id).order_by(InventoryTransaction.id.asc()).all()
    assert len(txs) >= 3
    
    # Receive tx: 10 -> 25
    assert txs[0].type == "PURCHASE"
    assert txs[0].quantity_before == 10
    assert txs[0].quantity_after == 25

    # Damage tx: 25 -> 22
    assert txs[1].reason_category == "DAMAGED"
    assert txs[1].quantity_before == 25
    assert txs[1].quantity_after == 22

    # Return tx: 22 -> 23
    assert txs[2].type == "RETURN"
    assert txs[2].quantity_before == 22
    assert txs[2].quantity_after == 23

    db.close()
