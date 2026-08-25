import os
import uuid
import hashlib
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/api/uploads", tags=["File Upload Security"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 # 10 MB Limit
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".csv"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf", "text/csv", "application/vnd.ms-excel"}

class FileMetadataResponse(BaseModel):
    file_id: str
    original_name: str
    storage_key: str
    mime_type: str
    size_bytes: int
    sha256: str
    uploaded_at: str

FILE_METADATA_STORE = []

@router.post("/upload", response_model=FileMetadataResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Secure File Upload Service — Validates 10MB size limit, extension whitelist, calculates SHA256 checksum, and renames with UUID.
    """
    # 1. Validate Extension
    filename = file.filename or "file.bin"
    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Security Rejection: File extension '{ext}' not allowed. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Read File Bytes & Validate Size Limit
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Security Rejection: File size ({round(file_size/1024/1024, 2)} MB) exceeds maximum allowed limit of 10 MB."
        )

    # 3. Calculate SHA256 Hash
    sha256_hash = hashlib.sha256(contents).hexdigest()

    # 4. Generate Server-Side UUID Storage Key
    file_id = f"FILE-{uuid.uuid4().hex[:8].upper()}"
    storage_key = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, storage_key)

    # Save to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    metadata = {
        "file_id": file_id,
        "original_name": filename,
        "storage_key": storage_key,
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": file_size,
        "sha256": sha256_hash,
        "uploaded_at": datetime.utcnow().isoformat()
    }
    FILE_METADATA_STORE.insert(0, metadata)

    return FileMetadataResponse(**metadata)

@router.get("/list", response_model=List[FileMetadataResponse])
def list_uploaded_files():
    """
    List all uploaded files and security metadata
    """
    return FILE_METADATA_STORE
