import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.logger import sanitize_data

client = TestClient(app)

def test_request_correlation_id_generated_header():
    """
    Test that every API request automatically receives a unique X-Request-ID header in response.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
    assert response.headers["x-request-id"].startswith("req-")

def test_request_correlation_id_custom_header_preserved():
    """
    Test that client-supplied X-Request-ID is preserved and propagated back in response header.
    """
    custom_id = "req-custom-trace-9901"
    response = client.get("/", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["x-request-id"] == custom_id

def test_sensitive_credential_redaction_sanitizer():
    """
    Test that sensitive fields (password, token, secret, hashed_password) are redacted from logs.
    """
    payload = {
        "user_id": "USR-000042",
        "password": "supersecretpassword123!",
        "hashed_password": "$2b$12$hashvalue",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "action": "LOGIN_SUCCESS"
    }

    cleaned = sanitize_data(payload)
    assert cleaned["user_id"] == "USR-000042"
    assert cleaned["password"] == "[REDACTED]"
    assert cleaned["hashed_password"] == "[REDACTED]"
    assert cleaned["access_token"] == "[REDACTED]"
    assert cleaned["action"] == "LOGIN_SUCCESS"
