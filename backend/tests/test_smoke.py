"""
Smoke tests — verify the application can import and respond to basic probes.
These run first in CI to catch import errors before the full suite.
"""
import pytest
from fastapi.testclient import TestClient


def test_app_imports_successfully():
    """F-01/F-08: Verify that app.main imports without NameError or other failures."""
    from app.main import app
    from fastapi import FastAPI
    assert isinstance(app, FastAPI), "app.main.app should be a FastAPI instance"


def test_health_live_returns_200():
    """Verify the liveness probe responds with 200 and ALIVE status."""
    from app.main import app
    client = TestClient(app)
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALIVE"
    assert "timestamp" in data


def test_health_ready_returns_200():
    """Verify the readiness probe responds (database available in test env)."""
    from app.main import app
    client = TestClient(app)
    response = client.get("/health/ready")
    # In test environment with SQLite, database should be reachable.
    # Redis may not be available, so we accept 200 or 503.
    assert response.status_code in (200, 503)


def test_release_readiness_is_honest():
    """F-10: Verify /release/readiness no longer claims READY_FOR_GO_LIVE."""
    from app.main import app
    client = TestClient(app)
    response = client.get("/release/readiness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NOT_EVALUATED"
    assert "READY_FOR_GO_LIVE" not in str(data)


def test_health_no_fabricated_claims():
    """F-04: Verify /health does not contain hard-coded SLO/DR/scorecard data."""
    from app.main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    # These keys must NOT exist in the honest health response
    assert "release_maturity_scorecard" not in data
    assert "disaster_resilience" not in data
    assert "secrets_management" not in data
    assert "slo_sli_telemetry" not in data
