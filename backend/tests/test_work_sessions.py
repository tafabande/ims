from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import WorkSession

client = TestClient(app)


def test_work_session_lifecycle_and_float_reconciliation():
    # Pre-clean any leftover active sessions for user_id = 1
    db = SessionLocal()
    db.query(WorkSession).filter(
        WorkSession.user_id == 1,
        WorkSession.status.in_(["ACTIVE", "PAUSED", "OPEN", "CLOSING"]),
    ).update({"status": "CLOSED"})
    db.commit()
    db.close()

    auth_headers = {"X-User-Role": "STAFF", "X-User-Id": "1"}

    # 1. Start Work Session
    start_resp = client.post(
        "/api/work-sessions/start",
        params={
            "session_type": "SALES",
            "location_name": "Harare Store #01",
            "device_id": "POS-03",
            "opening_float": 500.0,
        },
        headers=auth_headers,
    )
    assert start_resp.status_code == 200
    data = start_resp.json()
    assert data["status"] == "SUCCESS"
    session_id = data["session"]["id"]
    data["session"]["session_code"]
    assert data["session"]["opening_float"] == 500.0

    # 2. Pause Session
    pause_resp = client.put(
        f"/api/work-sessions/{session_id}/state",
        params={"status": "PAUSED"},
        headers=auth_headers,
    )
    assert pause_resp.status_code == 200
    assert pause_resp.json()["new_status"] == "PAUSED"

    # 3. Resume Session
    resume_resp = client.put(
        f"/api/work-sessions/{session_id}/state",
        params={"status": "ACTIVE"},
        headers=auth_headers,
    )
    assert resume_resp.status_code == 200
    assert resume_resp.json()["new_status"] == "ACTIVE"

    # 4. Close Session & Calculate Variance (-$30.00 Shortage)
    close_resp = client.post(
        f"/api/work-sessions/{session_id}/close",
        params={"actual_counted_cash": 470.0, "notes": "Cash shortage -$30.00"},
        headers=auth_headers,
    )
    assert close_resp.status_code == 200
    reconciliation = close_resp.json()["reconciliation"]
    assert reconciliation["opening_float"] == 500.0
    assert reconciliation["actual_closing"] == 470.0
    assert reconciliation["variance"] == -30.0
    assert reconciliation["variance_status"] == "SHORTAGE"

    # 5. Fetch Session Event Timeline
    timeline_resp = client.get(
        f"/api/work-sessions/{session_id}/timeline",
        headers=auth_headers,
    )
    assert timeline_resp.status_code == 200
    events = timeline_resp.json()["timeline"]
    assert len(events) >= 4
    event_types = [e["event_type"] for e in events]
    assert "SESSION_STARTED" in event_types
    assert "SESSION_PAUSED" in event_types
    assert "SESSION_RESUMED" in event_types
    assert "SESSION_CLOSED" in event_types
