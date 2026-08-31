import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_user_provision_and_otp_activation_lifecycle():
    """
    MA-04 User Account Provisioning & Cryptographic OTP Activation Lifecycle Test:
    1. Admin provisions user account (status=PENDING_INVITATION, active=False).
    2. Invalid OTP attempt is rejected (401).
    3. Password activation without OTP verification is rejected (400/401).
    4. Password activation under 12 characters is rejected (400).
    5. Valid OTP verification produces single-use activation token.
    6. Password activation succeeds with valid token (>= 12 chars).
    7. User can now authenticate via /auth/login with newly set password.
    """
    unique_id = uuid.uuid4().hex[:6]
    email = f"employee_{unique_id}@ims.local"
    emp_code = f"EMP-{unique_id.upper()}"
    admin_headers = {"X-User-Role": "ADMIN"}

    # 1. Admin provisions user account
    prov_res = client.post(
        "/api/users/provision",
        json={
            "employee_id": emp_code,
            "email": email,
            "role": "WAREHOUSE",
            "full_name": f"Employee {unique_id}",
        },
        headers=admin_headers,
    )
    assert prov_res.status_code == 201
    prov_data = prov_res.json()
    assert prov_data["status"] == "PENDING_INVITATION"
    assert "_dev_otp" in prov_data
    raw_otp = prov_data["_dev_otp"]
    assert len(raw_otp) == 6
    assert raw_otp.isdigit()

    # 2. Invalid OTP is rejected
    res_wrong_otp = client.post("/api/users/verify-otp", json={"email": email, "otp": "000000"})
    assert res_wrong_otp.status_code == 401

    # 3. Direct password activation without OTP token is rejected
    res_no_token = client.post(
        "/api/users/activate-password",
        json={"email": email, "password": "SecurePassword2026!"},
    )
    assert res_no_token.status_code in [400, 401]

    # 4. Valid OTP verification issues activation token
    res_verify = client.post("/api/users/verify-otp", json={"email": email, "otp": raw_otp})
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["status"] == "OTP_VERIFIED"
    assert "activation_token" in verify_data
    activation_token = verify_data["activation_token"]

    # 5. OTP cannot be reused (single-use challenge)
    res_reused_otp = client.post("/api/users/verify-otp", json={"email": email, "otp": raw_otp})
    assert res_reused_otp.status_code in [400, 401]

    # 6. Password policy enforcement (< 12 chars rejected)
    res_short_pwd = client.post(
        "/api/users/activate-password",
        json={"email": email, "password": "short", "activation_token": activation_token},
    )
    assert res_short_pwd.status_code == 400
    assert "at least 12 characters" in res_short_pwd.json()["detail"]

    # 7. Password activation with valid token and strong password succeeds
    new_password = "SuperStrongWarehousePass2026!"
    res_act = client.post(
        "/api/users/activate-password",
        json={"email": email, "password": new_password, "activation_token": activation_token},
    )
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "ACTIVE"

    # 8. User can now authenticate with the newly activated credentials
    login_res = client.post("/api/auth/login", json={"username": email, "password": new_password})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
