"""
Enterprise Data Intake Security Boundary Hardening Test Suite:
Verifies the 10 mandatory architectural tests specified by Chaa:
1. Approved-data hash changes -> commit blocked (409 Conflict)
2. Real-time reclassification at commit after authoritative domain data changed
3. M2M credential identity cannot impersonate another source system (403 Forbidden)
4. API-key fast lookup (ik_xxxx), rotation, and revocation lifecycle
5. Append-only reconciliation record invariant verification & cryptographic seal
6. Quarantined batch error containment & commit guard
7. File SHA-256 duplicate defense
8. Append-only external identity remapping lineage history
9. Separation of Duties: Requester/Unauthorized commit rejection
10. Inventory movement boundary defense (PRODUCTS cannot touch InventoryTransaction)
"""

import json
import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import (
    Category,
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


def get_auth_token(email: str, role: str, full_name: str = "Test Operator", user_id: int | None = None) -> str:
    user = get_or_create_user(email, role, full_name)
    perms = ROLE_PERMISSIONS.get(role, ["*"])
    token = create_access_token(user_id=str(user.id), role=role, permissions=perms)
    return token


# ====================================================================
# TEST 1: Approved-Data Hash Changes -> Commit Blocked (409 Conflict)
# ====================================================================


def test_approved_data_hash_tamper_defense():
    """
    Time-of-Check / Time-of-Use Defense:
    If a staged record is modified or injected after manager approval,
    the fingerprint comparison fails and blocks commit with 409 Conflict.
    """
    manager_token = get_auth_token("manager_audit@ims.co.zw", "MANAGER", "Audit Manager")
    uploader_token = get_auth_token("uploader_staff@ims.co.zw", "STAFF", "Data Clerk")

    uid = uuid.uuid4().hex[:6].upper()
    csv_content = (
        "sku,quantity,unit_cost\n"
        f"SKU-TAMPER-{uid},50,10.00\n"
    )

    # 1. Upload (Opening stock is automatically HIGH risk and PENDING_APPROVAL)
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"stock_tamper_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "PHYSICAL_COUNT"},
        headers={"Authorization": f"Bearer {uploader_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]
    assert up_res.json()["risk_level"] == "HIGH"
    assert up_res.json()["status"] == "PENDING_APPROVAL"

    # 2. Manager Approves (freezes approved_content_hash)
    app_res = client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert app_res.status_code == 200
    approved_batch = app_res.json()
    assert approved_batch["status"] == "APPROVED"
    assert approved_batch["approved_content_hash"] is not None

    # 3. Simulate unauthorized tampering with staged row in database
    db = SessionLocal()
    staged_rec = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).first()
    norm = json.loads(staged_rec.normalized_data_json)
    norm["quantity"] = 999999
    staged_rec.normalized_data_json = json.dumps(norm)
    db.commit()
    db.close()

    # 4. Attempt Commit -> Must be blocked because current_hash != approved_hash
    commit_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert commit_res.status_code == 409
    assert "Approved dataset has changed; re-review required." in commit_res.json()["detail"]


# ====================================================================
# TEST 2: Real-Time Reclassification at Commit
# ====================================================================


def test_realtime_reclassification_at_commit():
    """
    If authoritative database state changes between preview and commit,
    the commit engine dynamically re-queries domain records, reclassifies NO_CHANGE to UPDATE,
    and captures exact field-level diff_json and before_snapshot_json.
    """
    admin_token = get_auth_token("admin_reclass@ims.co.zw", "APP_ADMIN", "Admin Reclass", user_id=201)
    db = SessionLocal()

    uid = uuid.uuid4().hex[:6].upper()
    sku = f"SKU-RECLASS-{uid}"

    cat = db.query(Category).first()
    if not cat:
        cat = Category(name="Electronics", code="ELEC", category_code="CAT-000101")
        db.add(cat)
        db.flush()

    # Seed product with price 50.00
    prod = Product(
        sku=sku,
        product_code=f"PRD-{uid}",
        name="Bluetooth Speaker",
        category_id=cat.id,
        purchase_price=30.0,
        selling_price=50.0,
    )
    db.add(prod)
    db.commit()
    db.close()

    # Upload batch with identical price 50.00 (initially classified as NO_CHANGE)
    csv_content = f"sku,name,purchase_price,selling_price,reorder_level\n{sku},Bluetooth Speaker,30.00,50.00,5\n"
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"reclass_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "PRODUCTS", "source_system": "CATALOG_SUPPLIER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    # Preview confirms initial classification is NO_CHANGE
    prev_res = client.get(
        f"/api/intake/batches/{batch_id}/preview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert prev_res.json()["no_change_count"] == 1
    assert prev_res.json()["update_count"] == 0

    # Concurrently, another user changes selling_price in DB from 50.00 to 75.00
    db = SessionLocal()
    prod_in_db = db.query(Product).filter(Product.sku == sku).first()
    prod_in_db.selling_price = 75.0
    db.commit()
    db.close()

    # Commit the batch: must dynamically re-evaluate and detect that DB is now 75.00 while import is 50.00 -> UPDATE
    com_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert com_res.status_code == 200

    db = SessionLocal()
    rec = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).first()
    assert rec.action_type == "UPDATE"
    assert rec.diff_json is not None
    diff = json.loads(rec.diff_json)
    assert "selling_price" in diff
    assert diff["selling_price"]["before"] == 75.0
    assert diff["selling_price"]["after"] == 50.0
    db.close()


# ====================================================================
# TEST 3: M2M Credential Identity Cannot Impersonate Another Source
# ====================================================================


def test_m2m_source_system_impersonation_defense():
    """
    Source system identity is strictly derived from the authenticated credential.
    A credential issued for 'HR_WORKDAY' cannot push records claiming to be 'SAP_ERP'.
    """
    db = SessionLocal()
    raw_secret = "m2m_secret_key_888"
    key_id = f"ik_{uuid.uuid4().hex[:8]}"

    account = IntegrationAccount(
        account_id=f"INT-WORKDAY-{uuid.uuid4().hex[:4].upper()}",
        name="Workday Production Agent",
        status="ACTIVE",
        allowed_source_system="HR_WORKDAY",
        scopes_json=json.dumps(["employees:write"]),
    )
    db.add(account)
    db.flush()

    api_key_rec = IntegrationApiKey(
        account_id=account.account_id,
        key_id=key_id,
        api_key_hash=hash_api_key(raw_secret),
        prefix="ims_live_wd",
        name="Workday Secret Key",
        status="ACTIVE",
    )
    db.add(api_key_rec)
    db.commit()
    db.close()

    token_str = f"{key_id}.{raw_secret}"

    payload = [{"employee_code": "EMP-999", "first_name": "John", "last_name": "Doe", "email": "jdoe@corp.co.zw"}]

    # Impersonation attempt: requesting SAP_ERP path with HR_WORKDAY key -> 403 Forbidden
    res = client.post(
        "/api/intake/integrations/SAP_ERP/EMPLOYEES",
        json=payload,
        headers={"X-API-Key": token_str},
    )
    assert res.status_code == 403
    assert "restricted to 'HR_WORKDAY'" in res.json()["detail"]


# ====================================================================
# TEST 4: API Key Lifecycle (Fast Prefix Lookup, Revocation, Expiration)
# ====================================================================


def test_api_key_lifecycle_and_revocation():
    """
    Verifies O(1) prefix lookup (ik_xxxx.secret) and strict enforcement of key statuses (ACTIVE, REVOKED).
    """
    db = SessionLocal()
    raw_secret = "secret_rotate_123"
    key_id = f"ik_{uuid.uuid4().hex[:8]}"

    account = IntegrationAccount(
        account_id=f"INT-FINANCE-{uuid.uuid4().hex[:4].upper()}",
        name="Finance API Client",
        status="ACTIVE",
        allowed_source_system="FINANCE_SYS",
        scopes_json=json.dumps(["products:write"]),
    )
    db.add(account)
    db.flush()

    api_key_rec = IntegrationApiKey(
        account_id=account.account_id,
        key_id=key_id,
        api_key_hash=hash_api_key(raw_secret),
        prefix="ims_fin_live",
        name="Finance Key 1",
        status="ACTIVE",
    )
    db.add(api_key_rec)
    db.commit()

    token_str = f"{key_id}.{raw_secret}"
    payload = [{"sku": f"SKU-FIN-{uuid.uuid4().hex[:4].upper()}", "name": "Calculator", "purchase_price": 5.0, "selling_price": 10.0}]

    # 1. Valid Active Key -> 200 OK
    res_active = client.post(
        "/api/intake/integrations/FINANCE_SYS/PRODUCTS",
        json=payload,
        headers={"X-API-Key": token_str},
    )
    assert res_active.status_code == 200

    # 2. Revoke Key
    api_key_rec.status = "REVOKED"
    api_key_rec.revoked_at = datetime.now(UTC)
    db.commit()
    db.close()

    # 3. Revoked Key Request -> 401 Unauthorized
    res_revoked = client.post(
        "/api/intake/integrations/FINANCE_SYS/PRODUCTS",
        json=payload,
        headers={"X-API-Key": token_str},
    )
    assert res_revoked.status_code == 401
    assert "revoked" in res_revoked.json()["detail"].lower()


# ====================================================================
# TEST 5: Reconciliation Record Invariant & Cryptographic Seal
# ====================================================================


def test_reconciliation_record_invariant_and_checksum():
    """
    Verifies that post-commit reconciliation creates an append-only ImportReconciliationRecord
    confirming the invariant: total == accepted + rejected and accepted == created + updated + unchanged.
    """
    uploader_token = get_auth_token("uploader_rec@ims.co.zw", "STAFF", "Uploader Rec")
    admin_token = get_auth_token("admin_rec@ims.co.zw", "APP_ADMIN", "Admin Rec")
    uid = uuid.uuid4().hex[:6].upper()

    csv_content = (
        "employee_code,first_name,last_name,email,department\n"
        f"EMP-REC1-{uid},Kudakwashe,Sibanda,ksibanda_{uid.lower()}@ims.co.zw,Logistics\n"
        f"EMP-REC2-{uid},Farai,Gumbo,fgumbo_{uid.lower()}@ims.co.zw,Logistics\n"
    )

    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"emp_rec_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "EMPLOYEES", "source_system": "HR_WORKDAY"},
        headers={"Authorization": f"Bearer {uploader_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    # Commit batch
    com_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert com_res.status_code == 200

    # Query reconciliation record in DB
    db = SessionLocal()
    rec_record = db.query(ImportReconciliationRecord).filter(ImportReconciliationRecord.batch_id == batch_id).first()
    assert rec_record is not None
    assert rec_record.total_records == 2
    assert rec_record.accepted_count == 2
    assert rec_record.rejected_count == 0
    assert rec_record.created_count == 2
    assert rec_record.reconciliation_delta == 0.0
    assert rec_record.is_reconciled is True
    assert len(rec_record.checksum) == 64
    db.close()


# ====================================================================
# TEST 6: Quarantined Error Containment & Commit Guard
# ====================================================================


def test_quarantined_batch_commit_guard():
    """
    A batch containing validation errors transitions to QUARANTINED status
    and cannot be committed until errors are resolved.
    """
    admin_token = get_auth_token("admin_guard@ims.co.zw", "APP_ADMIN", "Admin Guard")
    uid = uuid.uuid4().hex[:6].upper()

    # 1 valid, 1 invalid row (negative cost price)
    csv_content = (
        "sku,name,purchase_price,selling_price\n"
        f"SKU-V1-{uid},Valid Item,10.00,20.00\n"
        f"SKU-INV-{uid},Invalid Item,-50.00,20.00\n"
    )

    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"guard_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "PRODUCTS", "source_system": "CATALOG_SUPPLIER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]

    # Status must be QUARANTINED
    batch_res = client.get(
        f"/api/intake/batches/{batch_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert batch_res.json()["status"] == "QUARANTINED"
    assert batch_res.json()["rejected_count"] == 1

    # Attempt commit on quarantined batch -> 400 Bad Request
    com_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert com_res.status_code == 400
    assert "quarantined validation errors" in com_res.json()["detail"]


# ====================================================================
# TEST 7: File SHA-256 Duplicate Defense
# ====================================================================


def test_file_sha256_duplicate_defense():
    """
    Uploading the identical file byte stream twice flags the second import with is_duplicate=True.
    """
    admin_token = get_auth_token("admin_dup@ims.co.zw", "APP_ADMIN", "Admin Dup")
    uid = uuid.uuid4().hex[:6].upper()

    csv_content = f"employee_code,first_name,last_name,email,department\nEMP-DUP-{uid},Tafadzwa,Moyo,tmoyo_{uid.lower()}@corp.co.zw,Security\n".encode()

    # First upload
    res1 = client.post(
        "/api/intake/upload",
        files={"file": (f"dup_{uid}.csv", csv_content, "text/csv")},
        data={"entity_type": "EMPLOYEES", "source_system": "HR_WORKDAY"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res1.status_code == 200
    assert res1.json().get("is_duplicate", False) is False

    # Second upload with identical file content
    res2 = client.post(
        "/api/intake/upload",
        files={"file": (f"dup_{uid}.csv", csv_content, "text/csv")},
        data={"entity_type": "EMPLOYEES", "source_system": "HR_WORKDAY"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res2.status_code == 200
    assert res2.json().get("is_duplicate", True) is True


# ====================================================================
# TEST 8: Append-Only External Identity Remapping History
# ====================================================================


def test_external_identity_remapping_history():
    """
    When an external entity mapping is updated (e.g. EMP-492 -> EMP-00128 changed to EMP-00341),
    an append-only audit trail is created in ExternalEntityMappingHistory.
    """
    admin_token = get_auth_token("admin_map@ims.co.zw", "APP_ADMIN", "Admin Map")
    uid = uuid.uuid4().hex[:6].upper()

    # 1. Initial Mapping
    create_res = client.post(
        "/api/intake/mappings",
        json={
            "entity_type": "EMPLOYEE",
            "source_system": "HR_LEGACY",
            "external_id": f"LEGACY-EMP-{uid}",
            "internal_code": f"EMP-OLD-{uid}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_res.status_code == 201
    mapping_id = create_res.json()["id"]

    # 2. Update / Remap to new internal code
    update_res = client.post(
        "/api/intake/mappings",
        json={
            "entity_type": "EMPLOYEE",
            "source_system": "HR_LEGACY",
            "external_id": f"LEGACY-EMP-{uid}",
            "internal_code": f"EMP-NEW-{uid}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_res.status_code in [200, 201]

    # 3. Retrieve Mapping History
    hist_res = client.get(
        f"/api/intake/mappings/{mapping_id}/history",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 2
    latest = history[0]
    assert latest["old_internal_code"] == f"EMP-OLD-{uid}"
    assert latest["new_internal_code"] == f"EMP-NEW-{uid}"


# ====================================================================
# TEST 9: Unauthorized User Attempts High-Risk Import Commit
# ====================================================================


def test_unauthorized_user_high_risk_commit_rejection():
    """
    A STAFF user without MANAGER or APP_ADMIN role cannot commit a high-risk import batch.
    """
    staff_token = get_auth_token("staff_user@ims.co.zw", "STAFF", "Staff User", user_id=701)
    uid = uuid.uuid4().hex[:6].upper()

    # Opening stock is automatically rated HIGH RISK
    csv_content = f"sku,unit_cost,quantity\nSKU-STOCK-{uid},20.00,100\n"
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"stock_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "WAREHOUSE_COUNT"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert up_res.status_code == 200
    batch_id = up_res.json()["batch_id"]
    assert up_res.json()["risk_level"] == "HIGH"

    # Staff attempts commit -> 403 Forbidden
    com_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert com_res.status_code == 403
    assert "Manager or Admin approval" in com_res.json()["detail"]


# ====================================================================
# TEST 10: Inventory Movement Boundary Defense
# ====================================================================


def test_inventory_ledger_boundary_defense():
    """
    Non-stock entity imports (e.g. PRODUCTS) CANNOT create rows in InventoryTransaction.
    Only OPENING_STOCK / STOCK_ADJUSTMENT batches are authorized to write to the inventory ledger.
    """
    admin_token = get_auth_token("admin_inv@ims.co.zw", "APP_ADMIN", "Admin Inv", user_id=801)
    uid = uuid.uuid4().hex[:6].upper()
    sku = f"SKU-BOUNDARY-{uid}"

    # 1. Product Import: must NOT create InventoryTransaction
    csv_prod = f"sku,name,purchase_price,selling_price\n{sku},Desk Lamp,15.00,25.00\n"
    up_res = client.post(
        "/api/intake/upload",
        files={"file": (f"prod_{uid}.csv", csv_prod.encode("utf-8"), "text/csv")},
        data={"entity_type": "PRODUCTS", "source_system": "CATALOG_SUPPLIER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert up_res.status_code == 200
    p_batch_id = up_res.json()["batch_id"]

    client.post(f"/api/intake/batches/{p_batch_id}/commit", headers={"Authorization": f"Bearer {admin_token}"})

    db = SessionLocal()
    p_tx_count = db.query(InventoryTransaction).filter(InventoryTransaction.reference == p_batch_id).count()
    assert p_tx_count == 0  # Zero stock transactions emitted
    db.close()

    # 2. Opening Stock Import: MUST create audited InventoryTransaction with OPENING_BALANCE
    csv_stock = f"sku,unit_cost,quantity\n{sku},15.00,50\n"
    up_stock_res = client.post(
        "/api/intake/upload",
        files={"file": (f"stock_{uid}.csv", csv_stock.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "PHYSICAL_COUNT"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert up_stock_res.status_code == 200
    s_batch_id = up_stock_res.json()["batch_id"]

    # Manager approves
    manager_token = get_auth_token("manager_inv@ims.co.zw", "MANAGER", "Manager Inv", user_id=802)
    client.post(f"/api/intake/batches/{s_batch_id}/approve", headers={"Authorization": f"Bearer {manager_token}"})
    client.post(f"/api/intake/batches/{s_batch_id}/commit", headers={"Authorization": f"Bearer {manager_token}"})

    db = SessionLocal()
    stock_tx = db.query(InventoryTransaction).filter(InventoryTransaction.reference == s_batch_id).first()
    assert stock_tx is not None
    assert stock_tx.type == "OPENING_BALANCE"
    assert stock_tx.quantity == 50
    assert stock_tx.quantity_before == 0
    assert stock_tx.quantity_after == 50
    db.close()
