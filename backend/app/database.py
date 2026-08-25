import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite for local development, fallback to PostgreSQL if DATABASE_URL is set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ims.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def set_session_rls_context(db, location_id: str = None, org_id: str = None):
    """
    Sets PostgreSQL Row-Level Security (RLS) session variables for multi-tenant / multi-warehouse isolation.
    Executed inside an active database transaction session.
    """
    if engine.dialect.name == "postgresql":
        if location_id:
            db.execute(text("SET LOCAL app.location_id = :loc"), {"loc": str(location_id)})
        if org_id:
            db.execute(text("SET LOCAL app.org_id = :org"), {"org": str(org_id)})
