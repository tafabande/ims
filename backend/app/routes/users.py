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

@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_permission("users:delete"))):
    """
    Deletes (soft-deactivates) user account with RBAC users:delete permission check.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.active = False
    db.commit()
    db.refresh(user)
    return user
