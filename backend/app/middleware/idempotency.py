import os
import json
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

try:
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
except Exception:
    redis_client = None

IDEMPOTENCY_TTL_SECONDS = 86400 # 24 hours retention

class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only process state-modifying requests that specify Idempotency-Key
        idempotency_key = request.headers.get("Idempotency-Key")
        if not idempotency_key or request.method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await call_next(request)

        cache_key = f"idempotency:{idempotency_key}"

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
                            "X-Idempotency-Key": idempotency_key
                        }
                    )
            except Exception:
                pass

        # Execute downstream request
        response = await call_next(request)

        # Cache successful response for 24 hours
        if redis_client and 200 <= response.status_code < 300:
            try:
                # Read response body stream
                response_body = [section async for section in response.body_iterator]
                response.body_iterator = iterate_in_threadpool(response_body)
                body_bytes = b"".join(response_body)
                
                try:
                    payload = json.loads(body_bytes.decode())
                    cache_payload = {
                        "status_code": response.status_code,
                        "content": payload
                    }
                    redis_client.set(cache_key, json.dumps(cache_payload), ex=IDEMPOTENCY_TTL_SECONDS)
                except Exception:
                    pass

                return Response(
                    content=body_bytes,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
            except Exception:
                pass

        return response

def iterate_in_threadpool(iterable):
    async def _iterator():
        for item in iterable:
            yield item
    return _iterator()
