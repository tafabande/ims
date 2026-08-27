import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import engine, get_db
from app.main import app
from app.models import Category, Product, Store, Warehouse

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_cart_stock_reservation_creation_and_available_qty_reduction():
    db = TestingSessionLocal()
    store = Store(
        store_code=f"STR-RES-{uuid.uuid4().hex[:4].upper()}",
        name="Reservation Test Store",
    )
    db.add(store)
    db.commit()

    cat = Category(name="Res Category", code=f"RES-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-RES-{uuid.uuid4().hex[:4]}",
        name="Reservation Test Product",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=25.0,
        stock_quantity=10,
        reserved_quantity=0,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    store_id = store.id
    db.close()

    # Create Cart Reservation for 4 units
    res = client.post(
        "/api/carts/reserve",
        json={
            "store_id": store_id,
            "items": [{"product_id": prod_id, "quantity": 4}],
            "ttl_minutes": 15,
        },
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )

    assert res.status_code == 201
    cart = res.json()
    assert cart["status"] == "ACTIVE"
    assert cart["ttl_remaining_seconds"] > 0
    assert len(cart["reservations"]) == 1
    cart_id = cart["id"]

    # Verify Product reserved_quantity = 4 and available_quantity = 6
    db = TestingSessionLocal()
    db_prod = db.query(Product).filter(Product.id == prod_id).first()
    assert db_prod.reserved_quantity == 4
    assert db_prod.available_quantity == 6
    db.close()

    # Cancel reservation & verify stock restored
    cancel_res = client.delete(
        f"/api/carts/{cart_id}/reserve",
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    assert cancel_res.status_code == 200

    db = TestingSessionLocal()
    db_prod_after = db.query(Product).filter(Product.id == prod_id).first()
    assert db_prod_after.reserved_quantity == 0
    assert db_prod_after.available_quantity == 10
    db.close()


def test_concurrency_pessimistic_locking_prevents_overbooking():
    db = TestingSessionLocal()
    store = Store(store_code=f"STR-OVR-{uuid.uuid4().hex[:4].upper()}", name="Overbooking Store")
    db.add(store)
    cat = Category(name="Ovr Category", code=f"OVR-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-OVR-{uuid.uuid4().hex[:4]}",
        name="Limited Stock Item",
        category_id=cat.id,
        purchase_price=5.0,
        selling_price=15.0,
        stock_quantity=5,
        reserved_quantity=0,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    store_id = store.id
    db.close()

    # User A reserves 4 units (Available: 1 left)
    res_a = client.post(
        "/api/carts/reserve",
        json={"store_id": store_id, "items": [{"product_id": prod_id, "quantity": 4}]},
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    assert res_a.status_code == 201

    # User B attempts to reserve 3 units (only 1 available) -> 409 Conflict
    res_b = client.post(
        "/api/carts/reserve",
        json={"store_id": store_id, "items": [{"product_id": prod_id, "quantity": 3}]},
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    assert res_b.status_code == 409
    assert "Stock Reservation Failed" in res_b.json()["detail"]


def test_cart_checkout_converts_reservation_to_sale_and_store_pickup():
    db = TestingSessionLocal()
    store = Store(store_code=f"STR-CHK-{uuid.uuid4().hex[:4].upper()}", name="Checkout Store")
    db.add(store)
    cat = Category(name="Chk Category", code=f"CHK-{uuid.uuid4().hex[:4]}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-CHK-{uuid.uuid4().hex[:4]}",
        name="Checkout Test Item",
        category_id=cat.id,
        purchase_price=20.0,
        selling_price=50.0,
        stock_quantity=10,
        reserved_quantity=0,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    store_id = store.id
    db.close()

    # Reserve 2 units
    res = client.post(
        "/api/carts/reserve",
        json={"store_id": store_id, "items": [{"product_id": prod_id, "quantity": 2}]},
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    assert res.status_code == 201
    cart_id = res.json()["id"]

    # Checkout with Store Pickup fulfillment
    chk_res = client.post(
        f"/api/carts/{cart_id}/checkout",
        json={
            "payment_method": "CASH",
            "fulfillment_type": "STORE_PICKUP",
            "customer_name": "John Banda",
        },
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )

    assert chk_res.status_code == 200
    data = chk_res.json()
    assert "sale" in data
    assert data["sale"]["total_amount"] == 100.0
    assert "store_pickup" in data
    pickup_code = data["store_pickup"]["pickup_code"]
    assert pickup_code.startswith("PICKUP-2026-")
    assert data["store_pickup"]["status"] == "READY_FOR_COLLECTION"

    # Staff collection endpoint
    collect_res = client.post(
        f"/api/carts/pickups/{pickup_code}/collect",
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    assert collect_res.status_code == 200
    assert collect_res.json()["status"] == "COLLECTED"


def test_guided_store_and_employee_wizards():
    # 1. Guided Store Setup Wizard (auto-creates default warehouse)
    store_res = client.post(
        "/api/setup/store-wizard",
        json={
            "name": "Harare Main Store",
            "phone": "+263 242 100 200",
            "currency": "USD",
            "create_default_warehouse": True,
        },
        headers={"X-User-Role": "ADMIN", "X-Network-Context": "LAN"},
    )

    assert store_res.status_code == 201
    store_data = store_res.json()
    assert store_data["store_code"].startswith("STR-HRE-")
    store_id = store_data["id"]

    # Verify default warehouse created
    db = TestingSessionLocal()
    wh = db.query(Warehouse).filter(Warehouse.store_id == store_id).first()
    assert wh is not None
    assert wh.warehouse_code.startswith("WH-HRE-")
    assert wh.name == "Harare Main Store Main Warehouse"
    db.close()

    # 2. Guided Employee Setup Wizard (with one-click login account)
    emp_res = client.post(
        "/api/setup/employee-wizard",
        json={
            "first_name": "Mary",
            "last_name": "Moyo",
            "email": f"mary_{uuid.uuid4().hex[:6]}@ims.local",
            "phone": "+263 77 333 4444",
            "position": "STORE_MANAGER",
            "store_id": store_id,
            "create_user_account": True,
            "password": "SecurePassword2026!",
        },
        headers={"X-User-Role": "ADMIN", "X-Network-Context": "LAN"},
    )

    assert emp_res.status_code == 201
    emp_data = emp_res.json()
    assert emp_data["employee_code"].startswith("EMP-2026-")
    assert emp_data["user_id"] is not None
