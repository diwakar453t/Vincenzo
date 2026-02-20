from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Class(BaseModel):
    """Class model for managing school classes."""
    
    __tablename__ = "classes"
    
    # Basic Information
    name = Column(String(100), nullable=False)  # e.g., "10-A", "9-B"
    grade_level = Column(Integer, nullable=False)  # e.g., 1-12
    section = Column(String(10), nullable=False)  # e.g., "A", "B", "C"
    academic_year = Column(String(20), nullable=False)  # e.g., "2023-2024"
    
    # Room Assignment
    room_number = Column(String(20), nullable=True)  # legacy field for display
    room_id = Column(Integer, ForeignKey('rooms.id', ondelete='SET NULL'), nullable=True)
    capacity = Column(Integer, default=40, nullable=False)
    
    # Class Teacher
    class_teacher_id = Column(Integer, ForeignKey('teachers.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    room = relationship("Room", back_populates="classes", foreign_keys=[room_id])
    class_teacher = relationship("Teacher", back_populates="classes_as_teacher", foreign_keys=[class_teacher_id])
    students = relationship("Student", back_populates="class_enrolled")
    class_subjects = relationship("ClassSubject", back_populates="class_obj")
    
    def __repr__(self):
        return f"<Class(name='{self.name}', grade={self.grade_level}, section='{self.section}')>"
    
    @property
    def display_name(self):
        return f"Grade {self.grade_level} - {self.section}"
    
    @property
    def occupancy_percentage(self):
        student_count = len(self.students) if self.students else 0
        if self.capacity and self.capacity > 0:
            return round((student_count / self.capacity) * 100, 1)
        return 0

