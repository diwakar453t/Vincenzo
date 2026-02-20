from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Subject Group Schemas ───────────────────────────────────────────────

class SubjectGroupBase(BaseModel):
    """Base schema for SubjectGroup"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class SubjectGroupCreate(SubjectGroupBase):
    """Schema for creating a subject group"""
    pass


class SubjectGroupUpdate(BaseModel):
    """Schema for updating a subject group"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class SubjectGroupResponse(SubjectGroupBase):
    """Schema for subject group response"""
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubjectGroupListItem(BaseModel):
    """Schema for subject group list item"""
    id: int
    name: str
    description: Optional[str] = None
    subject_count: int = 0

    class Config:
        from_attributes = True


class SubjectGroupListResponse(BaseModel):
    """Schema for paginated subject group list"""
    groups: list[SubjectGroupListItem]
    total: int


# ─── Subject Schemas ─────────────────────────────────────────────────────

class SubjectBase(BaseModel):
    """Base schema for Subject"""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    credits: int = Field(default=1, ge=1, le=10)
    subject_type: str = Field(default="theory", max_length=30)
    group_id: Optional[int] = None


class SubjectCreate(SubjectBase):
    """Schema for creating a subject"""
    pass


class SubjectUpdate(BaseModel):
    """Schema for updating a subject"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    description: Optional[str] = None
    credits: Optional[int] = Field(None, ge=1, le=10)
    subject_type: Optional[str] = Field(None, max_length=30)
    group_id: Optional[int] = None


class SubjectResponse(SubjectBase):
    """Schema for subject response"""
    id: int
    tenant_id: str
    group_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubjectListItem(BaseModel):
    """Schema for subject list item"""
    id: int
    name: str
    code: str
    credits: int
    subject_type: str = "theory"
    group_id: Optional[int] = None
    group_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectListResponse(BaseModel):
    """Schema for paginated subject list"""
    subjects: list[SubjectListItem]
    total: int
    skip: int
    limit: int


# ─── Class-Subject Assignment Schemas ────────────────────────────────────

class ClassSubjectCreate(BaseModel):
    """Schema for assigning a subject to a class"""
    teacher_id: Optional[int] = None


class ClassSubjectInfo(BaseModel):
    """Schema for class-subject assignment info"""
    id: int
    subject_id: int
    subject_name: str
    subject_code: str
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClassSubjectsResponse(BaseModel):
    """Schema for listing subjects assigned to a class"""
    class_id: int
    class_name: str
    subjects: list[ClassSubjectInfo]
    total: int
