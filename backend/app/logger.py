import logging
import json
import datetime
from typing import Any, Dict, Optional

SENSITIVE_KEYS = {
    "password", "hashed_password", "token", "access_token", "refresh_token", 
    "authorization", "cookie", "api_key", "secret", "database_password", 
    "jwt", "session_token", "private_key"
}

def sanitize_data(data: Any) -> Any:
    """
    Recursively sanitize sensitive key/value pairs from log payloads.
    """
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if k.lower() in SENSITIVE_KEYS:
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = sanitize_data(v)
        return cleaned
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data

class StructuredJSONFormatter(logging.Formatter):
    """
    Custom Logging Formatter for Structured JSON Observability.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "level": record.levelname,
            "service": "ims-api",
            "logger": record.name,
            "message": record.getMessage()
        }

        # Extra metadata passed via extra={...}
        if hasattr(record, "request_id"):
            log_payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "user_id"):
            log_payload["user_id"] = getattr(record, "user_id")
        if hasattr(record, "event_type"):
            log_payload["event_type"] = getattr(record, "event_type")
        if hasattr(record, "details"):
            log_payload["details"] = sanitize_data(getattr(record, "details"))

        return json.dumps(log_payload)

# Initialize logger
logger = logging.getLogger("ims.observability")
logger.setLevel(logging.INFO)

# Console handler
handler = logging.StreamHandler()
handler.setFormatter(StructuredJSONFormatter())
if not logger.handlers:
    logger.addHandler(handler)

def log_application_event(event_type: str, message: str, request_id: Optional[str] = None, user_id: Optional[str] = None, extra_details: Optional[Dict[str, Any]] = None, level: int = logging.INFO):
    """Log structured application event."""
    extra = {
        "event_type": event_type,
        "request_id": request_id or "system",
        "user_id": user_id or "anonymous",
        "details": extra_details or {}
    }
    logger.log(level, message, extra=extra)

def log_security_event(event_type: str, user_identity: str, ip_address: str, status: str, details: str, request_id: Optional[str] = None):
    """Log structured security event (LOGIN, TOKEN_REFRESH, PERMISSION_DENIED)."""
    extra = {
        "event_type": f"SECURITY:{event_type}",
        "request_id": request_id or "system",
        "user_id": user_identity,
        "details": {
            "ip_address": ip_address,
            "status": status,
            "info": details
        }
    }
    level = logging.WARNING if status in ("DENIED", "FAILURE", "WARN") else logging.INFO
    logger.log(level, f"Security Event: {event_type} - {status}", extra=extra)
