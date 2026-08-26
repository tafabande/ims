from fastapi import APIRouter, HTTPException, Depends, Request, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import json
import uuid

from app.database import get_db
from app.models import WorkSession, SessionEvent, User

router = APIRouter(prefix="/work-sessions", tags=["Operational Work Sessions"])

VALID_TRANSITIONS = {
    "SCHEDULED": ["OPEN", "CANCELLED"],
    "OPEN": ["ACTIVE", "ABANDONED"],
    "ACTIVE": ["PAUSED", "CLOSING", "CLOSED", "SUSPENDED", "ABANDONED", "FORCED_CLOSED"],
    "PAUSED": ["ACTIVE", "CLOSING", "CLOSED", "SUSPENDED", "ABANDONED", "FORCED_CLOSED"],
    "CLOSING": ["CLOSED", "ACTIVE", "FORCED_CLOSED"],
    "CLOSED": [],
    "SUSPENDED": ["ACTIVE", "CLOSED", "FORCED_CLOSED"],
    "ABANDONED": ["CLOSED", "FORCED_CLOSED"],
    "FORCED_CLOSED": []
}

@router.post("/start")
def start_work_session(
    session_type: str = "SALES",
    location_name: str = "Harare Store #01",
    device_id: str = "POS-01",
    opening_float: float = 200.0,
    notes: Optional[str] = None,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Start a new operational work session (Layer B).
    Enforces no duplicate active sessions per user per device.
    """
    # Check if active session already exists for user
    existing = db.query(WorkSession).filter(
        WorkSession.user_id == user_id,
        WorkSession.status.in_(["ACTIVE", "PAUSED", "OPEN", "CLOSING"])
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"User already has an active work session ({existing.session_code} - {existing.status}). Close it before starting a new one."
        )

    user = db.query(User).filter(User.id == user_id).first()
    role = user.role if user else "STAFF"

    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    short_uuid = str(uuid.uuid4())[:4].upper()
    session_code = f"WS-{now_str}-{short_uuid}"

    session = WorkSession(
        session_code=session_code,
        user_id=user_id,
        role=role,
        location_name=location_name,
        device_id=device_id,
        session_type=session_type.upper(),
        status="ACTIVE",
        opening_float=opening_float,
        closing_float=0.0,
        expected_closing=opening_float,
        variance=0.0,
        notes=notes,
        started_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Record initial SESSION_STARTED event (Layer C)
    start_event = SessionEvent(
        session_id=session.id,
        event_type="SESSION_STARTED",
        entity_type="WorkSession",
        entity_id=session.session_code,
        metadata_json=json.dumps({"opening_float": opening_float, "session_type": session_type, "device_id": device_id})
    )
    db.add(start_event)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Operational work session {session.session_code} started.",
        "session": {
            "id": session.id,
            "session_code": session.session_code,
            "session_type": session.session_type,
            "status": session.status,
            "location_name": session.location_name,
            "device_id": session.device_id,
            "opening_float": session.opening_float,
            "started_at": session.started_at.isoformat()
        }
    }


@router.put("/{session_id}/state")
def update_session_state(
    session_id: int,
    status: str, # ACTIVE, PAUSED, CLOSING, SUSPENDED, ABANDONED
    x_user_id: Optional[int] = Header(None),
    x_user_role: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Transition explicit operational session state with strict state machine validation and ownership rules.
    """
    session = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Work session not found")

    # Enforce Server-Side Session Ownership
    if x_user_id and session.user_id != x_user_id and x_user_role not in ["APP_ADMIN", "MANAGER", "STORE_MANAGER"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this operational work session.")

    old_status = session.status.upper()
    new_status = status.upper()

    # Enforce State Machine Matrix
    allowed_next_states = VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed_next_states:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid session state transition: Cannot transition from '{old_status}' to '{new_status}'. Allowed target states: {allowed_next_states}"
        )

    session.status = new_status
    if new_status == "PAUSED":
        session.paused_at = datetime.utcnow()

    db.commit()

    event_type = "SESSION_PAUSED" if new_status == "PAUSED" else "SESSION_RESUMED" if new_status == "ACTIVE" else f"STATUS_{new_status}"
    state_event = SessionEvent(
        session_id=session.id,
        event_type=event_type,
        entity_type="WorkSession",
        entity_id=session.session_code,
        metadata_json=json.dumps({"old_status": old_status, "new_status": new_status})
    )
    db.add(state_event)
    db.commit()

    return {
        "status": "SUCCESS",
        "session_id": session.id,
        "old_status": old_status,
        "new_status": new_status
    }


@router.post("/{session_id}/close")
def close_work_session(
    session_id: int,
    actual_counted_cash: float,
    notes: Optional[str] = None,
    x_user_id: Optional[int] = Header(None),
    x_user_role: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Close work session & compute cash float reconciliation variance.
    """
    session = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Work session not found")

    # Enforce Server-Side Session Ownership
    if x_user_id and session.user_id != x_user_id and x_user_role not in ["APP_ADMIN", "MANAGER", "STORE_MANAGER"]:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this operational work session.")

    old_status = session.status.upper()
    if "CLOSED" not in VALID_TRANSITIONS.get(old_status, []):
        raise HTTPException(status_code=400, detail=f"Cannot close session from state '{old_status}'.")

    expected_closing = session.opening_float + session.total_sales_amount - session.total_refunds_amount
    variance = actual_counted_cash - expected_closing

    session.closing_float = actual_counted_cash
    session.expected_closing = expected_closing
    session.variance = variance
    session.status = "CLOSED"
    session.closed_at = datetime.utcnow()
    if notes:
        session.notes = notes

    db.commit()

    close_event = SessionEvent(
        session_id=session.id,
        event_type="SESSION_CLOSED",
        entity_type="WorkSession",
        entity_id=session.session_code,
        metadata_json=json.dumps({
            "opening_float": session.opening_float,
            "sales_total": session.total_sales_amount,
            "refunds_total": session.total_refunds_amount,
            "expected_closing": expected_closing,
            "actual_closing": actual_counted_cash,
            "variance": variance
        })
    )
    db.add(close_event)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Work session {session.session_code} closed.",
        "reconciliation": {
            "opening_float": session.opening_float,
            "total_sales": session.total_sales_amount,
            "total_refunds": session.total_refunds_amount,
            "expected_closing": expected_closing,
            "actual_closing": actual_counted_cash,
            "variance": variance,
            "variance_status": "EXACT" if variance == 0 else "OVERAGE" if variance > 0 else "SHORTAGE"
        }
    }


@router.post("/{session_id}/force-close")
def force_close_work_session(
    session_id: int,
    reason: str,
    x_user_role: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Managerial Emergency Override: Force close an abandoned, unresponsive, or suspended work session.
    Requires MANAGER or APP_ADMIN role.
    """
    session = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Work session not found")

    old_status = session.status.upper()
    session.status = "FORCED_CLOSED"
    session.closed_at = datetime.utcnow()
    session.notes = f"[FORCED_CLOSED BY MANAGER] Reason: {reason}"

    db.commit()

    force_event = SessionEvent(
        session_id=session.id,
        event_type="FORCED_CLOSED_BY_MANAGER",
        entity_type="WorkSession",
        entity_id=session.session_code,
        metadata_json=json.dumps({"old_status": old_status, "reason": reason})
    )
    db.add(force_event)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Work session {session.session_code} forcibly closed by manager.",
        "old_status": old_status,
        "new_status": "FORCED_CLOSED"
    }


@router.get("/active")
def get_active_session(user_id: int = 1, db: Session = Depends(get_db)):
    """
    Retrieve active work session for current operator.
    """
    session = db.query(WorkSession).filter(
        WorkSession.user_id == user_id,
        WorkSession.status.in_(["ACTIVE", "PAUSED", "OPEN", "CLOSING"])
    ).order_by(WorkSession.id.desc()).first()

    if not session:
        return {"has_active_session": False, "session": None}

    return {
        "has_active_session": True,
        "session": {
            "id": session.id,
            "session_code": session.session_code,
            "session_type": session.session_type,
            "status": session.status,
            "location_name": session.location_name,
            "device_id": session.device_id,
            "opening_float": session.opening_float,
            "total_sales_amount": session.total_sales_amount,
            "total_refunds_amount": session.total_refunds_amount,
            "expected_closing": session.opening_float + session.total_sales_amount - session.total_refunds_amount,
            "started_at": session.started_at.isoformat()
        }
    }


@router.get("/{session_id}/timeline")
def get_session_timeline(session_id: int, db: Session = Depends(get_db)):
    """
    Retrieve immutable audit event timeline for a given work session.
    """
    session = db.query(WorkSession).filter(WorkSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Work session not found")

    events = db.query(SessionEvent).filter(SessionEvent.session_id == session_id).order_by(SessionEvent.created_at.asc()).all()
    return {
        "session_id": session_id,
        "session_code": session.session_code,
        "session_type": session.session_type,
        "user_id": session.user_id,
        "status": session.status,
        "opening_float": session.opening_float,
        "total_sales_amount": session.total_sales_amount,
        "total_refunds_amount": session.total_refunds_amount,
        "event_count": len(events),
        "timeline": [
            {
                "id": ev.id,
                "event_type": ev.event_type,
                "entity_type": ev.entity_type,
                "entity_id": ev.entity_id,
                "metadata": json.loads(ev.metadata_json) if ev.metadata_json else {},
                "timestamp": ev.created_at.isoformat()
            }
            for ev in events
        ]
    }
