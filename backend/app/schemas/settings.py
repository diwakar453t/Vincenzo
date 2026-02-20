"""
Settings & Configuration schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── School Settings ─────────────────────────────────────────────────────

class SchoolSettingsUpdate(BaseModel):
    school_name: Optional[str] = None
    school_code: Optional[str] = None
    school_logo: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    established_year: Optional[int] = None
    principal_name: Optional[str] = None
    board_affiliation: Optional[str] = None
    school_type: Optional[str] = None


class SchoolSettingsResponse(BaseModel):
    id: int
    tenant_id: str
    school_name: str
    school_code: Optional[str] = None
    school_logo: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    established_year: Optional[int] = None
    principal_name: Optional[str] = None
    board_affiliation: Optional[str] = None
    school_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Academic Year ────────────────────────────────────────────────────────

class AcademicYearCreate(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    is_current: bool = False


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_current: Optional[bool] = None


class AcademicYearResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    start_date: datetime
    end_date: datetime
    is_current: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── System Preferences ──────────────────────────────────────────────────

class PreferenceUpsert(BaseModel):
    key: str
    value: Optional[str] = None
    category: str = "system"
    description: Optional[str] = None
    value_type: str = "string"


class PreferenceResponse(BaseModel):
    id: int
    tenant_id: str
    key: str
    value: Optional[str] = None
    category: str
    description: Optional[str] = None
    value_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BulkPreferenceUpdate(BaseModel):
    preferences: List[PreferenceUpsert]
