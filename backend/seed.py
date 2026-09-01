import os

from app.database import Base, SessionLocal, engine
from app.models import User
from app.services.iam_service import hash_password
from app.services.payment_service import seed_default_payment_methods
from app.services.settings_service import seed_default_settings

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if _ENVIRONMENT == "production":
    raise RuntimeError("FATAL: Sample database seeding is strictly prohibited in production.")


def seed_initial_admin(db):
    """Seed initial system administrator account if no admin user exists."""
    admin_email = "admin@ims.co.zw"
    existing = db.query(User).filter(User.email == admin_email).first()
    if not existing:
        admin_user = User(
            user_code="USR-000001",
            email=admin_email,
            full_name="System Administrator",
            role="APP_ADMIN",
            department="IT Governance",
            hashed_password=hash_password("admin123"),
            active=True,
        )
        db.add(admin_user)
        db.commit()
        print("[OK] Initial administrator account configured.")


def seed_db():
    """
    Plain IMS Database Initialization:
    Ensures database schema tables exist and seeds core system settings, payment methods, and initial admin user.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_settings(db)
        seed_default_payment_methods(db)
        seed_initial_admin(db)
        print("Database schema and core system configuration initialized successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
