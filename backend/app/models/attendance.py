import enum
from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    EXCUSED = "excused"


class StudentAttendance(BaseModel):
    """Daily attendance record for a student."""

    __tablename__ = "student_attendance"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    remarks = Column(Text, nullable=True)
    academic_year = Column(String(20), nullable=False, default="2025-26")

    # Relationships
    student = relationship("Student", backref="attendance_records")
    class_ref = relationship("Class", backref="student_attendance")

    def __repr__(self):
        return f"<StudentAttendance(student={self.student_id}, date={self.date}, status={self.status})>"


class StaffAttendance(BaseModel):
    """Daily attendance record for staff (teachers)."""

    __tablename__ = "staff_attendance"

    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    check_in = Column(String(10), nullable=True)   # HH:MM
    check_out = Column(String(10), nullable=True)   # HH:MM
    remarks = Column(Text, nullable=True)

    # Relationships
    teacher = relationship("Teacher", backref="attendance_records")

    def __repr__(self):
        return f"<StaffAttendance(teacher={self.teacher_id}, date={self.date}, status={self.status})>"
