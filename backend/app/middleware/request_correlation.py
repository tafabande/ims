import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.logger import log_application_event

class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that attaches a unique correlation request_id (X-Request-ID) to every HTTP request/response cycle,
    logging structured request start/end observability events.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # Extract existing X-Request-ID or generate new correlation token
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = f"req-{uuid.uuid4().hex[:8]}"

        request.state.request_id = request_id
        start_time = time.time()

        # Log request started
        user_id = request.headers.get("X-User-Id", "anonymous")
        log_application_event(
            event_type="HTTP_REQUEST_START",
            message=f"{request.method} {request.url.path}",
            request_id=request_id,
            user_id=user_id,
            extra_details={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown"
            }
        )

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        # Log request completed
        log_application_event(
            event_type="HTTP_REQUEST_COMPLETE",
            message=f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            request_id=request_id,
            user_id=user_id,
            extra_details={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )

        return response
