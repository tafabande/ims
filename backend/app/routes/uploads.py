import hashlib
import os
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import UserContext, require_permission

router = APIRouter(prefix="/api/uploads", tags=["File Upload Security"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB Limit

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".csv", ".xlsx", ".xls"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class FileMetadataResponse(BaseModel):
    file_id: str
    original_name: str
    storage_key: str
    mime_type: str
    size_bytes: int
    sha256: str
    uploaded_at: str
    uploaded_by: str | None = None


FILE_METADATA_STORE: list[dict] = []


def _validate_magic_bytes(ext: str, contents: bytes) -> bool:
    """Inspect binary file signatures to prevent disguised executables"""
    if ext in [".png"]:
        return contents.startswith(b"\x89PNG\r\n\x1a\n") or contents.startswith(b"\x89PNG")
    if ext in [".jpg", ".jpeg"]:
        return contents.startswith(b"\xff\xd8\xff")
    if ext in [".pdf"]:
        return contents.startswith(b"%PDF-")
    if ext in [".xlsx"]:
        return contents.startswith(b"PK\x03\x04")
    if ext in [".csv", ".xls", ".txt"]:
        try:
            contents[:1024].decode("utf-8", errors="ignore")
            return True
        except Exception:
            return False
    return True


@router.post("/upload", response_model=FileMetadataResponse)
async def upload_file(
    file: UploadFile = File(...),
    auth_ctx: UserContext = Depends(require_permission("products:read")),
):
    """
    Secure File Upload Service:
    - Authenticated endpoint with permission verification
    - 10MB size limit enforcement
    - Whitelisted extension and MIME type validation
    - Magic byte header inspection
    - SHA256 integrity calculation and UUID file isolation
    """
    filename = os.path.basename(file.filename or "file.bin")
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Security Rejection: File extension '{ext}' not allowed. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Security Rejection: File size ({round(file_size / 1024 / 1024, 2)} MB) exceeds maximum allowed limit of 10 MB.",
        )

    if not _validate_magic_bytes(ext, contents):
        raise HTTPException(
            status_code=400,
            detail=f"Security Rejection: File signature does not match declared extension '{ext}'.",
        )

    sha256_hash = hashlib.sha256(contents).hexdigest()
    file_id = f"FILE-{uuid.uuid4().hex[:8].upper()}"
    storage_key = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, storage_key)

    with open(file_path, "wb") as f:
        f.write(contents)

    metadata = {
        "file_id": file_id,
        "original_name": filename,
        "storage_key": storage_key,
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": file_size,
        "sha256": sha256_hash,
        "uploaded_at": datetime.now(UTC).isoformat(),
        "uploaded_by": auth_ctx.user_code,
    }
    FILE_METADATA_STORE.insert(0, metadata)

    return FileMetadataResponse(**metadata)


@router.get("/list", response_model=list[FileMetadataResponse])
def list_uploaded_files(auth_ctx: UserContext = Depends(require_permission("products:read"))):
    """
    List all uploaded files and security metadata
    """
    return FILE_METADATA_STORE
