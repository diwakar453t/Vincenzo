"""
File Upload models
"""
import enum
from sqlalchemy import Column, String, Integer, Text, Boolean, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class FileCategory(str, enum.Enum):
    document = "document"
    image = "image"
    spreadsheet = "spreadsheet"
    presentation = "presentation"
    pdf = "pdf"
    video = "video"
    audio = "audio"
    archive = "archive"
    other = "other"


class FileVisibility(str, enum.Enum):
    private = "private"
    shared = "shared"
    public = "public"


class UploadedFile(BaseModel):
    __tablename__ = "uploaded_files"

    filename = Column(String(500), nullable=False)
    original_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Float, nullable=False, default=0)       # bytes
    category = Column(Enum(FileCategory), default=FileCategory.other, nullable=False)
    visibility = Column(Enum(FileVisibility), default=FileVisibility.private, nullable=False)
    description = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    entity_type = Column(String(50), nullable=True)            # e.g. "student", "teacher"
    entity_id = Column(Integer, nullable=True)                 # linked entity
    is_active = Column(Boolean, default=True, nullable=False)

    uploader = relationship("User", backref="uploaded_files", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<UploadedFile(name={self.original_name}, size={self.file_size})>"


class FileShare(BaseModel):
    __tablename__ = "file_shares"

    file_id = Column(Integer, ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    can_edit = Column(Boolean, default=False, nullable=False)
    shared_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    file = relationship("UploadedFile", backref="shares", foreign_keys=[file_id])
    shared_user = relationship("User", foreign_keys=[shared_with_user_id])
    sharer = relationship("User", foreign_keys=[shared_by])

    def __repr__(self):
        return f"<FileShare(file={self.file_id}, user={self.shared_with_user_id})>"
