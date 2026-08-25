import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, get_db
from app.models import Category, Product, Supplier, Purchase
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)

def test_purchase_order_state_machine_transitions():
    """
    Test State Machine transitions and illegal transition prevention.
    """
    db = TestingSessionLocal()
    
    # Setup Category, Supplier & Product
    cat = Category(name="State Tech", code=f"CAT-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    supp = Supplier(name="State Supplier Inc.")
    db.add(supp)
    db.commit()

    prod = Product(
        sku=f"SKU-STATE-{uuid.uuid4().hex[:4]}",
        name="State Gateway Router",
        category_id=cat.id,
        supplier_id=supp.id,
        purchase_price=50.0,
        selling_price=100.0,
        stock_quantity=10
    )
    db.add(prod)
    db.commit()
    supp_id = supp.id
    prod_id = prod.id
    db.close()

    headers = {"X-User-Role": "ADMIN"}

    # 1. Create Purchase Order (Starts in DRAFT)
    res_create = client.post("/api/purchases/", json={
        "supplier_id": supp_id,
        "items": [{"product_id": prod_id, "quantity": 10, "unit_price": 50.0}]
    }, headers=headers)
    assert res_create.status_code == 201
    po_data = res_create.json()
    assert po_data["status"] == "DRAFT"
    po_id = po_data["id"]

    # 2. Test Invalid Transition: DRAFT -> CLOSED (Should fail with HTTP 400)
    res_invalid = client.post(f"/api/purchases/{po_id}/transition", json={
        "target_status": "CLOSED"
    }, headers=headers)
    assert res_invalid.status_code == 400
    assert "Invalid PO state transition" in res_invalid.json()["detail"]

    # 3. Test Valid Step-by-Step State Machine Progression
    # DRAFT -> SUBMITTED
    res_sub = client.post(f"/api/purchases/{po_id}/transition", json={"target_status": "SUBMITTED"}, headers=headers)
    assert res_sub.status_code == 200
    assert res_sub.json()["status"] == "SUBMITTED"

    # SUBMITTED -> APPROVED
    res_app = client.post(f"/api/purchases/{po_id}/transition", json={"target_status": "APPROVED"}, headers=headers)
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "APPROVED"

    # APPROVED -> ORDERED
    res_ord = client.post(f"/api/purchases/{po_id}/transition", json={"target_status": "ORDERED"}, headers=headers)
    assert res_ord.status_code == 200
    assert res_ord.json()["status"] == "ORDERED"

    # ORDERED -> RECEIVED (Triggers stock inbound receipt)
    res_rcv = client.post(f"/api/purchases/{po_id}/transition", json={"target_status": "RECEIVED"}, headers=headers)
    assert res_rcv.status_code == 200
    assert res_rcv.json()["status"] == "RECEIVED"

    # RECEIVED -> CLOSED
    res_cls = client.post(f"/api/purchases/{po_id}/transition", json={"target_status": "CLOSED"}, headers=headers)
    assert res_cls.status_code == 200
    assert res_cls.json()["status"] == "CLOSED"
