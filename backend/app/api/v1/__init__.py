"""API v1 router configuration."""
from fastapi import APIRouter
from app.api.v1 import health

# Create main API v1 router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(health.router, tags=["health"])

# Placeholder for future routers
# api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
# api_router.include_router(students.router, prefix="/students", tags=["students"])
# api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
