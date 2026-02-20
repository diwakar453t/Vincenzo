from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime


class StudentBase(BaseModel):
    """Base schema for Student"""
    student_id: str = Field(..., min_length=1, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., pattern="^(male|female|other)$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    enrollment_date: date
    class_id: Optional[int] = None  
    parent_id: Optional[int] = None
    status: str = Field(default="active", pattern="^(active|inactive|graduated|transferred|expelled)$")
    photo_url: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    medical_info: Optional[str] = None


class StudentCreate(StudentBase):
    """Schema for creating a student"""
    pass


class StudentUpdate(BaseModel):
    """Schema for updating a student"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    class_id: Optional[int] = None
    parent_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|graduated|transferred|expelled)$")
    photo_url: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    medical_info: Optional[str] = None


class StudentResponse(StudentBase):
    """Schema for student response"""
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    full_name: str

    class Config:
        from_attributes = True


class StudentListItem(BaseModel):
    """Schema for student list item (simplified)"""
    id: int
    student_id: str
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    class_id: Optional[int]
    status: str
    enrollment_date: date

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    """Schema for paginated student list"""
    students: list[StudentListItem]
    total: int
    skip: int
    limit: int
