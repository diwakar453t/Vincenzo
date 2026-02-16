"""Custom exception classes for PreSkool ERP."""
from typing import Any, Optional
from fastapi import HTTPException, status


class PreSkoolException(Exception):
    """Base exception class for PreSkool ERP."""
    
    def __init__(self, message: str, status_code: int = 500, details: Optional[Any] = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class NotFoundException(PreSkoolException):
    """Exception raised when a resource is not found."""
    
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier}
        )


class UnauthorizedException(PreSkoolException):
    """Exception raised when authentication fails."""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class ForbiddenException(PreSkoolException):
    """Exception raised when access is forbidden."""
    
    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )


class ValidationException(PreSkoolException):
    """Exception raised when validation fails."""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class TenantNotFoundException(PreSkoolException):
    """Exception raised when tenant is not found."""
    
    def __init__(self, tenant_id: str):
        super().__init__(
            message=f"Tenant '{tenant_id}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"tenant_id": tenant_id}
        )


class DuplicateResourceException(PreSkoolException):
    """Exception raised when attempting to create a duplicate resource."""
    
    def __init__(self, resource: str, field: str, value: Any):
        super().__init__(
            message=f"{resource} with {field}='{value}' already exists",
            status_code=status.HTTP_409_CONFLICT,
            details={"resource": resource, "field": field, "value": value}
        )
