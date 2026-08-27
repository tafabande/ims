import uuid

import pytest

from app.database import Base, SessionLocal, engine
from app.models import (
    Employee,
)
from app.services import ingestion_service, integration_service

Base.metadata.create_all(bind=engine, checkfirst=True)


def test_csv_staging_and_sha256_duplicate_detection():
    """
    Test CSV data ingestion staging into ImportBatch & ImportRecord tables,
    and verify SHA-256 duplicate file hash detection.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    csv_content = (
        f"sku,name,purchase_price,selling_price\nPROD-ING-{unique_suffix},Test Ingest Product,10.00,15.00\n".encode()
    )

    # 1. First upload
    batch1, records1, is_dup1, dup_msg1 = ingestion_service.stage_and_validate_import(
        db=db, filename="products.csv", raw_content=csv_content, entity_type="PRODUCTS"
    )

    assert batch1.batch_id.startswith("IMP-2026-")
    assert batch1.record_count == 1
    assert batch1.valid_count == 1
    assert batch1.rejected_count == 0
    assert is_dup1 == False
    assert dup_msg1 is None
    assert len(records1) == 1
    assert records1[0].validation_status == "VALID"

    # 2. Second upload of exact same file -> SHA-256 duplicate warning
    _batch2, _records2, is_dup2, dup_msg2 = ingestion_service.stage_and_validate_import(
        db=db,
        filename="products_dup.csv",
        raw_content=csv_content,
        entity_type="PRODUCTS",
    )

    assert is_dup2 == True
    assert dup_msg2 is not None
    assert "Possible duplicate import" in dup_msg2

    db.close()


def test_dynamic_column_mapping_and_validation():
    """
    Test dynamic column header mapping (e.g. Vendor "Item Code" -> IMS "sku")
    and schema validation rules (e.g. rejecting negative price).
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    csv_content = (
        f"Item Code,Product Description,Cost Price,Retail Price\n"
        f"SKU-GOOD-{unique_suffix},Good Product,20.00,30.00\n"
        f"SKU-BAD-{unique_suffix},Bad Negative Product,20.00,-5.00\n"
    ).encode()

    col_mapping = {
        "Item Code": "sku",
        "Product Description": "name",
        "Cost Price": "purchase_price",
        "Retail Price": "selling_price",
    }

    batch, records, _is_dup, _ = ingestion_service.stage_and_validate_import(
        db=db,
        filename="vendor_catalog.csv",
        raw_content=csv_content,
        entity_type="PRODUCTS",
        column_mapping=col_mapping,
    )

    assert batch.record_count == 2
    assert batch.valid_count == 1
    assert batch.rejected_count == 1
    assert batch.status == "REQUIRES_CORRECTION"

    # Verify rejected record has error details
    rejected_rec = next(r for r in records if r.validation_status == "REJECTED")
    assert (
        "cannot be negative" in rejected_rec.error_message.lower()
        or "selling price" in rejected_rec.error_message.lower()
    )

    db.close()


def test_manager_approval_workflow_promotes_staging_to_core_db():
    """
    Test Manager Review & Approval Workflow: Validated staging records write into core PostgreSQL tables.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    csv_content = f"employee_code,first_name,last_name,email,job_title,department\nEMP-STAGE-{unique_suffix},Alice,Worker,alice_{unique_suffix.lower()}@corp.co.zw,Supervisor,Warehouse\n".encode()

    batch, _records, _, _ = ingestion_service.stage_and_validate_import(
        db=db,
        filename="employees.csv",
        raw_content=csv_content,
        entity_type="EMPLOYEES",
    )

    # Core DB should NOT have employee yet before approval
    emp_before = db.query(Employee).filter(Employee.employee_code == f"EMP-STAGE-{unique_suffix}").first()
    assert emp_before is None

    # Manager approves batch
    approved_batch = ingestion_service.approve_import_batch(db, batch.batch_id)
    assert approved_batch.status in ["APPROVED", "IMPORTED"]
    assert approved_batch.approved_at is not None

    # Core DB should now have Employee record
    emp_after = db.query(Employee).filter(Employee.employee_code == f"EMP-STAGE-{unique_suffix}").first()
    assert emp_after is not None
    assert emp_after.first_name == "Alice"
    assert emp_after.department.name == "Warehouse"

    db.close()


def test_integration_accounts_and_api_key_authentication():
    """
    Test Integration Accounts, API Key generation, SHA-256 key hashing, and scope validation.
    """
    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6].upper()

    # 1. Create Integration Account with scopes
    acc = integration_service.create_integration_account(
        db=db,
        name=f"ERP System {unique_suffix}",
        scopes=["products:create", "sales:read"],
    )
    assert acc.account_id.startswith("INT-2026-")

    # 2. Issue API Key
    _key_rec, plain_text_key = integration_service.generate_api_key_for_account(
        db=db, account_id=acc.account_id, key_name="Prod Key"
    )
    assert plain_text_key.startswith("ims_live_")

    # 3. Verify valid key authentication & scope check
    auth_res = integration_service.verify_integration_api_key(
        db=db, api_key=plain_text_key, required_scope="products:create"
    )
    auth_acc = auth_res[0] if isinstance(auth_res, tuple) else auth_res
    assert auth_acc.account_id == acc.account_id

    # 4. Verify invalid scope rejection
    with pytest.raises(Exception) as exc_info:
        integration_service.verify_integration_api_key(db=db, api_key=plain_text_key, required_scope="employees:delete")
    assert "lacks required scope" in str(exc_info.value.detail).lower()

    db.close()
