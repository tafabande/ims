import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.logger import sanitize_data
from app.database import engine, Base

client = TestClient(app)

def test_idor_unauthorized_user_deletion_rejected():
    """
    IDOR & RBAC Security Test:
    Staff member attempting to delete a user account must receive HTTP 403 Forbidden.
    """
    response = client.delete(
        "/api/users/9999",
        headers={"X-User-Role": "STAFF"}
    )
    assert response.status_code == 403
    assert "Authorization Failed" in response.json()["detail"]

def test_nested_credential_log_sanitization():
    """
    REQ-06 Security Test:
    Verifies that sanitize_data recursively redacts deeply nested sensitive keys.
    """
    payload = {
        "event": "USER_LOGIN",
        "actor": "USR-0042",
        "nested_meta": {
            "session": {
                "access_token": "secret_jwt_token_12345",
                "refresh_token": "secret_refresh_token_67890",
                "cookie": "session_id_abc"
            },
            "credentials": {
                "password": "SuperSecretPassword123!",
                "api_key": "api_key_live_9999"
            }
        }
    }

    sanitized = sanitize_data(payload)
    assert sanitized["nested_meta"]["session"]["access_token"] == "[REDACTED]"
    assert sanitized["nested_meta"]["session"]["refresh_token"] == "[REDACTED]"
    assert sanitized["nested_meta"]["session"]["cookie"] == "[REDACTED]"
    assert sanitized["nested_meta"]["credentials"]["password"] == "[REDACTED]"
    assert sanitized["nested_meta"]["credentials"]["api_key"] == "[REDACTED]"
