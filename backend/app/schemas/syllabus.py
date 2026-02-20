from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


# ─── Syllabus Topic Schemas ────────────────────────────────────────────

class SyllabusTopicBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    order: int = 0


class SyllabusTopicCreate(SyllabusTopicBase):
    pass


class SyllabusTopicUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    order: Optional[int] = None


class SyllabusTopicResponse(SyllabusTopicBase):
    id: int
    syllabus_id: int
    is_completed: bool = False
    completed_date: Optional[date] = None
    document_path: Optional[str] = None
    document_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Syllabus Schemas ──────────────────────────────────────────────────

class SyllabusBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    academic_year: str = Field(..., min_length=1, max_length=20)
    status: str = Field(default="draft", max_length=20)
    subject_id: int
    class_id: int


class SyllabusCreate(SyllabusBase):
    pass


class SyllabusUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    academic_year: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    subject_id: Optional[int] = None
    class_id: Optional[int] = None


class SyllabusResponse(SyllabusBase):
    id: int
    tenant_id: str
    subject_name: Optional[str] = None
    class_name: Optional[str] = None
    topics: List[SyllabusTopicResponse] = []
    total_topics: int = 0
    completed_topics: int = 0
    progress: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SyllabusListItem(BaseModel):
    id: int
    title: str
    academic_year: str
    status: str
    subject_id: int
    subject_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    total_topics: int = 0
    completed_topics: int = 0
    progress: float = 0.0

    class Config:
        from_attributes = True


class SyllabusListResponse(BaseModel):
    syllabi: List[SyllabusListItem]
    total: int


class DocumentUploadResponse(BaseModel):
    topic_id: int
    document_path: str
    document_name: str
    message: str
