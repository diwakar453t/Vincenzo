from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class TeacherStatus(str, enum.Enum):
    """Teacher status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    RESIGNED = "resigned"


class Teacher(BaseModel):
    """Teacher model for managing teacher information."""
    
    __tablename__ = "teachers"
    
    # Basic Information
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    
    # Contact Information
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    # Employment Information
    hire_date = Column(Date, nullable=False)
    qualification = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    salary = Column(Numeric(10, 2), nullable=True)
    status = Column(String(20), default=TeacherStatus.ACTIVE.value, nullable=False)
    
    # Additional Information
    photo_url = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="teacher_profile")
    classes_as_teacher = relationship("Class", back_populates="class_teacher")
    class_subjects = relationship("ClassSubject", back_populates="teacher")
    
    def __repr__(self):
        return f"<Teacher(employee_id='{self.employee_id}', name='{self.first_name} {self.last_name}')>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
