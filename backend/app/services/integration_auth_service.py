"""
Machine-to-Machine (M2M) Integration Authentication & Scoped Authorization Service:
Verifies cryptographic API keys, enforces system boundaries (allowed_source_system),
and validates granular permissions/scopes for external automated data pipelines.
"""

import hashlib
import hmac
import json
from datetime import UTC, datetime

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.models import IntegrationAccount, IntegrationActivityLog, IntegrationApiKey

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_api_key(raw_key: str) -> str:
    """Computes SHA-256 digest of secret API key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def verify_integration_identity(
    api_key: str,
    required_scope: str,
    expected_system: str,
    db: Session,
    ip_address: str = "127.0.0.1",
    endpoint: str = "",
) -> IntegrationAccount:
    """
    Authenticates external machine client and authorizes requested entity scope.
    Strictly forbids source system impersonation or header forgery.
    Supports B-tree indexed prefix lookup (ik_<key_id>.<secret>) with constant-time digest verification.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required integration authentication credential in 'X-API-Key' header.",
        )

    # Support structured format: ik_<key_id>.<secret> or direct raw secret
    api_key_record = None
    if "." in api_key and api_key.startswith("ik_"):
        key_id, raw_secret = api_key.split(".", 1)
        api_key_record = (
            db.query(IntegrationApiKey)
            .filter(IntegrationApiKey.key_id == key_id)
            .first()
        )
        if api_key_record:
            secret_hash = hash_api_key(raw_secret)
            if not hmac.compare_digest(api_key_record.api_key_hash, secret_hash):
                api_key_record = None
    else:
        key_hash = hash_api_key(api_key)
        all_keys = db.query(IntegrationApiKey).all()
        for k in all_keys:
            if hmac.compare_digest(k.api_key_hash, key_hash):
                api_key_record = k
                break

    if not api_key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unrecognized integration API Key.",
        )

    # Lifecycle State Check
    if api_key_record.status == "REVOKED" or api_key_record.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Integration API key has been revoked.",
        )
    if api_key_record.status == "EXPIRED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Integration API key has expired.",
        )

    # Record usage timestamp
    api_key_record.last_used_at = datetime.now(UTC)
    db.flush()

    account = api_key_record.account
    if not account or account.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Integration account '{account.account_id if account else 'UNKNOWN'}' is suspended or inactive.",
        )

    if account.expires_at and account.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integration API credentials have expired.",
        )

    # 1. Verify Allowed Source System Boundary
    if account.allowed_source_system:
        if account.allowed_source_system.upper() != expected_system.upper():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Integration client '{account.account_id}' is restricted to '{account.allowed_source_system}' and cannot ingest for '{expected_system}'.",
            )

    # 2. Verify Granular Scopes
    scopes = json.loads(account.scopes_json or "[]")
    has_scope = (
        "*" in scopes
        or f"{required_scope.split(':')[0]}:*" in scopes
        or required_scope in scopes
    )

    if not has_scope:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Integration client '{account.account_id}' lacks required permission scope '{required_scope}'.",
        )

    # 3. Log Integration Access Trace
    try:
        activity = IntegrationActivityLog(
            account_id=account.account_id,
            endpoint=endpoint or f"/api/intake/integrations/{expected_system}",
            method="POST",
            status_code=200,
            ip_address=ip_address,
            created_at=datetime.now(UTC),
        )
        db.add(activity)
        db.flush()
    except Exception:
        pass

    return account
