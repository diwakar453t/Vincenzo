import enum
from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApplicantType(str, enum.Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class LeaveType(BaseModel):
    """Types of leave (Sick, Casual, Earned, etc.)."""

    __tablename__ = "leave_types"

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    max_days_per_year = Column(Integer, default=12, nullable=False)
    is_paid = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    applies_to = Column(Enum(ApplicantType), default=ApplicantType.TEACHER, nullable=False)
    color = Column(String(10), default="#3D5EE1", nullable=False)

    # Relationships
    applications = relationship("LeaveApplication", back_populates="leave_type")

    def __repr__(self):
        return f"<LeaveType(name='{self.name}', max_days={self.max_days_per_year})>"


class LeaveApplication(BaseModel):
    """Leave application submitted by a teacher or student."""

    __tablename__ = "leave_applications"

    applicant_type = Column(Enum(ApplicantType), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days = Column(Float, default=1, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING, nullable=False)
    admin_remarks = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    academic_year = Column(String(20), nullable=False, default="2025-26")

    # Relationships
    leave_type = relationship("LeaveType", back_populates="applications")
    teacher = relationship("Teacher", backref="leave_applications")
    student = relationship("Student", backref="leave_applications")
    approver = relationship("User", backref="approved_leaves", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<LeaveApplication(type={self.applicant_type}, status={self.status})>"
