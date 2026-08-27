import pytest

import app.models  # Register all domain models with Base metadata
from app.database import Base, SessionLocal, engine, get_db
from app.main import app


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    yield


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
