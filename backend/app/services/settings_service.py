from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import SystemSetting

DEFAULT_SYSTEM_SETTINGS = [
    {
        "key": "sales.max_staff_discount",
        "value": "2.0",
        "data_type": "float",
        "category": "sales",
        "description": "Maximum negotiation discount % allowed for counter staff without manager approval",
    },
    {
        "key": "sales.max_manager_discount",
        "value": "5.0",
        "data_type": "float",
        "category": "sales",
        "description": "Maximum negotiation discount % allowed for store managers without executive approval",
    },
    {
        "key": "pricing.minimum_margin",
        "value": "10.0",
        "data_type": "float",
        "category": "pricing",
        "description": "Minimum required margin floor % above purchase cost price",
    },
    {
        "key": "purchases.large_order_threshold",
        "value": "500.0",
        "data_type": "float",
        "category": "purchases",
        "description": "Financial threshold ($) above which stock adjustments and POs require high-risk approval",
    },
    {
        "key": "inventory.low_stock_threshold",
        "value": "5",
        "data_type": "int",
        "category": "inventory",
        "description": "Default threshold count triggering low stock reorder alerts",
    },
    {
        "key": "security.session_timeout",
        "value": "900",
        "data_type": "int",
        "category": "security",
        "description": "User token session timeout duration in seconds (15 mins = 900s)",
    },
    {
        "key": "sales.refund_approval_threshold",
        "value": "100.0",
        "data_type": "float",
        "category": "workflows",
        "description": "Monetary refund limit ($) requiring Store Manager approval",
    },
    {
        "key": "purchases.approval_threshold",
        "value": "500.0",
        "data_type": "float",
        "category": "workflows",
        "description": "Purchase Order amount ($) requiring high-risk approval",
    },
    {
        "key": "escalation.auto_escalate_hours",
        "value": "24",
        "data_type": "int",
        "category": "escalations",
        "description": "Hours before an unreviewed operational case is auto-escalated",
    },
    {
        "key": "notifications.quiet_mode",
        "value": "true",
        "data_type": "bool",
        "category": "notifications",
        "description": "Enforce quiet notification mode (subtle glows instead of loud red badges)",
    },
    {
        "key": "announcement.text",
        "value": "Operations Control Active: High-value refunds require manager authorization.",
        "data_type": "string",
        "category": "announcements",
        "description": "System-wide broadcast message shown to logged-in users",
    },
    {
        "key": "announcement.enabled",
        "value": "true",
        "data_type": "bool",
        "category": "announcements",
        "description": "Toggle system announcement header banner",
    },
    {
        "key": "work_session.default_float",
        "value": "150.0",
        "data_type": "float",
        "category": "sessions",
        "description": "Mandatory starting cash float ($) for POS shift registration",
    },
    {
        "key": "IT_ADMIN_EMAIL",
        "value": "admin@ims.co.zw",
        "data_type": "string",
        "category": "contact",
        "description": "IT Administrator email address — displayed on login screen and audit events",
    },
    {
        "key": "IT_ADMIN_NAME",
        "value": "System Administrator",
        "data_type": "string",
        "category": "contact",
        "description": "IT Administrator full name",
    },
    {
        "key": "IT_ADMIN_PHONE",
        "value": "",
        "data_type": "string",
        "category": "contact",
        "description": "IT Administrator phone number (optional)",
    },
    {
        "key": "ORG_NAME",
        "value": "IMS Enterprise",
        "data_type": "string",
        "category": "org",
        "description": "Organisation name displayed in the application header and reports",
    },
]


def seed_default_settings(db: Session):
    """
    Ensure all dynamic database business settings exist upon startup using SQLModel select.
    """
    for default in DEFAULT_SYSTEM_SETTINGS:
        statement = select(SystemSetting).where(SystemSetting.key == default["key"])
        existing = (
            db.exec(statement).first()
            if hasattr(db, "exec")
            else db.query(SystemSetting).filter(SystemSetting.key == default["key"]).first()
        )
        if not existing:
            setting = SystemSetting(
                key=default["key"],
                value=default["value"],
                data_type=default["data_type"],
                category=default["category"],
                description=default["description"],
                updated_at=datetime.now(UTC),
            )
            db.add(setting)
    db.commit()


def get_setting_value(db: Session, key: str, fallback: Any = None) -> Any:
    """
    Fetch a typed setting value directly from database configuration using SQLModel select.
    """
    statement = select(SystemSetting).where(SystemSetting.key == key)
    setting = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(SystemSetting).filter(SystemSetting.key == key).first()
    )
    if not setting:
        return fallback

    val_str = setting.value
    dt = setting.data_type
    try:
        if dt == "float":
            return float(val_str)
        elif dt == "int":
            return int(val_str)
        elif dt == "bool":
            return val_str.lower() in ["true", "1", "yes"]
        return val_str
    except Exception:
        return fallback


def get_setting(db: Session, key: str) -> str | None:
    """
    Fetch the raw string value of a setting by key.
    Returns None if the setting does not exist or has an empty value.
    """
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting and setting.value:
        return setting.value
    return None


def update_setting(db: Session, key: str, new_value: str, updated_by: str | None = None) -> SystemSetting:
    statement = select(SystemSetting).where(SystemSetting.key == key)
    setting = (
        db.exec(statement).first()
        if hasattr(db, "exec")
        else db.query(SystemSetting).filter(SystemSetting.key == key).first()
    )
    if not setting:
        raise HTTPException(status_code=404, detail=f"System setting '{key}' not found.")

    setting.value = str(new_value)
    setting.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(setting)
    return setting


def list_settings(db: Session, category: str | None = None) -> list[SystemSetting]:
    seed_default_settings(db)
    statement = select(SystemSetting)
    if category:
        statement = statement.where(SystemSetting.category == category)
    if hasattr(db, "exec"):
        return db.exec(statement).all()
    query = db.query(SystemSetting)
    if category:
        query = query.filter(SystemSetting.category == category)
    return query.order_by(SystemSetting.id.asc()).all()


def list_all_settings(db: Session) -> list[SystemSetting]:
    return list_settings(db)


def bulk_update_settings(db: Session, updates: dict[str, Any], updated_by: str | None = None) -> list[SystemSetting]:
    """
    Bulk update system configuration settings key-value pairs.
    """
    modified = []
    for key, value in updates.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            setting.value = str(value)
            setting.updated_at = datetime.now(UTC)
            modified.append(setting)
    db.commit()
    for s in modified:
        db.refresh(s)
    return modified

