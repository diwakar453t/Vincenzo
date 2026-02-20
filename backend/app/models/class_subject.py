from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ClassSubject(BaseModel):
    """Association model for Class-Subject-Teacher relationship."""
    
    __tablename__ = "class_subjects"
    
    # Relationships
    class_id = Column(Integer, ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    teacher_id = Column(Integer, ForeignKey('teachers.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    class_obj = relationship("Class", back_populates="class_subjects")
    subject = relationship("Subject", back_populates="class_subjects")
    teacher = relationship("Teacher", back_populates="class_subjects")
    
    def __repr__(self):
        return f"<ClassSubject(class_id={self.class_id}, subject_id={self.subject_id}, teacher_id={self.teacher_id})>"
