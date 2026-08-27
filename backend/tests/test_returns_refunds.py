import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database import engine, get_db
from app.main import app
from app.models import Category, Customer, Product, Sale, SaleItem

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_pos_return_restock_and_damage_writeoff():
    db = TestingSessionLocal()

    cat = Category(name="Returns Test Cat", code=f"CAT-RET-{uuid.uuid4().hex[:4]}")
    cust = Customer(name="Return Test Customer")
    db.add_all([cat, cust])
    db.commit()

    prod = Product(
        sku=f"SKU-RET-{uuid.uuid4().hex[:4]}",
        name="Returned Item Keyboard",
        category_id=cat.id,
        purchase_price=30.0,
        selling_price=50.0,
        stock_quantity=20,
    )
    db.add(prod)
    db.commit()

    sale = Sale(
        invoice_number=f"INV-TEST-{uuid.uuid4().hex[:4]}",
        customer_id=cust.id,
        total_amount=100.0,
        payment_status="PAID",
    )
    db.add(sale)
    db.commit()

    s_item = SaleItem(sale_id=sale.id, product_id=prod.id, quantity=2, unit_price=50.0)
    db.add(s_item)
    db.commit()

    sale_id, prod_id = sale.id, prod.id
    db.close()

    # Process Return Order: 1 Restockable item + 1 Damaged item
    res = client.post(
        "/api/returns",
        json={
            "sale_id": sale_id,
            "reason_category": "DEFECTIVE",
            "is_damaged": True,
            "restock_approved": True,
            "items": [
                {
                    "product_id": prod_id,
                    "quantity": 1,
                    "refund_unit_price": 50.0,
                    "restockable": True,
                },
                {
                    "product_id": prod_id,
                    "quantity": 1,
                    "refund_unit_price": 50.0,
                    "restockable": False,
                },
            ],
        },
    )
    assert res.status_code == 201
    ret_order = res.json()
    assert ret_order["total_refund_amount"] == 100.0
    assert ret_order["return_code"].startswith("RET-")

    # Verify inventory incremented by 1 for restockable item
    db = TestingSessionLocal()
    p = db.query(Product).filter(Product.id == prod_id).first()
    assert p.stock_quantity == 21
    db.close()
