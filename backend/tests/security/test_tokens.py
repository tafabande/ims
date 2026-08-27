from fastapi.testclient import TestClient

from app.main import app
from app.services.iam_service import create_access_token, create_refresh_token

client = TestClient(app)


def test_access_and_refresh_token_issuance():
    """
    Token Security Test:
    Verifies that create_access_token and create_refresh_token issue distinct tokens.
    """
    access = create_access_token(user_id="42", role="MANAGER", permissions=["inventory:read"])
    refresh = create_refresh_token(user_id="42")

    assert access is not None
    assert refresh is not None
    assert access != refresh


def test_token_refresh_exchange_endpoint_and_rotation():
    """
    MA-03 Token Refresh & Rotation Test:
    Exchange genuine refresh token for a new short-lived access token and rotated refresh token.
    """
    # 1. Login to obtain genuine refresh token and active DB session
    login_res = client.post("/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert login_res.status_code == 200
    initial_refresh = login_res.json()["refresh_token"]

    # 2. Exchange genuine refresh token
    res = client.post("/auth/refresh", json={"refresh_token": initial_refresh})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # 3. Old refresh token is now rotated and invalid
    res_old = client.post("/auth/refresh", json={"refresh_token": initial_refresh})
    assert res_old.status_code == 401


def test_synthetic_refresh_token_rejected():
    """
    MA-03 Negative Test:
    Synthetic, forged, or unrecorded refresh tokens (including 'ref_' prefixes) must return 401 Unauthorized.
    """
    res_synth = client.post("/auth/refresh", json={"refresh_token": "valid_refresh_token_sample_123"})
    assert res_synth.status_code == 401

    res_ref = client.post("/auth/refresh", json={"refresh_token": "ref_synthetic_manager_token"})
    assert res_ref.status_code == 401


def test_token_refresh_missing_payload_rejected():
    """
    Token Refresh Validation Test:
    Missing refresh token payload returns HTTP 401 Unauthorized.
    """
    res = client.post("/auth/refresh", json={"refresh_token": ""})
    assert res.status_code == 401
    assert "Refresh token required" in res.json()["detail"]
