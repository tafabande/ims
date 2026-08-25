from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import SystemSettingUpdate, SystemSettingResponse
from app.services import settings_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/settings", tags=["Dynamic System & Business Settings"])

@router.get("", response_model=List[SystemSettingResponse])
def get_system_settings(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read")) # All authenticated roles
):
    """
    Get dynamic business settings from database configuration.
    """
    return settings_service.list_settings(db, category)

@router.put("/{key}", response_model=SystemSettingResponse)
def update_system_setting(
    key: str,
    setting_data: SystemSettingUpdate,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or App Admin
):
    """
    Update a dynamic business setting in database configuration.
    Allows changing business limits (e.g. max_staff_discount) without code deployments.
    """
    return settings_service.update_setting(db, key, setting_data.value)
