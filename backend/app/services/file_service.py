"""
File Upload & Management Service
Local storage with validation, sharing, and metadata tracking.
"""
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import UploadFile, HTTPException
from app.models.uploaded_file import UploadedFile, FileShare, FileCategory, FileVisibility
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt",
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
    ".mp4", ".mp3", ".wav",
    ".zip", ".rar", ".7z",
}

MIME_CATEGORY_MAP = {
    "application/pdf": FileCategory.pdf,
    "application/msword": FileCategory.document,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileCategory.document,
    "application/vnd.ms-excel": FileCategory.spreadsheet,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileCategory.spreadsheet,
    "application/vnd.ms-powerpoint": FileCategory.presentation,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": FileCategory.presentation,
    "text/csv": FileCategory.spreadsheet,
    "text/plain": FileCategory.document,
}


def _detect_category(mime_type: str, filename: str) -> FileCategory:
    if mime_type in MIME_CATEGORY_MAP:
        return MIME_CATEGORY_MAP[mime_type]
    if mime_type and mime_type.startswith("image/"):
        return FileCategory.image
    if mime_type and mime_type.startswith("video/"):
        return FileCategory.video
    if mime_type and mime_type.startswith("audio/"):
        return FileCategory.audio
    ext = os.path.splitext(filename)[1].lower()
    if ext in {".zip", ".rar", ".7z", ".tar", ".gz"}:
        return FileCategory.archive
    return FileCategory.other


class FileService:
    def __init__(self, db: Session):
        self.db = db
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    # ─── Upload ──────────────────────────────────────────────────────────

    def upload_file(self, file: UploadFile, tenant_id: str, user_id: int,
                    description: str = None, entity_type: str = None,
                    entity_id: int = None, visibility: str = "private") -> dict:
        # Validate extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")

        # Read and validate size
        content = file.file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large (max {MAX_FILE_SIZE // (1024*1024)} MB)")

        # Generate unique filename
        unique_name = f"{uuid.uuid4().hex}{ext}"
        tenant_dir = os.path.join(UPLOAD_DIR, tenant_id)
        os.makedirs(tenant_dir, exist_ok=True)
        filepath = os.path.join(tenant_dir, unique_name)

        with open(filepath, "wb") as f:
            f.write(content)

        mime = file.content_type or "application/octet-stream"
        category = _detect_category(mime, file.filename or "")

        db_file = UploadedFile(
            filename=unique_name,
            original_name=file.filename or "unknown",
            file_path=filepath,
            mime_type=mime,
            file_size=len(content),
            category=category.value,
            visibility=visibility,
            description=description,
            uploaded_by=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=tenant_id,
        )
        self.db.add(db_file)
        self.db.commit()
        self.db.refresh(db_file)
        logger.info(f"📁 File uploaded: {file.filename} ({len(content)} bytes) by user {user_id}")
        return self._file_dict(db_file)

    # ─── List ────────────────────────────────────────────────────────────

    def list_files(self, tenant_id: str, user_id: int,
                   category: str = None, entity_type: str = None,
                   entity_id: int = None, limit: int = 50, offset: int = 0):
        q = self.db.query(UploadedFile).filter(
            UploadedFile.tenant_id == tenant_id,
            UploadedFile.is_active == True,
        )
        if category:
            q = q.filter(UploadedFile.category == category)
        if entity_type:
            q = q.filter(UploadedFile.entity_type == entity_type)
        if entity_id:
            q = q.filter(UploadedFile.entity_id == entity_id)

        total = q.count()
        files = q.order_by(UploadedFile.created_at.desc()).offset(offset).limit(limit).all()
        return [self._file_dict(f) for f in files], total

    def get_file(self, file_id: int, tenant_id: str) -> dict:
        f = self.db.query(UploadedFile).filter(
            UploadedFile.id == file_id,
            UploadedFile.tenant_id == tenant_id,
            UploadedFile.is_active == True,
        ).first()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        return self._file_dict(f)

    def delete_file(self, file_id: int, tenant_id: str):
        f = self.db.query(UploadedFile).filter(
            UploadedFile.id == file_id,
            UploadedFile.tenant_id == tenant_id,
        ).first()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        f.is_active = False
        self.db.commit()

    # ─── Share ───────────────────────────────────────────────────────────

    def share_file(self, file_id: int, shared_with_user_id: int,
                   tenant_id: str, shared_by: int, can_edit: bool = False) -> dict:
        f = self.db.query(UploadedFile).filter(
            UploadedFile.id == file_id, UploadedFile.tenant_id == tenant_id
        ).first()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")

        share = FileShare(
            file_id=file_id,
            shared_with_user_id=shared_with_user_id,
            can_edit=can_edit,
            shared_by=shared_by,
            tenant_id=tenant_id,
        )
        self.db.add(share)
        f.visibility = FileVisibility.shared.value
        self.db.commit()
        self.db.refresh(share)
        return {
            "id": share.id, "file_id": share.file_id,
            "shared_with_user_id": share.shared_with_user_id,
            "can_edit": share.can_edit, "shared_by": share.shared_by,
            "is_active": share.is_active, "created_at": share.created_at,
        }

    def get_shared_files(self, user_id: int, tenant_id: str):
        shares = self.db.query(FileShare).filter(
            FileShare.shared_with_user_id == user_id,
            FileShare.tenant_id == tenant_id,
            FileShare.is_active == True,
        ).all()
        result = []
        for s in shares:
            f = self.db.query(UploadedFile).filter(UploadedFile.id == s.file_id).first()
            if f and f.is_active:
                d = self._file_dict(f)
                d["shared_by"] = s.shared_by
                d["can_edit"] = s.can_edit
                result.append(d)
        return result

    # ─── Stats ───────────────────────────────────────────────────────────

    def get_stats(self, tenant_id: str) -> dict:
        base = self.db.query(UploadedFile).filter(
            UploadedFile.tenant_id == tenant_id,
            UploadedFile.is_active == True,
        )
        total = base.count()
        total_size = base.with_entities(func.sum(UploadedFile.file_size)).scalar() or 0

        cat_breakdown = self.db.query(
            UploadedFile.category, func.count(UploadedFile.id), func.sum(UploadedFile.file_size)
        ).filter(
            UploadedFile.tenant_id == tenant_id, UploadedFile.is_active == True
        ).group_by(UploadedFile.category).all()

        recent = base.order_by(UploadedFile.created_at.desc()).limit(5).all()

        return {
            "total_files": total,
            "total_size_bytes": float(total_size),
            "total_size_mb": round(float(total_size) / (1024 * 1024), 2),
            "by_category": [{"category": str(c), "count": cnt, "size_bytes": float(sz or 0)} for c, cnt, sz in cat_breakdown],
            "recent_uploads": [self._file_dict(f) for f in recent],
        }

    # ─── Serializer ──────────────────────────────────────────────────────

    def _file_dict(self, f: UploadedFile) -> dict:
        return {
            "id": f.id, "tenant_id": f.tenant_id,
            "filename": f.filename, "original_name": f.original_name,
            "file_path": f.file_path, "mime_type": f.mime_type,
            "file_size": f.file_size,
            "category": f.category.value if hasattr(f.category, 'value') else str(f.category),
            "visibility": f.visibility.value if hasattr(f.visibility, 'value') else str(f.visibility),
            "description": f.description,
            "uploaded_by": f.uploaded_by,
            "entity_type": f.entity_type, "entity_id": f.entity_id,
            "is_active": f.is_active,
            "created_at": f.created_at, "updated_at": f.updated_at,
        }
