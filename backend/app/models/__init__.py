# Import all models here to ensure they are registered with SQLAlchemy
from app.models.base import BaseModel
from app.models.user import User, Tenant, UserRole

__all__ = ["BaseModel", "User", "Tenant", "UserRole"]
