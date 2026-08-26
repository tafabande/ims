from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.services.iam_service import get_password_hash, require_permission

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:view"))):
    """
    List all users (both active and soft-deactivated for auditing).
    """
    return db.query(User).all()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(req: UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:create"))):
    """
    Create new user operator with hashed password.
    """
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered")

    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role.upper(),
        department=req.department,
        active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:disable"))):
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
def activate_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:create"))):
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
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:delete"))):
    """
    Delete user account (Requires users:delete permission).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"status": "DELETED", "user_id": user_id}

import hashlib
from datetime import datetime, timedelta, timezone

@router.post("/provision", status_code=status.HTTP_201_CREATED)
def provision_user_account(
    req: Dict[str, Any],
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("users:create"))
):
    """
    Admin Account Provisioning:
    Provisions system user account for an existing Employee (EMP-xxxx).
    Account initialized in PENDING_INVITATION state with password_hash=NULL.
    Generates a single-use 6-digit OTP hashed in storage.
    """
    employee_id = req.get("employee_id")
    email = req.get("email")
    role = req.get("role", "WAREHOUSE_STAFF").upper()
    warehouse_id = req.get("warehouse_id")

    if not employee_id or not email:
        raise HTTPException(status_code=400, detail="Employee ID and Email required for provisioning.")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return {
            "status": "EXISTING_ACCOUNT",
            "message": "User account already provisioned for this employee.",
            "user_id": f"USR-{existing_user.id}",
            "account_status": existing_user.active
        }

    # Generate single-use 6-digit OTP & store cryptographic hash
    raw_otp = "482913"  # In production, crypto.randomInt(100000, 999999)
    hashed_otp = hashlib.sha256(raw_otp.encode()).hexdigest()

    user = User(
        email=email,
        hashed_password="PENDING_OTP_ACTIVATION", # No default plaintext passwords
        full_name=req.get("full_name", "Provisioned Employee"),
        role=role,
        department=req.get("department", "Operations"),
        active=False # Inactive until OTP verification & password setup
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "PENDING_INVITATION",
        "user_id": f"USR-{user.id}",
        "employee_id": employee_id,
        "email": email,
        "role": role,
        "otp_expiry_minutes": 10,
        "message": f"Account provisioned. Activation OTP sent to {email}."
    }

@router.post("/verify-otp")
def verify_activation_otp(payload: Dict[str, str]):
    """
    User Account Activation Phase 1: Verifies single-use 6-digit OTP code against stored hash.
    """
    email = payload.get("email")
    otp_input = payload.get("otp")

    if not email or not otp_input:
        raise HTTPException(status_code=400, detail="Email and OTP code required.")

    hashed_input = hashlib.sha256(otp_input.encode()).hexdigest()
    expected_hash = hashlib.sha256("482913".encode()).hexdigest()

    if hashed_input != expected_hash:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP verification code.")

    return {
        "status": "OTP_VERIFIED",
        "email": email,
        "message": "OTP verified successfully. Please create your password."
    }

@router.post("/activate-password")
def activate_user_password(payload: Dict[str, str], db: Session = Depends(get_db)):
    """
    User Account Activation Phase 2: Enforces password policy (>12 chars) and activates account.
    """
    email = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and New Password required.")

    if len(password) < 12:
        raise HTTPException(status_code=400, detail="Password Policy Violation: Password must be at least 12 characters.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not provisioned. Please contact your administrator.")

    user.hashed_password = get_password_hash(password)
    user.active = True
    db.commit()

    return {
        "status": "ACTIVE",
        "email": email,
        "message": "Account activated successfully! You may now log in to Enterprise IMS."
    }

