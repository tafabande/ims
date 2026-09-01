"""
Enterprise Installation & First-Time Bootstrap Security Service
================================================================
Handles secure one-time bootstrap of primary Root Administrator.

Security Principles Enforced:
1. Zero-User != Auth: An empty database does NOT grant authorization. A one-time cryptographically
   random bootstrap token (injected via BOOTSTRAP_SECRET or generated locally on server boot) is mandatory.
2. Constant-Time Verification: Compares token digest with hmac.compare_digest.
3. Network Boundary: Restricted to localhost/trusted internal interfaces by default.
4. Permanent Disabling: Transitions EnterpriseInstallation lifecycle to INITIALIZED / BOOTSTRAP_DISABLED.
5. Audit Lineage: Emits immutable ENTERPRISE_INITIALIZED audit events with installation ID and actor IP.
6. Zero Reconnaissance: Status endpoint does not disclose entity counts or internal table volumes.
"""

import hashlib
import hmac
import ipaddress
import os
import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import AuditLogRecord, EnterpriseInstallation, SessionRecord, User
from app.schemas import InitializeRootAdminRequest, SystemStatusResponse, TokenResponse
from app.services.iam_service import (
    ROLE_PERMISSIONS,
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
)

TOKEN_FILE_PATH = Path(__file__).resolve().parent.parent.parent / ".bootstrap_token"


def get_or_generate_bootstrap_secret() -> tuple[str, str]:
    """
    Retrieves the authoritative bootstrap secret from:
    1. Environment variable BOOTSTRAP_SECRET / IMS_BOOTSTRAP_SECRET
    2. Or local secure server token file (.bootstrap_token)
    Returns (raw_secret, sha256_hash).
    """
    env_secret = os.getenv("BOOTSTRAP_SECRET") or os.getenv("IMS_BOOTSTRAP_SECRET")
    if env_secret and len(env_secret.strip()) >= 16:
        raw_secret = env_secret.strip()
    elif TOKEN_FILE_PATH.exists():
        try:
            raw_secret = TOKEN_FILE_PATH.read_text(encoding="utf-8").strip()
        except Exception:
            raw_secret = secrets.token_urlsafe(32)
            TOKEN_FILE_PATH.write_text(raw_secret, encoding="utf-8")
    else:
        raw_secret = secrets.token_urlsafe(32)
        try:
            TOKEN_FILE_PATH.write_text(raw_secret, encoding="utf-8")
        except Exception:
            pass

    secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()
    return raw_secret, secret_hash


def get_or_create_installation(db: Session) -> EnterpriseInstallation:
    """
    Retrieves or initializes the unique EnterpriseInstallation lifecycle record.
    """
    inst = db.query(EnterpriseInstallation).first()
    if not inst:
        _, secret_hash = get_or_generate_bootstrap_secret()
        inst = EnterpriseInstallation(
            installation_id=f"INST-2026-{uuid.uuid4().hex[:8].upper()}",
            status="BOOTSTRAP_PENDING",
            bootstrap_token_hash=secret_hash,
            created_at=datetime.now(UTC),
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)
    return inst


def get_public_system_status(db: Session) -> SystemStatusResponse:
    """
    Public system status endpoint (information-disclosure safe).
    Does NOT leak internal table row counts (users, products, stores).
    """
    inst = get_or_create_installation(db)
    user_count = db.query(User).count()

    is_initialized = (inst.status == "INITIALIZED" or user_count > 0)
    setup_required = (not is_initialized and inst.status == "BOOTSTRAP_PENDING")

    return SystemStatusResponse(
        is_initialized=is_initialized,
        setup_required=setup_required,
        installation_id=inst.installation_id,
        system_name="Enterprise IMS",
        version="1.0.0",
    )


def is_trusted_network(client_ip: str) -> bool:
    """
    Validates whether incoming client request originates from localhost or trusted internal interface.
    """
    if os.getenv("ALLOW_REMOTE_BOOTSTRAP", "").lower() in ["true", "1", "yes"]:
        return True

    if client_ip in ["127.0.0.1", "::1", "localhost", "testclient"]:
        return True

    try:
        ip_obj = ipaddress.ip_address(client_ip)
        return ip_obj.is_private or ip_obj.is_loopback
    except ValueError:
        return False


def validate_password_strength(password: str) -> None:
    """
    Enforces production enterprise password quality standards for root administration.
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password policy violation: Root Administrator password must be at least 8 characters.",
        )
    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password policy violation: Root Administrator password must contain uppercase, lowercase, and numeric characters.",
        )


def bootstrap_root_administrator(
    db: Session,
    payload: InitializeRootAdminRequest,
    client_ip: str = "127.0.0.1",
    user_agent: str = "Web Client",
) -> TokenResponse:
    """
    Atomic One-Time Enterprise Bootstrap Execution:
    1. Validates trusted network interface.
    2. Enforces non-empty bootstrap authorization token.
    3. Acquires pessimistic lock on EnterpriseInstallation record.
    4. Validates lifecycle state is BOOTSTRAP_PENDING and user_count == 0.
    5. Performs constant-time token digest comparison against stored hash.
    6. Validates password quality policy.
    7. Creates Root Administrator governance account (role=ADMIN, user_code=USR-000001).
    8. Transactionally marks installation INITIALIZED and consumes bootstrap secret.
    9. Emits ENTERPRISE_INITIALIZED audit event.
    10. Wipes local temporary token file.
    """
    # 1. Network Boundary Check
    if not is_trusted_network(client_ip):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Boundary Violation: Initial system bootstrap is restricted to trusted local network interfaces.",
        )

    # 2. Token Mandatory
    if not payload.bootstrap_token or not payload.bootstrap_token.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing required bootstrap authorization token. An unauthenticated setup is strictly forbidden.",
        )

    # 3. Row Locking & Concurrency Protection
    inst_query = db.query(EnterpriseInstallation).order_by(EnterpriseInstallation.id.asc())
    if db.bind and db.bind.dialect.name == "postgresql":
        inst_query = inst_query.with_for_update()
    
    inst = inst_query.first()
    if not inst:
        inst = get_or_create_installation(db)

    # 4. Lifecycle & Existing Users Guard
    existing_users_count = db.query(User).count()
    if inst.status in ["INITIALIZED", "BOOTSTRAP_DISABLED"] or existing_users_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="System is already initialized. Bootstrap authorization has been permanently disabled.",
        )

    if inst.status == "INITIALIZING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A concurrent bootstrap process is currently in progress. Please wait.",
        )

    # Transition to INITIALIZING to block race conditions
    inst.status = "INITIALIZING"
    db.commit()
    db.refresh(inst)

    # 5. Constant-Time Token Digest Verification
    token_input_hash = hashlib.sha256(payload.bootstrap_token.strip().encode("utf-8")).hexdigest()
    if not inst.bootstrap_token_hash or not hmac.compare_digest(inst.bootstrap_token_hash, token_input_hash):
        inst.status = "BOOTSTRAP_PENDING"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unrecognized bootstrap authorization token.",
        )

    # 6. Password Policy Validation
    validate_password_strength(payload.password)

    try:
        # 7. Create Root Governance Administrator (USR-000001)
        root_user = User(
            user_code="USR-000001",
            email=payload.email.strip().lower(),
            full_name=payload.full_name.strip(),
            hashed_password=hash_password(payload.password),
            role="ADMIN",  # System Governance & Security Role
            department="Executive IT & System Governance",
            active=True,
            created_at=datetime.now(UTC),
        )
        db.add(root_user)
        db.flush()

        # 8. Complete Lifecycle Transition & Consume Bootstrap Token
        inst.status = "INITIALIZED"
        inst.initialized_at = datetime.now(UTC)
        inst.initialized_by_user_id = root_user.id
        inst.bootstrap_consumed_at = datetime.now(UTC)
        inst.bootstrap_token_hash = None  # Wipe hash from DB

        # 9. Immutable Audit Event
        audit_event = AuditLogRecord(
            event_id=f"EVT-BOOTSTRAP-{uuid.uuid4().hex[:8].upper()}",
            user_name=root_user.full_name,
            action="ENTERPRISE_INITIALIZED",
            client_ip=client_ip,
            status="SUCCESS",
            details=f"Root Administrator account '{root_user.email}' initialized for installation {inst.installation_id}.",
            created_at=datetime.now(UTC),
        )
        db.add(audit_event)

        # 10. Issue Initial Session Token
        permissions = ROLE_PERMISSIONS.get("ADMIN", ["*"])
        access_token = create_access_token(user_id=str(root_user.id), role="ADMIN", permissions=permissions)
        refresh_token = create_refresh_token(user_id=str(root_user.id))

        session_id = str(uuid.uuid4())
        session_rec = SessionRecord(
            id=session_id,
            user_id=root_user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            device_info=user_agent,
            ip_address=client_ip,
            is_active=True,
            expires_at=datetime.now(UTC) + timedelta(days=7),
            created_at=datetime.now(UTC),
        )
        db.add(session_rec)
        db.commit()

        # Clean up local file token if present
        if TOKEN_FILE_PATH.exists():
            try:
                TOKEN_FILE_PATH.unlink()
            except Exception:
                pass

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=900,
            user_id=str(root_user.id),
            user_code=root_user.user_code,
            full_name=root_user.full_name,
            email=root_user.email,
            role="ADMIN",
            permissions=permissions,
            session_id=session_id,
        )

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        # If another concurrent thread committed first causing unique/FK collision
        if "IntegrityError" in type(exc).__name__ or "UNIQUE constraint failed" in str(exc) or "Duplicate entry" in str(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="System is already initialized or a concurrent bootstrap completed.",
            )
        # Reset status so administrator can retry if creation failed
        try:
            inst.status = "BOOTSTRAP_PENDING"
            db.commit()
        except Exception:
            pass
        raise
