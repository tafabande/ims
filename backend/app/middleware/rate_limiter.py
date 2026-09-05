import os
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.middleware.security import get_client_ip

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_IS_PRODUCTION = _ENVIRONMENT == "production"

# Attempt to connect to Redis with bounded connection timeout
try:
    import redis

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.Redis.from_url(
        redis_url, decode_responses=True, socket_connect_timeout=0.2, socket_timeout=0.2
    )
    redis_client.ping()
except Exception:
    redis_client = None

# Fallback in-memory rate limit counter store
memory_counter = {}

ROUTE_LIMITS = {
    "/auth/login": {"limit": 5, "window": 60},
    "/api/auth/login": {"limit": 5, "window": 60},
    "/inventory/adjustments": {"limit": 20, "window": 60},
    "/api/inventory/adjustments": {"limit": 20, "window": 60},
    "/sales": {"limit": 30, "window": 60},
    "/api/sales": {"limit": 30, "window": 60},
    "default": {"limit": 60, "window": 60},
}


class DistributedRateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Bypass health, metrics, docs, and CORS OPTIONS preflight requests
        if (
            request.method == "OPTIONS"
            or path.startswith("/health")
            or path in ["/", "/docs", "/openapi.json", "/metrics", "/redoc"]
        ):
            return await call_next(request)

        client_ip = get_client_ip(request)

        # Bypass rate limiter for test suites and automation harnesses in non-production
        if not _IS_PRODUCTION and client_ip in ["testclient", "localhost"]:
            return await call_next(request)

        # Derive identity safely: use verified Bearer token sub if present, otherwise trusted client IP
        identity = client_ip
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            try:
                from app.services import iam_service

                payload = iam_service.decode_access_token(token)
                sub = payload.get("sub")
                if sub:
                    identity = f"usr_{sub}"
            except Exception:
                pass

        policy = ROUTE_LIMITS.get(path, ROUTE_LIMITS["default"])
        max_limit = policy["limit"]
        window_seconds = policy["window"]

        key = f"rate_limit:{path}:{identity}"
        now = int(time.time())

        current_count = 0
        if redis_client:
            try:
                current_count = redis_client.incr(key)
                if current_count == 1:
                    redis_client.expire(key, window_seconds)
                ttl = redis_client.ttl(key)
            except Exception:
                current_count, ttl = self._fallback_counter(key, window_seconds, now)
        elif _IS_PRODUCTION:
            return JSONResponse(
                status_code=503,
                content={"detail": "Rate-limiting service unavailable. Request rejected safely."},
                headers={"Retry-After": "5"},
            )
        else:
            current_count, ttl = self._fallback_counter(key, window_seconds, now)

        if current_count > max_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded for endpoint '{path}'. Maximum allowed: {max_limit} req/{window_seconds}s.",
                    "retry_after_seconds": ttl if ttl > 0 else window_seconds,
                },
                headers={
                    "Retry-After": str(ttl if ttl > 0 else window_seconds),
                    "X-RateLimit-Limit": str(max_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(now + (ttl if ttl > 0 else window_seconds)),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_limit - current_count))
        response.headers["X-RateLimit-Reset"] = str(now + (ttl if ttl > 0 else window_seconds))
        return response

    def _fallback_counter(self, key: str, window_seconds: int, now: int) -> tuple[int, int]:
        if key not in memory_counter:
            memory_counter[key] = {"count": 1, "reset_at": now + window_seconds}
            return 1, window_seconds

        entry = memory_counter[key]
        if now >= entry["reset_at"]:
            memory_counter[key] = {"count": 1, "reset_at": now + window_seconds}
            return 1, window_seconds

        entry["count"] += 1
        ttl = entry["reset_at"] - now
        return entry["count"], ttl
