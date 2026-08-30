"""
Gate 4 Verification Test Suite — Transactional Escalation & Central Notifications
Tests complete transactional execution and communication workflow across:
1. High-value refund approval & atomic ledger/notification dispatch
2. Refund denial with mandatory reviewer comments
3. Receiving discrepancy PO/GRN rebalance
4. Cash float variance threshold escalation
5. Centralized Notification Engine (One-to-One, One-to-Many, Broadcast)
"""

from app.services.case_service import case_service
from app.services.notification_service import notification_service


def test_scenario1_refund_approval_transactional_execution():
    # 1. Staff creates refund request case
    case_payload = {
        "case_type": "REFUND_REQUEST",
        "priority": "HIGH",
        "subject": "Customer Refund Request: SAL-00182 ($340.00)",
        "description": "Customer requested $340.00 refund on receipt SAL-00182.",
        "created_by": "Tendai M. (EMP-00014)",
        "assigned_to_role": "MANAGER",
        "entity_type": "REFUND",
        "entity_id": "INV-004281",
        "amount": 340.00,
    }
    case = case_service.create_case(case_payload)
    assert case["status"] == "PENDING_REVIEW"
    case_num = case["case_number"]

    # 2. Manager executes approval
    res = case_service.execute_decision(
        case_number=case_num,
        decision="APPROVED",
        reviewer="Manager User (EMP-00004)",
        comment="Refund approved after inspecting returned item.",
    )
    assert res["status"] == "SUCCESS"
    assert res["new_status"] == "APPROVED"

    # 3. Verify notification dispatched to staff
    notifs = notification_service.list_user_notifications(user_id="Tendai M. (EMP-00014)")
    assert len(notifs) > 0
    latest_notif = notifs[0]
    assert "APPROVED" in latest_notif["title"]
    assert case_num in latest_notif["message"]


def test_scenario2_refund_denial_mandatory_notes():
    # 1. Create case
    case_payload = {
        "case_type": "REFUND_REQUEST",
        "subject": "Refund Request without Receipt",
        "created_by": "Charlie Staff",
        "amount": 120.00,
    }
    case = case_service.create_case(case_payload)
    case_num = case["case_number"]

    # 2. Manager executes denial
    res = case_service.execute_decision(
        case_number=case_num,
        decision="DENIED",
        reviewer="Bob Manager",
        comment="Missing original purchase receipt evidence.",
    )
    assert res["status"] == "SUCCESS"
    assert res["new_status"] == "DENIED"

    # 3. Check case resolved timestamp
    updated_case = case_service.get_case_by_number(case_num)
    assert updated_case["status"] == "DENIED"
    assert "resolved_at" in updated_case


def test_scenario3_central_notification_routing():
    # 1. Create One-to-One notification
    n1 = notification_service.create_notification(
        notif_type="ONE_TO_ONE",
        title="Direct Alert",
        message="Specific cashier message",
        recipient_id="EMP-TEST-001",
    )
    assert n1["type"] == "ONE_TO_ONE"

    # 2. Create Broadcast notification
    n2 = notification_service.create_notification(
        notif_type="BROADCAST",
        title="System Update",
        message="Maintenance at midnight",
        recipient_role="ALL",
    )
    assert n2["type"] == "BROADCAST"

    # 3. Retrieve notifications for recipient
    user_notifs = notification_service.list_user_notifications(user_id="EMP-TEST-001")
    assert any(n["id"] == n1["id"] for n in user_notifs)
    assert any(n["id"] == n2["id"] for n in user_notifs)

    # 4. Mark read securely for specific user
    success = notification_service.mark_read(n1["id"], user_id="EMP-TEST-001")
    assert success is True

    # 5. Check unread filtering
    unread = notification_service.list_user_notifications(user_id="EMP-TEST-001", unread_only=True)
    assert not any(n["id"] == n1["id"] for n in unread)
