import secrets
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, Security, Depends, status
from fastapi.security.api_key import APIKeyHeader
from passlib.context import CryptContext

from app.models import IntegrationAccount, IntegrationApiKey, IntegrationActivityLog, Product, Category, Employee, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def generate_integration_account(
    db: Session,
    name: str,
    description: Optional[str] = None,
    scopes: List[str] = []
) -> Tuple[IntegrationAccount, str]:
    """
    Creates an IntegrationAccount (e.g. INT-2026-00012) and generates a secret API Key.
    Returns (account, plain_text_secret_key). The key is shown ONLY ONCE.
    """
    account_id = f"INT-2026-{secrets.token_hex(4).upper()}"
    raw_secret = f"ims_live_{secrets.token_urlsafe(32)}"
    key_hash = pwd_context.hash(raw_secret)
    prefix = raw_secret[:12]

    account = IntegrationAccount(
        account_id=account_id,
        name=name,
        description=description,
        status="ACTIVE",
        scopes_json=json.dumps(scopes),
        created_at=datetime.now(timezone.utc)
    )
    db.add(account)
    db.flush()

    key_record = IntegrationApiKey(
        account_id=account_id,
        api_key_hash=key_hash,
        prefix=prefix,
        name=f"Primary API Key for {name}",
        created_at=datetime.now(timezone.utc)
    )
    db.add(key_record)

    db.commit()
    db.refresh(account)

    return account, raw_secret


def create_integration_account(db: Session, name: str, scopes: List[str] = []) -> IntegrationAccount:
    account, _ = generate_integration_account(db, name=name, scopes=scopes)
    return account


def generate_api_key_for_account(db: Session, account_id: str, key_name: str):
    account = db.query(IntegrationAccount).filter(IntegrationAccount.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail=f"Integration Account '{account_id}' not found.")

    raw_secret = f"ims_live_{secrets.token_urlsafe(32)}"
    key_hash = pwd_context.hash(raw_secret)
    prefix = raw_secret[:12]

    key_record = IntegrationApiKey(
        account_id=account_id,
        api_key_hash=key_hash,
        prefix=prefix,
        name=key_name,
        created_at=datetime.now(timezone.utc)
    )
    db.add(key_record)
    db.commit()
    db.refresh(key_record)
    return key_record, raw_secret


def verify_integration_api_key(db: Session, api_key: str, required_scope: Optional[str] = None):
    """
    Authenticates an incoming X-API-Key header against active IntegrationAccount records.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'X-API-Key' authentication header for system integration."
        )

    prefix = api_key[:12]
    candidate_keys = db.query(IntegrationApiKey).filter(
        IntegrationApiKey.prefix == prefix,
        IntegrationApiKey.revoked_at == None
    ).all()

    matched_key = None
    for k in candidate_keys:
        if pwd_context.verify(api_key, k.api_key_hash):
            matched_key = k
            break

    if not matched_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked Integration API Key."
        )

    account = db.query(IntegrationAccount).filter(
        IntegrationAccount.account_id == matched_key.account_id,
        IntegrationAccount.status == "ACTIVE"
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Integration account is suspended or revoked."
        )

    if required_scope:
        try:
            scopes = json.loads(account.scopes_json or "[]")
        except Exception:
            scopes = []
        if required_scope not in scopes and "*" not in scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Integration Account '{account.account_id}' lacks required scope '{required_scope}'."
            )

    matched_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return account



def require_integration_scope(required_scope: str):
    def scope_checker(
        api_key: Optional[str] = Depends(API_KEY_HEADER),
        db: Session = Depends(get_db)
    ) -> IntegrationAccount:
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing 'X-API-Key' header."
            )
        account, _ = verify_integration_api_key(db, api_key, required_scope)
        return account
    return scope_checker


def log_integration_activity(
    db: Session,
    account_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    ip_address: str = "127.0.0.1",
    error_message: Optional[str] = None
):
    """Logs integration access and errors for security audit trail."""
    log = IntegrationActivityLog(
        account_id=account_id,
        endpoint=endpoint,
        http_method=method,
        status_code=status_code,
        ip_address=ip_address,
        error_message=error_message,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()


# Domain Handlers for REST API Integration Ingestion
def ingest_external_product(db: Session, payload: Dict[str, Any], account: IntegrationAccount) -> Product:
    sku = payload.get("sku", "").strip()
    if not sku:
        raise HTTPException(status_code=400, detail="SKU is required.")
    
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        existing.name = payload.get("name", existing.name)
        existing.purchase_price = float(payload.get("purchase_price", existing.purchase_price))
        existing.selling_price = float(payload.get("selling_price", existing.selling_price))
        db.commit()
        db.refresh(existing)
        return existing

    cat = db.query(Category).first()
    if not cat:
        cat = Category(name="General Supplies", code="GEN-001", category_code="CAT-000001")
        db.add(cat)
        db.flush()

    p = Product(
        sku=sku,
        product_code=f"PRD-{secrets.token_hex(3).upper()}",
        name=payload.get("name"),
        category_id=cat.id,
        purchase_price=float(payload.get("purchase_price", 0.0)),
        selling_price=float(payload.get("selling_price", 0.0)),
        reorder_level=int(payload.get("reorder_level", 10)),
        unit=payload.get("unit", "Units"),
        barcode=payload.get("barcode")
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def ingest_external_employee(db: Session, payload: Dict[str, Any], account: IntegrationAccount) -> Employee:
    code = payload.get("employee_code", "").strip()
    existing = db.query(Employee).filter(Employee.employee_code == code).first()
    if existing:
        return existing

    emp = Employee(
        employee_code=code,
        first_name=payload.get("first_name"),
        last_name=payload.get("last_name"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        position=payload.get("job_title", "CASHIER"),
        status="ACTIVE"
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp
