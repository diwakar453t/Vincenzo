from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class LeaveStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApplicantTypeEnum(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"


# ─── Leave Type ──────────────────────────────────────────────────────────

class LeaveTypeCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    max_days_per_year: int = 12
    is_paid: bool = True
    is_active: bool = True
    applies_to: ApplicantTypeEnum = ApplicantTypeEnum.TEACHER
    color: str = "#3D5EE1"


class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    max_days_per_year: Optional[int] = None
    is_paid: Optional[bool] = None
    is_active: Optional[bool] = None
    applies_to: Optional[ApplicantTypeEnum] = None
    color: Optional[str] = None


class LeaveTypeResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    max_days_per_year: int
    is_paid: bool
    is_active: bool
    applies_to: str
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaveTypeListResponse(BaseModel):
    leave_types: List[LeaveTypeResponse]
    total: int


# ─── Leave Application ──────────────────────────────────────────────────

class LeaveApplicationCreate(BaseModel):
    applicant_type: ApplicantTypeEnum
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None
    leave_type_id: int
    start_date: date
    end_date: date
    reason: str
    academic_year: str = "2025-26"


class LeaveActionRequest(BaseModel):
    status: LeaveStatusEnum
    admin_remarks: Optional[str] = None


class LeaveApplicationResponse(BaseModel):
    id: int
    tenant_id: str
    applicant_type: str
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None
    applicant_name: Optional[str] = None
    leave_type_id: int
    leave_type_name: Optional[str] = None
    leave_type_color: Optional[str] = None
    start_date: date
    end_date: date
    days: float
    reason: str
    status: str
    admin_remarks: Optional[str] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    academic_year: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaveApplicationListResponse(BaseModel):
    applications: List[LeaveApplicationResponse]
    total: int


# ─── Leave Balance ───────────────────────────────────────────────────────

class LeaveBalanceItem(BaseModel):
    leave_type_id: int
    leave_type_name: str
    color: str
    max_days: int
    used_days: float
    remaining_days: float
    pending_days: float


class LeaveBalanceResponse(BaseModel):
    applicant_type: str
    applicant_id: int
    applicant_name: str
    academic_year: str
    balances: List[LeaveBalanceItem]


# ─── Calendar ────────────────────────────────────────────────────────────

class LeaveCalendarEvent(BaseModel):
    id: int
    applicant_name: str
    leave_type_name: str
    color: str
    start_date: date
    end_date: date
    days: float
    status: str
