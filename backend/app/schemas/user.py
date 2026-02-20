"""User schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# --- Request Schemas ---

class UserRegisterRequest(BaseModel):
    """Schema for user registration."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 chars)")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name")
    role: str = Field(default="student", description="User role: admin, teacher, student, parent")
    tenant_id: str = Field(..., description="Tenant identifier")


class UserLoginRequest(BaseModel):
    """Schema for user login."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="Password")


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh."""
    refresh_token: str = Field(..., description="Refresh token")


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password")


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""
    email: str = Field(..., description="Email address associated with the account")


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with token."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password")


# --- Response Schemas ---

class UserResponse(BaseModel):
    """Schema for user response (no password)."""
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response after login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    message: str
    success: bool = True
