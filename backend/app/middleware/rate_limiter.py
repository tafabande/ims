import time
import os
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Attempt to connect to Redis with bounded connection timeout
try:
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=0.2, socket_timeout=0.2)
    redis_client.ping()
except Exception:
    redis_client = None

# Fallback in-memory rate limit counter store
memory_counter = {}

ROUTE_LIMITS = {
    "/auth/login": {"limit": 5, "window": 60},
    "/inventory/adjustments": {"limit": 20, "window": 60},
    "/sales": {"limit": 30, "window": 60},
    "default": {"limit": 60, "window": 60}
}

class DistributedRateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Bypass health, docs, and CORS OPTIONS preflight requests
        if request.method == "OPTIONS" or path in ["/health", "/", "/docs", "/openapi.json"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        user_header = request.headers.get("X-User-Id", client_ip)
        
        policy = ROUTE_LIMITS.get(path, ROUTE_LIMITS["default"])
        max_limit = policy["limit"]
        window_seconds = policy["window"]

        key = f"rate_limit:{path}:{user_header}"
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
        else:
            current_count, ttl = self._fallback_counter(key, window_seconds, now)

        remaining = max(0, max_limit - current_count)

        if current_count > max_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded for endpoint '{path}'. Maximum allowed: {max_limit} req/{window_seconds}s.",
                    "retry_after_seconds": ttl if ttl > 0 else window_seconds
                },
                headers={
                    "Retry-After": str(ttl if ttl > 0 else window_seconds),
                    "X-RateLimit-Limit": str(max_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(now + (ttl if ttl > 0 else window_seconds))
                }
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(now + (ttl if ttl > 0 else window_seconds))
        return response

    def _fallback_counter(self, key, window_seconds, now):
        if key not in memory_counter or memory_counter[key]["reset"] <= now:
            memory_counter[key] = {"count": 1, "reset": now + window_seconds}
        else:
            memory_counter[key]["count"] += 1

        entry = memory_counter[key]
        ttl = entry["reset"] - now
        return entry["count"], ttl
