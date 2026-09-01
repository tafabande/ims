import hashlib
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import (
    Employee,
    ExternalEntityMapping,
    ImportBatch,
    ImportRecord,
    IntegrationAccount,
    IntegrationApiKey,
    User,
)
from app.services.iam_service import ROLE_PERMISSIONS, create_access_token, hash_password


@pytest.fixture(autouse=True)
def setup_test_database():
    """Ensures test database tables exist."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def admin_auth_headers(db_session: Session):
    """Creates a mock admin user and returns valid bearer headers."""
    admin_email = "test_intake_admin@ims.co.zw"
    user = db_session.query(User).filter(User.email == admin_email).first()
    if not user:
        user = User(
            user_code="USR-TEST-001",
            email=admin_email,
            full_name="Intake Test Admin",
            role="APP_ADMIN",
            department="IT Governance",
            hashed_password=hash_password("password123"),
            active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token(
        user_id=str(user.id),
        role=user.role,
        permissions=ROLE_PERMISSIONS.get(user.role, ["*"]),
    )
    return {"Authorization": f"Bearer {token}"}


def test_get_enterprise_data_dictionary(admin_auth_headers):
    """Data Dictionary Contract Test: Verify retrieval of canonical schemas."""
    client = TestClient(app)
    response = client.get("/api/intake/dictionary", headers=admin_auth_headers)
    assert response.status_code == 200
    contracts = response.json()
    assert len(contracts) >= 4

    employee_contract = next((c for c in contracts if c["entity_type"] == "EMPLOYEES"), None)
    assert employee_contract is not None
    assert employee_contract["schema_version"] == "EMPLOYEE-2.1"
    assert employee_contract["risk_level"] == "HIGH"

    fields = {f["field_name"]: f for f in employee_contract["fields"]}
    assert "employee_code" in fields
    assert fields["employee_code"]["required"] is True
    assert fields["employee_code"]["is_identifier"] is True
    assert "email" in fields


def test_download_versioned_import_template(admin_auth_headers):
    """Template Generator Test: Verify dynamic CSV generation with versioned header comments."""
    client = TestClient(app)
    response = client.get("/api/intake/templates/EMPLOYEES", headers=admin_auth_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "IMS_Template_EMPLOYEES_EMPLOYEE-2.1.csv" in response.headers["content-disposition"]

    csv_text = response.text
    assert "# IMS Enterprise Import Template | Entity: EMPLOYEES | Schema: EMPLOYEE-2.1" in csv_text
    assert "employee_code,first_name,last_name,email,phone,department,job_title,system_role" in csv_text


def test_file_upload_staging_and_quarantine_validation(admin_auth_headers, db_session: Session):
    """
    Staging & Quarantine Gateway Test:
    Verify that uploaded files are placed in staging tables (ImportBatch and ImportRecord),
    validated, and quarantined if errors exist.
    """
    client = TestClient(app)

    # Valid CSV content with version header
    csv_valid = (
        "# IMS Enterprise Import Template | Entity: EMPLOYEES | Schema: EMPLOYEE-2.1\n"
        "employee_code,first_name,last_name,email,phone,department,job_title\n"
        "EMP-TEST-901,Tafadzwa,Moyo,tmoyo_intake@ims.co.zw,+26377111222,Engineering,Lead Tech\n"
        "EMP-TEST-902,Grace,Ndlovu,gndlovu_intake@ims.co.zw,+26377333444,Sales,Counter Rep\n"
    )

    files = {"file": ("employees_batch_01.csv", csv_valid.encode("utf-8"), "text/csv")}
    data = {
        "entity_type": "EMPLOYEES",
        "source_system": "HR_WORKDAY",
        "source_reference": "SYNC-RUN-8841",
    }

    response = client.post("/api/intake/upload", files=files, data=data, headers=admin_auth_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total_records"] == 2
    assert res_data["valid_records"] == 2
    assert res_data["rejected_records"] == 0
    assert res_data["status"] == "PENDING_APPROVAL"  # Employees are rated HIGH RISK
    batch_id = res_data["batch_id"]

    # Verify staging records in DB
    batch = db_session.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    assert batch is not None
    assert batch.source_system == "HR_WORKDAY"
    assert batch.schema_version == "EMPLOYEE-2.1"
    assert batch.risk_level == "HIGH"

    records = db_session.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).all()
    assert len(records) == 2
    assert records[0].external_id == "EMP-TEST-901"
    assert records[0].validation_status == "VALID"


def test_m2m_api_intake_and_canonical_mapping_commit(admin_auth_headers, db_session: Session):
    """
    End-to-End M2M Intake and Canonical Entity Reconciliation Test:
    External HR system pushes records via REST API with API key, records are staged, approved, committed,
    and cross-system identity mappings are registered in ExternalEntityMapping.
    """
    client = TestClient(app)

    # Setup M2M API Account
    raw_key = "sap_hr_sync_key_999"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    account = IntegrationAccount(
        account_id="INT-SAP-HR",
        name="SAP HR Integration",
        status="ACTIVE",
        allowed_source_system="SAP_HR",
        scopes_json=json.dumps(["employees:write"]),
    )
    db_session.add(account)
    db_session.flush()

    api_key_rec = IntegrationApiKey(
        account_id=account.account_id,
        api_key_hash=key_hash,
        prefix="sap_hr",
        name="SAP Sync Key",
    )
    db_session.add(api_key_rec)
    db_session.commit()

    payload = [
        {
            "employee_code": "EMP-M2M-555",
            "first_name": "Simbarashe",
            "last_name": "Chirwa",
            "email": "schirwa_m2m@ims.co.zw",
            "phone": "+263 71 888 9999",
            "department": "Security Ops",
            "job_title": "Surveillance Lead",
        }
    ]

    # 1. Push payload to M2M Intake Gateway with API Key
    res = client.post(
        "/api/intake/integrations/SAP_HR/EMPLOYEES",
        json=payload,
        headers={"X-API-Key": raw_key},
    )
    assert res.status_code == 200
    intake_result = res.json()
    batch_id = intake_result["batch_id"]
    assert intake_result["valid_records"] == 1
    assert intake_result["rejected_records"] == 0

    # 2. Commit batch into core domain tables
    commit_res = client.post(f"/api/intake/batches/{batch_id}/commit", headers=admin_auth_headers)
    assert commit_res.status_code == 200
    assert commit_res.json()["status"] == "COMMITTED"

    # 3. Verify Employee created in core table
    emp = db_session.query(Employee).filter(Employee.employee_code == "EMP-M2M-555").first()
    assert emp is not None
    assert emp.first_name == "Simbarashe"
    assert emp.email == "schirwa_m2m@ims.co.zw"

    # 4. Verify External Entity Mapping registered
    mapping = (
        db_session.query(ExternalEntityMapping)
        .filter(
            ExternalEntityMapping.entity_type == "EMPLOYEES",
            ExternalEntityMapping.source_system == "SAP_HR",
            ExternalEntityMapping.external_id == "EMP-M2M-555",
        )
        .first()
    )
    assert mapping is not None
    assert mapping.internal_code == "EMP-M2M-555"

    # 5. Verify Mappings endpoint lists the cross-system mapping
    mappings_res = client.get("/api/intake/mappings?source_system=SAP_HR", headers=admin_auth_headers)
    assert mappings_res.status_code == 200
    mappings_list = mappings_res.json()
    assert any(m["external_id"] == "EMP-M2M-555" for m in mappings_list)


def test_quarantine_error_reporting_on_invalid_records(admin_auth_headers, db_session: Session):
    """
    Quarantine Isolation Test:
    Verify that records with validation errors are flagged as REJECTED,
    the batch is marked as QUARANTINED, and errors are queryable via API.
    """
    client = TestClient(app)

    # 1 valid row, 1 row missing name, 1 row with negative price
    csv_with_errors = (
        "sku,name,purchase_price,selling_price\n"
        "SKU-INT-001,Valid Monitor 27in,150.00,220.00\n"
        "SKU-INT-002,,100.00,150.00\n"
        "SKU-INT-003,Defective Speaker,-50.00,80.00\n"
    )

    files = {"file": ("products_malformed.csv", csv_with_errors.encode("utf-8"), "text/csv")}
    data = {"entity_type": "PRODUCTS", "source_system": "SUPPLIER_FEED"}

    res = client.post("/api/intake/upload", files=files, data=data, headers=admin_auth_headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["total_records"] == 3
    assert res_data["valid_records"] == 1
    assert res_data["rejected_records"] == 2
    assert res_data["status"] == "QUARANTINED"
    batch_id = res_data["batch_id"]

    # Query quarantined error records via API
    records_res = client.get(
        f"/api/intake/batches/{batch_id}/records?validation_status=REJECTED",
        headers=admin_auth_headers,
    )
    assert records_res.status_code == 200
    rejected_recs = records_res.json()
    assert len(rejected_recs) == 2
    assert any("Product name is required" in r["error_message"] for r in rejected_recs)
    assert any("Purchase cost cannot be negative" in r["error_message"] for r in rejected_recs)

