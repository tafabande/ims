from app.database import SessionLocal, engine, Base
from app.services.settings_service import seed_default_settings
from app.services.payment_service import seed_default_payment_methods

def seed_db():
    """
    Plain IMS Production Initialization:
    Ensures database schema tables exist and seeds system configuration parameters.
    No sample products, sales, customers, or suppliers are pre-populated.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_default_settings(db)
    seed_default_payment_methods(db)
    db.close()
    print("Database schema initialized for production. Plain application ready.")

if __name__ == "__main__":
    seed_db()
