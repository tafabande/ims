"""
Enterprise Production Health & Readiness Router for IMS
Supports Kubernetes / Docker Container Health Checks:
- GET /health/liveness  : Basic process uptime check
- GET /health/readiness : Database connectivity & dependency check
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/health", tags=["Infrastructure Health & Observability"])

SERVICE_START_TIME = datetime.now(UTC)


@router.get("/liveness")
def check_liveness() -> dict[str, Any]:
    """
    Liveness probe for Docker / K8s process health.
    Returns HTTP 200 as long as the FastAPI process is responsive.
    """
    uptime_seconds = int((datetime.now(UTC) - SERVICE_START_TIME).total_seconds())
    return {
        "status": "UP",
        "service": "ims-api",
        "version": "2.4.0-prod",
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/readiness")
def check_readiness(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Readiness probe for database & infrastructure dependency health.
    Queries PostgreSQL via SELECT 1. Returns 200 OK if healthy, 503 if DB unavailable.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "READY",
            "service": "ims-api",
            "database": "CONNECTED",
            "timestamp": datetime.now(UTC).isoformat(),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "NOT_READY",
                "service": "ims-api",
                "database": "DISCONNECTED",
                "error": str(exc),
            },
        )
