from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class ParentProfileResponse(BaseModel):
    """Parent profile information"""
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    occupation: Optional[str]
    user_id: int
    
    class Config:
        from_attributes = True


class ParentChildInfo(BaseModel):
    """Basic child information for parent view"""
    id: int
    student_id: str
    full_name: str
    class_name: str
    grade_level: int
    section: str
    photo_url: Optional[str]
    status: str
    attendance_percentage: float


class ChildDetailedInfo(BaseModel):
    """Detailed child profile"""
    id: int
    student_id: str
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    date_of_birth: date
    gender: str
    class_id: int
    class_name: str
    grade_level: int
    section: str
    enrollment_date: date
    status: str
    address: Optional[str]
    photo_url: Optional[str]
    blood_group: Optional[str]
    medical_info: Optional[str]


class ChildGradeItem(BaseModel):
    """Individual grade entry"""
    subject_name: str
    subject_code: str
    term: str
    marks_obtained: float
    total_marks: float
    percentage: float
    grade: str
    remarks: Optional[str]


class ChildGradeReport(BaseModel):
    """Complete grade report for a child"""
    student_id: int
    student_name: str
    class_name: str
    academic_year: str
    term: str
    grades: List[ChildGradeItem]
    overall_percentage: float
    overall_grade: str
    gpa: float
    rank: Optional[int]
    total_students: Optional[int]


class ChildAttendanceDay(BaseModel):
    """Single day attendance record"""
    date: date
    status: str  # present, absent, late, holiday
    remarks: Optional[str]


class ChildAttendanceSummary(BaseModel):
    """Attendance summary for a child"""
    student_id: int
    student_name: str
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    attendance_percentage: float
    recent_records: List[ChildAttendanceDay]


class ChildAssignmentInfo(BaseModel):
    """Assignment information for parent view"""
    id: int
    title: str
    description: Optional[str]
    subject_name: str
    assigned_date: date
    due_date: date
    total_marks: float
    status: str  # pending, submitted, graded
    submitted_date: Optional[date]
    marks_obtained: Optional[float]
    teacher_remarks: Optional[str]


class FeeItem(BaseModel):
    """Individual fee item"""
    fee_type: str
    amount: float
    due_date: date
    status: str  # paid, pending, overdue
    paid_date: Optional[date]
    payment_method: Optional[str]
    receipt_number: Optional[str]


class FeePaymentStatus(BaseModel):
    """Complete fee payment status"""
    student_id: int
    student_name: str
    academic_year: str
    total_fee: float
    paid_amount: float
    pending_amount: float
    payment_items: List[FeeItem]


class NotificationItem(BaseModel):
    """School notification"""
    id: int
    title: str
    message: str
    category: str  # academic, event, fee, general
    date: date
    is_read: bool


class ParentUpdateProfile(BaseModel):
    """Fields that parent can update"""
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    occupation: Optional[str] = Field(None, max_length=100)
