import os
import re

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PROHIBITED_CDN_PATTERNS = [
    r"fonts\.googleapis\.com",
    r"fonts\.gstatic\.com",
    r"unpkg\.com",
    r"jsdelivr\.net",
    r"cdnjs\.cloudflare\.com",
    r"esm\.sh",
    r"cloudinary\.com",
    r"firebase\.com",
    r"supabase\.co",
]


def test_dep_01_content_security_policy_headers():
    """
    DEP-01 Verification: Test that SecurityHeadersMiddleware returns strict Content Security Policy
    restricting assets to 'self' (No external CDNs, fonts, or scripts).
    """
    response = client.get("/")
    assert response.status_code == 200
    csp = response.headers.get("Content-Security-Policy")
    assert csp is not None
    assert "default-src 'self'" in csp
    assert "object-src 'none'" in csp


def test_dep_01_frontend_offline_dependency_audit():
    """
    DEP-01 Verification: Scan all frontend source files (JSX, JS, CSS, HTML) to ensure
    100% zero external CDN, font, or script leaks exist in the codebase.
    """
    candidate_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src")),
        os.path.abspath(os.path.join(os.getcwd(), "frontend", "src")),
        os.path.abspath(os.path.join(os.getcwd(), "..", "frontend", "src")),
    ]
    frontend_src = next((p for p in candidate_paths if os.path.exists(p)), None)
    if not frontend_src:
        pytest.skip("Frontend src directory not found in this isolated test environment.")

    violations = []

    for root, _, files in os.walk(frontend_src):
        for file in files:
            if file.endswith((".jsx", ".js", ".css", ".html", ".tsx", ".ts")):
                filepath = os.path.join(root, file)
                with open(filepath, encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for pattern in PROHIBITED_CDN_PATTERNS:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            rel_path = os.path.relpath(filepath, frontend_src)
                            violations.append(f"File '{rel_path}' contains external CDN reference matching '{pattern}'")

    assert len(violations) == 0, f"DEP-01 Violations Found: {violations}"


def test_dep_01_backend_offline_dependency_audit():
    """
    DEP-01 Verification: Scan backend service files to ensure no dynamic startup CDN downloads
    or remote un-pinned API calls exist.
    """
    backend_app = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
    assert os.path.exists(backend_app), "Backend app directory found."

    violations = []

    for root, _, files in os.walk(backend_app):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                with open(filepath, encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for pattern in PROHIBITED_CDN_PATTERNS:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            rel_path = os.path.relpath(filepath, backend_app)
                            violations.append(f"File '{rel_path}' contains external CDN reference matching '{pattern}'")

    assert len(violations) == 0, f"DEP-01 Violations Found: {violations}"
