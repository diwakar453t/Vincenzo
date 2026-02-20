import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class GradeCategory(BaseModel):
    """Grading scale definition — e.g. A+ = 90-100, GPA 4.0."""

    __tablename__ = "grade_categories"

    name = Column(String(20), nullable=False)           # e.g. "A+", "A", "B+"
    min_percentage = Column(Float, nullable=False)       # e.g. 90.0
    max_percentage = Column(Float, nullable=False)       # e.g. 100.0
    grade_point = Column(Float, nullable=False)          # e.g. 4.0
    description = Column(String(100), nullable=True)     # e.g. "Outstanding"
    is_passing = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)   # display order

    def __repr__(self):
        return f"<GradeCategory(name='{self.name}', {self.min_percentage}-{self.max_percentage}%)>"


class Grade(BaseModel):
    """Individual student grade for a subject in an exam."""

    __tablename__ = "grades"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String(20), nullable=False)

    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, default=100, nullable=False)
    percentage = Column(Float, nullable=True)            # auto-calculated
    grade_name = Column(String(20), nullable=True)       # resolved from category
    grade_point = Column(Float, nullable=True)           # resolved from category
    remarks = Column(Text, nullable=True)

    # Relationships
    student = relationship("Student", backref="grades")
    exam = relationship("Exam", backref="grades")
    subject = relationship("Subject", backref="grades")
    class_ref = relationship("Class", backref="grades")

    def __repr__(self):
        return f"<Grade(student={self.student_id}, exam={self.exam_id}, subject={self.subject_id}, marks={self.marks_obtained})>"
