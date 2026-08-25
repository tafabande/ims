import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, get_db
from app.models import Category, Product, Employee, Department, JobRole
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

def test_employee_separation_without_user_account():
    """
    Test Domain Model: Create Employee without requiring a system User login account.
    """
    db = TestingSessionLocal()
    
    dept = Department(department_code=f"DEP-{uuid.uuid4().hex[:4]}", name="Logistics")
    db.add(dept)
    db.commit()

    role = JobRole(role_code=f"JOB-{uuid.uuid4().hex[:4]}", name="Forklift Driver", department_id=dept.id)
    db.add(role)
    db.commit()
    dept_id = dept.id
    role_id = role.id
    db.close()

    # Create Employee without user_id
    res = client.post("/api/organization/employees", json={
        "first_name": "Dave",
        "last_name": "Driver",
        "email": f"dave_{uuid.uuid4().hex[:6]}@ims.local",
        "department_id": dept_id,
        "job_role_id": role_id,
        "user_id": None,
        "status": "ACTIVE"
    }, headers={"X-User-Role": "ADMIN"})

    assert res.status_code == 201
    emp_data = res.json()
    assert emp_data["employee_code"].startswith("EMP-")
    assert emp_data["user_id"] is None

def test_hierarchical_categories_and_tree():
    """
    Test Category Hierarchy (parent_id) and category tree retrieval.
    """
    code_parent = f"CAT-PARENT-{uuid.uuid4().hex[:4]}"
    code_child = f"CAT-CHILD-{uuid.uuid4().hex[:4]}"

    # Parent Category
    res_p = client.post("/api/products/categories", json={
        "name": "Electronics Main",
        "code": code_parent,
        "description": "Main tech category"
    })
    assert res_p.status_code == 201
    parent_id = res_p.json()["id"]

    # Child Subcategory
    res_c = client.post("/api/products/categories", json={
        "name": "Laptops Subcategory",
        "code": code_child,
        "description": "Laptops subcategory",
        "parent_id": parent_id
    })
    assert res_c.status_code == 201

    # Fetch Category Tree
    res_tree = client.get("/api/products/categories/tree")
    assert res_tree.status_code == 200
    tree = res_tree.json()
    assert len(tree) > 0

    parent_in_tree = next((item for item in tree if item["id"] == parent_id), None)
    assert parent_in_tree is not None
    assert len(parent_in_tree["children"]) >= 1
    assert parent_in_tree["children"][0]["code"] == code_child

def test_category_referential_protection_on_deletion():
    """
    Test referential protection: Deleting a category with assigned products fails with 400 Bad Request.
    """
    db = TestingSessionLocal()
    code_cat = f"CAT-PROTECT-{uuid.uuid4().hex[:4]}"

    cat = Category(name="Protected Cat", code=code_cat)
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"SKU-PROT-{uuid.uuid4().hex[:4]}",
        name="Assigned Product",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=5
    )
    db.add(prod)
    db.commit()
    cat_id = cat.id
    db.close()

    # Attempt deletion of category with assigned product
    res_del = client.delete(f"/api/products/categories/{cat_id}")
    assert res_del.status_code == 400
    assert "products are currently assigned to it" in res_del.json()["detail"]
