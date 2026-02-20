from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class GuardianStatus(str, enum.Enum):
    """Guardian status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"


class Relationship(str, enum.Enum):
    """Relationship to student enumeration."""
    FATHER = "father"
    MOTHER = "mother"
    GUARDIAN = "guardian"
    UNCLE = "uncle"
    AUNT = "aunt"
    GRANDPARENT = "grandparent"
    SIBLING = "sibling"
    OTHER = "other"


# Association table for many-to-many Guardian ↔ Student relationship
guardian_students = Table(
    'guardian_students',
    BaseModel.metadata,
    Column('guardian_id', Integer, ForeignKey('guardians.id', ondelete='CASCADE'), primary_key=True),
    Column('student_id', Integer, ForeignKey('students.id', ondelete='CASCADE'), primary_key=True),
)


class Guardian(BaseModel):
    """Guardian model for managing parent/guardian information."""
    
    __tablename__ = "guardians"
    
    # Basic Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    
    # Contact Information
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(20), nullable=False)
    alt_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    # Professional Information
    occupation = Column(String(255), nullable=True)
    annual_income = Column(String(100), nullable=True)
    
    # Relationship
    relationship_type = Column(String(30), default=Relationship.GUARDIAN.value, nullable=False)
    
    # Account linkage
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, unique=True)
    
    # Additional Information
    status = Column(String(20), default=GuardianStatus.ACTIVE.value, nullable=False)
    photo_url = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="guardian_profile")
    students = relationship("Student", secondary=guardian_students, backref="guardians")
    
    def __repr__(self):
        return f"<Guardian(name='{self.first_name} {self.last_name}')>"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
