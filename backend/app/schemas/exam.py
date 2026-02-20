from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


# ─── ExamSchedule Schemas ──────────────────────────────────────────────

class ExamScheduleBase(BaseModel):
    subject_id: int
    exam_date: date
    start_time: str = Field(..., max_length=10)
    end_time: str = Field(..., max_length=10)
    room_id: Optional[int] = None
    max_marks: float = 100
    passing_marks: float = 35
    instructions: Optional[str] = None


class ExamScheduleCreate(ExamScheduleBase):
    pass


class ExamScheduleUpdate(BaseModel):
    subject_id: Optional[int] = None
    exam_date: Optional[date] = None
    start_time: Optional[str] = Field(None, max_length=10)
    end_time: Optional[str] = Field(None, max_length=10)
    room_id: Optional[int] = None
    max_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    instructions: Optional[str] = None


class ExamScheduleResponse(ExamScheduleBase):
    id: int
    exam_id: int
    subject_name: Optional[str] = None
    room_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Exam Schemas ──────────────────────────────────────────────────────

class ExamBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    exam_type: str = Field(default="mid_term", max_length=30)
    academic_year: str = Field(..., max_length=20)
    status: str = Field(default="upcoming", max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    class_id: int
    total_marks: float = 100
    passing_marks: float = 35


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    exam_type: Optional[str] = Field(None, max_length=30)
    status: Optional[str] = Field(None, max_length=20)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_marks: Optional[float] = None
    passing_marks: Optional[float] = None


class ExamListItem(BaseModel):
    id: int
    name: str
    exam_type: str
    academic_year: str
    status: str
    class_id: int
    class_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_marks: float
    passing_marks: float
    schedule_count: int = 0

    class Config:
        from_attributes = True


class ExamResponse(ExamBase):
    id: int
    tenant_id: str
    class_name: Optional[str] = None
    schedules: List[ExamScheduleResponse] = []
    schedule_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExamListResponse(BaseModel):
    exams: List[ExamListItem]
    total: int


# ─── Calendar view ─────────────────────────────────────────────────────

class CalendarEvent(BaseModel):
    id: int
    exam_id: int
    exam_name: str
    subject_name: str
    class_name: Optional[str] = None
    exam_date: date
    start_time: str
    end_time: str
    room_name: Optional[str] = None
    exam_type: str
    status: str


class ExamCalendarResponse(BaseModel):
    events: List[CalendarEvent]
