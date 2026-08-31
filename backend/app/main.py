import os
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import app.models  # Register all SQLAlchemy models in Base.metadata
from app.database import Base, engine, get_db
from app.middleware.idempotency import IdempotencyMiddleware
from app.middleware.rate_limiter import DistributedRateLimiterMiddleware
from app.middleware.request_correlation import RequestCorrelationMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.routes import (
    approvals,
    audit,
    auth,
    cases,
    employees,
    health,
    import_export,
    imports,
    integrations,
    integrity,
    inventory,
    notifications,
    payments,
    planning,
    pricing,
    procurement,
    products,
    promotions,
    purchases,
    reconciliation,
    registries,
    reservations,
    returns,
    sales,
    sessions,
    settings,
    setup_wizards,
    shifts,
    stocktakes,
    stores,
    transfers,
    uploads,
    users,
    work_sessions,
)
from app.services.cache_service import get_cache_stats

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_IS_PRODUCTION = _ENVIRONMENT == "production"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # NEVER seed sample users or predictable default credentials in production
    if not _IS_PRODUCTION and os.getenv("AUTO_SEED", "false").lower() == "true":
        try:
            from seed import seed_db

            seed_db()
        except Exception as e:
            print(f"Startup database seeding notice: {e}")
    yield


app = FastAPI(
    title="IMS Microservices & Gateway API",
    description="Production Microservices API for IMS with Domain Model Architecture, Employee Separation, Hierarchical Categories, RequestID Correlation, Structured JSON Logging & Audit Logging.",
    version="4.0.0",
    lifespan=lifespan,
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
)

_STARTED_AT = time.monotonic()

# 0. Request Correlation & Observability Middleware (X-Request-ID)
app.add_middleware(RequestCorrelationMiddleware)

# 0.1 Response Payload GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Idempotency Key Middleware
app.add_middleware(IdempotencyMiddleware)

# 3. Distributed Redis Rate Limiter Middleware
app.add_middleware(DistributedRateLimiterMiddleware)

# 4. Environment-Driven Explicit CORS Configuration (No wildcard '*' with credentials)
raw_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
)
cors_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Microservice Route Handlers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(employees.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(purchases.router)
app.include_router(audit.router)
app.include_router(uploads.router)
app.include_router(stores.router)
app.include_router(shifts.router)
app.include_router(returns.router)
app.include_router(transfers.router)
app.include_router(planning.router)
app.include_router(notifications.router)
app.include_router(cases.router)
app.include_router(health.router)
app.include_router(registries.router)
app.include_router(stocktakes.router)
app.include_router(promotions.router)
app.include_router(reservations.router)
app.include_router(setup_wizards.router)
app.include_router(approvals.router)
app.include_router(reconciliation.router)
app.include_router(pricing.router)
app.include_router(procurement.router)
app.include_router(settings.router)
app.include_router(payments.router)
app.include_router(sessions.router)
app.include_router(integrity.router)
app.include_router(import_export.router)
app.include_router(integrations.router)
app.include_router(imports.router)
app.include_router(work_sessions.router)


@app.get("/")
def read_root():
    return {
        "system": "IMS API Gateway",
        "version": "4.0.0",
        "status": "operational",
    }


@app.get("/health/live")
def health_live():
    """
    Kubernetes / Docker Liveness Probe: Confirms the process is running and responding.
    """
    return {"status": "ALIVE", "timestamp": datetime.now(UTC).isoformat()}


@app.get("/health/ready")
def health_ready(db: Session = Depends(get_db)):
    """
    Kubernetes / Docker Readiness Probe: Confirms DB and Redis are ready to accept traffic.
    Returns 503 if any required dependency is unreachable.
    """
    checks = {}
    all_ok = True

    # Database check
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "CONNECTED"
    except Exception as e:
        checks["database"] = f"UNREACHABLE: {e}"
        all_ok = False

    # Redis check
    try:
        import redis as _redis

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = _redis.from_url(redis_url, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "CONNECTED"
    except Exception:
        checks["redis"] = "UNREACHABLE"
        all_ok = False

    result = {
        "status": "READY" if all_ok else "NOT_READY",
        "checks": checks,
        "timestamp": datetime.now(UTC).isoformat(),
    }

    if not all_ok:
        raise HTTPException(status_code=503, detail=result)
    return result


@app.get("/health")
def health_check():
    """
    Health check endpoint for Docker & DevOps monitoring.
    Reports only live-checkable information — no hard-coded SLO claims.
    """
    return {
        "status": "healthy",
        "gateway": "NGINX API Gateway",
        "cors": f"Explicit ({len(cors_origins)} origins configured)",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/health/operational")
def health_operational():
    """
    Operational Health Endpoint.
    SLO/SLI telemetry should be sourced from a monitoring system (e.g. Prometheus/Grafana),
    not from hard-coded values in application code.
    """
    return {
        "status": "OPERATIONAL",
        "note": "SLO/SLI metrics, disaster recovery status, and secrets management evidence "
        "should be sourced from monitoring infrastructure and CI artifacts, not runtime endpoints.",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.get("/release/readiness")
def release_readiness():
    """
    Release readiness is assessed via CI artifacts and external gate checks, not runtime endpoints.
    """
    return {
        "status": "NOT_EVALUATED",
        "message": "Release readiness is determined by CI pipeline results, security scan artifacts, "
        "and external gate checks — not by a runtime self-assessment endpoint. "
        "See CI workflow outputs for the latest evidence.",
    }


@app.get("/cache/stats")
def cache_statistics():
    """
    Real-time Redis Cache-Aside Hit/Miss ratio telemetry endpoint
    """
    return get_cache_stats()


@app.get("/metrics", include_in_schema=False)
def metrics():
    uptime = max(0.0, time.monotonic() - _STARTED_AT)
    body = (
        "# HELP ims_up Application process availability.\n"
        "# TYPE ims_up gauge\n"
        "ims_up 1\n"
        "# HELP ims_process_uptime_seconds Process uptime in seconds.\n"
        "# TYPE ims_process_uptime_seconds gauge\n"
        f"ims_process_uptime_seconds {uptime:.3f}\n"
    )
    return Response(content=body, media_type="text/plain; version=0.0.4")
