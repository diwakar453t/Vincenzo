"""
Plugin Model & DB persistence
"""
from sqlalchemy import Column, String, Integer, Text, Boolean, JSON, DateTime
from app.models.base import BaseModel


class PluginRecord(BaseModel):
    __tablename__ = "plugin_records"

    name = Column(String(100), nullable=False, unique=True)
    version = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    author = Column(String(100), nullable=True)
    category = Column(String(50), default="general")
    icon = Column(String(10), default="🔌")
    status = Column(String(20), default="installed", nullable=False)
    config = Column(JSON, nullable=True)
    is_builtin = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<PluginRecord(name={self.name}, status={self.status})>"
