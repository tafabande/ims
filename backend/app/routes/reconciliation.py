from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import ReconciliationScanRequest, ReconciliationExceptionResponse, ExceptionResolveRequest
from app.services import reconciliation_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/reconciliation", tags=["Reconciliation & Anomaly Exception Engine"])

@router.post("/scan", response_model=List[ReconciliationExceptionResponse])
def trigger_reconciliation_scan(
    scan_data: Optional[ReconciliationScanRequest] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view"))
):
    """
    Trigger automated reconciliation scan across transaction ledgers and sales invoices.
    """
    store_id = scan_data.store_id if scan_data else None
    wh_id = scan_data.warehouse_id if scan_data else None
    
    variances = reconciliation_service.run_inventory_reconciliation_scan(db, store_id, wh_id)
    anomalies = reconciliation_service.detect_sales_inventory_anomalies(db)
    return list_reconciliation_exceptions(status_filter=None, db=db, auth_ctx=auth_ctx)

@router.get("/exceptions", response_model=List[ReconciliationExceptionResponse])
def list_reconciliation_exceptions(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("inventory:view"))
):
    return reconciliation_service.list_reconciliation_exceptions(db, status_filter)

@router.post("/exceptions/{exception_id}/resolve", response_model=ReconciliationExceptionResponse)
def resolve_inventory_exception(
    exception_id: int,
    resolve_data: ExceptionResolveRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or Auditor
):
    return reconciliation_service.resolve_exception(
        db,
        exception_id,
        resolve_data.resolution_type,
        resolve_data.investigation_notes
    )
