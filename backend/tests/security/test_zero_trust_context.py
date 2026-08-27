from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_zero_trust_lan_network_context_pos_sale():
    """
    Zero-Trust Security Test:
    Store LAN network proximity allows staff POS sale transaction.
    """
    res = client.post(
        "/api/sales/",
        json={"customer_id": 1, "payment_method": "Cash", "items": []},
        headers={"X-User-Role": "STAFF", "X-Network-Context": "LAN"},
    )
    # Validation or empty items check returns 404/400, but NOT Zero-Trust network block (403)
    assert res.status_code != 403


def test_zero_trust_remote_staff_pos_sale_rejected():
    """
    Zero-Trust Security Test:
    Remote network context (X-Network-Context: REMOTE) blocks staff from creating POS sales (HTTP 403 Forbidden).
    """
    res = client.post(
        "/api/sales/",
        json={"customer_id": 1, "payment_method": "Cash", "items": []},
        headers={"X-User-Role": "STAFF", "X-Network-Context": "REMOTE"},
    )
    assert res.status_code == 403
    assert "Zero-Trust Policy" in res.json()["detail"]
    assert "store LAN network proximity" in res.json()["detail"]


def test_zero_trust_admin_remote_bypass_allowed():
    """
    Zero-Trust Security Test:
    System Administrator (ADMIN) can access operations from REMOTE network context.
    """
    res = client.get(
        "/api/products/",
        headers={"X-User-Role": "ADMIN", "X-Network-Context": "REMOTE"},
    )
    assert res.status_code == 200
    assert res.headers.get("X-Network-Context") == "REMOTE"
