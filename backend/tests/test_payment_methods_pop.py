import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import PaymentMethod, POPVerification

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_payment_methods_and_pop_verification_flow():
    """
    Test Dynamic Payment Methods & Proof of Payment (POP) Verification Engine:
    - Pre-seeded payment options (EcoCash, Merchant #, InnBucks, ZiG, Cash).
    - Registering custom payment method with merchant number & markup.
    - Submitting POP transaction reference & markup calculation ($100 + 3.0% = $103).
    - Manager verifying POP in queue (PENDING_VERIFICATION -> VERIFIED).
    """
    # 1. Fetch pre-seeded payment methods
    get_res = client.get(
        "/api/payments/methods",
        headers={"X-User-Role": "STAFF"}
    )
    assert get_res.status_code == 200
    methods = get_res.json()
    assert len(methods) >= 4
    ecocash = next((m for m in methods if m["code"] == "ECOCASH_MERCHANT"), None)
    assert ecocash is not None
    assert ecocash["merchant_number"] == "304891"
    assert ecocash["markup_percentage"] == 2.5

    # 2. Add custom payment method (EcoCash Express 3.0% markup)
    unique_code = f"ECO_EXP_{uuid.uuid4().hex[:4].upper()}"
    create_res = client.post(
        "/api/payments/methods",
        json={
            "code": unique_code,
            "name": "EcoCash Express Merchant",
            "type": "MOBILE_MONEY",
            "merchant_number": "89012",
            "merchant_name": "Delta Express Store",
            "markup_percentage": 3.0,
            "instructions": "Dial *151*2*2# Enter Merchant Code 89012",
            "requires_pop": True
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert create_res.status_code == 201
    pm_data = create_res.json()
    pm_id = pm_data["id"]

    # 3. Submit Proof of Payment (Base Amount = $100.00 -> Markup 3% = $3.00 -> Total = $103.00)
    tx_ref = f"MP260825.{uuid.uuid4().hex[:6].upper()}"
    pop_res = client.post(
        "/api/payments/submit-pop",
        json={
            "payment_method_id": pm_id,
            "transaction_reference": tx_ref,
            "base_amount": 100.0,
            "pop_file_key": f"pop_receipt_{uuid.uuid4().hex[:6]}.pdf"
        },
        headers={"X-User-Role": "STAFF"}
    )
    assert pop_res.status_code == 201
    pop_data = pop_res.json()
    pop_id = pop_data["id"]
    assert pop_data["status"] == "PENDING_VERIFICATION"
    assert pop_data["base_amount"] == 100.0
    assert pop_data["markup_amount"] == 3.0
    assert pop_data["total_amount_paid"] == 103.0

    # 4. Manager verifies POP in queue -> Status becomes VERIFIED
    queue_res = client.get(
        "/api/payments/verification-queue?status_filter=PENDING_VERIFICATION",
        headers={"X-User-Role": "MANAGER"}
    )
    assert queue_res.status_code == 200
    queue = queue_res.json()
    assert any(p["id"] == pop_id for p in queue)

    verify_res = client.post(
        f"/api/payments/verify/{pop_id}",
        headers={"X-User-Role": "MANAGER"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"
