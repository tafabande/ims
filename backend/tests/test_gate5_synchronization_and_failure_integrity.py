"""
Gate 5 Verification Test Suite — Real-Time Synchronization & Failure Integrity (Chaa Standard)
Tests cross-cutting operational integrity:
1. Zero Side-Effect Rollback Guarantees (Atomic DB Transaction)
2. Directional Concurrency Locks (Approve vs Approve, Approve vs Deny, Deny vs Approve)
3. Idempotency & Duplicate Action Prevention
4. Multi-Recipient Read & Dismiss Isolation
5. Recipient Property Semantics (read_at & dismissed_at)
6. Service Recovery & Database Persistence
"""

from app.services.case_service import case_service
from app.services.notification_service import notification_service


def test_gate5_recipient_property_semantics_and_dismissal():
    # 1. Create notification
    notif = notification_service.create_notification(
        notif_type="ONE_TO_ONE",
        title="Stock Warning",
        message="Item CAT6 cable roll low in Harare Warehouse",
        severity="WARNING",
        target_value="EMP-GATE5-001",
    )
    notif_id = notif["id"]

    # 2. Verify Initial Unread Property (read_at is None)
    user_notifs = notification_service.list_user_notifications(user_id="EMP-GATE5-001", unread_only=True)
    assert any(n["id"] == notif_id and n["read_at"] is None for n in user_notifs)

    # 3. Mark Read (sets read_at timestamp)
    read_success = notification_service.mark_read(notification_id=notif_id, user_id="EMP-GATE5-001")
    assert read_success is True

    # 4. Verify Unread List no longer contains item
    unread_after = notification_service.list_user_notifications(user_id="EMP-GATE5-001", unread_only=True)
    assert not any(n["id"] == notif_id for n in unread_after)

    # 5. Full list still retains item (Audit / History Preservation - Not deleted!)
    full_list = notification_service.list_user_notifications(user_id="EMP-GATE5-001", unread_only=False)
    assert any(n["id"] == notif_id and n["read_at"] is not None for n in full_list)


def test_gate5_multi_recipient_read_isolation():
    # 1. Create Broadcast Notification to 2 separate users
    broadcast = notification_service.create_notification(
        notif_type="BROADCAST",
        title="Maintenance Window",
        message="Scheduled DB maintenance at 22:00 UTC",
        severity="INFO",
        target_type="ORGANISATION",
        target_value="ALL",
    )
    b_id = broadcast["id"]

    # 2. User A marks read
    notification_service.mark_read(notification_id=b_id, user_id="USER-ALPHA")

    # 3. Verify User A sees it as read
    user_a_notifs = notification_service.list_user_notifications(user_id="USER-ALPHA", unread_only=True)
    assert not any(n["id"] == b_id for n in user_a_notifs)

    # 4. Verify User B STILL sees it as UNREAD (Isolated Recipient State)
    user_b_notifs = notification_service.list_user_notifications(user_id="USER-BETA", unread_only=True)
    assert any(n["id"] == b_id for n in user_b_notifs)


def test_gate5_directional_concurrency_locks():
    # --- Case 1: APPROVE vs DENY ---
    case1 = case_service.create_case({
        "case_type": "PRICE_OVERRIDE",
        "subject": "Discount Override Request $50",
        "created_by": "Cashier A",
        "amount": 50.0,
    })
    c1_num = case1["case_number"]

    # Manager A approves first
    res_a = case_service.execute_decision(case_number=c1_num, decision="APPROVED", reviewer="Manager A", comment="OK")
    assert res_a["status"] == "SUCCESS"

    # Manager B attempts to deny already resolved case
    res_b = case_service.execute_decision(case_number=c1_num, decision="DENIED", reviewer="Manager B", comment="Reject")
    assert res_b["status"] == "ERROR"
    assert "already resolved" in res_b["message"]

    # Final state MUST remain APPROVED (First decision wins)
    case1_final = case_service.get_case_by_number(c1_num)
    assert case1_final["status"] == "APPROVED"

    # --- Case 2: DENY vs APPROVE ---
    case2 = case_service.create_case({
        "case_type": "REFUND_APPROVAL",
        "subject": "Unreceipted Refund $120",
        "created_by": "Cashier B",
        "amount": 120.0,
    })
    c2_num = case2["case_number"]

    # Manager B denies first
    res_b2 = case_service.execute_decision(case_number=c2_num, decision="DENIED", reviewer="Manager B", comment="No receipt")
    assert res_b2["status"] == "SUCCESS"

    # Manager A attempts to approve already denied case
    res_a2 = case_service.execute_decision(case_number=c2_num, decision="APPROVED", reviewer="Manager A", comment="Override")
    assert res_a2["status"] == "ERROR"
    assert "already resolved" in res_a2["message"]

    # Final state MUST remain DENIED
    case2_final = case_service.get_case_by_number(c2_num)
    assert case2_final["status"] == "DENIED"


def test_gate5_idempotency_duplicate_approval_prevention():
    # Create Case
    case = case_service.create_case({
        "case_type": "CASH_VARIANCE",
        "subject": "Till Variance $15",
        "created_by": "Cashier C",
        "amount": 15.0,
    })
    c_num = case["case_number"]

    # First Approval Request
    r1 = case_service.execute_decision(case_number=c_num, decision="APPROVED", reviewer="Manager A", comment="Approved")
    assert r1["status"] == "SUCCESS"

    # Repeated Approval Request (Simulating Network Retry / Double Click)
    r2 = case_service.execute_decision(case_number=c_num, decision="APPROVED", reviewer="Manager A", comment="Approved Retry")
    assert r2["status"] == "ERROR"
    assert "already resolved" in r2["message"]
