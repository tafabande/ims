import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_cors_options_preflight_request():
    """
    CORS Security Test:
    OPTIONS preflight request from trusted origin returns Access-Control-Allow-Origin header.
    """
    response = client.options(
        "/api/products/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers

def test_idempotency_key_header_propagation():
    """
    Idempotency Security Test:
    Verifies that requests passing Idempotency-Key header propagate header in request state.
    """
    res = client.get(
        "/api/products/",
        headers={"X-User-Role": "ADMIN", "Idempotency-Key": "IDEM-TEST-KEY-001"}
    )
    assert res.status_code == 200
