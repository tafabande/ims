from fastapi import Request, HTTPException, Depends
from starlette.middleware.base import BaseHTTPMiddleware

def determine_network_context(request: Request) -> str:
    """
    Evaluates Zero-Trust Network Context (LAN, REMOTE, ADMIN) from client IP and proxy headers.
    """
    # 1. Reverse proxy / WAF header override
    hdr_ctx = request.headers.get("X-Network-Context")
    if hdr_ctx and hdr_ctx.upper() in ["LAN", "REMOTE", "ADMIN"]:
        return hdr_ctx.upper()

    # 2. Extract Client IP address
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    # 3. LAN IP range detection (127.0.0.1, 10.x, 192.168.x, 172.16-31.x)
    if client_ip in ["127.0.0.1", "::1", "testclient", "localhost"] or \
       client_ip.startswith("192.168.") or \
       client_ip.startswith("10.") or \
       any(client_ip.startswith(f"172.{b}.") for b in range(16, 32)):
        return "LAN"

    return "REMOTE"

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Attach Zero-Trust Network Context to request.state
        request.state.network_context = determine_network_context(request)

        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none';"
        response.headers["X-Network-Context"] = request.state.network_context
        return response

def verify_role_access(required_roles: list):
    """
    Dependency helper to enforce RBAC permissions at the endpoint layer
    """
    def role_checker(request: Request):
        user_role = request.headers.get("X-User-Role", "STAFF").upper()
        if user_role not in required_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied: Role '{user_role}' lacks required permissions ({', '.join(required_roles)})."
            )
        return user_role
    return role_checker

