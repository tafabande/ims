from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import HTTPException
from sqlmodel import select, Session
from app.models import SystemSetting

DEFAULT_SYSTEM_SETTINGS = [
    {
        "key": "sales.max_staff_discount",
        "value": "2.0",
        "data_type": "float",
        "category": "sales",
        "description": "Maximum negotiation discount % allowed for counter staff without manager approval"
    },
    {
        "key": "sales.max_manager_discount",
        "value": "5.0",
        "data_type": "float",
        "category": "sales",
        "description": "Maximum negotiation discount % allowed for store managers without executive approval"
    },
    {
        "key": "pricing.minimum_margin",
        "value": "10.0",
        "data_type": "float",
        "category": "pricing",
        "description": "Minimum required margin floor % above purchase cost price"
    },
    {
        "key": "purchases.large_order_threshold",
        "value": "500.0",
        "data_type": "float",
        "category": "purchases",
        "description": "Financial threshold ($) above which stock adjustments and POs require high-risk approval"
    },
    {
        "key": "inventory.low_stock_threshold",
        "value": "5",
        "data_type": "int",
        "category": "inventory",
        "description": "Default threshold count triggering low stock reorder alerts"
    },
    {
        "key": "security.session_timeout",
        "value": "900",
        "data_type": "int",
        "category": "security",
        "description": "User token session timeout duration in seconds (15 mins = 900s)"
    }
]

def seed_default_settings(db: Session):
    """
    Ensure all dynamic database business settings exist upon startup using SQLModel select.
    """
    for default in DEFAULT_SYSTEM_SETTINGS:
        statement = select(SystemSetting).where(SystemSetting.key == default["key"])
        existing = db.exec(statement).first() if hasattr(db, "exec") else db.query(SystemSetting).filter(SystemSetting.key == default["key"]).first()
        if not existing:
            setting = SystemSetting(
                key=default["key"],
                value=default["value"],
                data_type=default["data_type"],
                category=default["category"],
                description=default["description"],
                updated_at=datetime.now(timezone.utc)
            )
            db.add(setting)
    db.commit()

def get_setting_value(db: Session, key: str, fallback: Any = None) -> Any:
    """
    Fetch a typed setting value directly from database configuration using SQLModel select.
    """
    statement = select(SystemSetting).where(SystemSetting.key == key)
    setting = db.exec(statement).first() if hasattr(db, "exec") else db.query(SystemSetting).filter(SystemSetting.key == key).first()
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

def update_setting(db: Session, key: str, new_value: str) -> SystemSetting:
    statement = select(SystemSetting).where(SystemSetting.key == key)
    setting = db.exec(statement).first() if hasattr(db, "exec") else db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"System setting '{key}' not found.")

    setting.value = str(new_value)
    setting.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(setting)
    return setting

def list_settings(db: Session, category: Optional[str] = None) -> List[SystemSetting]:
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

def list_all_settings(db: Session) -> List[SystemSetting]:
    return list_settings(db)
