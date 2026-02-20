from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Text, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.core.database import Base
import enum


class StudentStatus(str, enum.Enum):
    """Student status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    GRADUATED = "graduated"
    TRANSFERRED = "transferred"
    EXPELLED = "expelled"


class Gender(str, enum.Enum):
    """Gender enumeration."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Student(BaseModel):
    """Student model for managing student information."""
    
    __tablename__ = "students"
    
    # Basic Information
    student_id = Column(String(50), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)  # Using String for SQLite compatibility
    
    # Contact Information
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    # Academic Information
    enrollment_date = Column(Date, nullable=False)
    class_id = Column(Integer, ForeignKey('classes.id', ondelete='SET NULL'), nullable=True)
    
    # Parent/Guardian Information
    parent_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Additional Information
    status = Column(String(20), default=StudentStatus.ACTIVE.value, nullable=False)
    photo_url = Column(String(500), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    medical_info = Column(Text, nullable=True)
    
    # Relationships
    class_enrolled = relationship("Class", back_populates="students", foreign_keys=[class_id])
    parent = relationship("User", foreign_keys=[parent_id])
    
    def __repr__(self):
        return f"<Student(student_id='{self.student_id}', name='{self.first_name} {self.last_name}')>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
