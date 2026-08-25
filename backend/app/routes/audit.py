from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import datetime

router = APIRouter(prefix="/audit", tags=["Security Audit Log Service"])

class AuditEvent(BaseModel):
    id: str
    user: str
    action: str
    ip: str
    status: str
    details: str
    timestamp: str

AUDIT_LOG_STORE: List[dict] = [
    {
        "id": "LOG-8801",
        "user": "Alice Admin",
        "action": "USER_LOGIN",
        "ip": "192.168.1.105",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T08:00:12Z",
        "details": "Admin authentication via MFA token"
    },
    {
        "id": "LOG-8802",
        "user": "Bob Manager",
        "action": "CREATE_PURCHASE_ORDER",
        "ip": "192.168.1.112",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T09:15:33Z",
        "details": "Issued PO-2026-002 to OmniHardware ($3,250.00)"
    },
    {
        "id": "LOG-8803",
        "user": "Charlie Staff",
        "action": "PROCESS_SALE",
        "ip": "192.168.1.120",
        "status": "SUCCESS",
        "timestamp": "2026-08-25T09:10:00Z",
        "details": "Processed INV-2026-103 with stock deduction"
    }
]

@router.get("/logs", response_model=List[AuditEvent])
def get_audit_logs():
    """
    Append-Only Security Audit Log Service — Retrieve immutable security audit trail
    """
    return AUDIT_LOG_STORE

@router.post("/event")
def record_audit_event(event: AuditEvent):
    """
    Record new immutable audit log event
    """
    AUDIT_LOG_STORE.insert(0, event.dict())
    return {"status": "recorded", "event_id": event.id}
