from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import User
from app.services.iam_service import hash_password

client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    users_to_seed = [
        (101, "User A", "STAFF"),
        (102, "User B", "STAFF"),
        (103, "User C", "STAFF"),
        (104, "User D", "STAFF"),
    ]
    for uid, name, role in users_to_seed:
        existing = db.query(User).filter(User.id == uid).first()
        if not existing:
            user = User(
                id=uid,
                email=f"user_{uid}@ims.local",
                user_code=f"USR-{uid:04d}",
                full_name=name,
                role=role,
                hashed_password=hash_password("password123"),
                active=True,
            )
            db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def test_server_side_session_ownership_enforcement():
    """
    Abnormal Scenario 1: IDOR / Session Hijacking Prevention.
    User B (user_id=102, role=STAFF) attempts to pause or close User A's work session (user_id=101).
    Server MUST reject with HTTP 403 Forbidden.
    """
    # 1. User A (user_id=101) starts a session
    start_resp = client.post(
        "/work-sessions/start",
        params={
            "session_type": "SALES",
            "location_name": "Harare Store #01",
            "device_id": "POS-01",
            "opening_float": 300.0,
        },
        headers={"x-user-id": "101", "x-user-role": "STAFF"},
    )
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session"]["id"]

    # 2. User B (user_id=102, Staff) attempts to pause User A's session -> REJECTED (403)
    hijack_pause = client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "PAUSED"},
        headers={"x-user-id": "102", "x-user-role": "STAFF"},
    )
    assert hijack_pause.status_code == 403
    assert "Forbidden" in hijack_pause.json()["detail"]

    # 3. User B (user_id=102, Staff) attempts to close User A's session -> REJECTED (403)
    hijack_close = client.post(
        f"/work-sessions/{session_id}/close",
        params={"actual_counted_cash": 300.0},
        headers={"x-user-id": "102", "x-user-role": "STAFF"},
    )
    assert hijack_close.status_code == 403
    assert "Forbidden" in hijack_close.json()["detail"]

    # Clean up User A's session
    client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "CLOSING"},
        headers={"x-user-id": "101", "x-user-role": "APP_ADMIN"},
    )
    client.post(
        f"/work-sessions/{session_id}/close",
        params={"actual_counted_cash": 300.0},
        headers={"x-user-id": "101", "x-user-role": "APP_ADMIN"},
    )


def test_invalid_state_transitions_rejected():
    """
    Abnormal Scenario 2: Illegal Session State Transitions.
    Rejects transitions such as CLOSED -> ACTIVE or ACTIVE -> CLOSED directly without CLOSING state.
    Server MUST reject with HTTP 400 Bad Request.
    """
    auth_headers = {"x-user-id": "102", "x-user-role": "STAFF"}

    # Start session for user_id=102
    start_resp = client.post(
        "/work-sessions/start",
        params={
            "session_type": "SALES",
            "location_name": "Harare Store #01",
            "device_id": "POS-02",
            "opening_float": 100.0,
        },
        headers=auth_headers,
    )
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session"]["id"]

    # Attempt illegal transition: ACTIVE -> CLOSED directly without count reconciliation
    invalid_close = client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "CLOSED"},
        headers=auth_headers,
    )
    assert invalid_close.status_code == 400
    assert "Invalid session state transition" in invalid_close.json()["detail"]

    # Transition ACTIVE -> CLOSING -> CLOSED (Valid)
    client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "CLOSING"},
        headers=auth_headers,
    )
    close_resp = client.post(
        f"/work-sessions/{session_id}/close",
        params={"actual_counted_cash": 100.0},
        headers=auth_headers,
    )
    assert close_resp.status_code == 200

    # Attempt illegal transition: CLOSED -> ACTIVE (Re-opening closed session)
    reopen_resp = client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "ACTIVE"},
        headers=auth_headers,
    )
    assert reopen_resp.status_code == 400
    assert "Invalid session state transition" in reopen_resp.json()["detail"]


def test_duplicate_active_session_creation_rejected():
    """
    Abnormal Scenario 3: Duplicate Simultaneous Sessions.
    Prevents user from starting a second active work session when one is already active.
    """
    auth_headers = {"x-user-id": "103", "x-user-role": "STAFF"}

    # 1. Start first session for user_id=103
    start_resp1 = client.post(
        "/work-sessions/start",
        params={
            "session_type": "SALES",
            "location_name": "Harare Store #01",
            "device_id": "POS-03",
            "opening_float": 200.0,
        },
        headers=auth_headers,
    )
    assert start_resp1.status_code == 200
    session1_id = start_resp1.json()["session"]["id"]

    # 2. Attempt starting second simultaneous session for same user (user_id=103) -> REJECTED (400)
    start_resp2 = client.post(
        "/work-sessions/start",
        params={
            "session_type": "GOODS_RECEIVING",
            "location_name": "Harare Store #01",
            "device_id": "POS-04",
            "opening_float": 50.0,
        },
        headers=auth_headers,
    )
    assert start_resp2.status_code == 400
    assert "User already has an active work session" in start_resp2.json()["detail"]

    # Clean up session
    client.put(
        f"/work-sessions/{session1_id}/state",
        params={"status": "CLOSING"},
        headers=auth_headers,
    )
    client.post(
        f"/work-sessions/{session1_id}/close",
        params={"actual_counted_cash": 200.0},
        headers=auth_headers,
    )


def test_abandoned_and_forced_closed_sessions():
    """
    Abnormal Scenario 4: Abandoned Session & Managerial Forced Closure.
    Operator leaves terminal unattended (session state -> ABANDONED / PAUSED).
    Store Manager executes emergency `POST /work-sessions/{id}/force-close`.
    """
    staff_headers = {"x-user-id": "104", "x-user-role": "STAFF"}
    mgr_headers = {"x-user-id": "2", "x-user-role": "MANAGER"}

    # 1. Start session for user_id=104
    start_resp = client.post(
        "/work-sessions/start",
        params={
            "session_type": "STOCK_COUNT",
            "location_name": "Harare Warehouse",
            "device_id": "Handheld-01",
            "opening_float": 0.0,
        },
        headers=staff_headers,
    )
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session"]["id"]

    # 2. Transition state ACTIVE -> ABANDONED (operator network drop / timeout)
    client.put(
        f"/work-sessions/{session_id}/state",
        params={"status": "ABANDONED"},
        headers=staff_headers,
    )

    # 3. Manager forces closure of abandoned session
    force_close = client.post(
        f"/work-sessions/{session_id}/force-close",
        params={"reason": "Operator went off-shift without closing cash till."},
        headers=mgr_headers,
    )
    assert force_close.status_code == 200
    assert force_close.json()["new_status"] == "FORCED_CLOSED"

    # 4. Verify immutable event trail records FORCED_CLOSED_BY_MANAGER
    timeline_resp = client.get(
        f"/work-sessions/{session_id}/timeline",
        headers=mgr_headers,
    )
    assert timeline_resp.status_code == 200
    event_types = [e["event_type"] for e in timeline_resp.json()["timeline"]]
    assert "FORCED_CLOSED_BY_MANAGER" in event_types
