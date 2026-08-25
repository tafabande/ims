import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, get_db
from app.models import Employee, Store
from sqlalchemy.orm import sessionmaker

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_lean_employee_creation_without_user_account():
    db = TestingSessionLocal()
    store = Store(store_code=f"STR-EMP-{uuid.uuid4().hex[:4].upper()}", name="Employee Test Store")
    db.add(store)
    db.commit()
    store_id = store.id
    db.close()

    res = client.post("/api/organization/employees", json={
        "first_name": "John",
        "last_name": "Banda",
        "email": f"john_{uuid.uuid4().hex[:6]}@ims.local",
        "phone": "+263 77 111 2233",
        "position": "CASHIER",
        "store_id": store_id,
        "user_id": None,
        "status": "ACTIVE"
    }, headers={"X-User-Role": "ADMIN"})

    assert res.status_code == 201
    emp = res.json()
    assert emp["employee_code"].startswith("EMP-2026-")
    assert emp["position"] == "CASHIER"
    assert emp["store_id"] == store_id
    assert emp["user_id"] is None
    emp_id = emp["id"]

    # Test update position and manager
    update_res = client.put(f"/api/organization/employees/{emp_id}", json={
        "position": "STORE_MANAGER",
        "status": "ACTIVE"
    }, headers={"X-User-Role": "ADMIN"})
    assert update_res.status_code == 200
    updated_emp = update_res.json()
    assert updated_emp["position"] == "STORE_MANAGER"

    # Test Soft Deactivation (TERMINATED)
    deactivate_res = client.put(f"/api/organization/employees/{emp_id}", json={
        "status": "TERMINATED"
    }, headers={"X-User-Role": "ADMIN"})
    assert deactivate_res.status_code == 200
    assert deactivate_res.json()["status"] == "TERMINATED"

    # Test Operational Activity Endpoint
    activity_res = client.get(f"/api/organization/employees/{emp_id}/activity")
    assert activity_res.status_code == 200
    act = activity_res.json()
    assert act["employee_id"] == emp_id
    assert act["status"] == "TERMINATED"
    assert "total_sales_count" in act
