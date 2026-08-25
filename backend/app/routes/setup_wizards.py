from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    StoreWizardRequest, StoreResponse,
    WarehouseWizardRequest, WarehouseResponse,
    EmployeeWizardRequest, EmployeeResponse
)
from app.services.setup_service import (
    create_store_wizard, create_warehouse_wizard, create_employee_wizard
)
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/setup", tags=["Setup Wizards"])

@router.post("/store-wizard", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def wizard_create_store(
    payload: StoreWizardRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:manage"))
):
    store = create_store_wizard(db=db, data=payload)
    return store

@router.post("/warehouse-wizard", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def wizard_create_warehouse(
    payload: WarehouseWizardRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:manage"))
):
    wh = create_warehouse_wizard(db=db, data=payload)
    return wh

@router.post("/employee-wizard", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def wizard_create_employee(
    payload: EmployeeWizardRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:manage"))
):
    emp = create_employee_wizard(db=db, data=payload)
    return emp
