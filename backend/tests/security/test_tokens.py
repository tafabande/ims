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


def test_token_refresh_exchange_endpoint():
    """
    Token Refresh Endpoint Test:
    Exchange valid refresh token for a new short-lived access token.
    """
    res = client.post("/auth/refresh", json={"refresh_token": "valid_refresh_token_sample_123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_token_refresh_missing_payload_rejected():
    """
    Token Refresh Validation Test:
    Missing refresh token payload returns HTTP 401 Unauthorized.
    """
    res = client.post("/auth/refresh", json={"refresh_token": ""})
    assert res.status_code == 401
    assert "Refresh token required" in res.json()["detail"]
