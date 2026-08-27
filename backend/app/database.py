import os
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

# Default to SQLite for local development, fallback to PostgreSQL if DATABASE_URL is set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ims.db")

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if _ENVIRONMENT == "production" and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "FATAL: SQLite is not supported in production. "
        "Set DATABASE_URL to a PostgreSQL connection string."
    )

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if engine.dialect.name == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA busy_timeout=10000;")
        cursor.close()

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

# Auto-migrate missing columns for SQLite local dev
with engine.connect() as conn:
    for stmt in [
        "ALTER TABLE integration_accounts ADD COLUMN description TEXT;",
        "ALTER TABLE import_batches ADD COLUMN file_size INTEGER DEFAULT 0;",
        "ALTER TABLE import_batches ADD COLUMN column_mapping_json TEXT;",
        "ALTER TABLE import_batches ADD COLUMN storage_path VARCHAR(255);",
        "ALTER TABLE import_batches ADD COLUMN approval_id INTEGER;",
        "ALTER TABLE purchases ADD COLUMN work_session_id INTEGER;",
        "ALTER TABLE purchases ADD COLUMN work_session_code VARCHAR(50);",
        "ALTER TABLE sales ADD COLUMN work_session_id INTEGER;",
        "ALTER TABLE sales ADD COLUMN work_session_code VARCHAR(50);",
        "ALTER TABLE inventory_transactions ADD COLUMN work_session_id INTEGER;",
        "ALTER TABLE inventory_transactions ADD COLUMN work_session_code VARCHAR(50);",
        "ALTER TABLE cases ADD COLUMN work_session_id INTEGER;",
        "ALTER TABLE cases ADD COLUMN work_session_code VARCHAR(50);"
    ]:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            pass


