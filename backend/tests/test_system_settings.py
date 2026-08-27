import uuid

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Category, Product

client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)


def test_dynamic_system_settings_evaluation():
    """
    Test Dynamic System Settings Engine:
    - Get dynamic database settings.
    - Update sales.max_staff_discount from 2.0% to 10.0% dynamically.
    - Verify price negotiation checks dynamically evaluate updated setting!
    """
    # 0. Ensure setting is reset to 2.0 for test isolation
    client.put(
        "/api/settings/sales.max_staff_discount",
        json={"value": "2.0"},
        headers={"X-User-Role": "MANAGER"},
    )

    # 1. Fetch system settings
    get_res = client.get("/api/settings", headers={"X-User-Role": "STAFF"})
    assert get_res.status_code == 200
    settings = get_res.json()
    assert len(settings) >= 5

    # Find sales.max_staff_discount setting
    staff_discount_setting = next((s for s in settings if s["key"] == "sales.max_staff_discount"), None)
    assert staff_discount_setting is not None
    assert staff_discount_setting["value"] == "2.0"

    # 2. Setup product for negotiation test
    db = SessionLocal()
    unique_id = uuid.uuid4().hex[:6]
    cat = Category(name="Settings Test Tech", code=f"SET-CAT-{unique_id}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SET-SKU-{unique_id}",
        name="Settings Test Item",
        category_id=cat.id,
        purchase_price=80.0,
        selling_price=100.0,
        stock_quantity=50,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    # Staff attempting 5% discount ($95 offered price) when limit is 2.0% -> Requires Approval
    neg_initial_res = client.post(
        "/api/pricing/check-negotiation",
        json={"product_id": prod_id, "offered_price": 95.0, "user_role": "STAFF"},
        headers={"X-User-Role": "STAFF"},
    )
    assert neg_initial_res.status_code == 200
    assert neg_initial_res.json()["requires_approval"] is True

    # 3. Manager updates sales.max_staff_discount dynamically in database configuration to 10.0%
    update_res = client.put(
        "/api/settings/sales.max_staff_discount",
        json={"value": "10.0"},
        headers={"X-User-Role": "MANAGER"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["value"] == "10.0"

    # 4. Re-check negotiation: Staff attempting 5% discount ($95 offered price) is NOW ALLOWED!
    neg_updated_res = client.post(
        "/api/pricing/check-negotiation",
        json={"product_id": prod_id, "offered_price": 95.0, "user_role": "STAFF"},
        headers={"X-User-Role": "STAFF"},
    )
    assert neg_updated_res.status_code == 200
    assert neg_updated_res.json()["requires_approval"] is False
    assert neg_updated_res.json()["allowed_for_role"] is True
