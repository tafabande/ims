import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import IntegrationAccount, IntegrationActivityLog
from app.schemas import (
    ExternalEmployeeCreate,
    ExternalProductCreate,
    IntegrationAccountCreate,
    IntegrationAccountResponse,
    IntegrationActivityLogResponse,
)
from app.services import integration_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/v1/integrations", tags=["External System Integrations & API Accounts"])


# --- Integration Account & API Key Management ---


@router.post(
    "/accounts",
    response_model=IntegrationAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_integration_account(
    data: IntegrationAccountCreate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("users:manage")),  # Admin action
):
    """
    Creates an Integration Account (e.g., INT-2026-00012) for software-to-software integrations.
    """
    account, _secret_key = integration_service.generate_integration_account(
        db=db, name=data.name, description=data.description, scopes=data.scopes
    )

    # Return key in response only once
    resp = IntegrationAccountResponse.model_validate(account)
    return resp


@router.get("/accounts", response_model=list[IntegrationAccountResponse])
def list_integration_accounts(
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("users:manage")),
):
    accounts = db.query(IntegrationAccount).all()
    resps = []
    for a in accounts:
        try:
            parsed_scopes = json.loads(a.scopes_json or "[]")
            if isinstance(parsed_scopes, list):
                valid_scopes = [str(s) for s in parsed_scopes if isinstance(s, (str, int))]
            else:
                valid_scopes = []
        except Exception:
            valid_scopes = []

        item = IntegrationAccountResponse(
            id=a.id,
            account_id=a.account_id,
            name=a.name,
            description=a.description,
            status=a.status,
            scopes=valid_scopes,
            created_at=a.created_at,
            expires_at=a.expires_at,
        )
        resps.append(item)
    return resps


@router.get("/activity-logs", response_model=list[IntegrationActivityLogResponse])
def get_integration_activity_logs(
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("audit:read")),
):
    logs = db.query(IntegrationActivityLog).order_by(IntegrationActivityLog.timestamp.desc()).limit(100).all()
    return logs


# --- Controlled REST API Integration Endpoints ---


@router.post("/products", status_code=status.HTTP_201_CREATED)
def external_ingest_product(
    payload: ExternalProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    account: IntegrationAccount = Depends(integration_service.require_integration_scope("products:write")),
):
    """
    External API endpoint for adding or updating products from POS/ERP systems.
    Requires scope 'products:write'.
    """
    try:
        product = integration_service.ingest_external_product(db, payload.model_dump(), account)
        integration_service.log_integration_activity(
            db,
            account.account_id,
            "/api/v1/integrations/products",
            "POST",
            201,
            request.client.host if request.client else "127.0.0.1",
        )
        return {
            "status": "success",
            "message": "Product ingested successfully via API",
            "product_id": product.id,
            "sku": product.sku,
        }
    except Exception as e:
        integration_service.log_integration_activity(
            db,
            account.account_id,
            "/api/v1/integrations/products",
            "POST",
            400,
            request.client.host if request.client else "127.0.0.1",
            str(e),
        )
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def external_ingest_employee(
    payload: ExternalEmployeeCreate,
    request: Request,
    db: Session = Depends(get_db),
    account: IntegrationAccount = Depends(integration_service.require_integration_scope("employees:write")),
):
    """
    External API endpoint for syncing employee records from HR system.
    Requires scope 'employees:write'.
    """
    try:
        emp = integration_service.ingest_external_employee(db, payload.model_dump(), account)
        integration_service.log_integration_activity(
            db,
            account.account_id,
            "/api/v1/integrations/employees",
            "POST",
            201,
            request.client.host if request.client else "127.0.0.1",
        )
        return {
            "status": "success",
            "message": "Employee record ingested successfully via API",
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
        }
    except Exception as e:
        integration_service.log_integration_activity(
            db,
            account.account_id,
            "/api/v1/integrations/employees",
            "POST",
            400,
            request.client.host if request.client else "127.0.0.1",
            str(e),
        )
        raise HTTPException(status_code=400, detail=str(e)) from e
