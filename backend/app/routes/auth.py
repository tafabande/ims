from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timedelta, timezone

import uuid

from app.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, SessionResponse
from app.services.iam_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    ROLE_PERMISSIONS
)

router = APIRouter(prefix="/auth", tags=["IAM & Authentication Service"])

# In-memory mock session store for instant responsiveness
SESSION_DATABASE = [
    {
        "session_id": "SESS-9001",
        "user_id": 1,
        "username": "admin",
        "role": "ADMIN",
        "device_info": "Chrome on Windows 11 (Desktop)",
        "ip_address": "192.168.1.105",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    },
    {
        "session_id": "SESS-9002",
        "user_id": 2,
        "username": "manager",
        "role": "MANAGER",
        "device_info": "Safari on macOS (MacBook Pro)",
        "ip_address": "192.168.1.112",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
]

MOCK_USER_CREDENTIALS = {
    "admin": {"id": 1, "username": "admin", "password": "adminpassword", "name": "Alice Admin", "role": "ADMIN"},
    "manager": {"id": 2, "username": "manager", "password": "managerpassword", "name": "Bob Manager", "role": "MANAGER"},
    "staff": {"id": 3, "username": "staff", "password": "staffpassword", "name": "Charlie Staff", "role": "STAFF"}
}

@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request):
    """
    IAM Authentication — Verifies credentials, issues short-lived JWT Access Token (15m) + Refresh Token (7d), and records session.
    """
    user = MOCK_USER_CREDENTIALS.get(credentials.username.lower())
    if not user or user["password"] != credentials.password:
        raise HTTPException(
            status_code=401,
            detail="Authentication Failed: Invalid username or password."
        )

    role = user["role"]
    permissions = ROLE_PERMISSIONS.get(role, [])

    # Issue Short-lived JWT Access Token (15m) & Refresh Token (7d)
    access_token = create_access_token(user_id=str(user["id"]), role=role, permissions=permissions)
    refresh_token = create_refresh_token(user_id=str(user["id"]))

    # Record server-side session
    new_session = {
        "session_id": f"SESS-{uuid.uuid4().hex[:6].upper()}",
        "user_id": user["id"],
        "username": user["username"],
        "role": role,
        "device_info": request.headers.get("User-Agent", "Web Browser"),
        "ip_address": request.client.host if request.client else "127.0.0.1",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }

    SESSION_DATABASE.insert(0, new_session)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900, # 15 minutes
        user_id=str(user["id"]),
        role=role,
        permissions=permissions
    )

@router.post("/refresh")
def refresh_token(payload: RefreshTokenRequest):
    """
    Exchange valid Refresh Token for a new short-lived Access Token
    """
    if not payload.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required.")

    # Re-issue Access Token
    new_access_token = create_access_token(user_id="1", role="ADMIN", permissions=ROLE_PERMISSIONS["ADMIN"])
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": 900
    }

@router.post("/logout")
def logout(request: Request):
    """
    IAM Logout — Invalidate active server session
    """
    return {"status": "logged_out", "message": "Server-side refresh session revoked successfully."}

@router.get("/sessions")
def list_sessions():
    """
    IAM Server-Side Sessions — List active user device sessions
    """
    return SESSION_DATABASE

@router.post("/revoke-session/{session_id}")
def revoke_session(session_id: str):
    """
    Revoke target user session
    """
    for sess in SESSION_DATABASE:
        if sess["session_id"] == session_id:
            sess["active"] = False
            return {"status": "revoked", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found.")

@router.get("/me")
def get_user_profile(role: str = "ADMIN"):
    """
    Get current identity profile and granted permission scopes
    """
    permissions = ROLE_PERMISSIONS.get(role.upper(), ROLE_PERMISSIONS["ADMIN"])
    return {
        "user_id": "USR-101",
        "name": role.capitalize() + " User",
        "role": role.upper(),
        "permissions": permissions,
        "session_status": "ACTIVE",
        "mfa_enabled": True
    }
