from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime


class GuardianBase(BaseModel):
    """Base schema for Guardian"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    email: Optional[EmailStr] = None
    phone: str = Field(..., min_length=1, max_length=20)
    alt_phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    occupation: Optional[str] = Field(None, max_length=255)
    annual_income: Optional[str] = Field(None, max_length=100)
    relationship_type: str = Field(
        default="guardian",
        pattern="^(father|mother|guardian|uncle|aunt|grandparent|sibling|other)$"
    )
    user_id: Optional[int] = None
    status: str = Field(default="active", pattern="^(active|inactive)$")
    photo_url: Optional[str] = Field(None, max_length=500)


class GuardianCreate(GuardianBase):
    """Schema for creating a guardian"""
    student_ids: Optional[List[int]] = None


class GuardianUpdate(BaseModel):
    """Schema for updating a guardian"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    alt_phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    occupation: Optional[str] = Field(None, max_length=255)
    annual_income: Optional[str] = Field(None, max_length=100)
    relationship_type: Optional[str] = Field(
        None, pattern="^(father|mother|guardian|uncle|aunt|grandparent|sibling|other)$"
    )
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")
    photo_url: Optional[str] = Field(None, max_length=500)
    student_ids: Optional[List[int]] = None


class LinkedStudentInfo(BaseModel):
    """Schema for linked student basic info"""
    id: int
    student_id: str
    full_name: str
    class_id: Optional[int] = None
    status: str

    class Config:
        from_attributes = True


class GuardianResponse(GuardianBase):
    """Schema for guardian response"""
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    full_name: str
    linked_students: List[LinkedStudentInfo] = []

    class Config:
        from_attributes = True


class GuardianListItem(BaseModel):
    """Schema for guardian list item (simplified)"""
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str] = None
    phone: str
    relationship_type: str
    status: str
    student_count: int = 0

    class Config:
        from_attributes = True


class GuardianListResponse(BaseModel):
    """Schema for paginated guardian list"""
    guardians: list[GuardianListItem]
    total: int
    skip: int
    limit: int
