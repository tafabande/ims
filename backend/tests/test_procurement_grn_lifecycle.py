import uuid

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Category, Product, Supplier

client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)


def test_procurement_grn_receiving_and_three_way_matching():
    """
    Comprehensive Procurement & Receiving Lifecycle Test:
    1. Create PO -> Stock remains unchanged.
    2. GRN Step 1 (Receive Goods) -> Stock remains unchanged, status PENDING_VERIFICATION.
    3. GRN Step 2 (Manager Verify) -> Stock increases strictly by ACCEPTED_QUANTITY (+90).
    4. Supplier Return creation for rejected/damaged goods.
    5. Three-Way Matching (Billed Cost mismatch) -> Invoice placed on PAYMENT_HOLD.
    """
    db = SessionLocal()
    unique_id = uuid.uuid4().hex[:6]
    cat = Category(name="Procurement Test Tech", code=f"GRN-CAT-{unique_id}")
    db.add(cat)
    db.commit()

    supplier = Supplier(
        name="Delta Beverages Ltd",
        contact_person="Sales Manager",
        email=f"sales-{unique_id}@delta.co.zw",
    )
    db.add(supplier)
    db.commit()

    prod = Product(
        sku=f"COKE-500-{unique_id}",
        name="Coca-Cola 500ml",
        category_id=cat.id,
        supplier_id=supplier.id,
        purchase_price=0.70,
        selling_price=1.00,
        stock_quantity=100,
    )
    db.add(prod)
    db.commit()

    prod_id = prod.id
    supp_id = supplier.id
    initial_stock = prod.stock_quantity  # 100
    db.close()

    # 1. Create Purchase Order (Ordered Qty = 100 @ $0.70)
    po_res = client.post(
        "/api/purchases",
        json={
            "supplier_id": supp_id,
            "notes": "PO for 100 units Coca-Cola",
            "items": [{"product_id": prod_id, "quantity": 100, "unit_price": 0.70}],
        },
        headers={"X-User-Role": "MANAGER"},
    )
    assert po_res.status_code == 201
    po_data = po_res.json()
    po_id = po_data["id"]

    # Verify Stock HAS NOT CHANGED upon PO Creation!
    db = SessionLocal()
    prod_ref = db.query(Product).filter(Product.id == prod_id).first()
    assert prod_ref.stock_quantity == initial_stock  # Still 100
    db.close()

    # 2. Staff Receives Goods at Loading Bay (Ordered: 100, Received: 95, Accepted: 90, Damaged: 3, Rejected: 2)
    grn_res = client.post(
        "/api/procurement/receive",
        json={
            "po_id": po_id,
            "supplier_id": supp_id,
            "delivery_note_ref": "SUP-DEL-8921",
            "notes": "2 cartons damaged on arrival",
            "items": [
                {
                    "product_id": prod_id,
                    "received_quantity": 95,
                    "accepted_quantity": 90,
                    "rejected_quantity": 2,
                    "damaged_quantity": 3,
                    "unit_cost": 0.70,
                    "batch_number": f"BAT-{unique_id}",
                    "storage_location": "A-03-04",
                }
            ],
        },
        headers={"X-User-Role": "STAFF"},
    )
    assert grn_res.status_code == 201
    grn_data = grn_res.json()
    grn_id = grn_data["id"]
    assert grn_data["status"] == "PENDING_VERIFICATION"

    # Verify Stock STILL HAS NOT CHANGED prior to Manager Verification!
    db = SessionLocal()
    prod_ref = db.query(Product).filter(Product.id == prod_id).first()
    assert prod_ref.stock_quantity == initial_stock  # Still 100
    db.close()

    # 3. Manager Verifies and Approves GRN -> Stock INCREASES BY ACCEPTED QUANTITY (+90)
    verify_res = client.post(f"/api/procurement/grn/{grn_id}/verify", headers={"X-User-Role": "MANAGER"})
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "ACCEPTED"

    # Verify Stock IS NOW 190 (100 initial + 90 accepted)!
    db = SessionLocal()
    prod_ref = db.query(Product).filter(Product.id == prod_id).first()
    assert prod_ref.stock_quantity == initial_stock + 90  # Exactly 190
    db.close()

    # 4. Create Supplier Return for 5 damaged/rejected units
    return_res = client.post(
        "/api/procurement/returns",
        json={
            "grn_id": grn_id,
            "supplier_id": supp_id,
            "reason": "Damaged packaging on delivery",
            "items": [
                {
                    "grn_item_id": grn_data["items"][0]["id"],
                    "product_id": prod_id,
                    "returned_quantity": 5,
                    "return_reason": "Damaged packaging",
                }
            ],
        },
        headers={"X-User-Role": "STAFF"},
    )
    assert return_res.status_code == 201
    assert return_res.json()["status"] == "AUTHORISED"

    # 5. Three-Way Matching Control Test:
    # Supplier bills 90 units @ $0.85 (Agreed PO unit cost was $0.70 -> Unit Cost Mismatch!)
    match_res = client.post(
        "/api/procurement/three-way-match",
        json={
            "po_id": po_id,
            "supplier_invoice_code": f"INV-SUP-{unique_id}",
            "billed_quantity": 90,
            "billed_unit_cost": 0.85,  # Mismatch ($0.85 vs $0.70)
        },
        headers={"X-User-Role": "MANAGER"},
    )
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert match_data["three_way_match_status"] == "MISMATCH_COST"
    assert match_data["status"] == "PAYMENT_HOLD"
    assert "Unit Cost Mismatch" in match_data["mismatch_reason"]
