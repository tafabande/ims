import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_file_upload_extension_whitelist():
    """
    File Upload Security Test:
    - Attempting to upload '.exe' disguised executable -> Rejected 400 Bad Request
    - Uploading valid '.png' image -> Success 200 OK
    """
    # 1. Dangerous .exe Upload Attempt
    exe_file = ("malware.exe", io.BytesIO(b"MZ...executable bytes"), "application/octet-stream")
    response_exe = client.post("/api/uploads/upload", files={"file": exe_file})
    assert response_exe.status_code == 400
    assert "extension '.exe' not allowed" in response_exe.json()["detail"].lower()

    # 2. Valid .png Upload Attempt
    png_file = ("sample_invoice.png", io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..."), "image/png")
    response_png = client.post("/api/uploads/upload", files={"file": png_file})
    assert response_png.status_code == 200
    data = response_png.json()
    assert "file_id" in data
    assert data["original_name"] == "sample_invoice.png"
    assert len(data["sha256"]) == 64 # SHA256 hex string length
