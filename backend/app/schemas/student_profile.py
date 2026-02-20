from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime


class StudentProfileResponse(BaseModel):
    """Student profile information"""
    id: int
    student_id: str
    first_name: str
    last_name: str
    full_name: str
    date_of_birth: date
    gender: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    enrollment_date: date
    status: str
    photo_url: Optional[str]
    emergency_contact: Optional[str]
    emergency_contact_name: Optional[str]
    class_id: Optional[int]
    class_name: Optional[str]
    
    class Config:
        from_attributes = True


class StudentClassInfo(BaseModel):
    """Information about a class the student is enrolled in"""
    id: int
    name: str
    grade_level: int
    section: str
    room_number: Optional[str]
    class_teacher_name: Optional[str]
    subjects: List[str] = []


class StudentScheduleItem(BaseModel):
    """A single schedule/timetable entry"""
    day: str  # Monday, Tuesday, etc.
    period: int
    start_time: str
    end_time: str
    subject_name: str
    subject_code: str
    teacher_name: str
    room_number: Optional[str]


class StudentGradeItem(BaseModel):
    """A grade/mark for a subject"""
    subject_name: str
    subject_code: str
    term: str  # "Term 1", "Mid-term", etc.
    marks_obtained: float
    total_marks: float
    percentage: float
    grade: str  # A+, A, B+, etc.
    remarks: Optional[str]
    date: date


class StudentAssignment(BaseModel):
    """Assignment information"""
    id: int
    title: str
    subject_name: str
    subject_code: str
    description: Optional[str]
    due_date: date
    assigned_date: date
    status: str  # "pending", "submitted", "overdue"
    submission_date: Optional[date]
    marks_obtained: Optional[float]
    total_marks: float
    teacher_name: str


class StudentAttendanceSummary(BaseModel):
    """Attendance summary for student"""
    total_days: int
    present_days: int
    absent_days: int
    leave_days: int
    attendance_percentage: float
    subject_wise_attendance: List[dict]  # [{subject, present, total, percentage}]
    recent_records: List[dict]  # [{date, status, subject}]


class StudentUpdateProfile(BaseModel):
    """Fields that student can update in their profile"""
    phone: Optional[str] = Field(None, max_length=20)
    photo_url: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)


class StudentGradesResponse(BaseModel):
    """Response containing all grades"""
    grades: List[StudentGradeItem]
    gpa: float
    overall_percentage: float
    rank: Optional[int] = None


class StudentAssignmentsResponse(BaseModel):
    """Response containing assignments"""
    assignments: List[StudentAssignment]
    total: int
    pending_count: int
    submitted_count: int
    overdue_count: int
