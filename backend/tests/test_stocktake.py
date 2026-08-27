import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import engine, get_db
from app.main import app
from app.models import Category, Employee, Product, Store

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_stocktake_session_and_manager_approval():
    db = TestingSessionLocal()

    store = Store(store_code=f"STR-STK-{uuid.uuid4().hex[:4].upper()}", name="Stocktake Store")
    cat = Category(name="Stocktake Cat", code=f"CAT-STK-{uuid.uuid4().hex[:4]}")
    emp = Employee(
        employee_code=f"EMP-MGR-{uuid.uuid4().hex[:4]}",
        first_name="Manager",
        last_name="Joe",
        email=f"mgr_{uuid.uuid4().hex[:4]}@ims.local",
    )
    db.add_all([store, cat, emp])
    db.commit()

    prod = Product(
        sku=f"SKU-STK-{uuid.uuid4().hex[:4]}",
        name="Audited Mouse",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=100,
    )
    db.add(prod)
    db.commit()

    store_id, prod_id, emp_id = store.id, prod.id, emp.id
    db.close()

    # Create Stocktake (System = 100, Physical = 97 -> Variance = -3)
    create_res = client.post(
        "/api/stocktakes",
        json={
            "store_id": store_id,
            "reason": "EXPIRY",
            "conducted_by_emp_id": emp_id,
            "items": [
                {
                    "product_id": prod_id,
                    "system_quantity": 100,
                    "physical_count": 97,
                    "notes": "3 expired items written off",
                }
            ],
        },
    )
    assert create_res.status_code == 201
    stk = create_res.json()
    assert stk["status"] == "IN_PROGRESS"
    assert stk["items"][0]["variance_quantity"] == -3
    stk_id = stk["id"]

    # Manager Approves Stocktake
    approve_res = client.post(f"/api/stocktakes/{stk_id}/approve?approved_by_emp_id={emp_id}")
    assert approve_res.status_code == 200
    approved_stk = approve_res.json()
    assert approved_stk["status"] == "APPROVED"

    # Verify inventory updated to physical count (97)
    db = TestingSessionLocal()
    p = db.query(Product).filter(Product.id == prod_id).first()
    assert p.stock_quantity == 97
    db.close()
