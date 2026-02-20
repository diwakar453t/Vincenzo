from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ClassBase(BaseModel):
    """Base schema for Class"""
    name: str = Field(..., min_length=1, max_length=100)
    grade_level: int = Field(..., ge=1, le=12)
    section: str = Field(..., min_length=1, max_length=10)
    academic_year: str = Field(..., min_length=1, max_length=20)
    room_number: Optional[str] = Field(None, max_length=20)
    room_id: Optional[int] = None
    capacity: int = Field(default=40, ge=1, le=100)
    class_teacher_id: Optional[int] = None


class ClassCreate(ClassBase):
    """Schema for creating a class"""
    pass


class ClassUpdate(BaseModel):
    """Schema for updating a class"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    grade_level: Optional[int] = Field(None, ge=1, le=12)
    section: Optional[str] = Field(None, min_length=1, max_length=10)
    academic_year: Optional[str] = Field(None, min_length=1, max_length=20)
    room_number: Optional[str] = Field(None, max_length=20)
    room_id: Optional[int] = None
    capacity: Optional[int] = Field(None, ge=1, le=100)
    class_teacher_id: Optional[int] = None


class ClassResponse(ClassBase):
    """Schema for class response"""
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    display_name: str
    student_count: Optional[int] = 0
    occupancy_percentage: Optional[float] = 0

    class Config:
        from_attributes = True


class ClassListItem(BaseModel):
    """Schema for class list item (simplified)"""
    id: int
    name: str
    grade_level: int
    section: str
    academic_year: str
    room_number: Optional[str]
    room_id: Optional[int] = None
    capacity: int
    class_teacher_id: Optional[int]
    student_count: Optional[int] = 0
    occupancy_percentage: Optional[float] = 0

    class Config:
        from_attributes = True


class ClassListResponse(BaseModel):
    """Schema for paginated class list"""
    classes: list[ClassListItem]
    total: int
    skip: int
    limit: int

