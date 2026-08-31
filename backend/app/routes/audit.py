import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import UserContext, get_current_user, require_permission
from app.models import AuditLogRecord

router = APIRouter(prefix="/api/audit", tags=["Security Audit Log Service"])


class AuditEvent(BaseModel):
    id: str
    user: str
    action: str
    ip: str
    status: str
    details: str
    timestamp: str


class CreateAuditEventRequest(BaseModel):
    action: str
    status: str = "SUCCESS"
    details: str


@router.get("/logs", response_model=list[AuditEvent])
def get_audit_logs(
    db: Session = Depends(get_db),
    auth_ctx: UserContext = Depends(require_permission("audit:view")),
):
    """
    Append-Only Security Audit Log Service — Retrieve immutable security audit trail (Requires audit:view permission).
    """
    db_records = db.query(AuditLogRecord).order_by(AuditLogRecord.id.desc()).all()
    results = []
    for r in db_records:
        results.append(
            AuditEvent(
                id=r.event_id,
                user=r.user_name,
                action=r.action,
                ip=r.client_ip,
                status=r.status,
                details=r.details or "",
                timestamp=r.created_at.isoformat() if r.created_at else datetime.now(UTC).isoformat(),
            )
        )

    return results


@router.post("/event")
def record_audit_event(
    event_in: CreateAuditEventRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Record new immutable audit log event with server-verified attribution and database persistence.
    """
    event_id = f"LOG-{uuid.uuid4().hex[:6].upper()}"
    client_ip = request.client.host if request.client else "127.0.0.1"

    log_entry = AuditLogRecord(
        event_id=event_id,
        user_name=current_user.full_name,
        action=event_in.action,
        client_ip=client_ip,
        status=event_in.status,
        details=event_in.details,
    )
    db.add(log_entry)
    db.commit()

    return {"status": "recorded", "event_id": event_id}

