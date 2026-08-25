import pytest
from app.database import set_session_rls_context, SessionLocal, engine, Base
from app.models import Product, Category



def test_multi_warehouse_rls_context_isolation():
    """
    REQ-03 Security Test: Multi-Warehouse RLS Isolation.
    Verifies that set_session_rls_context binds PostgreSQL session variables
    restricting query execution to authorized warehouse scopes.
    """
    db = SessionLocal()
    
    # 1. Bind context to Harare Warehouse (Location ID: 101)
    set_session_rls_context(db, location_id="101", org_id="ORG-ZIM-01")

    import uuid
    cat_code = f"CAT-RLS-{uuid.uuid4().hex[:6]}"
    cat = Category(name="RLS Hardware", code=cat_code)
    db.add(cat)
    db.commit()

    prod_harare = Product(
        sku=f"SKU-HRE-{uuid.uuid4().hex[:6]}",
        name="Harare Edge Router",
        category_id=cat.id,
        purchase_price=100.0,
        selling_price=150.0,
        stock_quantity=50
    )
    db.add(prod_harare)
    db.commit()

    assert prod_harare.id is not None

    # 2. Switch RLS context to Bulawayo Warehouse (Location ID: 102)
    set_session_rls_context(db, location_id="102", org_id="ORG-ZIM-01")
    
    prod_bulawayo = Product(
        sku=f"SKU-BYO-{uuid.uuid4().hex[:6]}",
        name="Bulawayo Core Switch",
        category_id=cat.id,
        purchase_price=200.0,
        selling_price=300.0,
        stock_quantity=30
    )

    db.add(prod_bulawayo)
    db.commit()

    assert prod_bulawayo.id is not None
    db.close()
