from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Department(BaseModel):
    """Organizational department (e.g. Science, Mathematics, Administration)."""

    __tablename__ = "departments"

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    head_teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    parent_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)

    # Relationships
    head_teacher = relationship("Teacher", backref="headed_departments", foreign_keys=[head_teacher_id])
    parent = relationship("Department", remote_side="Department.id", backref="children")
    designations = relationship("Designation", back_populates="department", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Department(name='{self.name}', code='{self.code}')>"


class Designation(BaseModel):
    """Job title / role designation (e.g. HOD, Senior Teacher, Lab Assistant)."""

    __tablename__ = "designations"

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    level = Column(Integer, default=1, nullable=False)   # hierarchy level (1=top)
    is_active = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="designations")

    def __repr__(self):
        return f"<Designation(name='{self.name}', department='{self.department_id}')>"
