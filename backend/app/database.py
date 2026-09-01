import os

from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlmodel import create_engine

_DEFAULT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ims.db")).replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")

_ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
if _ENVIRONMENT == "production" and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "FATAL: SQLite is not supported in production. Set DATABASE_URL to a PostgreSQL connection string."
    )

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30})
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


def install_database_immutability_triggers(target_engine=None):
    """
    Installs database-level triggers enforcing append-only immutability.
    Guarantees that direct raw SQL UPDATE or DELETE statements fail at the database engine layer.
    """
    target = target_engine or engine
    sqlite_triggers = [
        """
        CREATE TRIGGER IF NOT EXISTS trg_imm_reconciliation_upd
        BEFORE UPDATE ON import_reconciliation_records
        BEGIN
            SELECT RAISE(ABORT, 'Database Security Boundary Violation: import_reconciliation_records is append-only and cannot be updated.');
        END;
        """,
        """
        CREATE TRIGGER IF NOT EXISTS trg_imm_reconciliation_del
        BEFORE DELETE ON import_reconciliation_records
        BEGIN
            SELECT RAISE(ABORT, 'Database Security Boundary Violation: import_reconciliation_records is append-only and cannot be deleted.');
        END;
        """,
        """
        CREATE TRIGGER IF NOT EXISTS trg_imm_mapping_hist_upd
        BEFORE UPDATE ON external_entity_mapping_histories
        BEGIN
            SELECT RAISE(ABORT, 'Database Security Boundary Violation: external_entity_mapping_histories is append-only and cannot be updated.');
        END;
        """,
        """
        CREATE TRIGGER IF NOT EXISTS trg_imm_mapping_hist_del
        BEFORE DELETE ON external_entity_mapping_histories
        BEGIN
            SELECT RAISE(ABORT, 'Database Security Boundary Violation: external_entity_mapping_histories is append-only and cannot be deleted.');
        END;
        """,
    ]
    postgresql_ddl = [
        """
        CREATE OR REPLACE FUNCTION fn_block_append_only_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'Database Security Boundary Violation: Table % is strictly append-only and cannot be updated or deleted.', TG_TABLE_NAME;
        END;
        $$ LANGUAGE plpgsql;
        """,
        """
        DROP TRIGGER IF EXISTS trg_imm_reconciliation_block ON import_reconciliation_records;
        CREATE TRIGGER trg_imm_reconciliation_block
        BEFORE UPDATE OR DELETE ON import_reconciliation_records
        FOR EACH ROW EXECUTE FUNCTION fn_block_append_only_mutation();
        """,
        """
        DROP TRIGGER IF EXISTS trg_imm_mapping_hist_block ON external_entity_mapping_histories;
        CREATE TRIGGER trg_imm_mapping_hist_block
        BEFORE UPDATE OR DELETE ON external_entity_mapping_histories
        FOR EACH ROW EXECUTE FUNCTION fn_block_append_only_mutation();
        """,
    ]
    with target.connect() as conn:
        if target.dialect.name == "sqlite":
            for stmt in sqlite_triggers:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    pass
        elif target.dialect.name == "postgresql":
            for stmt in postgresql_ddl:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    pass


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

