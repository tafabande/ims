import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import (
    Product,
    User,
)
from app.services import ingestion_service, integration_service

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
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
    db = TestingSessionLocal()
    try:
        if not db.query(User).filter(User.id == 1).first():
            admin = User(
                id=1,
                email="admin@test.com",
                user_code="USR-001",
                full_name="Admin",
                hashed_password="hash",
                role="ADMIN",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def test_suggest_column_mapping():
    headers = ["Employee No", "Employee Name", "Department", "Phone", "Position"]
    mapping = ingestion_service.suggest_column_mapping("employees", headers)
    assert mapping.get("Employee No") == "employee_code"
    assert mapping.get("Employee Name") in ["first_name", "last_name", "full_name"] or "employee_code" in mapping


def test_file_hash_duplicate_detection():
    db = TestingSessionLocal()
    csv_bytes = b"SKU,Name,Cost Price,Selling Price\nPRD-001,Test Item,10,20\n"

    # First Upload
    res1 = ingestion_service.validate_and_stage_import(
        db,
        "test.csv",
        csv_bytes,
        "products",
        {
            "SKU": "sku",
            "Name": "name",
            "Cost Price": "purchase_price",
            "Selling Price": "selling_price",
        },
    )
    assert res1["status"] in ["VALIDATED", "READY_FOR_COMMIT"]
    assert res1["is_duplicate"] is False

    # Second Upload with same content
    res2 = ingestion_service.validate_and_stage_import(
        db,
        "test.csv",
        csv_bytes,
        "products",
        {
            "SKU": "sku",
            "Name": "name",
            "Cost Price": "purchase_price",
            "Selling Price": "selling_price",
        },
    )
    assert res2["is_duplicate"] is True
    assert "Possible duplicate import detected" in res2["duplicate_warning_message"]


def test_validation_blocks_negative_values_and_duplicates():
    db = TestingSessionLocal()
    # CSV with invalid negative cost and duplicate SKU
    csv_bytes = (
        b"SKU,Name,Cost Price,Selling Price\nPRD-100,Good Item,10,20\nPRD-101,Bad Item,-5,20\nPRD-100,Dup Item,15,30\n"
    )

    res = ingestion_service.validate_and_stage_import(
        db,
        "invalid.csv",
        csv_bytes,
        "products",
        {
            "SKU": "sku",
            "Name": "name",
            "Cost Price": "purchase_price",
            "Selling Price": "selling_price",
        },
    )
    assert res["status"] in ["REQUIRES_CORRECTION", "QUARANTINED"]
    assert res["valid_records"] == 1
    assert res["rejected_records"] == 2
    assert len(res["errors"]) == 2


def test_execute_approved_batch_commits_to_core():
    db = TestingSessionLocal()
    csv_bytes = b"SKU,Name,Cost Price,Selling Price\nPRD-777,Widget A,15,30\n"

    staged = ingestion_service.validate_and_stage_import(
        db,
        "valid.csv",
        csv_bytes,
        "products",
        {
            "SKU": "sku",
            "Name": "name",
            "Cost Price": "purchase_price",
            "Selling Price": "selling_price",
        },
    )
    batch_id = staged["batch_id"]

    executed_batch = ingestion_service.execute_approved_batch(db, batch_id, approver_user_id=1)
    assert executed_batch.status in ["IMPORTED", "COMMITTED"]

    # Verify Product in Core Database
    prod = db.query(Product).filter(Product.sku == "PRD-777").first()
    assert prod is not None
    assert prod.name == "Widget A"
    assert prod.selling_price == 30.0


def test_integration_account_creation_and_api_key_auth():
    db = TestingSessionLocal()
    account, secret_key = integration_service.generate_integration_account(
        db, name="POS System Terminal", scopes=["products:write", "sales:create"]
    )
    assert account.account_id.startswith("INT-2026-")
    assert secret_key.startswith("ims_live_")

    # Verify API key authentication
    auth_account = integration_service.verify_integration_api_key(db, secret_key)
    assert auth_account.account_id == account.account_id


def test_template_and_export_generation():
    db = TestingSessionLocal()
    csv_str, filename = ingestion_service.generate_entity_template("employees")
    assert "Employee No" in csv_str
    assert filename == "employees_template.csv"

    exp_str, exp_filename = ingestion_service.export_entity_data(db, "products")
    assert "SKU" in exp_str
    assert exp_filename.startswith("export_products_")
