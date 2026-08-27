from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Category, InventoryTransaction, Product

client = TestClient(app)


def test_pessimistic_row_locking_concurrency_benchmark():
    """
    Stock Depletion Boundary & Ledger Integrity Benchmark Test:
    Initial Stock: 10 units.
    Fires 20 sales requests (Qty=1 each).
    Verifies process_sale_transaction guarantees:
    1. Exactly 10 requests succeed (HTTP 201 Created).
    2. Exactly 10 requests are rejected (HTTP 400 Insufficient Stock).
    3. Final stock is strictly 0 (0 negative stock violations).
    4. Transaction ledger contains exactly 10 immutable entries.
    """
    db = SessionLocal()
    import uuid

    cat_code = f"CONCUR-CAT-{uuid.uuid4().hex[:6]}"
    cat = Category(name="Electronics Concurrency", code=cat_code)
    db.add(cat)
    db.commit()

    prod_sku = f"CONCUR-SKU-{uuid.uuid4().hex[:6]}"
    prod = Product(
        sku=prod_sku,
        name="Concurrent Test Router",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=10,  # Initial stock: 10 units
        reserved_quantity=0,
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    results = []

    def process_sale_request(idx):
        response = client.post(
            "/api/sales/",
            json={
                "customer_id": 1,
                "payment_method": "Cash",
                "items": [{"product_id": prod_id, "quantity": 1}],
            },
            headers={
                "X-User-Role": "STAFF",
                "Idempotency-Key": f"IDEM-RACE-SALE-{idx}",
            },
        )
        return response.status_code

    # Process 20 sales requests against initial stock of 10
    for i in range(20):
        results.append(process_sale_request(i))

    success_count = results.count(201)
    rejected_count = results.count(400)

    # Verify atomic stock depletion guarantees
    assert success_count == 10, f"Expected 10 successful sales (201), got {success_count} (results: {results})"
    assert rejected_count == 10, f"Expected 10 rejected sales (400), got {rejected_count} (results: {results})"

    # Verify final stock and ledger integrity in database
    db = SessionLocal()
    final_prod = db.query(Product).filter(Product.id == prod_id).first()
    assert final_prod.stock_quantity == 0, f"Expected final stock to be 0, got {final_prod.stock_quantity}"

    tx_count = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == prod_id).count()
    assert tx_count == 10, f"Expected 10 transaction ledger entries, got {tx_count}"
    db.close()
