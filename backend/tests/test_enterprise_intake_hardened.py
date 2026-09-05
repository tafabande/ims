"""
Comprehensive Automated Tests for Hardened Enterprise Data Intake Architecture:
1. Separation of Duties (SoD) server-side enforcement on High-Risk imports.
2. Machine-to-Machine (M2M) API Authentication, System Boundary & Granular Scope validation.
3. Row-level Action Classification (CREATE, UPDATE, NO_CHANGE, REJECT) & Batch Preview.
4. Transactional Domain Handling for Inventory (OPENING_BALANCE events with before/after counts).
5. Post-Commit Reconciliation Ledger (accepted == created + updated + unchanged; delta == 0).
6. Strict Database-level Uniqueness on ExternalEntityMapping.
"""

import json
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import (
    Category,
    ExternalEntityMapping,
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


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def get_auth_token(email: str, role: str, full_name: str) -> str:
    user = get_or_create_user(email, role, full_name)
    perms = ROLE_PERMISSIONS.get(role, ["*"])
    token = create_access_token(user_id=str(user.id), role=role, permissions=perms)
    return token


# ====================================================================
# TEST 1: Separation of Duties (SoD) on High-Risk Imports
# ====================================================================


def test_separation_of_duties_enforcement():
    """
    Verifies that the requester/uploader CANNOT approve or commit their own High-Risk batch.
    A distinct authorized manager/admin must review and commit.
    """
    manager_token = get_auth_token("manager_sod@ims.co.zw", "MANAGER", "Manager SoD")
    admin_token = get_auth_token("admin_sod@ims.co.zw", "APP_ADMIN", "Admin SoD")

    # Manager uploads a high-risk opening stock CSV
    uid = uuid.uuid4().hex[:6].upper()
    csv_data = (
        "# IMS Enterprise Import Template | Entity: OPENING_STOCK | Schema: STOCK-1.0\n"
        "sku,quantity,unit_cost\n"
        f"SKU-SOD-{uid},500,25.00\n"
    )
    upload_res = client.post(
        "/api/intake/upload",
        files={"file": (f"opening_stock_sod_{uid}.csv", csv_data.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "WAREHOUSE_AUDIT"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert upload_res.status_code == 200
    batch_id = upload_res.json()["batch_id"]
    assert upload_res.json()["risk_level"] == "HIGH"
    assert upload_res.json()["status"] == "PENDING_APPROVAL"

    # Manager attempts to self-approve -> MUST BE FORBIDDEN (403 SoD Violation)
    approve_self_res = client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert approve_self_res.status_code == 403
    assert "Separation of Duties" in approve_self_res.json()["detail"]

    # Manager attempts to self-commit -> MUST BE FORBIDDEN (403 SoD Violation)
    commit_self_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert commit_self_res.status_code == 403
    assert "Separation of Duties" in commit_self_res.json()["detail"]

    # Distinct Admin approves and commits -> SUCCEEDS
    approve_admin_res = client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_admin_res.status_code == 200
    assert approve_admin_res.json()["status"] == "APPROVED"

    commit_admin_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert commit_admin_res.status_code == 200
    assert commit_admin_res.json()["status"] == "COMMITTED"


# ====================================================================
# TEST 2: Machine-to-Machine (M2M) API Key Authentication & Scopes
# ====================================================================


def test_m2m_integration_api_authentication_and_scopes():
    """
    Verifies that M2M API intake enforces API key verification, allowed_source_system boundaries,
    and granular scope restrictions (e.g. employees:write).
    """
    db = SessionLocal()
    raw_key = f"ims_live_hr_secret_{uuid.uuid4().hex[:8]}"
    key_hash = hash_api_key(raw_key)

    # Setup M2M Integration Account for HR_WORKDAY restricted to employees:write
    account = IntegrationAccount(
        account_id=f"INT-HR-{uuid.uuid4().hex[:6].upper()}",
        name="Workday HR Sync",
        status="ACTIVE",
        allowed_source_system="HR_WORKDAY",
        scopes_json=json.dumps(["employees:write"]),
    )
    db.add(account)
    db.flush()

    api_key_rec = IntegrationApiKey(
        account_id=account.account_id,
        api_key_hash=key_hash,
        prefix="ims_live_hr",
        name="Production Sync Key",
    )
    db.add(api_key_rec)
    db.commit()
    db.close()

    emp_code = f"EMP-M2M-{uuid.uuid4().hex[:6].upper()}"
    payload = [
        {
            "employee_code": emp_code,
            "first_name": "Tariro",
            "last_name": "Moyo",
            "email": f"{emp_code.lower()}@ims.co.zw",
            "department": "Engineering",
        }
    ]

    # 1. Missing API Key -> 401 Unauthorized
    no_key_res = client.post(
        "/api/intake/integrations/HR_WORKDAY/EMPLOYEES",
        json=payload,
    )
    assert no_key_res.status_code == 401

    # 2. Invalid API Key -> 401 Unauthorized
    bad_key_res = client.post(
        "/api/intake/integrations/HR_WORKDAY/EMPLOYEES",
        json=payload,
        headers={"X-API-Key": "invalid_secret_key"},
    )
    assert bad_key_res.status_code == 401

    # 3. Mismatched Source System Boundary -> 403 Forbidden
    wrong_sys_res = client.post(
        "/api/intake/integrations/SAP_ERP/EMPLOYEES",
        json=payload,
        headers={"X-API-Key": raw_key},
    )
    assert wrong_sys_res.status_code == 403
    assert "restricted to 'HR_WORKDAY'" in wrong_sys_res.json()["detail"]

    # 4. Unauthorized Entity Scope (e.g. products:write) -> 403 Forbidden
    no_scope_res = client.post(
        "/api/intake/integrations/HR_WORKDAY/PRODUCTS",
        json=[{"sku": "SKU-TEST-99", "name": "Illegal Item"}],
        headers={"X-API-Key": raw_key},
    )
    assert no_scope_res.status_code == 403
    assert "lacks required permission scope 'products:write'" in no_scope_res.json()["detail"]

    # 5. Valid Credentials & Scope -> 200 OK
    valid_res = client.post(
        "/api/intake/integrations/HR_WORKDAY/EMPLOYEES",
        json=payload,
        headers={"X-API-Key": raw_key},
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["valid_records"] == 1


# ====================================================================
# TEST 3: Row-Level Action Classification & Preview Before Commit
# ====================================================================


def test_row_action_classification_and_preview():
    """
    Verifies that staged records are classified into CREATE, UPDATE, NO_CHANGE, REJECT
    and exposed via GET /api/intake/batches/{id}/preview.
    """
    admin_token = get_auth_token("admin_sod@ims.co.zw", "APP_ADMIN", "Admin SoD")
    db = SessionLocal()

    uid = uuid.uuid4().hex[:6].upper()
    sku1 = f"SKU-EX1-{uid}"
    sku2 = f"SKU-EX2-{uid}"
    sku_new = f"SKU-NEW-{uid}"

    # Seed category & existing products in DB
    cat = db.query(Category).first()
    if not cat:
        cat = Category(name="Electronics", code="ELEC", category_code="CAT-000101")
        db.add(cat)
        db.flush()

    p1 = Product(
        sku=sku1,
        product_code=f"PRD-{uuid.uuid4().hex[:6].upper()}",
        name="Wireless Mouse",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
    )
    p2 = Product(
        sku=sku2,
        product_code=f"PRD-{uuid.uuid4().hex[:6].upper()}",
        name="Mechanical Keyboard",
        category_id=cat.id,
        purchase_price=40.0,
        selling_price=75.0,
    )
    db.add_all([p1, p2])
    db.commit()
    db.close()

    # Upload batch with 1 CREATE, 1 UPDATE, 1 NO_CHANGE, 1 REJECT
    csv_content = (
        "sku,name,purchase_price,selling_price,reorder_level\n"
        f"{sku_new},USB-C Hub,15.00,30.00,10\n"  # CREATE
        f"{sku1},Wireless Mouse Ergonomic,12.00,25.00,5\n"  # UPDATE (price & name changed)
        f"{sku2},Mechanical Keyboard,40.00,75.00,5\n"  # NO_CHANGE (identical)
        ",Broken Product Without SKU,-5.00,20.00,5\n"  # REJECT (missing sku & negative cost)
    )

    upload_res = client.post(
        "/api/intake/upload",
        files={"file": (f"products_diff_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "PRODUCTS", "source_system": "CATALOG_SUPPLIER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert upload_res.status_code == 200
    batch_id = upload_res.json()["batch_id"]

    # Preview proposed changes
    preview_res = client.get(
        f"/api/intake/batches/{batch_id}/preview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["total_records"] == 4
    assert preview["valid_records"] == 3
    assert preview["rejected_records"] == 1
    assert preview["create_count"] == 1
    assert preview["update_count"] == 1
    assert preview["no_change_count"] == 1


# ====================================================================
# TEST 4: Transactional Inventory Ledger Events
# ====================================================================


def test_transactional_inventory_ledger_events():
    """
    Verifies that opening stock imports create legitimate OPENING_BALANCE ledger events
    in InventoryTransaction with exact quantity_before and quantity_after.
    """
    admin_token = get_auth_token("admin_sod@ims.co.zw", "APP_ADMIN", "Admin SoD")
    manager_token = get_auth_token("manager_sod@ims.co.zw", "MANAGER", "Manager SoD")

    uid = uuid.uuid4().hex[:6].upper()
    sku = f"SKU-STOCK-AUDIT-{uid}"

    # Upload opening stock
    csv_content = (
        "sku,quantity,unit_cost\n"
        f"{sku},150,12.50\n"
    )
    upload_res = client.post(
        "/api/intake/upload",
        files={"file": (f"opening_stock_audit_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "OPENING_STOCK", "source_system": "STORE_AUDIT"},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    batch_id = upload_res.json()["batch_id"]

    # Approve & Commit by Admin (SoD)
    client.post(
        f"/api/intake/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    commit_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert commit_res.status_code == 200

    # Verify Domain Entity and Transactional Ledger
    db = SessionLocal()
    tx = (
        db.query(InventoryTransaction)
        .filter(InventoryTransaction.reference == batch_id)
        .first()
    )
    assert tx is not None
    assert tx.type == "OPENING_BALANCE"
    assert tx.quantity == 150
    assert tx.quantity_before == 0
    assert tx.quantity_after == 150
    assert tx.reason_category == "OPENING_STOCK_IMPORT"

    prod = db.query(Product).filter(Product.sku == sku).first()
    assert prod is not None
    assert prod.stock_quantity == 150
    db.close()


# ====================================================================
# TEST 5: Post-Commit Reconciliation Ledger
# ====================================================================


def test_post_commit_reconciliation_ledger():
    """
    Verifies that every committed batch produces a verifiable reconciliation ledger
    proving accepted input == domain state changes with 0 unexplained variance.
    """
    admin_token = get_auth_token("admin_sod@ims.co.zw", "APP_ADMIN", "Admin SoD")

    uid = uuid.uuid4().hex[:6].upper()
    csv_content = (
        "sku,name,purchase_price,selling_price,reorder_level\n"
        f"SKU-RECON-1-{uid},Item One,10.00,20.00,5\n"
        f"SKU-RECON-2-{uid},Item Two,15.00,30.00,5\n"
    )
    upload_res = client.post(
        "/api/intake/upload",
        files={"file": (f"products_recon_{uid}.csv", csv_content.encode("utf-8"), "text/csv")},
        data={"entity_type": "PRODUCTS", "source_system": "WAREHOUSE_IMPORT"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    batch_id = upload_res.json()["batch_id"]

    # Commit batch
    commit_res = client.post(
        f"/api/intake/batches/{batch_id}/commit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert commit_res.status_code == 200

    # Inspect reconciliation report
    recon_res = client.get(
        f"/api/intake/batches/{batch_id}/reconciliation",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert recon_res.status_code == 200
    recon = recon_res.json()
    assert recon["batch_id"] == batch_id
    assert recon["is_reconciled"] is True
    assert recon["total_imported"] == 2
    assert recon["accepted_count"] == 2
    assert recon["created_count"] == 2
    assert recon["reconciliation_delta"] == 0.0


# ====================================================================
# TEST 6: Strict Unique Constraint on ExternalEntityMapping
# ====================================================================


def test_strict_external_entity_mapping_uniqueness():
    """
    Verifies that the database prevents duplicate external identity mappings for the same
    (entity_type, source_system, external_id).
    """
    db = SessionLocal()
    uid = uuid.uuid4().hex[:6].upper()
    ext_id = f"EMP-EXT-{uid}"

    map1 = ExternalEntityMapping(
        entity_type="EMPLOYEES",
        internal_code=f"EMP-001-{uid}",
        source_system="HR_WORKDAY",
        external_id=ext_id,
    )
    db.add(map1)
    db.commit()

    # Attempt duplicate insert with same (entity_type, source_system, external_id)
    map2 = ExternalEntityMapping(
        entity_type="EMPLOYEES",
        internal_code=f"EMP-999-{uid}",
        source_system="HR_WORKDAY",
        external_id=ext_id,
    )
    db.add(map2)
    with pytest.raises(Exception):
        db.commit()
    db.rollback()
    db.close()
