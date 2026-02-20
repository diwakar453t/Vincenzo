from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Period Schemas ────────────────────────────────────────────────────

class PeriodBase(BaseModel):
    day_of_week: str = Field(..., max_length=15)
    start_time: str = Field(..., max_length=10)  # HH:MM
    end_time: str = Field(..., max_length=10)
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    period_type: str = Field(default="class", max_length=20)  # class, break, lunch, free


class PeriodCreate(PeriodBase):
    pass


class PeriodUpdate(BaseModel):
    day_of_week: Optional[str] = Field(None, max_length=15)
    start_time: Optional[str] = Field(None, max_length=10)
    end_time: Optional[str] = Field(None, max_length=10)
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    period_type: Optional[str] = Field(None, max_length=20)


class PeriodResponse(PeriodBase):
    id: int
    timetable_id: int
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None
    room_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Timetable Schemas ─────────────────────────────────────────────────

class TimetableBase(BaseModel):
    class_id: int
    academic_year: str = Field(..., max_length=20)
    name: Optional[str] = Field(None, max_length=200)
    status: str = Field(default="draft", max_length=20)


class TimetableCreate(TimetableBase):
    pass


class TimetableUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    status: Optional[str] = Field(None, max_length=20)


class TimetableListItem(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    academic_year: str
    name: Optional[str] = None
    status: str
    total_periods: int = 0

    class Config:
        from_attributes = True


class TimetableResponse(TimetableBase):
    id: int
    tenant_id: str
    class_name: Optional[str] = None
    periods: List[PeriodResponse] = []
    total_periods: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimetableListResponse(BaseModel):
    timetables: List[TimetableListItem]
    total: int


# ─── Conflict Schema ──────────────────────────────────────────────────

class ConflictItem(BaseModel):
    type: str  # teacher_conflict, room_conflict
    message: str
    day_of_week: str
    start_time: str
    end_time: str
    conflicting_class: Optional[str] = None


class ConflictCheckResponse(BaseModel):
    has_conflicts: bool
    conflicts: List[ConflictItem] = []


# ─── Bulk Period Creation ──────────────────────────────────────────────

class BulkPeriodsCreate(BaseModel):
    periods: List[PeriodCreate]
