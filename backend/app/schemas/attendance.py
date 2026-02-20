from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class AttendanceStatusEnum(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    EXCUSED = "excused"


# ─── Student Attendance ─────────────────────────────────────────────────

class StudentAttendanceCreate(BaseModel):
    student_id: int
    class_id: int
    date: date
    status: AttendanceStatusEnum = AttendanceStatusEnum.PRESENT
    remarks: Optional[str] = None
    academic_year: str = "2025-26"


class StudentAttendanceBulk(BaseModel):
    """Bulk mark attendance for a class on a date."""
    class_id: int
    date: date
    academic_year: str = "2025-26"
    entries: List[dict]   # [{ student_id, status, remarks? }]


class StudentAttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatusEnum] = None
    remarks: Optional[str] = None


class StudentAttendanceResponse(BaseModel):
    id: int
    tenant_id: str
    student_id: int
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    date: date
    status: str
    remarks: Optional[str] = None
    academic_year: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentAttendanceListResponse(BaseModel):
    records: List[StudentAttendanceResponse]
    total: int


# ─── Staff Attendance ───────────────────────────────────────────────────

class StaffAttendanceCreate(BaseModel):
    teacher_id: int
    date: date
    status: AttendanceStatusEnum = AttendanceStatusEnum.PRESENT
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None


class StaffAttendanceBulk(BaseModel):
    """Bulk mark staff attendance for a date."""
    date: date
    entries: List[dict]   # [{ teacher_id, status, check_in?, check_out?, remarks? }]


class StaffAttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatusEnum] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None


class StaffAttendanceResponse(BaseModel):
    id: int
    tenant_id: str
    teacher_id: int
    teacher_name: Optional[str] = None
    date: date
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StaffAttendanceListResponse(BaseModel):
    records: List[StaffAttendanceResponse]
    total: int


# ─── Statistics & Reports ───────────────────────────────────────────────

class AttendanceStats(BaseModel):
    total_days: int
    present: int
    absent: int
    late: int
    half_day: int
    excused: int
    percentage: float


class StudentAttendanceReport(BaseModel):
    student_id: int
    student_name: str
    admission_number: Optional[str] = None
    class_name: Optional[str] = None
    stats: AttendanceStats


class ClassAttendanceReport(BaseModel):
    class_id: int
    class_name: str
    date: date
    total_students: int
    present: int
    absent: int
    late: int
    half_day: int
    excused: int
    percentage: float


class MonthlyAttendanceDay(BaseModel):
    date: date
    status: Optional[str] = None


class MonthlyAttendanceResponse(BaseModel):
    student_id: Optional[int] = None
    teacher_id: Optional[int] = None
    name: str
    month: int
    year: int
    days: List[MonthlyAttendanceDay]
    stats: AttendanceStats
