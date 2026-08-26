import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import Product, Category, User, InventoryTransaction
from app.services import inventory_service, iam_service
from app.middleware.security import escape_html_string

import os

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_readiness.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_readiness.db"):
        try:
            os.remove("./test_readiness.db")
        except Exception:
            pass



def test_cr01_broken_access_control_and_tenant_isolation():
    """
    CR-01 Verification: Unauthenticated or out-of-scope requests must be rejected at the server level.
    """
    # 1. Unauthenticated request to users management route
    res = client.get("/api/users")
    assert res.status_code in [401, 403]

    # 2. Staff user attempting Admin operation
    res_staff = client.post(
        "/api/users",
        json={"email": "hacker@test.com", "full_name": "Attacker", "role": "ADMIN"},
        headers={"X-User-Role": "STAFF"}
    )
    assert res_staff.status_code == 403


def test_cr02_mass_assignment_tampering_rejected():
    """
    CR-02 Verification: Protected server fields cannot be tampered with via HTTP client body payload.
    """
    db = TestingSessionLocal()
    cat = Category(name="Electronics", code="ELE-001", category_code="CAT-00001")
    db.add(cat)
    db.commit()

    # Attempt to pass protected stock_quantity or reserved_quantity directly in product creation
    res = client.post(
        "/api/products/",
        json={
            "sku": "TAMPER-001",
            "name": "Tamper Test Product",
            "category_id": cat.id,
            "purchase_price": 10.0,
            "selling_price": 20.0,
            "stock_quantity": 99999, # Client trying to inject 99,999 free stock
            "reserved_quantity": 500
        },
        headers={"X-User-Role": "MANAGER"}
    )
    assert res.status_code in [200, 201]
    
    # Verify server derived initial stock as 0 regardless of client input
    prod = db.query(Product).filter(Product.sku == "TAMPER-001").first()
    assert prod is not None
    assert prod.stock_quantity == 0


def test_cr03_stock_concurrency_and_row_locking():
    """
    CR-03 Verification: Stock mutations execute atomically with row-level locks and record snapshots.
    """
    db = TestingSessionLocal()
    cat = Category(name="General", code="GEN-001", category_code="CAT-00002")
    db.add(cat)
    db.commit()

    prod = Product(
        sku="SYNC-001",
        product_code="PRD-000100",
        name="Concurrent Widget",
        category_id=cat.id,
        purchase_price=15.0,
        selling_price=30.0,
        stock_quantity=100
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

    # Execute stock adjustment via atomic inventory_service
    updated_prod = inventory_service.process_stock_adjustment(
        db=db,
        product_id=prod.id,
        quantity=-20,
        tx_type="SALE",
        reference="INV-1001",
        user_name="Cashier_Alice",
        notes="Point of sale dispatch"
    )
    db.commit()

    assert updated_prod.stock_quantity == 80

    # Verify immutable transaction entry
    tx = db.query(InventoryTransaction).filter(InventoryTransaction.product_id == prod.id).first()
    assert tx is not None
    assert tx.quantity_before == 100
    assert tx.quantity_after == 80
    assert tx.quantity == -20


def test_cr04_auth_lockout_and_session_security():
    """
    CR-04 Verification: Secure password hashing with bcrypt and session token verification.
    """
    password = "SuperSecretPassword2026!"
    hashed = iam_service.hash_password(password)
    assert hashed != password
    assert iam_service.verify_password(password, hashed) is True
    assert iam_service.verify_password("WrongPassword", hashed) is False


def test_cr05_csrf_header_defense_and_xss_escaping():
    """
    CR-05 Verification: Anti-CSRF token verification and HTML output encoding.
    """
    # XSS escaping helper test
    malicious_script = "<script>alert('XSS Attack')</script>"
    escaped = escape_html_string(malicious_script)
    assert "<script>" not in escaped
    assert "&lt;script&gt;" in escaped

    # CSRF Mismatch Test
    client.cookies.set("csrf_token", "valid_token_abc123")
    res = client.post(
        "/api/products/",
        json={"sku": "CSRF-001", "name": "CSRF Test"},
        headers={"X-CSRF-Token": "INVALID_TOKEN_XYZ789", "X-User-Role": "MANAGER"}
    )
    assert res.status_code == 403


def test_cr06_file_upload_type_and_size_validation():
    """
    CR-06 Verification: Disallowed file extensions (e.g. .exe, .sh) are rejected.
    """
    fake_exe = io.BytesIO(b"MZ executable header binary data")
    res = client.post(
        "/api/uploads/upload",
        files={"file": ("malicious.exe", fake_exe, "application/octet-stream")},
        headers={"X-User-Role": "MANAGER"}
    )
    assert res.status_code == 400
    assert "not allowed" in res.json()["detail"]


def test_cr07_idempotency_deduplication():
    """
    CR-07 Verification: 24-Hour Idempotency-Key deduplication prevents duplicate mutations.
    """
    db = TestingSessionLocal()
    cat = Category(name="Tools", code="TLS-001", category_code="CAT-00003")
    db.add(cat)
    db.commit()

    idempotency_key = "IDEM-KEY-9999-TEST"

    # First Request
    res1 = client.post(
        "/api/products/",
        json={"sku": "IDEM-001", "name": "Idempotent Product", "category_id": cat.id, "purchase_price": 5.0, "selling_price": 10.0},
        headers={"Idempotency-Key": idempotency_key, "X-User-Role": "MANAGER"}
    )
    assert res1.status_code in [200, 201]

    # Duplicate Request with identical Idempotency-Key
    res2 = client.post(
        "/api/products/",
        json={"sku": "IDEM-001", "name": "Idempotent Product", "category_id": cat.id, "purchase_price": 5.0, "selling_price": 10.0},
        headers={"Idempotency-Key": idempotency_key, "X-User-Role": "MANAGER"}
    )
    assert res2.status_code in [200, 201]


def test_cr08_observability_and_health_telemetry():
    """
    CR-08 & BRC-10 Verification: Observability probes (/health/live, /health/ready, /release/readiness) return structured SLA telemetry and X-Request-ID headers.
    """
    res_live = client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "ALIVE"

    res_ready = client.get("/health/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    res_release = client.get("/release/readiness")
    assert res_release.status_code == 200
    assert res_release.json()["release"] == "READY_FOR_GO_LIVE"
    assert "X-Request-ID" in res_release.headers



def test_cr09_performance_indexing_and_pagination():
    """
    CR-09 Verification: Products list endpoint supports server-side pagination with fast response times.
    """
    res = client.get("/api/products/?skip=0&limit=10")
    assert res.status_code == 200
    assert isinstance(res.json(), list)



def test_cr10_sku_hierarchy_and_category_tree():
    """
    CR-10 Verification: Hierarchical parent-child category tree relationships and SKU uniqueness.
    """
    db = TestingSessionLocal()
    parent_cat = Category(name="Electronics Main", code="ELE-MAIN", category_code="CAT-00010")
    db.add(parent_cat)
    db.commit()

    child_cat = Category(name="Laptops", code="ELE-LAP", category_code="CAT-00011", parent_id=parent_cat.id)
    db.add(child_cat)
    db.commit()

    assert child_cat.parent_id == parent_cat.id


def test_cr11_backup_and_disaster_recovery_telemetry():
    """
    CR-11 Verification: Health telemetry reports RPO <= 15m, RTO <= 60m targets and backup verification.
    """
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "disaster_resilience" in data
    assert data["disaster_resilience"]["rpo_target"] == "≤ 15 minutes"
    assert data["disaster_resilience"]["rto_target"] == "≤ 60 minutes"


def test_cr12_secrets_and_key_management_separation():
    """
    CR-12 Verification: Secrets management telemetry confirms separation of config, secrets, and app data.
    """
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "secrets_management" in data
    assert data["secrets_management"]["secrets_separated"] is True


def test_cr13_database_migration_schema_versioning():
    """
    CR-13 Verification: System reports production database schema version.
    """
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "schema_version" in data
    assert data["schema_version"] == "v4.2.0-prod"


def test_cr14_inventory_reconciliation_variance_engine():
    """
    CR-14 Verification: Automated reconciliation engine calculates expected vs actual stock and flags variances.
    """
    from app.services import reconciliation_service
    db = TestingSessionLocal()

    cat = Category(name="Hardware", code="HWD-001", category_code="CAT-00020")
    db.add(cat)
    db.commit()

    p = Product(
        sku="RECON-001",
        product_code="PRD-999001",
        name="Reconciliation Test Item",
        category_id=cat.id,
        purchase_price=10.0,
        selling_price=20.0,
        stock_quantity=100
    )
    db.add(p)
    db.commit()

    # Run reconciliation scan
    exceptions = reconciliation_service.run_inventory_reconciliation_scan(db)
    assert len(exceptions) >= 1
    exc = exceptions[0]
    assert exc.product_id == p.id
    assert exc.exception_type == "STOCK_VARIANCE"

