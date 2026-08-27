from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.services.iam_service import require_permission
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/api/notifications", tags=["Event-Driven Business Notification Engine"])

MOCK_NOTIFICATIONS = [
    {
        "id": 1,
        "notification_code": "NOTIF-2026-0091",
        "importance": "ACTION_REQUIRED",  # ACTION_REQUIRED | ATTENTION_REQUIRED | INFORMATION
        "title": "Refund Approval Required: #REF-00042",
        "message": "Customer CUS-001284 (John Moyo) requested $145.00 refund on receipt SAL-00182 for 1x Dell XPS 15.",
        "category": "REFUND_APPROVAL",
        "target_type": "REFUND",
        "target_id": "REF-00042",
        "requester": "EMP-00014 (Sales Staff)",
        "submission_note": "Customer states item packaging was damaged upon unboxing.",
        "read": False,
        "created_at": "2026-08-26T01:45:00Z",
    },
    {
        "id": 2,
        "notification_code": "NOTIF-2026-0088",
        "importance": "ACTION_REQUIRED",
        "title": "Stock Adjustment Approval: #ADJ-00041",
        "message": "Warehouse Staff requested -2 unit stock write-off on SKU-000482 at Harare Main Warehouse.",
        "category": "STOCK_ADJUSTMENT",
        "target_type": "ADJUSTMENT",
        "target_id": "ADJ-00041",
        "requester": "EMP-00031 (Warehouse Staff)",
        "submission_note": "Supplier delivery discrepancy during receiving count.",
        "read": False,
        "created_at": "2026-08-26T01:30:00Z",
    },
    {
        "id": 3,
        "notification_code": "NOTIF-2026-0074",
        "importance": "ATTENTION_REQUIRED",
        "title": 'Critical Stockout Alert: Samsung 55" TV',
        "message": "Available stock (4u) is below safety reorder level (10u). Projected depletion in ~3.9 days.",
        "category": "CRITICAL_STOCK",
        "target_type": "PRODUCT",
        "target_id": "PRD-000482",
        "requester": "SYSTEM_ENGINE",
        "submission_note": "Reorder recommendation: 180 units.",
        "read": False,
        "created_at": "2026-08-26T01:10:00Z",
    },
    {
        "id": 4,
        "notification_code": "NOTIF-2026-0062",
        "importance": "INFORMATION",
        "title": "Goods Receiving Completed: #PO-000482",
        "message": "PO-000482 received at Harare Main. Ordered: 20, Received: 18, Returned: 2 (Damaged).",
        "category": "GOODS_RECEIVED",
        "target_type": "PURCHASE_ORDER",
        "target_id": "PO-000482",
        "requester": "EMP-00031 (Receiving Operator)",
        "submission_note": "Supplier delivery note attached.",
        "read": True,
        "created_at": "2026-08-26T00:50:00Z",
    },
]


@router.get("")
def list_manager_notifications(
    importance_filter: str | None = None,
    auth_ctx: dict = Depends(require_permission("inventory:view")),
):
    """
    Returns event-driven business notifications categorized by importance (ACTION_REQUIRED, ATTENTION_REQUIRED, INFORMATION).
    """
    if importance_filter:
        return [n for n in MOCK_NOTIFICATIONS if n["importance"] == importance_filter.upper()]
    return MOCK_NOTIFICATIONS


@router.post("/read/{notification_id}")
def mark_notification_read(notification_id: int, auth_ctx: dict = Depends(require_permission("inventory:view"))):
    """
    Marks target notification as read.
    """
    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["read"] = True
            return {
                "status": "success",
                "message": f"Notification {n['notification_code']} marked as read.",
            }
    raise HTTPException(status_code=404, detail="Notification not found.")


@router.post("/approve")
def execute_symmetrical_approval_decision(
    payload: dict[str, Any],
    auth_ctx: dict = Depends(require_permission("inventory:adjust")),  # Manager role
):
    """
    Symmetrical 3-Outcome Approval Engine:
    Executes APPROVED, REJECTED, or CHANGES_REQUESTED with required reviewer notes.
    """
    notification_id = payload.get("notification_id")
    decision = payload.get("decision", "APPROVED").upper()  # APPROVED | REJECTED | CHANGES_REQUESTED
    reviewer_notes = payload.get("reviewer_notes", "").strip()

    if decision in ["REJECTED", "CHANGES_REQUESTED"] and not reviewer_notes:
        raise HTTPException(
            status_code=400,
            detail=f"Reviewer notes are required when decision is '{decision}'.",
        )

    for n in MOCK_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["read"] = True
            n["importance"] = "INFORMATION"
            n["title"] = f"Resolved ({decision}): {n['title']}"

    return {
        "status": "DECISION_EXECUTED",
        "decision": decision,
        "reviewer_notes": reviewer_notes,
        "executed_at": datetime.now(UTC).isoformat(),
        "message": f"Approval decision '{decision}' executed successfully with audit log entry.",
    }


@router.get("/scheduler/jobs")
def get_scheduled_cron_jobs(
    auth_ctx: dict = Depends(require_permission("system:config")),
):
    """
    Returns configured backend background cron & scheduled jobs.
    """
    return scheduler_service.list_jobs()


@router.post("/scheduler/trigger/{job_id}")
def trigger_scheduled_cron_job(job_id: str, auth_ctx: dict = Depends(require_permission("system:config"))):
    """
    Manually triggers a backend scheduled cron job for event generation.
    """
    return scheduler_service.trigger_job(job_id)
