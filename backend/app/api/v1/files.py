"""
File Upload & Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.files import (
    FileUploadResponse, FileListResponse, FileShareCreate, FileShareResponse, FileStatsResponse,
)
from app.services.file_service import FileService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ═══════════════════════════════════════════════════════════════════════
# Upload / List
# ═══════════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    visibility: str = Form("private"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    result = FileService(db).upload_file(
        file, user.tenant_id, user.id,
        description=description, entity_type=entity_type,
        entity_id=entity_id, visibility=visibility,
    )
    return FileUploadResponse(**result)


@router.get("/", response_model=FileListResponse)
def list_files(
    category: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    files, total = FileService(db).list_files(
        user.tenant_id, user.id,
        category=category, entity_type=entity_type,
        entity_id=entity_id, limit=limit, offset=offset,
    )
    return FileListResponse(files=[FileUploadResponse(**f) for f in files], total=total)


@router.get("/stats", response_model=FileStatsResponse)
def file_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    stats = FileService(db).get_stats(user.tenant_id)
    stats["recent_uploads"] = [FileUploadResponse(**f) for f in stats["recent_uploads"]]
    return FileStatsResponse(**stats)


@router.get("/shared")
def shared_files(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    files = FileService(db).get_shared_files(user.id, user.tenant_id)
    return {"files": [FileUploadResponse(**f) for f in files]}


@router.get("/{file_id}", response_model=FileUploadResponse)
def get_file(file_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return FileUploadResponse(**FileService(db).get_file(file_id, user.tenant_id))


@router.get("/{file_id}/download")
def download_file(file_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    file_info = FileService(db).get_file(file_id, user.tenant_id)
    import os
    if not os.path.exists(file_info["file_path"]):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        file_info["file_path"],
        filename=file_info["original_name"],
        media_type=file_info["mime_type"],
    )


@router.delete("/{file_id}")
def delete_file(file_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    FileService(db).delete_file(file_id, user.tenant_id)
    return {"message": "File deleted"}


# ═══════════════════════════════════════════════════════════════════════
# Share
# ═══════════════════════════════════════════════════════════════════════

@router.post("/share", response_model=FileShareResponse)
def share_file(data: FileShareCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = FileService(db).share_file(
        data.file_id, data.shared_with_user_id,
        user.tenant_id, user.id, can_edit=data.can_edit,
    )
    return FileShareResponse(**result)
