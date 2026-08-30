from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.iam_service import require_permission
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Centralized Persistent Notification Engine"])


@router.get("")
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("sales:view")),
):
    """
    List notifications for current authenticated user.
    """
    user_id = auth_ctx.get("sub") or auth_ctx.get("user_id") or "EMP-00014"
    user_role = auth_ctx.get("role") or "STAFF"
    return notification_service.list_user_notifications(
        user_id=user_id, user_role=user_role, unread_only=unread_only, db=db
    )


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("sales:view")),
):
    """
    Mark a specific notification as read for current authenticated user.
    Verifies that the notification recipient record belongs to the requesting user.
    """
    user_id = auth_ctx.get("sub") or auth_ctx.get("user_id") or "EMP-00014"
    success = notification_service.mark_read(notification_id, user_id=user_id, db=db)
    if not success:
        raise HTTPException(status_code=404, detail=f"Notification {notification_id} not found or not assigned to user {user_id}.")
    return {"status": "SUCCESS", "notification_id": notification_id, "user_id": user_id}


@router.post("/broadcast")
def send_broadcast_notification(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("organisation:manage")),
):
    """
    Send an organization-wide broadcast notification (Admin capability required).
    """
    title = payload.get("title", "System Announcement")
    message = payload.get("message", "")
    severity = payload.get("severity", "INFO")
    creator = auth_ctx.get("sub") or auth_ctx.get("user_id") or "APP_ADMIN"

    if not message:
        raise HTTPException(status_code=400, detail="Broadcast message body cannot be empty.")

    notif = notification_service.create_notification(
        notif_type="BROADCAST",
        title=title,
        message=message,
        severity=severity,
        target_type="ORGANISATION",
        target_value="ALL",
        created_by=creator,
        db=db,
    )
    return notif
