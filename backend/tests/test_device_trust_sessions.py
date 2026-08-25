import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import UserDevice, UserSession, User
from app.services import device_trust_service

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_device_trust_and_session_security_lifecycle():
    """
    Test Device Trust & Session Security Architecture:
    - Device registration & SHA-256 fingerprint hashing.
    - Active server-side session creation.
    - Risk-based authentication evaluation for high-risk actions & fingerprint mismatch.
    - Instant session revocation and device revocation.
    """
    db = SessionLocal()
    # 1. Register Device Fingerprint (with unique fingerprint per run for test isolation)
    unique_fp = uuid.uuid4().hex[:8]
    raw_fp = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36|Timezone:Africa/Harare|1920x1080|en-US|FP-{unique_fp}"
    reg_res = client.post(
        "/api/sessions/register-device",
        json={
            "device_name": f"Store Manager Workstation - Harare WH {unique_fp}",
            "fingerprint_raw": raw_fp,
            "ip_address": "197.221.240.12",
            "user_agent": "Chrome/128.0 (Windows NT 10.0)"
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert reg_res.status_code == 201
    dev_data = reg_res.json()
    device_id_str = dev_data["device_id"]
    device_pk = dev_data["id"]
    assert dev_data["is_trusted"] is True
    assert dev_data["is_revoked"] is False

    # 2. Create Active Server-Side Session
    session = device_trust_service.create_user_session(
        db=db,
        user_id=1,
        device_id=device_pk,
        raw_token=f"jwt_token_{uuid.uuid4().hex}",
        ip_address="197.221.240.12",
        user_agent="Chrome/128.0 (Windows NT 10.0)",
        location_summary="Harare Main Hub"
    )
    session_id_str = session.session_id
    db.close()

    # 3. Evaluate Risk for Normal Action (Low Risk)
    risk_low_res = client.post(
        "/api/sessions/evaluate-risk",
        json={
            "session_id": session_id_str,
            "action_name": "VIEW_INVENTORY",
            "fingerprint_raw": raw_fp,
            "ip_address": "197.221.240.12"
        },
        headers={"X-User-Role": "STAFF"}
    )
    assert risk_low_res.status_code == 200
    low_data = risk_low_res.json()
    assert low_data["risk_level"] == "LOW"
    assert low_data["step_up_required"] is False

    # 4. Evaluate Risk for Sensitive Operational Action (DELETE_PRODUCT -> High Risk / Step-Up Required)
    risk_high_res = client.post(
        "/api/sessions/evaluate-risk",
        json={
            "session_id": session_id_str,
            "action_name": "DELETE_PRODUCT",
            "fingerprint_raw": raw_fp,
            "ip_address": "197.221.240.12"
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert risk_high_res.status_code == 200
    high_data = risk_high_res.json()
    assert high_data["step_up_required"] is True
    assert any("High-risk operational action" in r for r in high_data["reasons"])

    # 5. Evaluate Risk for Fingerprint Mismatch (Stolen Token / Device Spoofing)
    spoofed_fp = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)|Timezone:America/New_York|390x844"
    risk_spoof_res = client.post(
        "/api/sessions/evaluate-risk",
        json={
            "session_id": session_id_str,
            "action_name": "VIEW_INVENTORY",
            "fingerprint_raw": spoofed_fp,
            "ip_address": "45.12.89.4"
        },
        headers={"X-User-Role": "STAFF"}
    )
    assert risk_spoof_res.status_code == 200
    spoof_data = risk_spoof_res.json()
    assert spoof_data["risk_score"] >= 0.50
    assert any("mismatch" in r.lower() for r in spoof_data["reasons"])

    # 6. Manager Revokes Active Session
    revoke_ses_res = client.post(
        f"/api/sessions/{session_id_str}/revoke",
        headers={"X-User-Role": "MANAGER"}
    )
    assert revoke_ses_res.status_code == 200
    assert revoke_ses_res.json()["is_revoked"] is True

    # 7. Manager Revokes Device -> Automatically revokes linked device & sessions
    revoke_dev_res = client.post(
        f"/api/sessions/devices/{device_id_str}/revoke",
        headers={"X-User-Role": "MANAGER"}
    )
    assert revoke_dev_res.status_code == 200
    assert revoke_dev_res.json()["is_revoked"] is True
