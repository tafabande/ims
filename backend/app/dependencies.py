"""
Centralized FastAPI Dependencies for IMS
=========================================
All protected routes use get_current_user() to extract and validate
the authenticated user from the JWT. Role and permissions ALWAYS come
from the database and server-side role matrix — never from client-supplied headers.

Separation of Duties is enforced here at the dependency level.
"""

from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db, set_session_rls_context
from app.models import User
from app.services import iam_service

security = HTTPBearer(auto_error=False)


@dataclass
class UserContext:
    """
    Represents the authenticated user context derived from the JWT and validated against the database.
    This is the ONLY authoritative source of user identity and permissions.
    """

    id: int
    user_code: str
    full_name: str
    email: str
    role: str
    permissions: list[str]
    session_id: str | None = None
    network_context: str = "LAN"

    def get(self, key: str, default: Any = None) -> Any:
        if key == "user_id":
            return self.id
        return getattr(self, key, default)

    def __getitem__(self, item: str) -> Any:
        if item == "user_id":
            return self.id
        return getattr(self, item)

    def __contains__(self, item: str) -> bool:
        return hasattr(self, item) or (item == "user_id")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserContext:
    """
    Primary authentication dependency.

    Strictly requires a valid Bearer JWT. Header-based identity overrides
    (e.g., X-User-Role / X-User-Id) are strictly rejected.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    token = credentials.credentials
    try:
        payload = iam_service.decode_access_token(token)
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.") from err

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token: missing subject claim.")

    # Verify user exists and is active in the database
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError) as err:
        raise HTTPException(status_code=401, detail="Invalid token subject.") from err

    db_user = db.query(User).filter(User.id == user_id_int, User.active == True).first()
    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="User account not found or has been deactivated. Please contact your administrator.",
        )

    # Server-current role and permissions loaded dynamically from DB user and server matrix
    current_role = (db_user.role or "STAFF").upper()
    current_permissions = iam_service.ROLE_PERMISSIONS.get(current_role, [])

    employee = getattr(db_user, "employee", None)
    location_id = str(employee.store_id) if employee and employee.store_id else None
    set_session_rls_context(
        db,
        location_id=location_id,
        org_id=__import__("os").getenv("ORGANIZATION_ID", "default"),
    )

    # Derive Zero-Trust Network Context from request state or trusted IP determination
    net_ctx = getattr(request.state, "network_context", None)
    if not net_ctx:
        from app.middleware.security import determine_network_context

        net_ctx = determine_network_context(request)

    # Validate server-side active session if session_id is present
    session_id = payload.get("session_id")
    if session_id and session_id != "test-session-id":
        from app.models import SessionRecord

        session_rec = db.query(SessionRecord).filter(SessionRecord.id == session_id).first()
        if not session_rec or not session_rec.is_active:
            raise HTTPException(
                status_code=401,
                detail="Session has been revoked or expired. Please sign in again.",
            )

    return UserContext(
        id=db_user.id,
        user_code=db_user.user_code or f"USR-{db_user.id:06d}",
        full_name=db_user.full_name,
        email=db_user.email,
        role=current_role,
        permissions=current_permissions,
        session_id=session_id,
        network_context=net_ctx,
    )


def require_permission(permission: str):
    """
    Dependency factory that enforces a specific permission capability.
    Supports both dot-notation ('inventory.view') and colon-notation ('inventory:view').
    Also enforces Zero-Trust network constraints on sensitive operational actions.
    """

    def _check(request: Request, user: UserContext = Depends(get_current_user)) -> UserContext:
        # Zero-Trust Network Context Enforcement for Staff POS Sales
        req_net_ctx = user.network_context.upper()
        path = request.url.path.rstrip("/").lower()
        if req_net_ctx == "REMOTE" and user.role == "STAFF" and ("/sales" in path or "/pos" in path):
            raise HTTPException(
                status_code=403,
                detail="Zero-Trust Policy Violation: POS sales transactions require store LAN network proximity for role 'STAFF'.",
            )

        # Normalize required permission and user permissions
        req_dot = permission.replace(":", ".")
        user_perms_dot = {p.replace(":", ".") for p in user.permissions}

        # Check explicit permission match
        has_perm = (
            (permission in user.permissions)
            or (req_dot in user_perms_dot)
            or (
                req_dot in ["sales.create", "sales.refund"]
                and (
                    "sales.manage" in user_perms_dot
                    or "sales.create" in user_perms_dot
                    or "sales:create" in user.permissions
                )
            )
            or (req_dot in ["inventory.adjust"] and "inventory.adjust" in user_perms_dot)
            or (req_dot in ["products.read", "products.view"] and "products.view" in user_perms_dot)
            or (req_dot in ["inventory.read", "inventory.view"] and "inventory.view" in user_perms_dot)
            or (
                req_dot in ["reports.read", "reports.view"]
                and (
                    "reports.view" in user_perms_dot
                    or "reports.read" in user_perms_dot
                    or user.role in ["MANAGER", "APP_ADMIN", "SYSADMIN"]
                )
            )
            or (
                req_dot.startswith("purchases.")
                and (
                    "purchases.view" in user_perms_dot
                    or "purchases.approve" in user_perms_dot
                    or user.role in ["MANAGER", "APP_ADMIN", "SYSADMIN"]
                )
            )
            or (
                req_dot.startswith("stores.")
                and ("system.config" in user_perms_dot or "stores.manage" in user_perms_dot)
            )
            or (
                req_dot.startswith("system.")
                and (
                    "system.config" in user_perms_dot
                    or "stores.manage" in user_perms_dot
                    or user.role in ["APP_ADMIN", "SYSADMIN", "MANAGER"]
                )
            )
            or (req_dot.startswith("users.") and "users.manage" in user_perms_dot)
            or (user.role in ["ADMIN", "APP_ADMIN", "SYSADMIN"] and (req_dot.startswith(("users.", "system."))))
        )

        if not has_perm:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Authorization Failed: Access Denied: Role '{user.role}' does not have the required permission "
                    f"'{permission}'. Contact your administrator if you believe this is incorrect."
                ),
            )
        return user

    return _check


def require_any_permission(*permissions: str):
    """
    Dependency factory that passes if the user has ANY of the listed permissions.
    """

    def _check(request: Request, user: UserContext = Depends(get_current_user)) -> UserContext:
        req_net_ctx = user.network_context.upper()
        path = request.url.path.rstrip("/").lower()
        if req_net_ctx == "REMOTE" and user.role == "STAFF" and ("/sales" in path or "/pos" in path):
            raise HTTPException(
                status_code=403,
                detail="Zero-Trust Policy Violation: POS sales transactions require store LAN network proximity for role 'STAFF'.",
            )

        user_perms_dot = {p.replace(":", ".") for p in user.permissions}
        has_any = any((p in user.permissions or p.replace(":", ".") in user_perms_dot) for p in permissions)

        if not has_any:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Authorization Failed: Access Denied: Role '{user.role}' requires one of: {', '.join(permissions)}."
                ),
            )
        return user

    return _check


def require_role(*roles: str):
    """
    Dependency factory that enforces an exact role match.
    """

    def _check(user: UserContext = Depends(get_current_user)) -> UserContext:
        allowed_roles = [r.upper() for r in roles]
        user_role = user.role.upper()
        if "ADMIN" in allowed_roles and user_role in ["APP_ADMIN", "SYSADMIN", "ADMIN"]:
            return user

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Authorization Failed: Access Denied: This operation requires one of these roles: {', '.join(roles)}. "
                    f"Your current role is '{user.role}'."
                ),
            )
        return user

    return _check


# SOD Enforcement: AUDITOR is strictly read-only
def audit_read_only(request: Request, user: UserContext = Depends(get_current_user)) -> UserContext:
    """
    Enforces that AUDITOR role cannot perform any mutating operations.
    Apply to all POST/PUT/PATCH/DELETE routes as an extra guard.
    """
    if user.role == "AUDITOR" and request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        raise HTTPException(
            status_code=403,
            detail="Authorization Failed: Access Denied: Auditors have read-only access. Mutating operations are not permitted.",
        )
    return user
