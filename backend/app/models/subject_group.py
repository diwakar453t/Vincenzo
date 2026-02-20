from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SubjectGroup(BaseModel):
    """Subject Group model for organizing subjects into groups (e.g., Science, Arts)."""

    __tablename__ = "subject_groups"

    # Basic Information
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    subjects = relationship("Subject", back_populates="group")

    def __repr__(self):
        return f"<SubjectGroup(name='{self.name}')>"
