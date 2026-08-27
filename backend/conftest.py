import pytest

import app.models  # Register all domain models with Base metadata
from app.database import Base, SessionLocal, engine, get_db
from app.main import app
from app.models import User
from app.services.iam_service import hash_password


def seed_test_users(db):
    """Seed baseline test users for test suites"""
    test_users = [
        {
            "id": 1,
            "user_code": "admin",
            "email": "admin@ims.local",
            "full_name": "System Admin",
            "role": "ADMIN",
            "password": "adminpassword",
        },
        {
            "id": 2,
            "user_code": "manager",
            "email": "manager@ims.local",
            "full_name": "Store Manager",
            "role": "MANAGER",
            "password": "managerpassword",
        },
        {
            "id": 3,
            "user_code": "staff",
            "email": "staff@ims.local",
            "full_name": "Front Desk Staff",
            "role": "STAFF",
            "password": "staffpassword",
        },
        {
            "id": 4,
            "user_code": "USR-000001",
            "email": "admin@ims.co.zw",
            "full_name": "System Administrator",
            "role": "ADMIN",
            "password": "admin123",
        },
        {
            "id": 5,
            "user_code": "USR-000002",
            "email": "manager@ims.co.zw",
            "full_name": "Store Operations Manager",
            "role": "MANAGER",
            "password": "manager123",
        },
        {
            "id": 6,
            "user_code": "USR-000003",
            "email": "staff@ims.co.zw",
            "full_name": "Front-Desk Cashier",
            "role": "STAFF",
            "password": "staff123",
        },
    ]
    for u_data in test_users:
        try:
            existing = db.query(User).filter((User.id == u_data["id"]) | (User.email == u_data["email"])).first()
            if not existing:
                data = dict(u_data)
                pwd = data.pop("password")
                user = User(**data, hashed_password=hash_password(pwd), active=True)
                db.add(user)
                db.commit()
        except Exception:
            db.rollback()


@pytest.fixture(autouse=True, scope="session")
def initialize_database():
    """Drop and recreate fresh schema once per test session to guarantee all model columns exist"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_test_users(db)
    finally:
        db.close()
    yield


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_test_users(db)
    finally:
        db.close()
    yield


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
