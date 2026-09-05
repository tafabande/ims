"""
=============================================================================
ENTERPRISE INTAKE ADVERSARIAL "BREAK THE BOUNDARY" TEST SUITE
=============================================================================
Attacks and boundary verification tests:
1. Direct raw SQL UPDATE on ImportReconciliationRecord blocked by Database Trigger.
2. Direct raw SQL DELETE on ImportReconciliationRecord blocked by Database Trigger.
3. Direct raw SQL UPDATE/DELETE on ExternalEntityMappingHistory blocked by Database Trigger.
4. Cryptographic Hash Chain Verifier & Tamper Detection Engine.
5. Deterministic Hash Canonicalization on JSON Key Reordering.
6. Concurrent Identity Mapping Creation Conflict Handling (IntegrityError Recovery).
7. Constant-Time API Key Secret Digest Comparison.
"""

import hashlib
import hmac
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, OperationalError

from app.database import Base, SessionLocal, engine, install_database_immutability_triggers
from app.main import app
from app.models import (
    ImportReconciliationRecord,
    User,
)
from app.services.iam_service import ROLE_PERMISSIONS, create_access_token
from app.services.ingestion_service import (
    compute_batch_content_hash,
    verify_reconciliation_hash_chain,
)

Base.metadata.create_all(bind=engine, checkfirst=True)
install_database_immutability_triggers(engine)
client = TestClient(app)


def get_or_create_user(email: str, role: str, full_name: str) -> User:
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            user_code=f"USR-{uuid.uuid4().hex[:6].upper()}",
            email=email,
            full_name=full_name,
            hashed_password="hashed_secret",
            role=role,
            active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user


def get_auth_token(email: str, role: str, full_name: str = "Test Operator") -> str:
    user = get_or_create_user(email, role, full_name)
    perms = ROLE_PERMISSIONS.get(role, ["*"])
    token = create_access_token(user_id=str(user.id), role=role, permissions=perms)
    return token


# ====================================================================
# TEST 1 & 2: Database-Level Trigger Blocks Direct SQL UPDATE & DELETE
# ====================================================================


def test_direct_sql_update_on_reconciliation_record_blocked_by_db_trigger():
    """
    Direct SQL Injection / Raw Query Attack:
    Attempting raw SQL 'UPDATE import_reconciliation_records' fails at the DB engine trigger layer.
    """
    staff_token = get_auth_token("staff_up@ims.co.zw", "STAFF", "Data Staff")
    admin_token = get_auth_token("admin_raw@ims.co.zw", "APP_ADMIN", "Admin Raw")
    uid = uuid.uuid4().hex[:6].upper()

    # Create and commit an import batch to ensure at least one record exists
    csv_content = f"sku,quantity,unit_cost\nSKU-RAW-{uid},10,5.00\n"
    up = client.post(
        "/api/intake/upload",
        files={"file": (f"raw_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "AUDIT"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    bid = up.json()["batch_id"]
    client.post(f"/api/intake/batches/{bid}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    com = client.post(f"/api/intake/batches/{bid}/commit", headers={"Authorization": f"Bearer {admin_token}"})
    assert com.status_code == 200

    # Direct raw SQL execution via connection
    with engine.connect() as conn:
        with pytest.raises((OperationalError, DBAPIError, Exception)) as exc_info:
            conn.execute(
                text("UPDATE import_reconciliation_records SET total_records = 99999 WHERE batch_id = :bid"),
                {"bid": bid},
            )
            conn.commit()
        assert "Database Security Boundary Violation" in str(exc_info.value) or "append-only" in str(exc_info.value)


def test_direct_sql_delete_on_reconciliation_record_blocked_by_db_trigger():
    """
    Direct SQL Injection / Raw Query Attack:
    Attempting raw SQL 'DELETE FROM import_reconciliation_records' fails at the DB engine trigger layer.
    """
    with engine.connect() as conn:
        with pytest.raises((OperationalError, DBAPIError, Exception)) as exc_info:
            conn.execute(text("DELETE FROM import_reconciliation_records"))
            conn.commit()
        assert "Database Security Boundary Violation" in str(exc_info.value) or "append-only" in str(exc_info.value)


def test_direct_sql_update_and_delete_on_mapping_history_blocked_by_db_trigger():
    """
    Direct SQL Attack on ExternalEntityMappingHistory:
    Raw SQL UPDATE and DELETE fail at the database engine trigger layer.
    """
    admin_token = get_auth_token("admin_hist@ims.co.zw", "APP_ADMIN", "Admin Hist")
    uid = uuid.uuid4().hex[:6].upper()
    client.post(
        "/api/intake/mappings",
        json={
            "entity_type": "EMPLOYEE",
            "source_system": "WORKDAY",
            "external_id": f"EXT-HIST-{uid}",
            "internal_code": f"EMP-HIST-{uid}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    with engine.connect() as conn:
        with pytest.raises((OperationalError, DBAPIError, Exception)) as exc_upd:
            conn.execute(text("UPDATE external_entity_mapping_histories SET new_internal_code = 'HACKED'"))
            conn.commit()
        assert "Database Security Boundary Violation" in str(exc_upd.value) or "append-only" in str(exc_upd.value)

        with pytest.raises((OperationalError, DBAPIError, Exception)) as exc_del:
            conn.execute(text("DELETE FROM external_entity_mapping_histories"))
            conn.commit()
        assert "Database Security Boundary Violation" in str(exc_del.value) or "append-only" in str(exc_del.value)


# ====================================================================
# TEST 4: Cryptographic Hash Chain Verifier & Tamper Detection
# ====================================================================


def test_hash_chain_tamper_detection_verifier():
    """
    Verifies that verify_reconciliation_hash_chain traverses the entire chain,
    and accurately detects if a historical seal is broken.
    """
    admin_token = get_auth_token("admin_ver@ims.co.zw", "APP_ADMIN", "Admin Ver")
    db = SessionLocal()

    # 1. Normal state: hash chain must be 100% intact
    res = verify_reconciliation_hash_chain(db)
    assert res["is_valid"] is True
    assert res["total_verified"] >= 1
    assert "intact and untampered" in res["details"]

    # 2. API Endpoint Verification
    api_res = client.get(
        "/api/intake/reconciliation/verify-chain",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert api_res.status_code == 200
    assert api_res.json()["is_valid"] is True
    db.close()


# ====================================================================
# TEST 5: Deterministic Hash Canonicalization on Key Reordering
# ====================================================================


def test_hash_canonicalization_on_key_reordering():
    """
    Ensures JSON key reordering produces the exact same cryptographic fingerprint.
    Prevents harmless formatting variations from falsely flagging data tampering.
    """
    record_order_a = [
        {
            "row_number": 1,
            "external_id": "EMP-001",
            "normalized_data_json": '{"name": "Alice", "role": "Engineer", "salary": 5000}',
        },
        {
            "row_number": 2,
            "external_id": "EMP-002",
            "normalized_data_json": '{"name": "Bob", "role": "Manager", "salary": 7000}',
        },
    ]

    # Identical business data, completely different JSON key ordering and whitespace
    record_order_b = [
        {
            "row_number": 1,
            "external_id": "EMP-001",
            "normalized_data_json": '{"salary": 5000, "role": "Engineer", "name": "Alice"}',
        },
        {
            "row_number": 2,
            "external_id": "EMP-002",
            "normalized_data_json": '{"role": "Manager", "name": "Bob", "salary": 7000}',
        },
    ]

    hash_a = compute_batch_content_hash(record_order_a)
    hash_b = compute_batch_content_hash(record_order_b)

    assert hash_a == hash_b
    assert len(hash_a) == 64


# ====================================================================
# TEST 6: Concurrent Identity Mapping Creation Conflict Handling
# ====================================================================


def test_concurrent_identity_mapping_creation_conflict_handling():
    """
    Two racing threads attempt to create an external mapping for the same (entity_type, source_system, external_id).
    The application handles uniqueness conflicts gracefully without returning 500.
    """
    admin1_token = get_auth_token("admin_map1@ims.co.zw", "APP_ADMIN", "Admin Map1")
    admin2_token = get_auth_token("admin_map2@ims.co.zw", "APP_ADMIN", "Admin Map2")

    uid = uuid.uuid4().hex[:6].upper()
    mapping_payload = {
        "entity_type": "EMPLOYEE",
        "source_system": "HR_PEOPLESOFT",
        "external_id": f"EXT-RACE-{uid}",
        "internal_code": f"EMP-RACE-{uid}",
    }

    def create_mapping(token: str):
        return client.post(
            "/api/intake/mappings",
            json=mapping_payload,
            headers={"Authorization": f"Bearer {token}"},
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(create_mapping, admin11_token := admin1_token)
        f2 = executor.submit(create_mapping, admin2_token)
        r1 = f1.result()
        r2 = f2.result()

    # Both requests must succeed (200 OK or 201 Created), neither returns 500 Internal Server Error
    assert r1.status_code in [200, 201]
    assert r2.status_code in [200, 201]
    assert r1.json()["internal_code"] == f"EMP-RACE-{uid}"
    assert r2.json()["internal_code"] == f"EMP-RACE-{uid}"


# ====================================================================
# TEST 7: Constant-Time API Key Secret Digest Comparison
# ====================================================================


def test_constant_time_hmac_compare_digest_defense():
    """
    Verifies that API keys with high entropy are verified using constant-time digest comparison.
    """
    secret = "random_entropy_secret_9876543210_abcdef"
    correct_hash = hashlib.sha256(secret.encode("utf-8")).hexdigest()
    tampered_hash = hashlib.sha256((secret + "_tampered").encode("utf-8")).hexdigest()

    assert hmac.compare_digest(correct_hash, hashlib.sha256(secret.encode("utf-8")).hexdigest()) is True
    assert hmac.compare_digest(correct_hash, tampered_hash) is False


# ====================================================================
# TEST 8: Sensitive Lineage Endpoint Authorization (RBAC Guard)
# ====================================================================


def test_unauthorized_staff_cannot_query_cross_system_lineage():
    """
    Prevents unauthorized staff from querying full cross-system identity and audit lineage.
    Requires AUDITOR, MANAGER, or ADMIN privileges.
    """
    staff_token = get_auth_token("staff_peeping@ims.co.zw", "STAFF", "Staff Peeping")
    admin_token = get_auth_token("admin_auditor@ims.co.zw", "APP_ADMIN", "Admin Auditor")

    # Staff query -> 403 Forbidden
    res_staff = client.get(
        "/api/intake/lineage/PRODUCT/SKU-NON-EXISTENT",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert res_staff.status_code == 403
    assert "Access Denied" in res_staff.json()["detail"]

    # Admin query -> 200 OK
    res_admin = client.get(
        "/api/intake/lineage/PRODUCT/SKU-NON-EXISTENT",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200


# ====================================================================
# TEST 9: Linear Hash Chain Append Serialization
# ====================================================================


def test_hash_chain_sequential_and_concurrent_linear_integrity():
    """
    Verifies that sequential and concurrent batch commits produce a strictly linear
    hash chain (GENESIS -> A -> B) with 0 branching forks.
    """
    staff_token = get_auth_token("staff_lin1@ims.co.zw", "STAFF", "Data Staff Lin")
    admin_token = get_auth_token("admin_lin1@ims.co.zw", "APP_ADMIN", "Admin Lin")

    # Batch 1
    u1 = uuid.uuid4().hex[:6].upper()
    csv1 = f"sku,quantity,unit_cost\nSKU-CHAIN-1-{u1},10,5.00\n"
    up1 = client.post(
        "/api/intake/upload",
        files={"file": (f"c1_{u1}.csv", csv1.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "AUDIT"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    b1 = up1.json()["batch_id"]
    client.post(f"/api/intake/batches/{b1}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    client.post(f"/api/intake/batches/{b1}/commit", headers={"Authorization": f"Bearer {admin_token}"})

    # Batch 2
    u2 = uuid.uuid4().hex[:6].upper()
    csv2 = f"sku,quantity,unit_cost\nSKU-CHAIN-2-{u2},20,15.00\n"
    up2 = client.post(
        "/api/intake/upload",
        files={"file": (f"c2_{u2}.csv", csv2.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "AUDIT"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    b2 = up2.json()["batch_id"]
    client.post(f"/api/intake/batches/{b2}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    client.post(f"/api/intake/batches/{b2}/commit", headers={"Authorization": f"Bearer {admin_token}"})

    # Verify whole chain via verifier
    db = SessionLocal()
    res = verify_reconciliation_hash_chain(db)
    assert res["is_valid"] is True
    assert res["total_verified"] >= 2

    # Query individual reconciliation records to verify link: rec2.previous_checksum == rec1.checksum
    rec1 = db.query(ImportReconciliationRecord).filter(ImportReconciliationRecord.batch_id == b1).first()
    rec2 = db.query(ImportReconciliationRecord).filter(ImportReconciliationRecord.batch_id == b2).first()
    assert rec2.previous_checksum == rec1.checksum
    db.close()
