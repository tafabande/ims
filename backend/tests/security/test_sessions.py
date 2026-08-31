from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_creates_active_session():
    """
    Session Security Test:
    Valid login credentials issue Access + Refresh tokens and create an active session record.
    """
    response = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "ADMIN"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify session recorded in /api/auth/sessions with authenticated header
    sessions_res = client.get("/api/auth/sessions", headers=headers)
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) > 0
    assert any(s["user_id"] == int(data["user_id"]) for s in sessions)


def test_revoke_session_invalidates_session():
    """
    Session Revocation Test:
    Revoking session ID sets active=False.
    """
    # Authenticate as admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert login_res.status_code == 200
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    sessions = client.get("/api/auth/sessions", headers=headers).json()
    target_id = sessions[0]["session_id"]

    revoke_res = client.post(f"/api/auth/revoke-session/{target_id}", headers=headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"

    # Re-authenticate to obtain a new active session token and verify target_id active is False
    login_res2 = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    headers2 = {"Authorization": f"Bearer {login_res2.json()['access_token']}"}
    updated_sessions = client.get("/api/auth/sessions", headers=headers2).json()
    revoked = next(s for s in updated_sessions if s["session_id"] == target_id)
    assert revoked["active"] is False


def test_unauthenticated_session_access_rejected():
    """
    MA-05 Security Test:
    Unauthenticated requests to /api/auth/sessions and /api/auth/revoke-session must return HTTP 401 Unauthorized.
    """
    res_list = client.get("/api/auth/sessions")
    assert res_list.status_code == 401

    res_revoke = client.post("/api/auth/revoke-session/any-session-id")
    assert res_revoke.status_code == 401


def test_non_admin_cannot_revoke_other_user_session():
    """
    MA-05 Security Test:
    A regular user cannot revoke a session owned by another user.
    """
    # 1. Admin logs in and creates a session
    admin_res = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    admin_token = admin_res.json()["access_token"]
    admin_sessions = client.get("/api/auth/sessions", headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_session_id = admin_sessions[0]["session_id"]

    # 2. Staff logs in
    staff_res = client.post("/api/auth/login", json={"username": "staff", "password": "staffpassword"})
    staff_token = staff_res.json()["access_token"]

    # 3. Staff attempts to revoke Admin's session -> Rejected 404 (or 403)
    revoke_res = client.post(
        f"/api/auth/revoke-session/{admin_session_id}",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert revoke_res.status_code == 404


def test_invalid_login_credentials_rejected():
    """
    MA-02 Authentication Failure Test:
    Invalid password or password aliases for non-matching accounts return HTTP 401 Unauthorized.
    """
    # Wrong password for existing user
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong_password"})
    assert response.status_code == 401
    assert "Authentication Failed" in response.json()["detail"]

    # Role-like non-existent user rejected without auto-provisioning
    response_fake = client.post("/api/auth/login", json={"username": "unseeded_admin", "password": "admin123"})
    assert response_fake.status_code == 401

    # Inactive/Deactivated account cannot log in
    response_deact = client.post("/api/auth/login", json={"username": "deactivated_user", "password": "password123"})
    assert response_deact.status_code == 401
