from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Subject(BaseModel):
    """Subject model for managing school subjects."""
    
    __tablename__ = "subjects"
    
    # Basic Information
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    credits = Column(Integer, default=1, nullable=False)
    subject_type = Column(String(30), default="theory", nullable=False)  # theory, practical, elective, lab
    
    # Group
    group_id = Column(Integer, ForeignKey('subject_groups.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    group = relationship("SubjectGroup", back_populates="subjects")
    class_subjects = relationship("ClassSubject", back_populates="subject")
    
    def __repr__(self):
        return f"<Subject(code='{self.code}', name='{self.name}')>"
