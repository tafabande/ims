from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import SystemSettingUpdate, SystemSettingResponse
from app.services import settings_service
from app.dependencies import require_permission, get_current_user, UserContext

router = APIRouter(prefix="/api/settings", tags=["Dynamic System & Business Settings"])


@router.get("/contact")
def get_it_admin_contact(db: Session = Depends(get_db)):
    """
    Public endpoint — returns IT admin contact information for the login page and error screens.
    No authentication required (accessible before login).
    Contact info is stored in the settings table, not hardcoded.
    """
    keys = ["IT_ADMIN_EMAIL", "IT_ADMIN_NAME", "IT_ADMIN_PHONE"]
    result = {}
    for key in keys:
        val = settings_service.get_setting(db, key)
        if val:
            result[key.lower()] = val
    return result or {
        "it_admin_email": "admin@ims.co.zw",
        "it_admin_name": "System Administrator",
        "it_admin_phone": None,
    }


@router.get("", response_model=List[SystemSettingResponse])
def get_system_settings(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get dynamic business settings from the database configuration.
    Accessible to all authenticated users.
    """
    return settings_service.list_settings(db, category)


@router.put("/{key}", response_model=SystemSettingResponse)
def update_system_setting(
    key: str,
    setting_data: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: UserContext = Depends(require_permission("system.config")),
):
    """
    Update a dynamic business setting.
    Restricted to roles with system.config permission (APP_ADMIN, SYSADMIN, MANAGER).
    Allows changing business limits without code deployments.
    Audit trail: logs the responsible user.
    """
    return settings_service.update_setting(db, key, setting_data.value, updated_by=current_user.email)
