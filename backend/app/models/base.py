from sqlalchemy import Column, Integer, DateTime, String
from sqlalchemy.sql import func
from app.core.database import Base


class BaseModel(Base):
    """Base model with common fields for all tables."""
    
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(50), index=True, nullable=False)  # For multi-tenancy
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"
