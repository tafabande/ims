import json
import os

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

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

        cache_key = f"idempotency:{idempotency_key}"

        # 1. Check Redis Cache
        if redis_client:
            try:
                cached_raw = redis_client.get(cache_key)
                if cached_raw:
                    cached = json.loads(cached_raw)
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
                pass

        # 2. Check In-Memory Fallback Store
        if cache_key in MEMORY_IDEMPOTENCY_STORE:
            cached = MEMORY_IDEMPOTENCY_STORE[cache_key]
            return JSONResponse(
                status_code=cached["status_code"],
                content=cached["content"],
                headers={
                    "X-Idempotency-Hit": "true",
                    "X-Idempotency-Key": idempotency_key,
                    "X-Cache-Lookup": "IDEMPOTENT_REPLAY",
                },
            )

        # Execute downstream request
        response = await call_next(request)

        # Cache successful response for 24 hours
        if 200 <= response.status_code < 300:
            try:
                body_bytes = b""
                if hasattr(response, "body") and response.body:
                    body_bytes = response.body
                elif hasattr(response, "body_iterator"):
                    iterator = response.body_iterator
                    if hasattr(iterator, "__aiter__"):
                        async for chunk in iterator:
                            body_bytes += chunk if isinstance(chunk, bytes) else str(chunk).encode()
                    else:
                        for chunk in iterator:
                            body_bytes += chunk if isinstance(chunk, bytes) else str(chunk).encode()

                try:
                    payload = json.loads(body_bytes.decode("utf-8"))
                except Exception:
                    payload = body_bytes.decode("utf-8", errors="replace")

                cache_payload = {
                    "status_code": response.status_code,
                    "content": payload,
                }
                if redis_client:
                    try:
                        redis_client.set(
                            cache_key,
                            json.dumps(cache_payload),
                            ex=IDEMPOTENCY_TTL_SECONDS,
                        )
                    except Exception:
                        pass
                if len(MEMORY_IDEMPOTENCY_STORE) > 1000:
                    MEMORY_IDEMPOTENCY_STORE.clear()
                MEMORY_IDEMPOTENCY_STORE[cache_key] = cache_payload

                return Response(
                    content=body_bytes,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )
            except Exception:
                pass

        return response


def iterate_in_threadpool(iterable):
    async def _iterator():
        for item in iterable:
            yield item

    return _iterator()
