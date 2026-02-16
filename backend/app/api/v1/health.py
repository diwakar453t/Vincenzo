"""Health check router for PreSkool ERP."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check including database and cache."""
    health_status = {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "components": {}
    }
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        health_status["components"]["database"] = "healthy"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["components"]["database"] = f"unhealthy: {str(e)}"
    
    # Check Redis (optional, don't fail if unavailable)
    try:
        import redis
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        health_status["components"]["cache"] = "healthy"
    except Exception:
        health_status["components"]["cache"] = "unavailable (optional for local dev)"
    
    return health_status


@router.get("/status")
async def status():
    """API status endpoint."""
    return {
        "api": "PreSkool ERP API",
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "documentation": "/docs"
    }
