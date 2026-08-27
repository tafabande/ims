import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import engine, get_db
from app.main import app
from app.models import Category, Product

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_security_middleware_network_context_injection():
    # LAN Header test
    res_lan = client.get("/health", headers={"X-Network-Context": "LAN"})
    assert res_lan.status_code == 200
    assert res_lan.headers.get("X-Network-Context") == "LAN"

    # REMOTE Header test
    res_remote = client.get("/health", headers={"X-Network-Context": "REMOTE"})
    assert res_remote.status_code == 200
    assert res_remote.headers.get("X-Network-Context") == "REMOTE"


def test_remote_context_denies_pos_sales_for_staff():
    db = TestingSessionLocal()
    cat = Category(name="POS Test Category", code=f"POS-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-POS-{uuid.uuid4().hex[:4]}",
        name="POS Test Item",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=50,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    # Attempting POS sale creation from REMOTE context as STAFF -> DENIED 403
    remote_res = client.post(
        "/api/sales/",
        json={
            "customer_id": 1,
            "payment_method": "CASH",
            "items": [{"product_id": prod_id, "quantity": 1}],
        },
        headers={"X-User-Role": "STAFF", "X-Network-Context": "REMOTE"},
    )

    assert remote_res.status_code == 403
    assert "Zero-Trust Policy" in remote_res.json()["detail"]


def test_lan_context_allows_pos_sales_for_staff():
    db = TestingSessionLocal()
    cat = Category(name="POS LAN Category", code=f"LAN-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-LAN-{uuid.uuid4().hex[:4]}",
        name="LAN Test Item",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=50,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    # Executing POS sale creation from LAN context as STAFF -> ALLOWED 201
    lan_res = client.post(
        "/api/sales/",
        json={
            "customer_id": 1,
            "payment_method": "CASH",
            "items": [{"product_id": prod_id, "quantity": 1}],
        },
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )

    assert lan_res.status_code == 201
    assert "invoice_number" in lan_res.json()


def test_remote_context_allows_manager_inventory_viewing():
    # Manager viewing products catalog/inventory from REMOTE context -> ALLOWED 200
    res = client.get(
        "/api/products/",
        headers={"X-User-Role": "MANAGER", "X-Network-Context": "REMOTE"},
    )
    assert res.status_code == 200
