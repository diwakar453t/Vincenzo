from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal



class TeacherBase(BaseModel):
    """Base schema for Teacher"""
    employee_id: str = Field(..., min_length=1, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., pattern="^(male|female|other)$")
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    hire_date: date
    qualification: Optional[str] = Field(None, max_length=255)
    specialization: Optional[str] = Field(None, max_length=255)
    salary: Optional[Decimal] = None
    status: str = Field(default="active", pattern="^(active|inactive|on_leave|resigned)$")
    photo_url: Optional[str] = Field(None, max_length=500)


class TeacherCreate(TeacherBase):
    """Schema for creating a teacher"""
    user_id: int  # Required for creation


class TeacherUpdate(BaseModel):
    """Schema for updating a teacher"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    qualification: Optional[str] = Field(None, max_length=255)
    specialization: Optional[str] = Field(None, max_length=255)
    salary: Optional[Decimal] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive|on_leave|resigned)$")
    photo_url: Optional[str] = Field(None, max_length=500)


class TeacherResponse(TeacherBase):
    """Schema for teacher response"""
    id: int
    user_id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    full_name: str

    class Config:
        from_attributes = True


class TeacherListItem(BaseModel):
    """Schema for teacher list item (simplified)"""
    id: int
    employee_id: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    specialization: Optional[str]
    status: str
    hire_date: date

    class Config:
        from_attributes = True


class TeacherListResponse(BaseModel):
    """Schema for paginated teacher list"""
    teachers: list[TeacherListItem]
    total: int
    skip: int
    limit: int
