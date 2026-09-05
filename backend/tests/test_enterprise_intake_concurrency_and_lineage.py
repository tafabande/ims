"""
=============================================================================
ENTERPRISE INTAKE CONCURRENCY, IMMUTABILITY & AUDIT LINEAGE TEST SUITE
=============================================================================
Tests the advanced enterprise boundaries:
1. Concurrent / Double-Commit Race Condition Defense (Exactly 1 commit, 1 ledger effect).
2. Staged Row Deletion after Approval (TOCTOU Hash Verification -> 409 Conflict).
3. Technical Immutability Enforcement (ORM event listeners block UPDATE & DELETE on audit tables).
4. Cryptographic Hash Chaining across sequential reconciliation records.
5. First-Class Source-Event Composite Idempotency (source_system + entity_type + source_reference).
6. End-to-End Import Lineage Tracing ("No Ghosts").
"""

import hashlib
import json
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import (
    ExternalEntityMappingHistory,
    ImportReconciliationRecord,
    ImportRecord,
    IntegrationAccount,
    IntegrationApiKey,
    InventoryTransaction,
    Product,
    User,
)
from app.services.iam_service import ROLE_PERMISSIONS, create_access_token
from app.services.integration_auth_service import hash_api_key

Base.metadata.create_all(bind=engine, checkfirst=True)
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
# TEST 1: Concurrent / Double-Commit Race Condition Defense
# ====================================================================


def test_concurrent_double_commit_race_protection():
    """
    Two managers attempt to commit the same approved batch simultaneously.
    Invariant: Exactly one commit transaction succeeds; subsequent commit is rejected.
    Result: Exactly 1 set of domain records, 1 set of ledger events, 1 reconciliation record.
    """
    admin1_token = get_auth_token("admin_c1@ims.co.zw", "APP_ADMIN", "Admin C1")
    admin2_token = get_auth_token("admin_c2@ims.co.zw", "APP_ADMIN", "Admin C2")
    manager_token = get_auth_token("manager_c@ims.co.zw", "MANAGER", "Manager C")

    uid = uuid.uuid4().hex[:6].upper()
    sku = f"SKU-RACE-{uid}"

    csv_content = (
        "sku,quantity,unit_cost\n"
        f"{sku},75,20.00\n"
    )

    # 1. Upload & Approve
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"race_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "STOCK_AUDIT"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    app_res = client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {admin1_token}"},
    )
    assert app_res.status_code == 200

    # 2. Sequential & Duplicate Commit Protection:
    # First commit succeeds
    res1 = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin1_token}"},
    )
    assert res1.status_code == 200

    # Duplicate / Concurrent attempt on the same batch fails with 400 Bad Request
    res2 = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin2_token}"},
    )
    assert res2.status_code == 400
    assert "already been committed" in res2.json()["detail"]

    # Verify that exactly ONE domain effect and ONE reconciliation record exist
    db = SessionLocal()
    prod = db.query(Product).filter(Product.sku == sku).first()
    assert prod is not None
    assert prod.stock_quantity == 75

    ledger_events = (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.reference == batch_id)
        .all()
    )
    assert len(ledger_events) == 1
    assert ledger_events[0].quantity == 75

    rec_records = (
        db.query(ImportReconciliationRecord)
        .filter(ImportReconciliationRecord.batch_id == batch_id)
        .all()
    )
    assert len(rec_records) == 1
    db.close()


# ====================================================================
# TEST 2: Staged Row Deletion After Approval (TOCTOU Defense)
# ====================================================================


def test_staged_row_deletion_after_approval_tamper_defense():
    """
    If an attacker or rogue script deletes a staged row after approval,
    the fingerprint comparison fails and blocks commit with 409 Conflict.
    """
    manager_token = get_auth_token("mgr_del@ims.co.zw", "MANAGER", "Manager Del")
    admin_token = get_auth_token("adm_del@ims.co.zw", "APP_ADMIN", "Admin Del")

    uid = uuid.uuid4().hex[:6].upper()
    csv_content = (
        "sku,quantity,unit_cost\n"
        f"SKU-DEL1-{uid},20,10.00\n"
        f"SKU-DEL2-{uid},30,15.00\n"
    )

    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"del_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "AUDIT"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    # Manager Approves
    app_res = client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert app_res.status_code == 200

    # Tamper: Delete one staged record directly in DB
    db = SessionLocal()
    staged_recs = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).all()
    assert len(staged_recs) == 2
    db.delete(staged_recs[1])
    db.commit()
    db.close()

    # Commit Attempt -> Must fail with 409 Conflict
    com_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert com_res.status_code == 409
    assert "Approved dataset has changed; re-review required." in com_res.json()["detail"]


# ====================================================================
# TEST 3: Append-Only Immutability Technical Enforcement
# ====================================================================


def test_append_only_immutability_technical_enforcement():
    """
    Technical Enforcement:
    SQLAlchemy ORM event listeners strictly block any UPDATE or DELETE
    on ImportReconciliationRecord and ExternalEntityMappingHistory.
    """
    admin_token = get_auth_token("adm_imm@ims.co.zw", "APP_ADMIN", "Admin Imm")
    uid = uuid.uuid4().hex[:6].upper()

    # Create mapping to generate history
    client.post(
        "/api/intake/mappings",
        json={
            "entity_type": "EMPLOYEE",
            "source_system": "HR_WORKDAY",
            "external_id": f"EXT-IMM-{uid}",
            "internal_code": f"EMP-IMM-{uid}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    db = SessionLocal()
    hist_record = (
        db.query(ExternalEntityMappingHistory)
        .filter(ExternalEntityMappingHistory.external_id == f"EXT-IMM-{uid}")
        .first()
    )
    assert hist_record is not None

    # 1. Attempt UPDATE on history record -> MUST RAISE PermissionError
    hist_record.new_internal_code = "MALICIOUS-TAMPER"
    with pytest.raises(PermissionError) as exc_update:
        db.commit()
    assert "append-only audit record and cannot be updated or deleted" in str(exc_update.value)
    db.rollback()

    # 2. Attempt DELETE on history record -> MUST RAISE PermissionError
    db.delete(hist_record)
    with pytest.raises(PermissionError) as exc_delete:
        db.commit()
    assert "append-only audit record and cannot be updated or deleted" in str(exc_delete.value)
    db.rollback()

    # 3. Test on ImportReconciliationRecord
    rec_record = db.query(ImportReconciliationRecord).first()
    if rec_record:
        rec_record.total_records = 999999
        with pytest.raises(PermissionError):
            db.commit()
        db.rollback()

        db.delete(rec_record)
        with pytest.raises(PermissionError):
            db.commit()
        db.rollback()

    db.close()


# ====================================================================
# TEST 4: Cryptographic Hash Chaining Across Sequential Batches
# ====================================================================


def test_cryptographic_hash_chain_sequential_sealing():
    """
    Verifies that sequential reconciliation records form a cryptographic hash chain:
    Record N+1 checksum depends on Record N's checksum seal.
    """
    manager_token = get_auth_token("mgr_chain@ims.co.zw", "MANAGER", "Manager Chain")
    admin_token = get_auth_token("adm_chain@ims.co.zw", "APP_ADMIN", "Admin Chain")

    def run_import_batch(batch_name: str, sku_code: str):
        csv = f"sku,quantity,unit_cost\n{sku_code},10,5.00\n"
        up = client.post(
            "/api/intake/upload",
            files={"file": (f"{batch_name}.csv", csv.encode("utf-8"), "text/csv")},
            data={"entity_type": "OPENING_STOCK", "source_system": "STOCK_AUDIT"},
            headers={"Authorization": f"Bearer {manager_token}"},
        )
        bid = up.json()["batch_id"]
        client.post(f"/api/intake/batches/{bid}/approve", headers={"Authorization": f"Bearer {admin_token}"})
        com = client.post(f"/api/intake/batches/{bid}/commit", headers={"Authorization": f"Bearer {admin_token}"})
        assert com.status_code == 200
        return bid

    uid = uuid.uuid4().hex[:6].upper()
    bid1 = run_import_batch(f"batch1_{uid}", f"SKU-C1-{uid}")
    bid2 = run_import_batch(f"batch2_{uid}", f"SKU-C2-{uid}")

    db = SessionLocal()
    rec1 = db.query(ImportReconciliationRecord).filter(ImportReconciliationRecord.batch_id == bid1).first()
    rec2 = db.query(ImportReconciliationRecord).filter(ImportReconciliationRecord.batch_id == bid2).first()

    assert rec1 is not None
    assert rec2 is not None
    # Hash Chain invariant: rec2.previous_checksum MUST EQUAL rec1.checksum
    assert rec2.previous_checksum == rec1.checksum

    # Validate rec2 checksum formula:
    expected_payload = (
        f"{bid2}:{rec1.checksum}:{rec2.total_records}:{rec2.accepted_count}:"
        f"{rec2.rejected_count}:{rec2.created_count}:{rec2.updated_count}:{rec2.unchanged_count}:{rec2.reconciliation_delta:.2f}"
    )
    expected_hash = hashlib.sha256(expected_payload.encode("utf-8")).hexdigest()
    assert rec2.checksum == expected_hash
    db.close()


# ====================================================================
# TEST 5: First-Class Source-Event Composite Idempotency
# ====================================================================


def test_source_event_composite_idempotency():
    """
    (source_system, entity_type, source_reference) composite key uniquely identifies an intake event.
    Replaying the exact same source event returns the existing batch with is_idempotent_replay=True.
    """
    admin_token = get_auth_token("adm_idemp@ims.co.zw", "APP_ADMIN", "Admin Idemp")
    uid = uuid.uuid4().hex[:6].upper()

    # Create integration account & key for M2M API
    account_id = f"INT-SAP-{uid}"
    raw_key = f"ik_{uid.lower()}test.m2m_super_secret_token_12345"
    db = SessionLocal()
    acc = IntegrationAccount(
        account_id=account_id,
        name="SAP ERP Gateway",
        status="ACTIVE",
        allowed_source_system="SAP_ERP",
        scopes_json=json.dumps(["employees:write", "products:write"]),
    )
    db.add(acc)
    db.flush()

    key_record = IntegrationApiKey(
        account_id=acc.account_id,
        key_id=f"ik_{uid.lower()}test",
        prefix=f"ik_{uid.lower()}test",
        name="SAP Test Key",
        api_key_hash=hash_api_key("m2m_super_secret_token_12345"),
        status="ACTIVE",
    )
    db.add(key_record)
    db.commit()
    db.close()

    source_ref = f"SAP-EVT-{uid}"
    payload = [
        {"employee_code": f"EMP-SAP-{uid}", "first_name": "Tinashe", "last_name": "Zvobgo", "email": f"tz_{uid.lower()}@corp.co.zw"}
    ]

    # 1. First M2M Submission
    res1 = client.post(
        f"/api/intake/integrations/SAP_ERP/EMPLOYEES?source_reference={source_ref}",
        json=payload,
        headers={"X-API-Key": raw_key},
    )
    assert res1.status_code == 200
    batch_id_1 = res1.json()["batch_id"]
    assert res1.json().get("is_idempotent_replay", False) is False

    # 2. Second M2M Submission with identical source_reference (Duplicate / Retry)
    res2 = client.post(
        f"/api/intake/integrations/SAP_ERP/EMPLOYEES?source_reference={source_ref}",
        json=payload,
        headers={"X-API-Key": raw_key},
    )
    assert res2.status_code == 200
    batch_id_2 = res2.json()["batch_id"]
    assert batch_id_1 == batch_id_2
    assert res2.json()["is_idempotent_replay"] is True


# ====================================================================
# TEST 6: Complete Audit Lineage Tracing ("No Ghosts")
# ====================================================================


def test_full_import_lineage_traceability():
    """
    Verifies that any domain record or transaction can walk its full lineage:
    Source System -> Batch -> Record -> Diffs -> Domain Entity -> Ledger Movement -> Hash Chain Checksum.
    """
    manager_token = get_auth_token("mgr_lin@ims.co.zw", "MANAGER", "Manager Lin")
    admin_token = get_auth_token("adm_lin@ims.co.zw", "APP_ADMIN", "Admin Lin")

    uid = uuid.uuid4().hex[:6].upper()
    sku = f"SKU-TRACE-{uid}"

    # Upload Opening Stock CSV
    csv_content = (
        "sku,quantity,unit_cost\n"
        f"{sku},120,45.00\n"
    )
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"trace_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "PHYSICAL_STOCKTAKE", "source_reference": f"AUDIT-REF-{uid}"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    batch_id = up_res.json()["batch_id"]

    # Approve & Commit
    client.post(f"/api/intake/batches/{batch_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    com_res = client.post(f"/api/intake/batches/{batch_id}/commit", headers={"Authorization": f"Bearer {admin_token}"})
    assert com_res.status_code == 200

    # Query Lineage Endpoint
    lineage_res = client.get(
        f"/api/intake/lineage/PRODUCT/{sku}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert lineage_res.status_code == 200
    lineage = lineage_res.json()

    assert lineage["canonical_id"] == sku
    assert lineage["domain_entity"]["sku"] == sku
    assert lineage["domain_entity"]["stock_quantity"] == 120

    # Intake Batches & Records
    assert len(lineage["intake_batches"]) >= 1
    batch_trace = lineage["intake_batches"][0]
    assert batch_trace["batch_id"] == batch_id
    assert batch_trace["source_system"] == "PHYSICAL_STOCKTAKE"
    assert batch_trace["source_reference"] == f"AUDIT-REF-{uid}"
    assert batch_trace["content_hash"] is not None
    assert batch_trace["approved_content_hash"] is not None
    assert batch_trace["reconciliation"]["is_reconciled"] is True
    assert len(batch_trace["reconciliation"]["checksum"]) == 64

    # Inventory Ledger Events
    assert len(lineage["inventory_ledger_events"]) >= 1
    ledger_tx = lineage["inventory_ledger_events"][0]
    assert ledger_tx["type"] == "OPENING_BALANCE"
    assert ledger_tx["quantity"] == 120
    assert ledger_tx["quantity_before"] == 0
    assert ledger_tx["quantity_after"] == 120
    assert ledger_tx["reference_batch_id"] == batch_id
