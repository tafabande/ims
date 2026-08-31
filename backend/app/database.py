import os

from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlmodel import create_engine

# Default to SQLite for local development, fallback to PostgreSQL if DATABASE_URL is set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ims.db")

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if _ENVIRONMENT == "production" and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "FATAL: SQLite is not supported in production. Set DATABASE_URL to a PostgreSQL connection string."
    )

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800")),
    )


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


def set_session_rls_context(db, location_id: str | None = None, org_id: str | None = None):
    """
    Sets PostgreSQL Row-Level Security (RLS) session variables for multi-tenant / multi-warehouse isolation.
    Executed inside an active database transaction session.
    """
    if engine.dialect.name == "postgresql":
        if location_id:
            db.execute(text("SELECT set_config('app.location_id', :loc, true)"), {"loc": str(location_id)})
        if org_id:
            db.execute(text("SELECT set_config('app.org_id', :org, true)"), {"org": str(org_id)})

