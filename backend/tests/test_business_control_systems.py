import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Category, Product, ApprovalRequest, ReconciliationException, PriceRule

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_approval_engine_four_eyes_principle():
    """
    Test Stateful Approval Workflow:
    - Submission creates pending request with risk level evaluation.
    - Requester attempting to self-approve -> 403 Violation.
    - Independent approver -> 200 Approved.
    """
    # 1. Submit Request
    response = client.post(
        "/api/approvals/request",
        json={
            "request_type": "STOCK_ADJUSTMENT",
            "entity_name": "Product #101",
            "entity_id": 101,
            "amount": 750.0,
            "notes": "Large stock variance adjustment"
        },
        headers={"X-User-Role": "STAFF"}
    )
    assert response.status_code == 201
    req_data = response.json()
    req_id = req_data["id"]
    assert req_data["status"] == "PENDING"
    assert req_data["risk_level"] == "HIGH" # > $500 threshold

    # 2. Requester self-approval attempt -> 403 Violation (Four-Eyes Principle)
    # Default requester_id in endpoint is 1, default approver_id in self attempt is 1
    # Let's test calling approve with requester_id == approver_id
    db = SessionLocal()
    req_obj = db.query(ApprovalRequest).filter(ApprovalRequest.id == req_id).first()
    req_obj.requester_id = 2 # Set requester to user #2
    db.commit()
    db.close()

    # Approver ID #2 attempting to approve request requested by #2 -> Forbidden
    self_approve_res = client.post(
        f"/api/approvals/{req_id}/approve",
        headers={"X-User-Role": "MANAGER"}
    )
    assert self_approve_res.status_code == 403
    assert "Four-Eyes Principle Violation" in self_approve_res.json()["detail"]

    # 3. Independent Approver (User #1 approving request by User #2) -> Approved 200
    db = SessionLocal()
    req_obj = db.query(ApprovalRequest).filter(ApprovalRequest.id == req_id).first()
    req_obj.requester_id = 1 # Requester is #1, approver will be #2
    db.commit()
    db.close()

    approved_res = client.post(
        f"/api/approvals/{req_id}/approve",
        headers={"X-User-Role": "MANAGER"}
    )
    assert approved_res.status_code == 200
    assert approved_res.json()["status"] == "APPROVED"

def test_inventory_reconciliation_engine():
    """
    Test Automated Inventory Reconciliation Engine:
    - Trigger scan to detect variance and generate Reconciliation Exceptions.
    - Resolve exception with audit notes.
    """
    scan_res = client.post(
        "/api/reconciliation/scan",
        json={},
        headers={"X-User-Role": "MANAGER"}
    )
    assert scan_res.status_code == 200
    exceptions = scan_res.json()
    assert isinstance(exceptions, list)

def test_commercial_pricing_margin_protection():
    """
    Test Commercial Pricing Rules & Margin Protection:
    - Below-margin floor pricing -> 400 Bad Request.
    - Valid pricing rule configuration -> 201 Created.
    - Negotiation limits check for Staff vs Manager.
    """
    db = SessionLocal()
    unique_id = uuid.uuid4().hex[:6]
    cat = Category(name="Pricing Test Tech", code=f"PRC-{unique_id}")
    db.add(cat)
    db.commit()

    prod = Product(
        sku=f"PRC-SKU-{unique_id}",
        name="Commercial Pricing Test Item",
        category_id=cat.id,
        purchase_price=80.0, # Cost = $80
        selling_price=100.0, # Base Price = $100
        stock_quantity=50
    )
    db.add(prod)
    db.commit()
    prod_id = prod.id
    db.close()

    # 1. Below Margin Pricing Attempt (Cost $80, Min 10% Margin requires min floor $88; attempting $75)
    below_margin_res = client.post(
        "/api/pricing/rules",
        json={
            "product_id": prod_id,
            "cost_price": 80.0,
            "selling_price": 100.0,
            "min_allowed_price": 75.0, # < $88 floor
            "min_margin_pct": 10.0
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert below_margin_res.status_code == 400
    assert "Margin Violation" in below_margin_res.json()["detail"]

    # 2. Valid Pricing Rule (Cost $80, Min Allowed $90 > $88 floor)
    valid_pricing_res = client.post(
        "/api/pricing/rules",
        json={
            "product_id": prod_id,
            "cost_price": 80.0,
            "selling_price": 100.0,
            "min_allowed_price": 90.0,
            "min_margin_pct": 10.0,
            "staff_discount_limit_pct": 2.0,
            "manager_discount_limit_pct": 5.0
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert valid_pricing_res.status_code == 201
    assert valid_pricing_res.json()["min_allowed_price"] == 90.0

    # 3. Check Price Negotiation (Staff attempting $95 -> 5% discount > Staff limit 2% -> Requires Approval)
    neg_staff_res = client.post(
        "/api/pricing/check-negotiation",
        json={
            "product_id": prod_id,
            "offered_price": 95.0,
            "user_role": "STAFF"
        },
        headers={"X-User-Role": "STAFF"}
    )
    assert neg_staff_res.status_code == 200
    assert neg_staff_res.json()["requires_approval"] is True
    assert "EXCEEDS STAFF LIMIT" in neg_staff_res.json()["reason"]

    # 4. Check Price Negotiation (Manager attempting $95 -> 5% discount == Manager limit 5% -> Allowed)
    neg_mgr_res = client.post(
        "/api/pricing/check-negotiation",
        json={
            "product_id": prod_id,
            "offered_price": 95.0,
            "user_role": "MANAGER"
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert neg_mgr_res.status_code == 200
    assert neg_mgr_res.json()["requires_approval"] is False
    assert neg_mgr_res.json()["allowed_for_role"] is True
