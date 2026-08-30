import asyncio
import hashlib
import json
import os

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.middleware.security import get_client_ip

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

IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours retention
MEMORY_IDEMPOTENCY_STORE = {}
MEMORY_LOCKS: dict[str, asyncio.Lock] = {}
_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only process state-modifying requests that specify Idempotency-Key
        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key or request.method not in [
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        ]:
            return await call_next(request)

        if len(idempotency_key) > 200:
            return JSONResponse(status_code=400, content={"detail": "Idempotency-Key exceeds 200 characters."})

        body_bytes = await request.body()
        body_hash = hashlib.sha256(body_bytes).hexdigest()
        identity = get_client_ip(request)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from app.services.iam_service import decode_access_token

                identity = f"user:{decode_access_token(auth_header[7:].strip()).get('sub', identity)}"
            except Exception:
                pass

        scope = f"{request.method}:{request.url.path}:{identity}:{idempotency_key}"
        cache_key = f"idempotency:{hashlib.sha256(scope.encode()).hexdigest()}"
        lock_key = f"{cache_key}:lock"

        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}

        request._receive = receive

        # 1. Check Redis Cache
        if redis_client:
            try:
                cached_raw = redis_client.get(cache_key)
                if cached_raw:
                    cached = json.loads(cached_raw)
                    if cached.get("body_hash") != body_hash:
                        return JSONResponse(
                            status_code=409,
                            content={"detail": "Idempotency-Key was already used with a different request body."},
                        )
                    return JSONResponse(
                        status_code=cached["status_code"],
                        content=cached["content"],
                        headers={
                            "X-Idempotency-Hit": "true",
                            "X-Idempotency-Key": idempotency_key,
                            "X-Cache-Lookup": "IDEMPOTENT_REPLAY",
                        },
                    )
            except Exception:
                if _IS_PRODUCTION:
                    return JSONResponse(
                        status_code=503,
                        content={"detail": "Idempotency service unavailable. Request rejected safely."},
                        headers={"Retry-After": "5"},
                    )

        # 2. Check In-Memory Fallback Store
        if cache_key in MEMORY_IDEMPOTENCY_STORE:
            cached = MEMORY_IDEMPOTENCY_STORE[cache_key]
            if cached.get("body_hash") != body_hash:
                return JSONResponse(
                    status_code=409,
                    content={"detail": "Idempotency-Key was already used with a different request body."},
                )
            return JSONResponse(
                status_code=cached["status_code"],
                content=cached["content"],
                headers={
                    "X-Idempotency-Hit": "true",
                    "X-Idempotency-Key": idempotency_key,
                    "X-Cache-Lookup": "IDEMPOTENT_REPLAY",
                },
            )

        lock = MEMORY_LOCKS.setdefault(cache_key, asyncio.Lock())
        if lock.locked():
            return JSONResponse(
                status_code=409,
                content={"detail": "A request with this Idempotency-Key is already being processed."},
                headers={"Retry-After": "1"},
            )

        redis_lock_acquired = False
        if redis_client:
            try:
                redis_lock_acquired = bool(redis_client.set(lock_key, "1", nx=True, ex=30))
                if not redis_lock_acquired:
                    return JSONResponse(
                        status_code=409,
                        content={"detail": "A request with this Idempotency-Key is already being processed."},
                        headers={"Retry-After": "1"},
                    )
            except Exception:
                if _IS_PRODUCTION:
                    return JSONResponse(status_code=503, content={"detail": "Idempotency service unavailable."})

        async with lock:
            try:
                response = await call_next(request)

                if 200 <= response.status_code < 300:
                    try:
                        response_body = b""
                        if hasattr(response, "body") and response.body:
                            response_body = response.body
                        elif hasattr(response, "body_iterator"):
                            iterator = response.body_iterator
                            if hasattr(iterator, "__aiter__"):
                                async for chunk in iterator:
                                    response_body += chunk if isinstance(chunk, bytes) else str(chunk).encode()
                            else:
                                for chunk in iterator:
                                    response_body += chunk if isinstance(chunk, bytes) else str(chunk).encode()

                        try:
                            payload = json.loads(response_body.decode("utf-8"))
                        except Exception:
                            payload = response_body.decode("utf-8", errors="replace")

                        cache_payload = {
                            "status_code": response.status_code,
                            "content": payload,
                            "body_hash": body_hash,
                        }
                        if redis_client:
                            redis_client.set(
                                cache_key,
                                json.dumps(cache_payload),
                                ex=IDEMPOTENCY_TTL_SECONDS,
                            )
                        if not _IS_PRODUCTION:
                            if len(MEMORY_IDEMPOTENCY_STORE) > 1000:
                                MEMORY_IDEMPOTENCY_STORE.clear()
                            MEMORY_IDEMPOTENCY_STORE[cache_key] = cache_payload

                        return Response(
                            content=response_body,
                            status_code=response.status_code,
                            headers=dict(response.headers),
                            media_type=response.media_type,
                        )
                    except Exception:
                        if _IS_PRODUCTION:
                            return JSONResponse(
                                status_code=503,
                                content={"detail": "Could not persist idempotency result safely."},
                            )

                return response
            finally:
                if redis_client and redis_lock_acquired:
                    try:
                        redis_client.delete(lock_key)
                    except Exception:
                        pass
                MEMORY_LOCKS.pop(cache_key, None)


def iterate_in_threadpool(iterable):
    async def _iterator():
        for item in iterable:
            yield item

    return _iterator()
