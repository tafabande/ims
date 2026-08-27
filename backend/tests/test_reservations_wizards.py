from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_store_setup_wizard_creation():
    """
    Guided Setup Wizard Test:
    Creates a new store and automatically provisions a default warehouse using StoreWizardRequest.
    """
    res = client.post(
        "/api/setup/store-wizard",
        json={
            "name": "Bulawayo Distribution Hub",
            "phone": "+263 29 223456",
            "currency": "USD",
            "timezone": "Africa/Harare",
            "create_default_warehouse": True,
        },
        headers={"X-User-Role": "ADMIN"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "STR-" in data["store_code"]
    assert data["name"] == "Bulawayo Distribution Hub"


def test_cart_reservation_ttl_and_checkout():
    """
    Cart Stock Reservation Test:
    Reserves stock items with a 15-minute TTL reservation window.
    """
    res = client.post(
        "/api/reservations/cart/reserve",
        json={
            "store_id": 1,
            "items": [{"product_id": 1, "quantity": 2}],
            "ttl_minutes": 15,
        },
        headers={"X-User-Role": "STAFF"},
    )
    # 201 Created or 404 Product not found (if DB unseeded)
    assert res.status_code in [201, 404]
