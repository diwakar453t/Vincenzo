import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SyllabusStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"


class Syllabus(BaseModel):
    """Syllabus model — one syllabus per subject+class combination."""

    __tablename__ = "syllabi"

    # Basic Information
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    academic_year = Column(String(20), nullable=False)
    status = Column(String(20), default="draft", nullable=False)  # draft, active, completed

    # Relations
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    subject = relationship("Subject", backref="syllabi")
    class_ref = relationship("Class", backref="syllabi")
    topics = relationship("SyllabusTopic", back_populates="syllabus", cascade="all, delete-orphan", order_by="SyllabusTopic.order")

    def __repr__(self):
        return f"<Syllabus(title='{self.title}')>"


class SyllabusTopic(BaseModel):
    """A single topic/unit within a syllabus."""

    __tablename__ = "syllabus_topics"

    # Content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0, nullable=False)

    # Completion tracking
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_date = Column(Date, nullable=True)

    # Document
    document_path = Column(String(500), nullable=True)
    document_name = Column(String(200), nullable=True)

    # FK
    syllabus_id = Column(Integer, ForeignKey("syllabi.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    syllabus = relationship("Syllabus", back_populates="topics")

    def __repr__(self):
        return f"<SyllabusTopic(title='{self.title}', completed={self.is_completed})>"
