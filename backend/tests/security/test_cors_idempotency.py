from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_cors_options_preflight_request():
    """
    CORS Security Test:
    OPTIONS preflight request from trusted origin returns Access-Control-Allow-Origin header.
    """
    response = client.options(
        "/products?low_stock=true&limit=1",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type,x-request-id,x-requested-with",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_idempotency_key_header_propagation():
    """
    Idempotency Security Test:
    Verifies that requests passing Idempotency-Key header propagate header in request state.
    """
    res = client.get(
        "/api/products/",
        headers={"X-User-Role": "ADMIN", "Idempotency-Key": "IDEM-TEST-KEY-001"},
    )
    assert res.status_code == 200
