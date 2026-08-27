from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ImportBatch, ImportRecord
from app.schemas import (
    ImportBatchResponse,
    ImportRecordResponse,
    ValidationResultResponse,
)
from app.services import ingestion_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/v1/import", tags=["Import Center & Data Ingestion Engine"])


@router.post("/stage", response_model=ValidationResultResponse)
async def stage_file_import(
    entity_type: str = Form(...),
    file: UploadFile = File(...),
    column_mapping_json: str | None = Form(None),
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:adjust")),
):
    """
    Data Ingestion & Staging Endpoint:
    1. Computes SHA-256 hash to detect duplicate file uploads.
    2. Parses raw CSV/Excel data into staging database tables (`ImportBatch` & `ImportRecord`).
    3. Normalizes dynamic column headers.
    4. Validates each row against business rules without modifying production tables.
    """
    raw_content = await file.read()
    if not raw_content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    column_mapping = None
    if column_mapping_json:
        import json

        try:
            column_mapping = json.loads(column_mapping_json)
        except Exception:
            column_mapping = None

    batch, records, is_duplicate, dup_msg = ingestion_service.stage_and_validate_import(
        db=db,
        filename=file.filename or "upload.csv",
        raw_content=raw_content,
        entity_type=entity_type,
        uploader_user_id=auth_ctx.get("user_id"),
        column_mapping=column_mapping,
    )

    errs = []
    for r in records:
        if r.validation_status == "REJECTED":
            errs.append(
                {
                    "row_number": r.row_number,
                    "error": r.error_message,
                    "raw_data": r.raw_data_json,
                }
            )

    return {
        "batch_id": batch.batch_id,
        "total_records": batch.record_count,
        "valid_records": batch.valid_count,
        "rejected_records": batch.rejected_count,
        "status": batch.status,
        "is_duplicate": is_duplicate,
        "duplicate_warning_message": dup_msg,
        "errors": errs,
    }


@router.post("/{batch_id}/approve", response_model=ImportBatchResponse)
def approve_staged_import_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:adjust")),
):
    """
    Manager Review & Approval Workflow:
    Promotes validated staging records from `ImportRecord` into production PostgreSQL tables.
    """
    return ingestion_service.approve_import_batch(db=db, batch_id=batch_id, approver_user_id=auth_ctx.get("user_id"))


@router.get("/batches", response_model=list[ImportBatchResponse])
def list_import_batches(
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Import History & Provenance Audit Log: List all imported file batches (`IMP-2026-XXXX`).
    """
    return db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()


@router.get("/batches/{batch_id}/records", response_model=list[ImportRecordResponse])
def get_import_batch_records(
    batch_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Fetch row-by-row staging records and validation errors for a specific import batch.
    """
    return (
        db.query(ImportRecord).filter(ImportRecord.batch_id == batch_id).order_by(ImportRecord.row_number.asc()).all()
    )


@router.get("/templates/{entity_type}")
def download_import_template(entity_type: str):
    """
    Downloadable Import Templates: Serves standard CSV templates with headers & instruction sample rows.
    """
    csv_str = ingestion_service.generate_import_template_csv(entity_type)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type.lower()}_template.csv"},
    )


@router.get("/export/{entity_type}")
def export_data_to_csv(
    entity_type: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Bulk Data Export Engine: Download system records (Products, Employees, Suppliers, Customers) as CSV.
    """
    csv_str = ingestion_service.export_entity_data_to_csv(db, entity_type)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type.lower()}_export.csv"},
    )
