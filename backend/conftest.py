import pytest
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials

import app.models  # Register all domain models with Base metadata
from app.database import Base, SessionLocal, engine, get_db
from app.dependencies import UserContext, get_current_user, security
from app.main import app
from app.models import User
from app.services import iam_service
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


def override_get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: SessionLocal = Depends(override_get_db),
) -> UserContext:
    # If a real Bearer token is provided, use standard authoritative token validation
    if credentials and credentials.credentials:
        return get_current_user(request, credentials, db)

    # In test execution only: support X-User-Role header for test clients
    x_user_role = request.headers.get("X-User-Role") or request.headers.get("x-user-role")
    if x_user_role:
        role_upper = x_user_role.upper()
        x_user_id = request.headers.get("X-User-Id") or request.headers.get("x-user-id") or "1"
        try:
            u_id = int(x_user_id)
        except Exception:
            u_id = 1

        db_user = db.query(User).filter(User.id == u_id).first() if db else None
        user_name = db_user.full_name if db_user else f"{role_upper} Operator"
        user_email = db_user.email if db_user else f"{role_upper.lower()}@ims.local"
        user_code = db_user.user_code if (db_user and db_user.user_code) else f"USR-{u_id:06d}"
        permissions = iam_service.ROLE_PERMISSIONS.get(role_upper, iam_service.ROLE_PERMISSIONS.get("STAFF", []))
        net_ctx = request.headers.get("X-Network-Context", "LAN").upper()

        return UserContext(
            id=u_id,
            user_code=user_code,
            full_name=user_name,
            email=user_email,
            role=role_upper,
            permissions=permissions,
            session_id="test-session-id",
            network_context=net_ctx,
        )

    raise HTTPException(
        status_code=401,
        detail="Authentication required. Please provide a valid Bearer token.",
    )


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
