from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Employee, Store, User, Warehouse
from app.schemas import (
    EmployeeWizardRequest,
    StoreWizardRequest,
    WarehouseWizardRequest,
)
from app.services.iam_service import get_password_hash


def create_store_wizard(db: Session, data: StoreWizardRequest) -> Store:
    """
    Guided Store creation with auto-generated identifier and automatic default warehouse creation.
    """
    # Extract store city prefix (e.g., "Harare Main Store" -> "HRE")
    clean_name = data.name.strip().upper()
    prefix = "HRE"
    if "BULAWAYO" in clean_name or "BYO" in clean_name:
        prefix = "BYO"
    elif "MUTARE" in clean_name or "MTR" in clean_name:
        prefix = "MTR"
    elif "GWERU" in clean_name or "GWU" in clean_name:
        prefix = "GWU"

    store_count = db.query(Store).count() + 1
    store_code = f"STR-{prefix}-{store_count:03d}"

    store = Store(
        store_code=store_code,
        name=data.name,
        address=data.address,
        phone=data.phone,
        manager_id=data.manager_id,
        status="ACTIVE",
        operating_hours="08:00 - 18:00",
    )
    db.add(store)
    db.flush()

    # Automatically create default warehouse if requested
    if data.create_default_warehouse:
        wh_code = f"WH-{prefix}-{store_count:03d}"
        wh = Warehouse(
            warehouse_code=wh_code,
            name=f"{data.name} Main Warehouse",
            store_id=store.id,
            is_default=True,
            status="ACTIVE",
        )
        db.add(wh)

    db.commit()
    db.refresh(store)
    return store


def create_warehouse_wizard(db: Session, data: WarehouseWizardRequest) -> Warehouse:
    """
    Guided Warehouse setup wizard with automatic identifier generation.
    """
    store = db.query(Store).filter(Store.id == data.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail=f"Store ID {data.store_id} not found.")

    wh_count = db.query(Warehouse).filter(Warehouse.store_id == data.store_id).count() + 1
    store_suffix = store.store_code.replace("STR-", "")
    wh_code = f"WH-{store_suffix}-{wh_count:02d}"

    wh = Warehouse(
        warehouse_code=wh_code,
        name=data.name,
        store_id=data.store_id,
        is_default=False,
        status="ACTIVE",
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


def create_employee_wizard(db: Session, data: EmployeeWizardRequest) -> Employee:
    """
    Guided Employee onboarding wizard with optional one-click login account generation.
    """
    emp_count = db.query(Employee).count() + 1
    emp_code = f"EMP-2026-{emp_count:05d}"

    emp = Employee(
        employee_code=emp_code,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        position=data.position.upper(),
        department_id=data.department_id,
        store_id=data.store_id,
        manager_id=data.manager_id,
        status="ACTIVE",
    )
    db.add(emp)
    db.flush()

    # Create associated system login user account if checked
    if data.create_user_account:
        existing_user = db.query(User).filter(User.email == data.email).first()
        if not existing_user:
            user_count = db.query(User).count() + 1
            user_code = f"USR-2026-{user_count:05d}"
            role = "STAFF"
            if "MANAGER" in data.position.upper() or "ADMIN" in data.position.upper():
                role = "MANAGER"

            hashed_pwd = get_password_hash(data.password or "ChangeMe2026!")
            user = User(
                user_code=user_code,
                email=data.email,
                hashed_password=hashed_pwd,
                full_name=f"{data.first_name} {data.last_name}",
                role=role,
                active=True,
            )

            db.add(user)
            db.flush()
            emp.user_id = user.id

    db.commit()
    db.refresh(emp)
    return emp
