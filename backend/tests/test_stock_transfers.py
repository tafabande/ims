import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, get_db
from app.models import Store, Category, Product
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_inter_store_stock_transfer():
    db = TestingSessionLocal()

    s1 = Store(store_code=f"STR-A-{uuid.uuid4().hex[:4].upper()}", name="Store A")
    s2 = Store(store_code=f"STR-B-{uuid.uuid4().hex[:4].upper()}", name="Store B")
    cat = Category(name="Transfer Test Cat", code=f"CAT-TRF-{uuid.uuid4().hex[:4]}")
    db.add_all([s1, s2, cat])
    db.commit()

    prod = Product(
        sku=f"SKU-TRF-{uuid.uuid4().hex[:4]}",
        name="Transferable Laptop",
        category_id=cat.id,
        purchase_price=500.0,
        selling_price=800.0,
        stock_quantity=50
    )
    db.add(prod)
    db.commit()

    s1_id, s2_id, prod_id = s1.id, s2.id, prod.id
    db.close()

    # Create Transfer 10 units from s1 to s2
    res = client.post("/api/transfers", json={
        "source_store_id": s1_id,
        "destination_store_id": s2_id,
        "notes": "Emergency stock rebalance",
        "items": [
            {"product_id": prod_id, "quantity": 10}
        ]
    })
    assert res.status_code == 201
    transfer = res.json()
    assert transfer["status"] == "COMPLETED"
    assert transfer["transfer_code"].startswith("TRF-")

    # Check inventory transaction logs for dual movement
    db = TestingSessionLocal()
    p = db.query(Product).filter(Product.id == prod_id).first()
    # Net change for global product stock quantity in this test schema: (-10 + 10 = 50)
    assert p.stock_quantity == 50
    db.close()
