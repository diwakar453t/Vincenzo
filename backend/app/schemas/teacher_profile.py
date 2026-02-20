from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


class TeacherProfileResponse(BaseModel):
    """Teacher profile information"""
    id: int
    employee_id: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    specialization: Optional[str]
    qualification: Optional[str]
    status: str
    hire_date: date
    photo_url: Optional[str]
    user_id: int
    
    class Config:
        from_attributes = True


class TeacherClassInfo(BaseModel):
    """Information about a class assigned to teacher"""
    id: int
    name: str
    grade_level: int
    section: str
    room_number: Optional[str]
    student_count: int
    is_class_teacher: bool  # True if this teacher is the class teacher


class TeacherStudentInfo(BaseModel):
    """Student information for teacher's view"""
    id: int
    student_id: str
    full_name: str
    class_name: str
    email: Optional[str]
    phone: Optional[str]
    status: str


class GradeEntry(BaseModel):
    """Grade entry/update schema"""
    student_id: int
    subject_id: int
    class_id: int
    term: str
    marks_obtained: float
    total_marks: float
    grade: str
    remarks: Optional[str]


class AssignmentCreate(BaseModel):
    """Create assignment schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str]
    subject_id: int
    class_id: int
    due_date: date
    total_marks: float


class AssignmentUpdate(BaseModel):
    """Update assignment schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str]
    due_date: Optional[date]
    total_marks: Optional[float]


class AssignmentResponse(BaseModel):
    """Assignment response"""
    id: int
    title: str
    description: Optional[str]
    subject_name: str
    class_name: str
    due_date: date
    total_marks: float
    assigned_date: date
    submission_count: int
    pending_count: int


class AttendanceEntry(BaseModel):
    """Attendance marking schema"""
    class_id: int
    date: date
    attendance_records: List[dict]  # [{"student_id": 1, "status": "present"}]


class TeacherUpdateProfile(BaseModel):
    """Fields that teacher can update in their profile"""
    phone: Optional[str] = Field(None, max_length=20)
    photo_url: Optional[str] = Field(None, max_length=500)


class TeacherScheduleItem(BaseModel):
    """Teaching schedule entry"""
    day: str
    period: int
    start_time: str
    end_time: str
    class_name: str
    subject_name: str
    room_number: Optional[str]
