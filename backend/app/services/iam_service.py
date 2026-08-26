import os
import json
import base64
import hmac
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import Request, HTTPException, Depends

# Attempt to import PyJWT or python-jose, fallback to stdlib HMAC-SHA256
try:
    import jwt
    HAS_JWT = True
except ImportError:
    try:
        from jose import jwt
        HAS_JWT = True
    except ImportError:
        HAS_JWT = False

# Secret Configs
SECRET_KEY = os.getenv("SECRET_KEY", "ims_enterprise_secure_production_jwt_signing_key_2026_x9f4a8b7c2d1e0f3")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15 # Short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7    # Long-lived refresh session

# ─── Granular RBAC Permission Matrix — Strict Separation of Duties ────────────
# Permission codes use dot-notation matching the frontend permissions.js exactly.
# Backend uses colon-notation internally; both are checked.
ROLE_PERMISSIONS = {
    # 1. SYSADMIN — Infrastructure & Server Operations ONLY. Zero business data access.
    "SYSADMIN": [
        "system.health", "system.metrics", "system.logs", "system.config",
        "users.manage", "roles.manage", "audit.view", "audit.export",
        # No inventory, sales, purchases, or financial data access
    ],

    # 2. APP_ADMIN — IAM, Security, Users, Audit. NO operational transactions.
    # SOD: APP_ADMIN cannot process sales, approve POs, or adjust inventory.
    "APP_ADMIN": [
        "users.manage", "roles.manage",
        "audit.view", "audit.export", "integrity.view",
        "system.config",
        "reports.view",
        # Read-only visibility into catalog (no write access)
        "products.view", "inventory.view", "sales.view", "purchases.view",
        "employees.view",
        # No: sales.create, sales.refund, purchases.approve, inventory.adjust
    ],

    # Universal Administrator (for test suites and superuser operations)
    "ADMIN": [
        "users.manage", "roles.manage", "audit.view", "audit.export", "integrity.view",
        "system.config", "reports.view", "stores.manage",
        "products.view", "products.create", "products.edit", "products.delete",
        "inventory.view", "inventory.adjust", "inventory.receive", "inventory.transfer", "inventory.count",
        "sales.view", "sales.create", "sales.policy", "sales.approve_large", "sales.refund", "sales.refund.approve",
        "purchases.view", "purchases.create", "purchases.approve", "purchases.receive",
        "gateways.manage", "employees.view", "employees.manage", "suppliers.manage", "customers.manage", "shifts.manage"
    ],

    # 3. MANAGER — Full operational authority. NO user management or system config.
    # SOD: MANAGER cannot create/disable system users or change server settings.
    "MANAGER": [
        "attention.view", "attention.decide", "attention.comment",
        "stores.manage",
        "products.view", "products.create", "products.edit", "products.delete",
        "inventory.view", "inventory.adjust", "inventory.receive", "inventory.transfer", "inventory.count",
        "sales.view", "sales.create", "sales.policy", "sales.approve_large", "sales.refund", "sales.refund.approve",
        "purchases.view", "purchases.create", "purchases.approve", "purchases.receive",
        "gateways.manage",
        "employees.view", "employees.manage",
        "suppliers.manage", "customers.manage",
        "reports.view", "shifts.manage",
        "integrity.view",
        # No: users.manage, roles.manage, system.config, audit.export
    ],

    # 4. STAFF — POS, Shifts, Returns only. Minimal read access.
    # SOD: STAFF cannot see reports, approve anything, or manage users/products.
    "STAFF": [
        "products.view", "inventory.view", "inventory.receive",
        "sales.view", "sales.create", "sales.refund",
        "shifts.manage",
        "customers.manage",
        # No: reports.view, users.manage, purchases.*, employees.manage
    ],

    # 5. WAREHOUSE — Goods receipt and stock movement. No sales or reports.
    "WAREHOUSE": [
        "products.view", "inventory.view", "inventory.adjust",
        "inventory.receive", "inventory.transfer", "inventory.count",
        "purchases.view", "purchases.receive",
        # No: sales.*, reports.view, users.manage
    ],

    # 6. AUDITOR — Strictly read-only. No writes of any kind.
    "AUDITOR": [
        "products.view", "inventory.view",
        "sales.view", "purchases.view",
        "employees.view", "suppliers.view", "customers.view",
        "audit.view", "audit.export",
        "reports.view", "integrity.view",
        # No creates, updates, or deletes — enforced by audit_read_only() dependency
    ],
}

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Production-grade password hashing primitive using bcrypt (OWASP & Chaa production recommendation).
    """
    return pwd_context.hash(password)

get_password_hash = hash_password

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against stored hash using passlib constant-time comparison with fallback for legacy hashes"""
    try:
        if pwd_context.identify(hashed_password):
            return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        pass
    
    # Fallback for legacy PBKDF2 hex strings
    salt = os.getenv("PASSWORD_SALT", "ims_secure_salt_2026").encode('utf-8')
    derived = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100_000).hex()
    return hmac.compare_digest(derived, hashed_password)


def hash_refresh_token(token: str) -> str:
    """Hash refresh token for secure database storage"""
    return hashlib.sha256(token.encode()).hexdigest()

def create_access_token(user_id: str, role: str, permissions: List[str], session_id: Optional[str] = None) -> str:
    """
    Issue short-lived JWT access token (15m TTL).
    Embeds session_id for server-side session tracking and revocation.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "permissions": permissions,
        "exp": int(expire.timestamp()),
        "iss": "ims-iam-auth",
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    if session_id:
        payload["session_id"] = session_id

    if HAS_JWT:
        try:
            return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        except Exception:
            pass

    # Fallback Standard Library HMAC-SHA256 JWT Token Generation
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(SECRET_KEY.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def create_refresh_token(user_id: str) -> str:
    """Issue opaque refresh token"""
    return f"ref_{user_id}_{uuid.uuid4().hex}"

def decode_access_token(token: str) -> dict:
    """
    Decode and validate JWT access token
    """
    if HAS_JWT:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid or expired JWT token: {str(e)}")

    # Fallback Standard Library JWT Validation
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        
        header_b64, payload_b64, sig_b64 = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig_b64 + "==")
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Signature mismatch")
        
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + "==")
        payload = json.loads(payload_bytes.decode())
        
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Token expired")
        
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

def create_refresh_session() -> tuple[str, str]:
    """
    Generate opaque refresh token and unique session ID
    """
    session_id = str(uuid.uuid4())
    raw_token = f"ref_{session_id}_{uuid.uuid4().hex}"
    return session_id, raw_token

# Backward compatibility re-export: all existing routes can import require_permission from here.
def require_permission(permission: str):
    from app.dependencies import require_permission as _require_permission
    return _require_permission(permission)

def get_current_user(*args, **kwargs):
    from app.dependencies import get_current_user as _get_current_user
    return _get_current_user(*args, **kwargs)
