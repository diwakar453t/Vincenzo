import enum
from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ExamType(str, enum.Enum):
    UNIT_TEST = "unit_test"
    MID_TERM = "mid_term"
    FINAL = "final"
    PRACTICAL = "practical"
    ASSIGNMENT = "assignment"
    OTHER = "other"


class ExamStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Exam(BaseModel):
    """Exam — a named exam event (e.g. Mid-Term 2025-26)."""

    __tablename__ = "exams"

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    exam_type = Column(String(30), default=ExamType.MID_TERM.value, nullable=False)
    academic_year = Column(String(20), nullable=False)
    status = Column(String(20), default=ExamStatus.UPCOMING.value, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    total_marks = Column(Float, default=100, nullable=False)
    passing_marks = Column(Float, default=35, nullable=False)

    # Relationships
    class_ref = relationship("Class", backref="exams")
    schedules = relationship("ExamSchedule", back_populates="exam", cascade="all, delete-orphan",
                             order_by="ExamSchedule.exam_date")

    def __repr__(self):
        return f"<Exam(name='{self.name}', type='{self.exam_type}')>"


class ExamSchedule(BaseModel):
    """Individual subject schedule within an exam."""

    __tablename__ = "exam_schedules"

    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)   # HH:MM
    end_time = Column(String(10), nullable=False)      # HH:MM
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    max_marks = Column(Float, default=100, nullable=False)
    passing_marks = Column(Float, default=35, nullable=False)
    instructions = Column(Text, nullable=True)

    # Relationships
    exam = relationship("Exam", back_populates="schedules")
    subject = relationship("Subject", backref="exam_schedules")
    room = relationship("Room", backref="exam_schedules")

    def __repr__(self):
        return f"<ExamSchedule(exam_id={self.exam_id}, subject_id={self.subject_id}, date={self.exam_date})>"
