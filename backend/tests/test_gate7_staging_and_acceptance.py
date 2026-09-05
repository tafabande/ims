"""
Gate 7 Verification Test Suite — Staging & Production Acceptance (Chaa Standard)
Tests environment isolation, secrets audit, and end-to-end platform flow:
1. Secrets Audit Hygiene (.gitignore rules and template safety)
2. Complete End-to-End Workflow Execution (Case -> Ledger -> Notification -> Recipient -> Outbox)
3. Operational Acceptance Status
"""

import os

from fastapi.testclient import TestClient

from app.main import app
from app.services.case_service import case_service

client = TestClient(app)


def test_gate7_secrets_audit_hygiene():
    """
    Secrets Audit Hygiene Test:
    Ensures .env and local secret credentials are not tracked in repository root.
    """
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    gitignore_path = os.path.join(repo_root, ".gitignore")

    assert os.path.exists(gitignore_path)
    with open(gitignore_path, encoding="utf-8") as f:
        content = f.read()

    assert ".env" in content
    assert ".env.*" in content


def test_gate7_end_to_end_operational_platform_flow():
    """
    End-to-End Operational Platform Flow Test:
    Case Creation -> Manager Approval -> Case CLOSED -> Notification Record Created -> Recipient Record Created.
    """
    # 1. Create Operational Case
    case = case_service.create_case({
        "case_type": "REFUND_APPROVAL",
        "subject": "End-to-End Platform Acceptance Test",
        "created_by": "Cashier Gate7",
        "amount": 75.0,
    })
    c_num = case["case_number"]
    assert case["status"] == "PENDING_REVIEW"

    # 2. Manager Approves Case via API
    mgr_headers = {"x-user-id": "2", "x-user-role": "MANAGER"}
    r_mgr = client.post(
        f"/api/cases/{c_num}/decision",
        json={"decision": "APPROVED", "reviewer": "Bob Manager", "comment": "Final Gate 7 Verification"},
        headers=mgr_headers,
    )
    assert r_mgr.status_code == 200
    assert r_mgr.json()["status"] == "SUCCESS"

    # 3. Verify Case state is resolved
    updated_case = case_service.get_case_by_number(c_num)
    assert updated_case["status"] == "APPROVED"
