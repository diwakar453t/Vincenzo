import enum
from sqlalchemy import Column, Integer, String, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class DayOfWeek(str, enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"


class Timetable(BaseModel):
    """
    Timetable model — one timetable per class per academic year.
    Acts as a container for all periods.
    """

    __tablename__ = "timetables"

    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String(20), nullable=False)
    name = Column(String(200), nullable=True)  # e.g. "Grade 10-A Weekly Schedule"
    status = Column(String(20), default="draft", nullable=False)  # draft, active

    # Relationships
    class_ref = relationship("Class", backref="timetables")
    periods = relationship("Period", back_populates="timetable", cascade="all, delete-orphan", order_by="Period.day_of_week, Period.start_time")

    __table_args__ = (
        UniqueConstraint('class_id', 'academic_year', 'tenant_id', name='uq_timetable_class_year_tenant'),
    )

    def __repr__(self):
        return f"<Timetable(class_id={self.class_id}, year='{self.academic_year}')>"


class Period(BaseModel):
    """A single period/slot in a timetable."""

    __tablename__ = "periods"

    timetable_id = Column(Integer, ForeignKey("timetables.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(15), nullable=False)  # monday..saturday
    start_time = Column(String(10), nullable=False)  # HH:MM format
    end_time = Column(String(10), nullable=False)    # HH:MM format
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    period_type = Column(String(20), default="class", nullable=False)  # class, break, lunch, free

    # Relationships
    timetable = relationship("Timetable", back_populates="periods")
    subject = relationship("Subject", backref="periods")
    teacher = relationship("Teacher", backref="periods")
    room = relationship("Room", backref="periods")

    def __repr__(self):
        return f"<Period(day='{self.day_of_week}', time='{self.start_time}-{self.end_time}')>"
