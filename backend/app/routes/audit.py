import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import UserContext, get_current_user, require_permission
from app.models import AuditLogRecord

router = APIRouter(prefix="/audit", tags=["Security Audit Log Service"])


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


AUDIT_LOG_STORE: list[dict] = [
    {
        "id": "LOG-8801",
        "user": "Alice Admin",
        "action": "USER_LOGIN",
        "ip": "192.168.1.105",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T08:00:12Z",
        "details": "Admin authentication via MFA token",
    },
    {
        "id": "LOG-8802",
        "user": "Bob Manager",
        "action": "CREATE_PURCHASE_ORDER",
        "ip": "192.168.1.112",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T09:15:33Z",
        "details": "Issued PO-2026-002 to OmniHardware ($3,250.00)",
    },
    {
        "id": "LOG-8803",
        "user": "Charlie Staff",
        "action": "PROCESS_SALE",
        "ip": "192.168.1.120",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T09:10:00Z",
        "details": "Processed INV-2026-103 with stock deduction",
    },
]


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

    # Combine with seed items if database records are empty
    if not results:
        return [AuditEvent(**item) for item in AUDIT_LOG_STORE]
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

    memory_record = {
        "id": event_id,
        "user": current_user.full_name,
        "action": event_in.action,
        "ip": client_ip,
        "status": event_in.status,
        "details": event_in.details,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    AUDIT_LOG_STORE.insert(0, memory_record)

    return {"status": "recorded", "event_id": event_id}
