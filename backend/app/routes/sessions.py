from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import (
    DeviceRegisterRequest, DeviceResponse,
    SessionResponse, RiskEvaluationRequest, RiskEvaluationResponse
)
from app.services import device_trust_service
from app.services.iam_service import require_permission

router = APIRouter(prefix="/api/sessions", tags=["Device Trust & Session Security"])

@router.post("/register-device", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    data: DeviceRegisterRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read")) # All authenticated users
):
    """
    Register device fingerprint and browser characteristics for active session recognition.
    """
    user_id = auth_ctx.get("user_id", 1)
    return device_trust_service.register_or_get_device(
        db=db,
        user_id=user_id,
        device_name=data.device_name,
        raw_fingerprint=data.fingerprint_raw,
        ip_address=data.ip_address,
        user_agent=data.user_agent
    )

@router.get("/active", response_model=List[SessionResponse])
def get_active_sessions(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or Sysadmin
):
    """
    View active operational sessions across the enterprise for session security auditing.
    """
    return device_trust_service.list_active_sessions(db, user_id)

@router.get("/devices", response_model=List[DeviceResponse])
def get_registered_devices(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or Sysadmin
):
    """
    View registered employee devices and trust status.
    """
    return device_trust_service.list_user_devices(db, user_id)

@router.post("/evaluate-risk", response_model=RiskEvaluationResponse)
def evaluate_risk(
    data: RiskEvaluationRequest,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("products:read"))
):
    """
    Risk-Based Authentication Engine:
    Evaluates session fingerprint integrity, IP changes, and operational action risk level.
    Determines if step-up verification (MFA or Manager approval) is required.
    """
    risk_score, risk_level, is_trusted, step_up, reasons = device_trust_service.evaluate_session_risk(
        db=db,
        session_id=data.session_id,
        action_name=data.action_name,
        raw_fingerprint=data.fingerprint_raw,
        current_ip=data.ip_address
    )
    return RiskEvaluationResponse(
        session_id=data.session_id,
        risk_score=risk_score,
        risk_level=risk_level,
        is_device_trusted=is_trusted,
        step_up_required=step_up,
        reasons=reasons
    )

@router.post("/{session_id}/revoke", response_model=SessionResponse)
def revoke_session(
    session_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or Sysadmin
):
    """
    Immediately terminate a suspicious or compromised user session.
    """
    revoker_user_id = auth_ctx.get("user_id", 1)
    return device_trust_service.revoke_session(db, session_id, revoker_user_id)

@router.post("/devices/{device_id}/revoke", response_model=DeviceResponse)
def revoke_device(
    device_id: str,
    db: Session = Depends(get_db),
    auth_ctx: dict = Depends(require_permission("stores:manage")) # Manager or Sysadmin
):
    """
    Revoke a device fingerprint. Automatically invalidates all active sessions linked to this device.
    """
    revoker_user_id = auth_ctx.get("user_id", 1)
    return device_trust_service.revoke_device(db, device_id, revoker_user_id)
