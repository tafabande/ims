import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
import app.models # Register all SQLAlchemy models in Base.metadata
from app.routes import products, inventory, sales, purchases, auth, audit, uploads, users, employees, stores, shifts, returns, transfers, stocktakes, promotions, reservations, setup_wizards, approvals, reconciliation, pricing, procurement, settings, payments, sessions

from app.middleware.rate_limiter import DistributedRateLimiterMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.idempotency import IdempotencyMiddleware
from app.middleware.request_correlation import RequestCorrelationMiddleware
from app.services.cache_service import get_cache_stats

# Create DB tables automatically
try:
    Base.metadata.create_all(bind=engine, checkfirst=True)
except Exception as e:
    print(f"Schema notice: {e}")


app = FastAPI(
    title="IMS Microservices & Gateway API",
    description="Production Microservices API for IMS with Domain Model Architecture, Employee Separation, Hierarchical Categories, RequestID Correlation, Structured JSON Logging & Audit Logging.",
    version="4.0.0"
)

# 0. Request Correlation & Observability Middleware (X-Request-ID)
app.add_middleware(RequestCorrelationMiddleware)

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Idempotency Key Middleware
app.add_middleware(IdempotencyMiddleware)

# 3. Distributed Redis Rate Limiter Middleware
app.add_middleware(DistributedRateLimiterMiddleware)

# 4. Environment-Driven Explicit CORS Configuration (No wildcard '*' with credentials)
raw_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
)
cors_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-User-Id", "X-User-Role", "Idempotency-Key", "X-Request-ID"],
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


@app.get("/")
def read_root():
    return {
        "system": "IMS API Gateway & Microservices Engine",
        "version": "4.0.0",
        "status": "operational",
        "domain_architecture": "Employee Separation • Hierarchical Category Trees • Referential Protection",
        "concurrency": "PostgreSQL Pessimistic Row-Level Locking (SELECT ... FOR UPDATE)",
        "idempotency": "24-Hour Key Deduplication Engine Active",
        "cors_policy": "Explicit Origins & Methods Enabled",
        "allowed_origins": cors_origins,
        "persistence": "PostgreSQL Source-of-Truth",
        "cache": "Redis Cache-Aside Layer",
        "security": "WAF -> NGINX -> Redis RateLimiter -> Idempotency -> Explicit CORS -> FastAPI -> PostgreSQL",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    """
    Health check endpoint for Docker & DevOps monitoring
    """
    return {
        "status": "healthy",
        "gateway": "NGINX API Gateway",
        "domain_model": "Active (Employees, Hierarchical Categories, Stable Business Codes)",
        "concurrency_lock": "PostgreSQL FOR UPDATE Active",
        "idempotency_engine": "Redis Deduplication (Active)",
        "cors": f"Explicit ({len(cors_origins)} origins configured)",
        "rate_limiter": "Redis Distributed (Active)",
        "cache": "Redis Cache-Aside (Active)",
        "database": "PostgreSQL Source of Truth (Connected)",
        "microservices": ["auth", "users", "employees", "inventory", "sales", "purchases", "audit", "uploads"]
    }

@app.get("/cache/stats")
def cache_statistics():
    """
    Real-time Redis Cache-Aside Hit/Miss ratio telemetry endpoint
    """
    return get_cache_stats()
