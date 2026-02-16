"""Base schema classes for PreSkool ERP."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    
    model_config = ConfigDict(from_attributes=True)


class BaseResponseSchema(BaseSchema):
    """Base response schema with common fields."""
    
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime


class HealthResponse(BaseModel):
    """Health check response schema."""
    
    status: str
    app: str
    version: str
    components: Optional[dict] = None


class StatusResponse(BaseModel):
    """API status response schema."""
    
    api: str
    version: str
    environment: str
    documentation: str


class ErrorResponse(BaseModel):
    """Error response schema."""
    
    error: str
    details: Optional[dict] = None
    status_code: int
