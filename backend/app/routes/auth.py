"""
IAM Authentication Routes
==========================
Production-grade authentication using the database as the source of truth.
No mock credentials, no in-memory session stores, no hardcoded roles or backdoors.
"""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    UserContext,
    get_current_user,
)
from app.models import Product, SessionRecord, Store, User
from app.schemas import (
    InitializeRootAdminRequest,
    LoginRequest,
    RefreshTokenRequest,
    SystemStatusResponse,
    TokenResponse,
)
from app.services.iam_service import (
    ROLE_PERMISSIONS,
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["IAM & Authentication"])


from app.middleware.security import get_client_ip
from app.services.bootstrap_service import (
    bootstrap_root_administrator,
    get_public_system_status,
)


@router.get("/status", response_model=SystemStatusResponse)
def get_system_initialization_status(db: Session = Depends(get_db)):
    """
    Public system status endpoint (information-disclosure safe).
    Checks whether the enterprise installation lifecycle has completed bootstrap.
    """
    return get_public_system_status(db)


@router.post("/initialize-root-admin", response_model=TokenResponse)
def initialize_root_administrator(
    payload: InitializeRootAdminRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Secure One-Time Bootstrap of Primary Root Administrator:
    - Requires valid one-time bootstrap authorization token.
    - Restricted to trusted local/internal interfaces.
    - Transactionally transitions installation lifecycle to INITIALIZED.
    - Emits ENTERPRISE_INITIALIZED audit event and permanently disables bootstrap.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "Web Client")
    return bootstrap_root_administrator(
        db=db,
        payload=payload,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user against the database.

    - Accepts email or user_code
    - Verifies bcrypt password hash against DB record
    - Issues JWT access token (15m) + refresh token (7d)
    - Records server-side session in session_records table
    - Returns user profile and server-assigned permissions
    """
    raw_ident = credentials.username.strip()
    identifier = raw_ident.lower()

    user: User | None = (
        db.query(User)
        .filter(
            or_(
                User.email == identifier,
                User.email == raw_ident,
                User.user_code == raw_ident,
                User.user_code == identifier,
                User.email.ilike(raw_ident),
                User.user_code.ilike(raw_ident),
            )
        )
        .first()
    )

    # Security: Constant-time failure message for missing user vs wrong password
    if not user or not user.active:
        raise HTTPException(
            status_code=401,
            detail="Authentication Failed: Invalid credentials or account inactive.",
        )

    # Password check: strictly verify against stored password hash
    is_valid_pwd = verify_password(credentials.password, user.hashed_password)
    if not is_valid_pwd:
        raise HTTPException(
            status_code=401,
            detail="Authentication Failed: Invalid credentials or account inactive.",
        )

    role = user.role
    permissions = ROLE_PERMISSIONS.get(role, [])

    # Generate tokens
    session_id = str(uuid.uuid4())
    access_token = create_access_token(
        user_id=str(user.id),
        role=role,
        permissions=permissions,
        session_id=session_id,
    )
    raw_refresh_token = create_refresh_token(user_id=str(user.id))
    refresh_token_hash = hash_refresh_token(raw_refresh_token)

    # Record server-side session in DB
    try:
        session_record = SessionRecord(
            id=session_id,
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            device_info=request.headers.get("User-Agent", "Unknown")[:500],
            ip_address=request.client.host if request.client else "unknown",
            created_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=7),
            is_active=True,
        )
        db.add(session_record)
        db.commit()
    except Exception as err:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Authentication service could not create a secure server-side session.",
        ) from err

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=900,  # 15 minutes
        user_id=str(user.id),
        user_code=user.user_code or f"USR-{user.id:06d}",
        full_name=user.full_name,
        email=user.email,
        role=role,
        permissions=permissions,
        session_id=session_id,
    )


@router.post("/refresh")
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new short-lived access token and rotated refresh token.
    Validates by hash-matching against the session_records table.
    """
    if not payload.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required.")

    token_hash = hash_refresh_token(payload.refresh_token)

    # Find matching active, unexpired session
    session: SessionRecord | None = (
        db.query(SessionRecord)
        .filter(
            SessionRecord.refresh_token_hash == token_hash,
            SessionRecord.is_active == True,
            SessionRecord.expires_at > datetime.now(UTC),
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. Please sign in again.",
        )

    # Verify the user is still active
    user = db.query(User).filter(User.id == session.user_id, User.active == True).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User account has been deactivated. Please contact your administrator.",
        )

    # Rotate refresh token atomically
    new_raw_refresh_token = create_refresh_token(user_id=str(user.id))
    session.refresh_token_hash = hash_refresh_token(new_raw_refresh_token)
    db.commit()

    # Issue new access token with current role
    permissions = ROLE_PERMISSIONS.get(user.role, [])
    new_access_token = create_access_token(
        user_id=str(user.id),
        role=user.role,
        permissions=permissions,
        session_id=session.id,
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_raw_refresh_token,
        "token_type": "bearer",
        "expires_in": 900,
        "role": user.role,
        "permissions": permissions,
    }


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Invalidate the current server-side session.
    The session_id is extracted from the JWT — no client-supplied session ID trusted.
    """
    session_id = current_user.session_id

    if session_id:
        session = (
            db.query(SessionRecord)
            .filter(
                SessionRecord.id == session_id,
                SessionRecord.user_id == current_user.id,
            )
            .first()
        )
        if session:
            session.is_active = False
            session.revoked_at = datetime.now(UTC)
            db.commit()

    return {
        "status": "logged_out",
        "message": "Session successfully invalidated.",
        "user_id": str(current_user.id),
        "session_id": session_id,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/me")
def get_current_user_profile(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the authenticated user's profile and current permission scopes.
    Data is sourced from the DB — always current, never cached stale data.
    """
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    return {
        "id": db_user.id,
        "user_code": db_user.user_code or f"USR-{db_user.id:06d}",
        "full_name": db_user.full_name,
        "email": db_user.email,
        "role": db_user.role,
        "department": db_user.department,
        "permissions": ROLE_PERMISSIONS.get(db_user.role, []),
        "active": db_user.active,
        "session_status": "ACTIVE",
        "session_id": current_user.session_id,
        "created_at": db_user.created_at.isoformat() if db_user.created_at else None,
    }


@router.get("/sessions")
def list_active_sessions(
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List active sessions.
    - ADMIN / SYSADMIN / users:manage: see all sessions
    - Authenticated non-admin roles: see only their own sessions
    """
    is_admin = (
        current_user.role in ["APP_ADMIN", "ADMIN", "SYSADMIN"]
        or "users:manage" in current_user.permissions
        or "users.manage" in current_user.permissions
    )

    if is_admin:
        sessions = db.query(SessionRecord).order_by(SessionRecord.created_at.desc()).all()
    else:
        sessions = (
            db.query(SessionRecord)
            .filter(SessionRecord.user_id == current_user.id)
            .order_by(SessionRecord.created_at.desc())
            .all()
        )

    return [
        {
            "session_id": s.id,
            "user_id": s.user_id,
            "device_info": s.device_info,
            "ip_address": s.ip_address,
            "active": s.is_active,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in sessions
    ]


@router.post("/revoke-session/{session_id}")
def revoke_session(
    session_id: str,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke a target session.
    - Admin can revoke any session
    - Regular users can only revoke their own sessions
    """
    is_admin = (
        current_user.role in ["APP_ADMIN", "ADMIN", "SYSADMIN"]
        or "users:manage" in current_user.permissions
        or "users.manage" in current_user.permissions
    )

    query = db.query(SessionRecord).filter(SessionRecord.id == session_id)
    if not is_admin:
        query = query.filter(SessionRecord.user_id == current_user.id)

    session = query.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied.")

    session.is_active = False
    session.revoked_at = datetime.now(UTC)
    db.commit()

    return {
        "status": "revoked",
        "session_id": session_id,
        "revoked_by": current_user.user_code,
        "timestamp": datetime.now(UTC).isoformat(),
    }
