from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_creates_active_session():
    """
    Session Security Test:
    Valid login credentials issue Access + Refresh tokens and create an active session record.
    """
    response = client.post("/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "ADMIN"

    # Verify session recorded in /auth/sessions
    sessions_res = client.get("/auth/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) > 0
    assert any(s["user_id"] == int(data["user_id"]) for s in sessions)


def test_revoke_session_invalidates_session():
    """
    Session Revocation Test:
    Revoking session ID sets active=False.
    """
    # Get active session
    sessions = client.get("/auth/sessions").json()
    target_id = sessions[0]["session_id"]

    revoke_res = client.post(f"/auth/revoke-session/{target_id}")
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"

    # Verify active=False
    updated_sessions = client.get("/auth/sessions").json()
    revoked = next(s for s in updated_sessions if s["session_id"] == target_id)
    assert revoked["active"] is False


def test_invalid_login_credentials_rejected():
    """
    Authentication Failure Test:
    Invalid password returns HTTP 401 Unauthorized.
    """
    response = client.post("/auth/login", json={"username": "admin", "password": "wrong_password"})
    assert response.status_code == 401
    assert "Authentication Failed" in response.json()["detail"]
