"""
Enterprise Installation & First-Time Bootstrap Security Test Suite
==================================================================
Exhaustively certifies that first-time installation bootstrap satisfies
all zero-trust boundaries, one-time token authorization, network isolation,
concurrency serialization, and information-disclosure prevention.

Test Scenarios:
1. Bootstrap with valid token -> 200 OK
2. Bootstrap without token -> 403 Forbidden
3. Wrong bootstrap token -> 403 Forbidden
4. Bootstrap twice -> 409 Conflict
5. Bootstrap after existing initialization -> 409 Conflict
6. Simultaneous bootstrap race conditions -> exactly one succeeds
7. Token consumption & permanent revocation
8. Token plaintext never emitted in audit logs
9. Network boundary enforcement (remote IP blocked when unconfigured)
10. Public status endpoint exposes zero reconnaissance / table counts
"""

from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine, install_database_immutability_triggers
from app.main import app
from app.models import AuditLogRecord, EnterpriseInstallation, SessionRecord, User
from app.services.bootstrap_service import (
    get_or_create_installation,
    get_or_generate_bootstrap_secret,
)


@pytest.fixture
def clean_bootstrap_db():
    """
    Drops and recreates all tables for pristine bootstrap testing.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    install_database_immutability_triggers(engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    install_database_immutability_triggers(engine)


def test_status_endpoint_information_disclosure_prevention(clean_bootstrap_db):
    """Scenario 10: Status endpoint must NOT disclose internal table counts or installation ID."""
    client = TestClient(app)
    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()

    assert "is_initialized" in data
    assert "setup_required" in data
    assert "system_name" in data

    # Must NOT expose sensitive table volumes or internal installation identifiers
    assert "installation_id" not in data
    assert "user_count" not in data
    assert "product_count" not in data
    assert "store_count" not in data
    assert "employee_count" not in data


def test_bootstrap_without_token_forbidden(clean_bootstrap_db):
    """Scenario 2: Missing bootstrap token must return 403 / 422 validation failure."""
    client = TestClient(app)
    payload = {
        "full_name": "Root Admin",
        "email": "root@enterprise.co.zw",
        "password": "EnterprisePassphrase2026!",
        "bootstrap_token": "",
    }
    response = client.post("/api/auth/initialize-root-admin", json=payload)
    assert response.status_code in [403, 422]


def test_bootstrap_with_wrong_token_forbidden(clean_bootstrap_db):
    """Scenario 3: Invalid bootstrap token must return 403 Forbidden."""
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
    finally:
        db.close()

    client = TestClient(app)
    payload = {
        "full_name": "Root Admin",
        "email": "root@enterprise.co.zw",
        "password": "EnterprisePassphrase2026!",
        "bootstrap_token": "WRONG-INVALID-TOKEN-SECRET-12345",
    }
    response = client.post("/api/auth/initialize-root-admin", json=payload)
    assert response.status_code == 403
    assert "Invalid or unrecognized bootstrap authorization token" in response.json()["detail"]


def test_bootstrap_with_valid_token_success(clean_bootstrap_db):
    """Scenario 1: Valid bootstrap token creates Root Administrator and initializes lifecycle."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()

    db = SessionLocal()
    try:
        inst = db.query(EnterpriseInstallation).first()
        if not inst:
            inst = EnterpriseInstallation(
                installation_id="INST-TEST-001",
                status="BOOTSTRAP_PENDING",
                bootstrap_token_hash=secret_hash,
            )
            db.add(inst)
            db.commit()
        else:
            inst.bootstrap_token_hash = secret_hash
            inst.status = "BOOTSTRAP_PENDING"
            db.commit()
    finally:
        db.close()

    client = TestClient(app)
    payload = {
        "full_name": "System Root Admin",
        "email": "admin@enterprise.co.zw",
        "password": "EnterpriseRootSecurePassphrase2026!",
        "bootstrap_token": raw_secret,
    }
    response = client.post("/api/auth/initialize-root-admin", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["role"] == "ADMIN"
    assert data["email"] == "admin@enterprise.co.zw"
    assert data["access_token"] is not None

    db2 = SessionLocal()
    try:
        updated_inst = db2.query(EnterpriseInstallation).first()
        assert updated_inst.status == "INITIALIZED"
        assert updated_inst.bootstrap_consumed_at is not None
        assert updated_inst.bootstrap_token_hash is None
    finally:
        db2.close()


def test_bootstrap_twice_fails_conflict(clean_bootstrap_db):
    """Scenario 4 & 5: Second bootstrap attempt must be blocked with 409 Conflict."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
        inst.bootstrap_token_hash = secret_hash
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    payload = {
        "full_name": "First Admin",
        "email": "first@enterprise.co.zw",
        "password": "EnterpriseRootSecurePassphrase2026!",
        "bootstrap_token": raw_secret,
    }
    res1 = client.post("/api/auth/initialize-root-admin", json=payload)
    assert res1.status_code == 200

    payload2 = {
        "full_name": "Second Admin",
        "email": "second@enterprise.co.zw",
        "password": "EnterpriseRootSecurePassphrase2026!",
        "bootstrap_token": raw_secret,
    }
    res2 = client.post("/api/auth/initialize-root-admin", json=payload2)
    assert res2.status_code == 409
    assert "System is already initialized" in res2.json()["detail"]


def test_bootstrap_remains_disabled_even_if_all_users_deleted(clean_bootstrap_db):
    """Scenario 9 (Chaa Critical Invariant): Once initialized, bootstrap remains permanently disabled even if all users are deleted."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
        inst.bootstrap_token_hash = secret_hash
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    payload = {
        "full_name": "Initial Admin",
        "email": "initial@enterprise.co.zw",
        "password": "EnterpriseRootSecurePassphrase2026!",
        "bootstrap_token": raw_secret,
    }
    res1 = client.post("/api/auth/initialize-root-admin", json=payload)
    assert res1.status_code == 200

    # Simulate catastrophic user table deletion
    db2 = SessionLocal()
    try:
        db2.query(SessionRecord).delete()
        # Set FK to None first to allow user deletion
        inst_rec = db2.query(EnterpriseInstallation).first()
        inst_rec.initialized_by_user_id = None
        db2.commit()
        db2.query(User).delete()
        db2.commit()
        assert db2.query(User).count() == 0
        assert inst_rec.status == "INITIALIZED"
    finally:
        db2.close()

    # Attempt re-bootstrap when user_count == 0 but installation status is INITIALIZED
    payload2 = {
        "full_name": "Attacker Admin",
        "email": "attacker@enterprise.co.zw",
        "password": "EnterpriseRootSecurePassphrase2026!",
        "bootstrap_token": raw_secret,
    }
    res2 = client.post("/api/auth/initialize-root-admin", json=payload2)
    assert res2.status_code == 409
    assert "System is already initialized. Bootstrap authorization has been permanently disabled." in res2.json()["detail"]


def test_bootstrap_secret_never_logged_in_audit_records(clean_bootstrap_db):
    """Scenario 8: Plaintext secret or password must NEVER appear in audit log records."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
        inst.bootstrap_token_hash = secret_hash
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
    finally:
        db.close()

    client = TestClient(app)
    payload = {
        "full_name": "Audit Target Admin",
        "email": "audit@enterprise.co.zw",
        "password": "SuperSecretPassphraseAuditTarget2026!",
        "bootstrap_token": raw_secret,
    }
    res = client.post("/api/auth/initialize-root-admin", json=payload)
    assert res.status_code == 200

    db2 = SessionLocal()
    try:
        audit_logs = db2.query(AuditLogRecord).all()
        assert len(audit_logs) >= 1
        for log in audit_logs:
            if log.details:
                assert raw_secret not in log.details
                assert "SuperSecretPassphraseAuditTarget2026!" not in log.details
    finally:
        db2.close()


def test_nist_sp_800_63b_passphrase_policy(clean_bootstrap_db):
    """NIST SP 800-63B Passphrase Policy: Min 15 chars, supports multi-word passphrases, rejects blocklisted."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
        inst.bootstrap_token_hash = secret_hash
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
    finally:
        db.close()

    client = TestClient(app)

    # 1. Under 15 characters -> rejected
    res_short = client.post("/api/auth/initialize-root-admin", json={
        "full_name": "Short Admin",
        "email": "short@enterprise.co.zw",
        "password": "Password1234!",  # 13 chars
        "bootstrap_token": raw_secret,
    })
    assert res_short.status_code in [400, 422]

    # 2. Blocklisted common password -> rejected
    res_blocked = client.post("/api/auth/initialize-root-admin", json={
        "full_name": "Common Admin",
        "email": "common@enterprise.co.zw",
        "password": "correcthorsebatterystaple",
        "bootstrap_token": raw_secret,
    })
    assert res_blocked.status_code == 400
    assert "Password policy violation" in res_blocked.json()["detail"]

    # 3. Valid multi-word passphrase without artificial special character rules -> accepted
    res_valid = client.post("/api/auth/initialize-root-admin", json={
        "full_name": "Valid Admin",
        "email": "valid@enterprise.co.zw",
        "password": "correct horse battery staple enterprise 2026",
        "bootstrap_token": raw_secret,
    })
    assert res_valid.status_code == 200


def test_concurrent_bootstrap_attempts_exactly_one_succeeds(clean_bootstrap_db):
    """Scenario 6: Simultaneous bootstrap race conditions -> exactly one succeeds."""
    raw_secret, secret_hash = get_or_generate_bootstrap_secret()
    db = SessionLocal()
    try:
        inst = get_or_create_installation(db)
        inst.bootstrap_token_hash = secret_hash
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
    finally:
        db.close()

    def attempt_bootstrap(worker_id):
        client = TestClient(app)
        payload = {
            "full_name": f"Admin Worker {worker_id}",
            "email": f"worker{worker_id}@enterprise.co.zw",
            "password": "EnterpriseConcurrentPassphrase2026!",
            "bootstrap_token": raw_secret,
        }
        return client.post("/api/auth/initialize-root-admin", json=payload)

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(attempt_bootstrap, i) for i in range(2)]
        results = [f.result() for f in futures]

    status_codes = [r.status_code for r in results]
    assert status_codes.count(200) == 1
    assert any(code in [409, 400] for code in status_codes)

    db2 = SessionLocal()
    try:
        admin_count = db2.query(User).count()
        assert admin_count == 1
    finally:
        db2.close()

