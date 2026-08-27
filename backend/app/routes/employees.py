from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department, Employee, InventoryTransaction, JobRole, ReturnOrder, Sale
from app.schemas import (
    DepartmentCreate,
    DepartmentResponse,
    EmployeeActivityResponse,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    JobRoleCreate,
    JobRoleResponse,
)
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/organization", tags=["Organization & Employees"])

# ----------------- Departments -----------------


@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()


@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("users:create")),
):
    existing = db.query(Department).filter(Department.department_code == dept_in.department_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists.")

    dept = Department(**dept_in.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# ----------------- Organizational Job Roles -----------------


@router.get("/job-roles", response_model=list[JobRoleResponse])
def list_job_roles(db: Session = Depends(get_db)):
    return db.query(JobRole).all()


@router.post("/job-roles", response_model=JobRoleResponse, status_code=status.HTTP_201_CREATED)
def create_job_role(
    role_in: JobRoleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("users:create")),
):
    existing = db.query(JobRole).filter(JobRole.role_code == role_in.role_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job role code already exists.")

    role = JobRole(**role_in.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


# ----------------- Employees -----------------


@router.get("/employees", response_model=list[EmployeeResponse])
def list_employees(
    store_id: int | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """
    List all organizational employees with optional filtering (store_id, status, search name/code).
    """
    query = db.query(Employee)
    if store_id:
        query = query.filter(Employee.store_id == store_id)
    if status_filter:
        query = query.filter(Employee.status == status_filter)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Employee.first_name.ilike(pattern),
                Employee.last_name.ilike(pattern),
                Employee.employee_code.ilike(pattern),
                Employee.email.ilike(pattern),
            )
        )

    employees = query.order_by(Employee.id.desc()).all()

    # Enrich with store_name and manager_name
    result = []
    for emp in employees:
        resp = EmployeeResponse.model_validate(emp)
        if emp.store:
            resp.store_name = emp.store.name
        if emp.manager:
            resp.manager_name = f"{emp.manager.first_name} {emp.manager.last_name}"
        result.append(resp)

    return result


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    resp = EmployeeResponse.model_validate(emp)
    if emp.store:
        resp.store_name = emp.store.name
    if emp.manager:
        resp.manager_name = f"{emp.manager.first_name} {emp.manager.last_name}"
    return resp


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("users:create")),
):
    """
    Create organizational employee record with stable human code (EMP-2026-XXXXX).
    Allows creating non-user employees (unlinked to login account).
    """
    existing_email = db.query(Employee).filter(Employee.email == emp_in.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Employee email already registered.")

    emp = Employee(**emp_in.model_dump(), employee_code="TEMP")
    db.add(emp)
    db.commit()
    db.refresh(emp)

    emp.employee_code = f"EMP-2026-{emp.id:05d}"
    db.commit()
    db.refresh(emp)

    resp = EmployeeResponse.model_validate(emp)
    if emp.store:
        resp.store_name = emp.store.name
    if emp.manager:
        resp.manager_name = f"{emp.manager.first_name} {emp.manager.last_name}"
    return resp


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    emp_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_permission("users:create")),
):
    """
    Update employee profile, position, store assignment, or status (soft deactivation).
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = emp_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(emp, field, val)

    db.commit()
    db.refresh(emp)

    resp = EmployeeResponse.model_validate(emp)
    if emp.store:
        resp.store_name = emp.store.name
    if emp.manager:
        resp.manager_name = f"{emp.manager.first_name} {emp.manager.last_name}"
    return resp


@router.get("/employees/{employee_id}/activity", response_model=EmployeeActivityResponse)
def get_employee_activity(employee_id: int, db: Session = Depends(get_db)):
    """
    Exposes operational activity history for an employee within IMS:
    Aggregates POS sales count/revenue, returns processed, stock adjustments, and last activity timestamp.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    full_name = f"{emp.first_name} {emp.last_name}"

    # Query Sales processed by this employee (by created_by name or code)
    sales = (
        db.query(Sale)
        .filter(
            or_(
                Sale.created_by == full_name,
                Sale.created_by == emp.employee_code,
                Sale.created_by == emp.email,
            )
        )
        .all()
    )
    sales_count = len(sales)
    sales_amount = sum(s.total_amount for s in sales)

    # Query Returns approved by this employee
    returns_count = db.query(ReturnOrder).filter(ReturnOrder.approved_by_emp_id == employee_id).count()

    # Query Inventory audit adjustments by this employee
    adjustments_count = (
        db.query(InventoryTransaction)
        .filter(
            or_(
                InventoryTransaction.user_name == full_name,
                InventoryTransaction.user_name == emp.employee_code,
            )
        )
        .count()
    )

    # Determine last activity timestamp
    last_tx = (
        db.query(InventoryTransaction)
        .filter(
            or_(
                InventoryTransaction.user_name == full_name,
                InventoryTransaction.user_name == emp.employee_code,
            )
        )
        .order_by(InventoryTransaction.created_at.desc())
        .first()
    )

    last_ts = last_tx.created_at if last_tx else emp.created_at

    return EmployeeActivityResponse(
        employee_id=emp.id,
        employee_code=emp.employee_code,
        full_name=full_name,
        position=emp.position,
        store_id=emp.store_id,
        status=emp.status,
        total_sales_count=sales_count,
        total_sales_amount=round(sales_amount, 2),
        total_returns_count=returns_count,
        total_adjustments_count=adjustments_count,
        last_activity_timestamp=last_ts,
    )
