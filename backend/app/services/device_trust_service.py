import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models import UserDevice, UserSession, User

def compute_fingerprint_hash(raw_traits: str) -> str:
    """
    Computes a cryptographic SHA-256 fingerprint hash from raw browser/device characteristics
    (e.g., UserAgent|Timezone|ScreenRes|Language|CanvasHash).
    """
    return hashlib.sha256(raw_traits.encode("utf-8")).hexdigest()

def register_or_get_device(
    db: Session,
    user_id: int,
    device_name: str,
    raw_fingerprint: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> UserDevice:
    """
    Registers a new device or updates last_seen on existing device fingerprint.
    """
    fp_hash = compute_fingerprint_hash(raw_fingerprint)
    now = datetime.now(timezone.utc)

    # Check if user already has a device matching this fingerprint
    device = db.query(UserDevice).filter(
        UserDevice.user_id == user_id,
        UserDevice.fingerprint_hash == fp_hash
    ).first()

    if device:
        if device.is_revoked:
            raise HTTPException(
                status_code=403,
                detail="Access denied: This device has been explicitly revoked by security policy."
            )
        device.last_seen = now
        if ip_address:
            device.ip_address = ip_address
        db.commit()
        db.refresh(device)
        return device

    # Register new device
    dev_code = f"DEV-2026-{uuid.uuid4().hex[:6].upper()}"
    new_device = UserDevice(
        device_id=dev_code,
        user_id=user_id,
        device_name=device_name,
        fingerprint_hash=fp_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        first_seen=now,
        last_seen=now,
        is_trusted=True,
        is_revoked=False,
        risk_score=0.0,
        created_at=now
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

def create_user_session(
    db: Session,
    user_id: int,
    device_id: int,
    raw_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    location_summary: str = "Harare Main Hub"
) -> UserSession:
    """
    Creates a tracked server-side session linked to a specific user & device.
    """
    now = datetime.now(timezone.utc)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    ses_code = f"SES-2026-{uuid.uuid4().hex[:6].upper()}"
    expires_at = now + timedelta(days=7)

    session = UserSession(
        session_id=ses_code,
        user_id=user_id,
        device_id=device_id,
        token_hash=token_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        location_summary=location_summary,
        created_at=now,
        last_seen=now,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def evaluate_session_risk(
    db: Session,
    session_id: str,
    action_name: str,
    raw_fingerprint: str,
    current_ip: Optional[str] = None
) -> Tuple[float, str, bool, bool, List[str]]:
    """
    Risk-Based Authentication Engine:
    Evaluates session integrity, device fingerprint match, IP subnet change, and operational sensitivity.
    Returns: (risk_score, risk_level, is_device_trusted, step_up_required, reasons)
    """
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.is_revoked:
        raise HTTPException(status_code=401, detail="Session has been revoked.")

    now = datetime.now(timezone.utc)

    # Convert naive datetimes from DB if needed
    session_expires = session.expires_at
    if session_expires.tzinfo is None:
        session_expires = session_expires.replace(tzinfo=timezone.utc)

    if session_expires < now:
        raise HTTPException(status_code=401, detail="Session has expired.")

    device = db.query(UserDevice).filter(UserDevice.id == session.device_id).first()
    reasons = []
    risk_score = 0.0

    # 1. Device Fingerprint Match Check
    fp_hash = compute_fingerprint_hash(raw_fingerprint)
    if not device or device.fingerprint_hash != fp_hash:
        risk_score += 0.45
        reasons.append("Device fingerprint mismatch detected for active session.")

    # 2. Device Trust / Revocation Check
    if device and device.is_revoked:
        risk_score += 0.50
        reasons.append("Associated device has been revoked.")
    elif device and not device.is_trusted:
        risk_score += 0.25
        reasons.append("Device is untrusted.")

    # 3. IP Address Subnet Change Check
    if current_ip and device and device.ip_address and current_ip != device.ip_address:
        risk_score += 0.20
        reasons.append(f"IP address changed from {device.ip_address} to {current_ip}.")

    # 4. Sensitive High-Risk Operations Threshold
    HIGH_RISK_ACTIONS = {
        "DELETE_PRODUCT": 0.30,
        "APPROVE_LARGE_PO": 0.25,
        "CHANGE_PRICE_FLOOR": 0.35,
        "ADJUST_STOCK_LARGE": 0.30
    }

    if action_name in HIGH_RISK_ACTIONS:
        action_weight = HIGH_RISK_ACTIONS[action_name]
        risk_score += action_weight
        reasons.append(f"High-risk operational action requested: '{action_name}'.")

    risk_score = min(1.0, risk_score)

    if risk_score < 0.25:
        risk_level = "LOW"
    elif risk_score < 0.50:
        risk_level = "MEDIUM"
    elif risk_score < 0.75:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    step_up_required = risk_score >= 0.50 or action_name in HIGH_RISK_ACTIONS
    is_device_trusted = bool(device and device.is_trusted and not device.is_revoked)

    return risk_score, risk_level, is_device_trusted, step_up_required, reasons

def list_active_sessions(db: Session, user_id: Optional[int] = None) -> List[UserSession]:
    query = db.query(UserSession).filter(UserSession.is_revoked == False)
    if user_id:
        query = query.filter(UserSession.user_id == user_id)
    return query.order_by(UserSession.last_seen.desc()).all()

def list_user_devices(db: Session, user_id: Optional[int] = None) -> List[UserDevice]:
    query = db.query(UserDevice)
    if user_id:
        query = query.filter(UserDevice.user_id == user_id)
    return query.order_by(UserDevice.last_seen.desc()).all()

def revoke_session(db: Session, session_id: str, revoker_user_id: int) -> UserSession:
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    session.is_revoked = True
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session

def revoke_device(db: Session, device_id: str, revoker_user_id: int) -> UserDevice:
    device = db.query(UserDevice).filter(UserDevice.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    device.is_revoked = True
    device.is_trusted = False

    # Revoke all active sessions linked to this device
    active_sessions = db.query(UserSession).filter(
        UserSession.device_id == device.id,
        UserSession.is_revoked == False
    ).all()
    now = datetime.now(timezone.utc)
    for s in active_sessions:
        s.is_revoked = True
        s.revoked_at = now

    db.commit()
    db.refresh(device)
    return device
