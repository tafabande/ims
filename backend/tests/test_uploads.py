import io

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_file_upload_authentication_and_extension_security():
    """
    File Upload Security Test (MA-06):
    - Unauthenticated upload attempt -> Rejected 401 Unauthorized
    - Attempting to upload '.exe' disguised executable -> Rejected 400 Bad Request
    - Disguised file with mismatching magic bytes -> Rejected 400 Bad Request
    - Uploading valid '.png' image with permission -> Success 200 OK
    """
    auth_headers = {"X-User-Role": "MANAGER"}

    # 1. Unauthenticated Upload Attempt
    png_bytes = io.BytesIO(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    )
    res_unauth = client.post("/api/uploads/upload", files={"file": ("test.png", png_bytes, "image/png")})
    assert res_unauth.status_code == 401

    # 2. Dangerous .exe Upload Attempt
    exe_file = (
        "malware.exe",
        io.BytesIO(b"MZ...executable bytes"),
        "application/octet-stream",
    )
    response_exe = client.post("/api/uploads/upload", files={"file": exe_file}, headers=auth_headers)
    assert response_exe.status_code == 400
    assert "extension '.exe' not allowed" in response_exe.json()["detail"].lower()

    # 3. Disguised Corrupt/Malicious File Signature Attempt (.png with fake contents)
    fake_png = (
        "disguised.png",
        io.BytesIO(b"MALICIOUS_NON_PNG_HEADER_DATA"),
        "image/png",
    )
    response_fake = client.post("/api/uploads/upload", files={"file": fake_png}, headers=auth_headers)
    assert response_fake.status_code == 400
    assert "file signature does not match" in response_fake.json()["detail"].lower()

    # 4. Valid .png Upload Attempt
    valid_png_bytes = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...")
    response_png = client.post(
        "/api/uploads/upload",
        files={"file": ("sample_invoice.png", valid_png_bytes, "image/png")},
        headers=auth_headers,
    )
    assert response_png.status_code == 200
    data = response_png.json()
    assert "file_id" in data
    assert data["original_name"] == "sample_invoice.png"
    assert len(data["sha256"]) == 64  # SHA256 hex string length
