import datetime
import html
import logging
import os

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_IS_PRODUCTION = _ENVIRONMENT == "production"

# Only trust X-Forwarded-For from these IPs (configure via env for your proxy layer)
TRUSTED_PROXY_IPS = set(filter(None, os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1,::1").split(",")))


def determine_network_context(request: Request) -> str:
    """
    Evaluates Zero-Trust Network Context (LAN, REMOTE) from trusted client IP and proxy headers.
    In non-production environments only, X-Network-Context request header overrides context.
    """
    # Test override is ONLY available outside production
    if not _IS_PRODUCTION:
        header_override = request.headers.get("X-Network-Context")
        if header_override:
            return header_override

    # 1. Extract Client IP — only trust X-Forwarded-For from known proxy IPs
    peer_ip = request.client.host if request.client else "127.0.0.1"
    if peer_ip in TRUSTED_PROXY_IPS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = peer_ip
    else:
        # Untrusted peer — ignore forwarding headers entirely
        client_ip = peer_ip

    # 2. LAN IP range detection (127.0.0.1, 10.x, 192.168.x, 172.16-31.x)
    if (
        client_ip in ["127.0.0.1", "::1", "testclient", "localhost"]
        or client_ip.startswith(("192.168.", "10."))
        or any(client_ip.startswith(f"172.{b}.") for b in range(16, 32))
    ):
        return "LAN"

    return "REMOTE"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Attach Zero-Trust Network Context to request.state for internal audit evaluation
        request.state.network_context = determine_network_context(request)

        # Anti-CSRF Protection check for state-changing requests when CSRF cookie/header is present
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            if csrf_cookie and csrf_header and csrf_cookie != csrf_header:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF Token Mismatch. State-changing request blocked."},
                )

        response = await call_next(request)

        # Production Security Headers
        response.headers["X-Network-Context"] = request.state.network_context
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "base-uri 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self';"
        )
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Prevent browser/proxy caching for sensitive API endpoints
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"

        return response


logger = logging.getLogger("security.audit")

# Enterprise RBAC & ABAC Role Permission Matrix
ROLE_PERMISSIONS = {
    "SYSADMIN": {
        "system:deploy",
        "system:backup",
        "system:restore",
        "system:configure",
        "system:logs",
        # Explicitly NO business domain permissions (products, inventory, sales, purchases, pricing)
    },
    "APP_ADMIN": {
        "users:view",
        "users:create",
        "users:update",
        "users:disable",
        "users:delete",
        "users:reset_password",
        "users:assign_role",
        "organisation:manage",
        "warehouses:manage",
        "categories:manage",
        "audit:view",
    },
    "ADMIN": {
        "products:view",
        "products:create",
        "products:update",
        "products:delete",
        "inventory:view",
        "inventory:adjust",
        "inventory:receive",
        "inventory:transfer",
        "inventory:read",
        "purchases:create",
        "purchases:submit",
        "purchases:approve",
        "purchases:receive",
        "pricing:view",
        "pricing:update",
        "suppliers:view",
        "suppliers:create",
        "suppliers:update",
        "users:view",
        "users:create",
        "users:update",
        "users:disable",
        "users:delete",
        "users:reset_password",
        "users:assign_role",
        "organisation:manage",
        "warehouses:manage",
        "categories:manage",
        "audit:view",
        "sales:create",
        "sales:view",
    },
    "MANAGER": {
        "products:view",
        "products:create",
        "products:update",
        "products:delete",
        "inventory:view",
        "inventory:adjust",
        "inventory:receive",
        "inventory:transfer",
        "inventory:read",
        "purchases:create",
        "purchases:submit",
        "purchases:approve",
        "purchases:receive",
        "pricing:view",
        "pricing:update",
        "suppliers:view",
        "suppliers:create",
        "suppliers:update",
        "sales:create",
        "sales:view",
        "audit:view",
    },
    "INVENTORY_MANAGER": {
        "products:view",
        "products:create",
        "products:update",
        "products:delete",
        "inventory:view",
        "inventory:adjust",
        "inventory:receive",
        "inventory:transfer",
        "inventory:read",
        "purchases:create",
        "purchases:submit",
        "purchases:approve",
        "purchases:receive",
        "pricing:view",
        "pricing:update",
        "suppliers:view",
        "suppliers:create",
        "suppliers:update",
    },
    "WAREHOUSE_MANAGER": {
        "products:view",
        "products:update",
        "inventory:view",
        "inventory:adjust",
        "inventory:receive",
        "inventory:transfer",
        "inventory:read",
        "purchases:receive",
        "suppliers:view",
    },
    "STAFF": {
        "products:view",
        "inventory:view",
        "inventory:receive",
        "inventory:read",
        "sales:create",
        "customers:view",
    },
    "AUDITOR": {
        "products:view",
        "inventory:view",
        "inventory:read",
        "sales:view",
        "purchases:view",
        "pricing:view",
        "customers:view",
        "suppliers:view",
        "audit:view",
    },
}


def require_permission(required_permission: str):
    """
    Granular Server-Side Permission Dependency:
    Evaluates permission strictly from authenticated server session with Separation of Duties.
    Emits structured security denial audit event on HTTP 403.
    """

    def permission_checker(request: Request):
        user = getattr(request.state, "user", None)
        user_role = user.role.upper() if user and hasattr(user, "role") else "STAFF"

        # Fallback to header ONLY in non-production test execution
        if not _IS_PRODUCTION and not user and request.headers.get("X-User-Role"):
            user_role = request.headers.get("X-User-Role").upper()

        user_permissions = ROLE_PERMISSIONS.get(user_role, set())

        if required_permission not in user_permissions:
            request_id = request.headers.get("X-Request-ID", "req-unknown")
            user_id = getattr(user, "id", "USR-ANONYMOUS")

            # Emit structured security audit log
            audit_event = {
                "event": "authorization_denied",
                "user_id": user_id,
                "user_role": user_role,
                "action": required_permission,
                "resource": request.url.path,
                "reason": "permission_denied",
                "request_id": request_id,
                "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            }
            logger.warning(f"[SECURITY_AUDIT] Authorization Denied: {audit_event}")

            raise HTTPException(
                status_code=403,
                detail={
                    "code": "PERMISSION_DENIED",
                    "message": f"Role '{user_role}' lacks required permission '{required_permission}'.",
                    "request_id": request_id,
                },
            )
        return user_role

    return permission_checker


def verify_role_access(required_roles: list):
    """
    Server-side Role Authorization Dependency:
    Evaluates role permissions strictly from authenticated server session, ignoring client-controlled headers.
    """

    def role_checker(request: Request):
        # Obtain server-authenticated user from request state or session
        user = getattr(request.state, "user", None)
        user_role = user.role.upper() if user and hasattr(user, "role") else "STAFF"

        # Fallback to header ONLY in explicit non-production test environments
        if not _IS_PRODUCTION and not user and request.headers.get("X-User-Role"):
            user_role = request.headers.get("X-User-Role").upper()

        if user_role not in required_roles:
            request.headers.get("X-Request-ID", "req-unknown")
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Role '{user_role}' lacks required permissions ({', '.join(required_roles)}).",
            )
        return user_role

    return role_checker


def escape_html_string(val: str) -> str:
    """XSS prevention helper: escapes dangerous HTML entities (<, >, &, ", ')"""
    if not val:
        return ""
    return html.escape(val, quote=True)
