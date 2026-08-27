import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import engine, get_db
from app.main import app
from app.models import Employee, Register, Store

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_store_creation_and_auto_warehouse():
    store_code = f"STR-TEST-{uuid.uuid4().hex[:4].upper()}"
    res = client.post(
        "/api/stores",
        json={
            "store_code": store_code,
            "name": "Test Store Branch",
            "address": "123 Main St",
            "phone": "+1 555-0999",
            "status": "ACTIVE",
        },
    )
    assert res.status_code == 201
    store = res.json()
    assert store["store_code"] == store_code
    store_id = store["id"]

    # Verify auto-created warehouse
    wh_res = client.get(f"/api/stores/{store_id}/warehouses")
    assert wh_res.status_code == 200
    warehouses = wh_res.json()
    assert len(warehouses) >= 1
    assert warehouses[0]["store_id"] == store_id


def test_shift_open_close_cash_variance():
    db = TestingSessionLocal()

    # Create Store, Register, and Employee
    s_code = f"STR-{uuid.uuid4().hex[:4].upper()}"
    store = Store(store_code=s_code, name="Shift Test Store")
    db.add(store)
    db.commit()

    reg_code = f"POS-{uuid.uuid4().hex[:4].upper()}"
    register = Register(register_code=reg_code, store_id=store.id, name="Register 1")
    db.add(register)

    emp_code = f"EMP-{uuid.uuid4().hex[:4].upper()}"
    emp = Employee(
        employee_code=emp_code,
        first_name="Sam",
        last_name="Cashier",
        email=f"sam_{uuid.uuid4().hex[:4]}@ims.local",
    )
    db.add(emp)
    db.commit()

    store_id = store.id
    reg_id = register.id
    emp_id = emp.id
    db.close()

    # Open Shift
    open_res = client.post(
        "/api/shifts/open",
        json={
            "employee_id": emp_id,
            "store_id": store_id,
            "register_id": reg_id,
            "opening_cash": 200.0,
        },
    )
    assert open_res.status_code == 201
    shift = open_res.json()
    assert shift["opening_cash"] == 200.0
    assert shift["status"] == "OPEN"
    shift_id = shift["id"]

    # Close Shift with Actual Cash $195 (Expected $200, Variance -$5.00)
    close_res = client.post(
        f"/api/shifts/{shift_id}/close",
        json={"actual_cash": 195.0, "supervisor_id": emp_id},
    )
    assert close_res.status_code == 200
    closed_shift = close_res.json()
    assert closed_shift["status"] == "CLOSED"
    assert closed_shift["expected_cash"] == 200.0
    assert closed_shift["actual_cash"] == 195.0
    assert closed_shift["variance"] == -5.0
