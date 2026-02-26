from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    """User role enumeration."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"


class Tenant(Base):
    """Tenant model for multi-tenancy support."""
    
    __tablename__ = "tenants"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="tenant")


class User(BaseModel):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # Use String instead of Enum for SQLite compat
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Relationship with tenant
    tenant = relationship("Tenant", back_populates="users",
                          foreign_keys="User.tenant_id",
                          primaryjoin="User.tenant_id == Tenant.id")
    
    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"
