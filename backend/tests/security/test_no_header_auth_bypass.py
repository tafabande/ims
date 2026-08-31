import importlib
import os

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.database import SessionLocal
from app.dependencies import get_current_user
from app.main import app
from app.models import IntegrationAccount, User
from app.services import iam_service
from app.services.iam_service import create_access_token


def test_production_get_current_user_strictly_rejects_header_forgery():
    """
    Direct Security Test on dependencies.get_current_user:
    Verify that in production code, get_current_user NEVER authenticates via
    X-User-Role / X-User-Id / X-Network-Context headers and raises HTTP 401.
    """
    db = SessionLocal()
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/uploads/list",
        "headers": [
            (b"x-user-role", b"APP_ADMIN"),
            (b"x-user-id", b"999999"),
            (b"x-network-context", b"LAN"),
        ],
    }
    request = Request(scope)

    # Calling get_current_user without Bearer credentials must raise 401
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(request, credentials=None, db=db)

    assert exc_info.value.status_code == 401
    assert "Authentication required" in exc_info.value.detail
    db.close()


def test_production_get_current_user_validates_real_bearer_token():
    """
    Direct Security Test on dependencies.get_current_user:
    Verify that get_current_user accepts a valid signed Bearer token and
    derives dynamic permissions from the database.
    """
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@ims.local").first()
    assert user is not None

    token = create_access_token(
        user_id=str(user.id),
        role=user.role,
        permissions=iam_service.ROLE_PERMISSIONS.get(user.role, []),
    )

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/uploads/list",
        "headers": [(b"authorization", f"Bearer {token}".encode())],
    }
    request = Request(scope)

    ctx = get_current_user(request, credentials=credentials, db=db)
    assert ctx.id == user.id
    assert ctx.email == user.email
    assert ctx.role == user.role
    assert len(ctx.permissions) > 0
    db.close()


def test_revoked_session_id_in_jwt_is_rejected():
    """
    Session Security & Revocation Test:
    Verify that if a session ID embedded in a JWT access token is marked is_active=False
    in the database, protected endpoints reject requests with HTTP 401.
    """
    client = TestClient(app)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "adminpassword"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sessions_res = client.get("/api/auth/sessions", headers=headers)
    assert sessions_res.status_code == 200
    session_id = sessions_res.json()[0]["session_id"]

    revoke_res = client.post(f"/api/auth/revoke-session/{session_id}", headers=headers)
    assert revoke_res.status_code == 200

    protected_res = client.get("/api/auth/sessions", headers=headers)
    assert protected_res.status_code == 401
    assert "revoked or expired" in protected_res.json()["detail"].lower()


def test_seed_db_fails_closed_in_production_environment(monkeypatch):
    """
    Production Security Lifecycle Test:
    Verify that seed.py strictly refuses execution when ENVIRONMENT=production.
    """
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(RuntimeError) as exc_info:
        import seed

        importlib.reload(seed)

    assert "strictly prohibited in production" in str(exc_info.value)


def test_integration_scope_json_decoding_and_eval_injection_defense():
    """
    Data Safety Test:
    Verify that malicious code or non-JSON payloads in scopes_json are safely
    handled without executing Python eval().
    """
    db = SessionLocal()
    # Create an integration account with an attempted code-injection payload
    malicious_account = IntegrationAccount(
        account_id="INT-TEST-PAYLOAD-001",
        name="Malicious Ingestion Probe",
        scopes_json="__import__('os').system('echo malicious')",
        status="ACTIVE",
    )
    db.add(malicious_account)
    db.commit()
    acc_id = malicious_account.id

    client = TestClient(app)
    admin_user = db.query(User).filter(User.role == "ADMIN").first()
    token = create_access_token(
        user_id=str(admin_user.id),
        role="ADMIN",
        permissions=iam_service.ROLE_PERMISSIONS.get("ADMIN", []),
    )

    res = client.get("/api/v1/integrations/accounts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    item = next((a for a in data if a["id"] == acc_id), None)
    assert item is not None
    # Malicious string failed JSON decoding safely and defaulted to empty list []
    assert item["scopes"] == []

    # Clean up
    db.delete(malicious_account)
    db.commit()
    db.close()


def test_alembic_migrations_directory_structure_exists():
    """
    Database Lifecycle & Migration Test:
    Verify that alembic.ini and versioned alembic migration files exist in backend root.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    assert os.path.exists(os.path.join(base_dir, "alembic.ini")) or os.path.exists("alembic.ini")
    assert os.path.exists(os.path.join(base_dir, "alembic", "env.py")) or os.path.exists("alembic/env.py")
    assert os.path.exists(os.path.join(base_dir, "alembic", "versions", "001_initial_schema.py")) or os.path.exists("alembic/versions/001_initial_schema.py")

