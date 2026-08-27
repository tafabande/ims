import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_permission
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.services.iam_service import (
    hash_password,
    verify_password,
)

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_permission("users:view")),
):
    """
    List all users (both active and soft-deactivated for auditing).
    """
    return db.query(User).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_permission("users:create")),
):
    """
    Create new user operator with hashed password.
    """
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role=req.role.upper(),
        department=req.department,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_permission("users:disable")),
):
    """
    Soft Deletion: Deactivates user operator (sets active=False).
    Preserves historical sales, inventory transaction ledger, and audit log records.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.active = False
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_permission("users:create")),
):
    """
    Reactivates a suspended user operator.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.active = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(require_permission("users:delete")),
):
    """
    Delete user account (Requires users:delete permission).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"status": "DELETED", "user_id": user_id}


@router.post("/provision", status_code=status.HTTP_201_CREATED)
def provision_user_account(
    req: dict[str, Any],
    db: Session = Depends(get_db),
    auth_ctx: Any = Depends(require_permission("users:create")),
):
    """
    Admin Account Provisioning:
    Provisions system user account for an employee in PENDING_INVITATION state.
    Generates a cryptographically random single-use 6-digit OTP stored as a salted hash.
    """
    employee_id = req.get("employee_id")
    email = req.get("email")
    role = req.get("role", "WAREHOUSE").upper()

    if not employee_id or not email:
        raise HTTPException(status_code=400, detail="Employee ID and Email required for provisioning.")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return {
            "status": "EXISTING_ACCOUNT",
            "message": "User account already provisioned for this employee.",
            "user_id": f"USR-{existing_user.id:06d}",
            "account_status": existing_user.active,
        }

    # Generate cryptographically secure 6-digit OTP
    raw_otp = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hash_password(raw_otp)

    user = User(
        email=email,
        hashed_password="PENDING_OTP_ACTIVATION",
        full_name=req.get("full_name", "Provisioned Employee"),
        role=role,
        department=req.get("department", "Operations"),
        active=False,
        activation_otp_hash=otp_hash,
        activation_otp_expires_at=datetime.now(UTC) + timedelta(minutes=15),
        activation_otp_attempts=0,
        activation_nonce=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response = {
        "status": "PENDING_INVITATION",
        "user_id": f"USR-{user.id:06d}",
        "employee_id": employee_id,
        "email": email,
        "role": role,
        "otp_expiry_minutes": 15,
        "message": f"Account provisioned. Activation OTP sent to {email}.",
    }
    if not _IS_PRODUCTION:
        response["_dev_otp"] = raw_otp

    return response


@router.post("/verify-otp")
def verify_activation_otp(payload: dict[str, str], db: Session = Depends(get_db)):
    """
    User Account Activation Phase 1: Verifies single-use 6-digit OTP against stored salted hash.
    On success, issues a single-use signed activation nonce.
    """
    email = payload.get("email")
    otp_input = payload.get("otp")

    if not email or not otp_input:
        raise HTTPException(status_code=400, detail="Email and OTP code required.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.activation_otp_hash:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP verification code.")

    if user.activation_otp_attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Maximum OTP verification attempts exceeded. Please request a new invitation.",
        )

    # Check expiration (aware or naive UTC handling)
    if user.activation_otp_expires_at:
        expires_at = user.activation_otp_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if datetime.now(UTC) > expires_at:
            raise HTTPException(status_code=401, detail="OTP verification code has expired.")

    # Verify salted hash
    if not verify_password(otp_input, user.activation_otp_hash):
        user.activation_otp_attempts = (user.activation_otp_attempts or 0) + 1
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid or expired OTP verification code.")

    # Success: issue single-use activation nonce and consume OTP
    activation_nonce = secrets.token_urlsafe(32)
    user.activation_nonce = activation_nonce
    user.activation_otp_hash = None
    user.activation_otp_expires_at = None
    user.activation_otp_attempts = 0
    db.commit()

    return {
        "status": "OTP_VERIFIED",
        "email": email,
        "activation_token": activation_nonce,
        "message": "OTP verified successfully. Please create your password using the activation token.",
    }


@router.post("/activate-password")
def activate_user_password(payload: dict[str, str], db: Session = Depends(get_db)):
    """
    User Account Activation Phase 2: Validates single-use activation token, enforces password policy, and activates account.
    """
    email = payload.get("email")
    password = payload.get("password")
    activation_token = payload.get("activation_token")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and New Password required.")

    if not activation_token:
        raise HTTPException(
            status_code=400,
            detail="Activation token required. Please verify your OTP code first.",
        )

    if len(password) < 12:
        raise HTTPException(
            status_code=400,
            detail="Password Policy Violation: Password must be at least 12 characters.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.activation_nonce or user.activation_nonce != activation_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired activation token. Please complete OTP verification.",
        )

    user.hashed_password = hash_password(password)
    user.active = True
    user.activation_nonce = None
    db.commit()

    return {
        "status": "ACTIVE",
        "email": email,
        "message": "Account activated successfully! You may now log in to Enterprise IMS.",
    }
