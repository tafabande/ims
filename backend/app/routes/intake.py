"""
Enterprise Data Intake & Canonical Integration Gateway Router:
Provides REST API endpoints for Data Dictionary inspection, versioned template generation,
multi-channel staging quarantine, M2M API integration, provenance tracking, and cross-system identity reconciliation.
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExternalEntityMapping, ExternalEntityMappingHistory, ImportBatch, ImportRecord, User
from app.routes.auth import get_current_user
from app.schemas import (
    BatchPreviewResponse,
    BatchReconciliationResponse,
    DataDictionaryContractResponse,
    ExternalEntityMappingCreate,
    ExternalEntityMappingHistoryResponse,
    ExternalEntityMappingResponse,
    ImportBatchResponse,
    ImportRecordResponse,
)
from app.services.data_dictionary_service import (
    get_all_canonical_contracts,
    get_contract_for_entity,
)
from app.services.ingestion_service import (
    approve_import_batch,
    execute_approved_batch,
    process_intake_payload,
    suggest_column_mapping,
    validate_and_stage_import,
)
from app.services.template_service import generate_csv_template

router = APIRouter(prefix="/api/intake", tags=["Enterprise Data Intake"])


# ==========================================
# 1. CANONICAL DATA DICTIONARY & CONTRACTS
# ==========================================


@router.get("/dictionary", response_model=list[DataDictionaryContractResponse])
def get_enterprise_data_dictionary():
    """
    Returns the Enterprise Canonical Data Dictionary contracts.
    Serves as the single source of truth for field definitions, constraints, data types, and risk levels.
    """
    return get_all_canonical_contracts()


@router.get("/dictionary/{entity_type}", response_model=DataDictionaryContractResponse)
def get_entity_data_contract(entity_type: str):
    """
    Returns canonical schema contract for a specific entity type (e.g. EMPLOYEES, PRODUCTS).
    """
    contract = get_contract_for_entity(entity_type)
    if not contract:
        raise HTTPException(
            status_code=404,
            detail=f"Canonical contract for entity '{entity_type}' not found.",
        )
    return contract


# ==========================================
# 2. VERSIONED TEMPLATE GENERATION
# ==========================================


@router.get("/templates/{entity_type}")
def download_versioned_import_template(
    entity_type: str,
    include_sample: bool = Query(True, description="Include a sample demonstration row"),
):
    """
    Dynamically generates and returns a versioned CSV import template with canonical headers
    and embedded schema version comments.
    """
    try:
        csv_content = generate_csv_template(entity_type, include_sample_row=include_sample)
        contract = get_contract_for_entity(entity_type)
        version = contract["schema_version"] if contract else "1.0"
        filename = f"IMS_Template_{entity_type.upper()}_{version}.csv"

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# 3. CSV/XLSX MULTIPART UPLOAD INTAKE
# ==========================================


@router.post("/upload", response_model=dict[str, Any])
async def upload_intake_file(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    source_system: str = Form("LOCAL_UPLOAD"),
    schema_version: str | None = Form(None),
    source_reference: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enterprise Intake Gateway for File Uploads (CSV / XLSX):
    1. Parses uploaded file and extracts versioned schema metadata.
    2. Suggests/applies canonical column mappings.
    3. Stages records into quarantine staging tables (`ImportBatch` & `ImportRecord`).
    4. Evaluates risk factor and tags provenance.
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    from app.services.ingestion_service import parse_csv_or_excel
    file_headers, _ = parse_csv_or_excel(content, file.filename)
    mapping = suggest_column_mapping(entity_type, file_headers)

    result = validate_and_stage_import(
        db=db,
        filename=file.filename,
        file_bytes=content,
        entity_type=entity_type,
        column_mapping=mapping,
        uploader_user_id=current_user.id,
        source_type="CSV" if file.filename.endswith(".csv") else "EXCEL",
        source_system=source_system,
        schema_version=schema_version,
        source_reference=source_reference or file.filename,
    )
    return result


# ==========================================
# 4. MACHINE-TO-MACHINE (M2M) API INTAKE
# ==========================================


@router.post("/integrations/{source_system}/{entity_type}", response_model=dict[str, Any])
def api_m2m_intake_gateway(
    source_system: str,
    entity_type: str,
    payload: list[dict[str, Any]],
    schema_version: str | None = Query(None),
    source_reference: str | None = Query(None),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """
    Machine-to-Machine (M2M) Intake Gateway:
    External systems (HR, ERP, POS, Suppliers) authenticate with cryptographic API keys.
    Enforces allowed_source_system boundary and granular permissions (e.g. employees:write).
    Data passes through canonical validation, quarantine staging, and provenance attribution.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Payload record array cannot be empty.")

    from app.services.integration_auth_service import verify_integration_identity

    required_scope = f"{entity_type.lower()}:write"
    account = verify_integration_identity(
        api_key=x_api_key or "",
        required_scope=required_scope,
        expected_system=source_system,
        db=db,
        endpoint=f"/api/intake/integrations/{source_system}/{entity_type}",
    )

    result = process_intake_payload(
        db=db,
        entity_type=entity_type,
        records=payload,
        source_system=source_system.upper(),
        source_type="API",
        schema_version=schema_version,
        source_reference=source_reference or f"M2M-{account.account_id}",
        uploader_user_id=None,
    )
    return result


# ==========================================
# 5. IMPORT BATCHES & QUARANTINE INSPECTOR
# ==========================================


@router.get("/batches", response_model=list[ImportBatchResponse])
def list_import_batches(
    status_filter: str | None = Query(None, alias="status"),
    entity_filter: str | None = Query(None, alias="entity_type"),
    source_filter: str | None = Query(None, alias="source_system"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists intake import batches with provenance metadata, status filters, and error metrics.
    """
    query = db.query(ImportBatch)
    if status_filter:
        query = query.filter(ImportBatch.status == status_filter.upper())
    if entity_filter:
        query = query.filter(ImportBatch.entity_type == entity_filter.upper())
    if source_filter:
        query = query.filter(ImportBatch.source_system == source_filter.upper())

    return query.order_by(ImportBatch.created_at.desc()).all()


@router.get("/batches/{batch_id}", response_model=ImportBatchResponse)
def get_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Inspects specific import batch metadata.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")
    return batch


@router.get("/batches/{batch_id}/records", response_model=list[ImportRecordResponse])
def get_batch_quarantine_records(
    batch_id: str,
    validation_status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Inspects staged/quarantined records and field-level validation errors for a batch.
    """
    query = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id)
    if validation_status:
        query = query.filter(ImportRecord.validation_status == validation_status.upper())
    return query.order_by(ImportRecord.row_number.asc()).limit(limit).all()


@router.get("/batches/{batch_id}/preview", response_model=BatchPreviewResponse)
def get_batch_preview_diff(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns proposed changes preview (CREATE / UPDATE / NO_CHANGE / REJECT) before commit.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    records = db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).all()
    create_cnt = sum(1 for r in records if r.action_type == "CREATE" and r.validation_status == "VALID")
    update_cnt = sum(1 for r in records if r.action_type == "UPDATE" and r.validation_status == "VALID")
    no_change_cnt = sum(1 for r in records if r.action_type == "NO_CHANGE" and r.validation_status == "VALID")
    rejected_cnt = sum(1 for r in records if r.validation_status != "VALID")

    return BatchPreviewResponse(
        batch_id=batch.batch_id,
        entity_type=batch.entity_type,
        risk_level=batch.risk_level or "LOW",
        status=batch.status,
        content_hash=batch.content_hash,
        total_records=batch.record_count,
        valid_records=batch.valid_count,
        rejected_records=rejected_cnt,
        create_count=create_cnt,
        update_count=update_cnt,
        no_change_count=no_change_cnt,
        requires_approval=(batch.risk_level == "HIGH"),
        uploader_user_id=batch.uploader_user_id,
    )


@router.post("/batches/{batch_id}/approve", response_model=ImportBatchResponse)
def approve_high_risk_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approves a staged high-risk import batch and binds an approval fingerprint.
    Strictly enforces Separation of Duties: Requester/uploader cannot approve their own batch.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    if current_user.role not in ["APP_ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Manager or Admin privileges required to approve import batches.")

    return approve_import_batch(db, batch_id, current_user.id)


@router.post("/batches/{batch_id}/commit", response_model=ImportBatchResponse)
def commit_intake_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Commits a validated/approved staging batch into domain tables and synchronizes external identity mappings.
    Enforces Separation of Duties and verifies approval snapshot fingerprints on high-risk imports.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    # Check high-risk approval restriction
    if batch.risk_level == "HIGH" and batch.status == "PENDING_APPROVAL":
        if current_user.role not in ["APP_ADMIN", "MANAGER"]:
            raise HTTPException(
                status_code=403,
                detail=f"Batch '{batch_id}' is rated HIGH RISK and requires Manager or Admin approval.",
            )

    return execute_approved_batch(db, batch_id, current_user.id)


@router.get("/batches/{batch_id}/reconciliation", response_model=BatchReconciliationResponse)
def get_batch_reconciliation_report(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns post-commit reconciliation ledger report proving accepted input equals domain state changes.
    """
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch '{batch_id}' not found.")

    if not batch.reconciliation_json:
        raise HTTPException(status_code=400, detail=f"Batch '{batch_id}' has not yet been committed to production.")

    import json
    report = json.loads(batch.reconciliation_json)

    return BatchReconciliationResponse(
        batch_id=batch.batch_id,
        entity_type=batch.entity_type,
        source_system=batch.source_system or "UNKNOWN",
        status=batch.status,
        total_imported=batch.record_count,
        accepted_count=batch.valid_count,
        rejected_count=batch.rejected_count,
        created_count=batch.created_records_count or 0,
        updated_count=batch.updated_records_count or 0,
        unchanged_count=batch.unchanged_records_count or 0,
        reconciliation_delta=batch.reconciliation_delta or 0.0,
        is_reconciled=(batch.reconciliation_delta == 0.0),
        checksum=report.get("checksum"),
        reconciliation_summary=report,
    )


@router.get("/reconciliation/verify-chain", response_model=dict[str, Any])
def verify_hash_chain_integrity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cryptographically verifies the append-only hash chain of all historical reconciliation records.
    Walks sequential links from genesis to current head and validates equations.
    """
    from app.services.ingestion_service import verify_reconciliation_hash_chain
    return verify_reconciliation_hash_chain(db)


# ==========================================
# 6. CANONICAL IDENTITY MAPPINGS (RECONCILIATION & HISTORY)
# ==========================================


@router.get("/mappings", response_model=list[ExternalEntityMappingResponse])
def list_external_identity_mappings(
    entity_type: str | None = Query(None),
    source_system: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists cross-system canonical identity mappings (e.g. HR EMP-492 -> IMS EMP-00128).
    """
    query = db.query(ExternalEntityMapping)
    if entity_type:
        query = query.filter(ExternalEntityMapping.entity_type == entity_type.upper())
    if source_system:
        query = query.filter(ExternalEntityMapping.source_system == source_system.upper())
    return query.order_by(ExternalEntityMapping.created_at.desc()).all()


@router.get("/mappings/{mapping_id}/history", response_model=list[ExternalEntityMappingHistoryResponse])
def get_mapping_history(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns complete append-only lineage history of external identity remapping events.
    """
    return (
        db.query(ExternalEntityMappingHistory)
        .filter(ExternalEntityMappingHistory.mapping_id == mapping_id)
        .order_by(ExternalEntityMappingHistory.created_at.desc())
        .all()
    )


@router.post("/mappings", response_model=ExternalEntityMappingResponse, status_code=status.HTTP_201_CREATED)
def create_external_identity_mapping(
    mapping_in: ExternalEntityMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually creates or links an external source ID to an internal canonical IMS identifier.
    Logs immutable audit entry in ExternalEntityMappingHistory.
    """
    existing = (
        db.query(ExternalEntityMapping)
        .filter(
            ExternalEntityMapping.entity_type == mapping_in.entity_type.upper(),
            ExternalEntityMapping.source_system == mapping_in.source_system.upper(),
            ExternalEntityMapping.external_id == mapping_in.external_id,
        )
        .first()
    )
    if existing:
        if existing.internal_code != mapping_in.internal_code:
            hist = ExternalEntityMappingHistory(
                mapping_id=existing.id,
                entity_type=existing.entity_type,
                source_system=existing.source_system,
                external_id=existing.external_id,
                old_internal_code=existing.internal_code,
                new_internal_code=mapping_in.internal_code,
                reason="Manual remapping update via UI/API",
                changed_by_user_id=current_user.id,
                created_at=datetime.now(UTC),
            )
            db.add(hist)
        existing.internal_code = mapping_in.internal_code
        existing.metadata_json = mapping_in.metadata_json
        db.commit()
        db.refresh(existing)
        return existing

    try:
        mapping = ExternalEntityMapping(
            entity_type=mapping_in.entity_type.upper(),
            internal_code=mapping_in.internal_code,
            source_system=mapping_in.source_system.upper(),
            external_id=mapping_in.external_id,
            metadata_json=mapping_in.metadata_json,
        )
        db.add(mapping)
        db.commit()
        db.refresh(mapping)

        hist = ExternalEntityMappingHistory(
            mapping_id=mapping.id,
            entity_type=mapping.entity_type,
            source_system=mapping.source_system,
            external_id=mapping.external_id,
            old_internal_code=None,
            new_internal_code=mapping.internal_code,
            reason="Manual initial mapping registration",
            changed_by_user_id=current_user.id,
            created_at=datetime.now(UTC),
        )
        db.add(hist)
        db.commit()
        return mapping
    except Exception:
        db.rollback()
        # Concurrency race condition recovery: return the mapping created concurrently
        winner = (
            db.query(ExternalEntityMapping)
            .filter(
                ExternalEntityMapping.entity_type == mapping_in.entity_type.upper(),
                ExternalEntityMapping.source_system == mapping_in.source_system.upper(),
                ExternalEntityMapping.external_id == mapping_in.external_id,
            )
            .first()
        )
        if winner:
            return winner
        raise


# ==========================================
# 8. AUDIT LINEAGE TRACER ("NO GHOSTS")
# ==========================================


@router.get("/lineage/{entity_type}/{entity_id}", response_model=dict[str, Any])
def trace_entity_import_lineage(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    WALKS COMPLETE AUDIT LINEAGE CHAIN:
    Source System -> Integration Credential -> Source Event -> Import Batch ->
    Import Record -> External ID -> Canonical ID -> Domain Entity ->
    Inventory Transaction -> Ledger Event -> Reconciliation Record (Hash Chain)
    Requires AUDITOR, MANAGER, or ADMIN role.
    """
    user_role = getattr(current_user, "role", "STAFF")
    user_perms = getattr(current_user, "permissions", []) or []
    if (
        user_role not in ["ADMIN", "APP_ADMIN", "MANAGER", "AUDITOR"]
        and "*" not in user_perms
        and "intake:audit" not in user_perms
        and "audit:read" not in user_perms
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Cross-system provenance lineage tracing requires auditor, manager, or administrator authorization.",
        )

    from app.services.ingestion_service import get_import_lineage_trace
    return get_import_lineage_trace(db=db, entity_type=entity_type, entity_id=entity_id)
