"""
File Upload schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FileUploadResponse(BaseModel):
    id: int
    tenant_id: str
    filename: str
    original_name: str
    file_path: str
    mime_type: Optional[str] = None
    file_size: float
    category: str
    visibility: str
    description: Optional[str] = None
    uploaded_by: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    files: List[FileUploadResponse]
    total: int


class FileShareCreate(BaseModel):
    file_id: int
    shared_with_user_id: int
    can_edit: bool = False


class FileShareResponse(BaseModel):
    id: int
    file_id: int
    shared_with_user_id: int
    can_edit: bool
    shared_by: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FileStatsResponse(BaseModel):
    total_files: int
    total_size_bytes: float
    total_size_mb: float
    by_category: List[dict]
    recent_uploads: List[FileUploadResponse]
