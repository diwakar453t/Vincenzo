from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging_config import setup_logging
from app.core.middleware import (
    LoggingMiddleware,
    TenantMiddleware,
    ExceptionHandlerMiddleware
)
from app.api.v1 import api_router

# Set up logging
logger = setup_logging()

# Import all models so they register with Base
from app.models.user import User, Tenant  # noqa: E402

# Create database tables automatically for local dev
Base.metadata.create_all(bind=engine)
logger.info("💾 Database tables created/verified")


# Initialize FastAPI app with enhanced metadata
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## PreSkool ERP - Comprehensive School/College Management System
    
    A modern, multi-tenant ERP platform for educational institutions with:
    
    * 🔐 **Role-based authentication** (Admin, Teacher, Student, Parent)
    * 📊 **Interactive dashboards** with real-time data
    * 👥 **People management** (Students, Teachers, Guardians)
    * 📚 **Academic management** (Classes, Subjects, Timetables, Exams)
    * 💼 **HRM** (Attendance, Leave, Payroll)
    * 💰 **Fees management** with payment integration
    * 📖 **Library, Hostel, Transport** management
    * 📈 **Comprehensive reporting** system
    
    ### Authentication
    Most endpoints require authentication via Bearer token.
    
    ### Multi-Tenancy
    Include `X-Tenant-ID` header in requests to specify the tenant context.
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "PreSkool Support",
        "email": "support@preskool.local",
    },
    license_info={
        "name": "MIT",
    },
)

# Add middleware (order matters!)
# 1. Exception handler (first to catch all exceptions)
app.add_middleware(ExceptionHandlerMiddleware)

# 2. CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Trusted host middleware (security)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.preskool.local", "localhost"]
    )

# 4. Tenant middleware
app.add_middleware(TenantMiddleware)

# 5. Logging middleware (last to log everything)
app.add_middleware(LoggingMiddleware)

# Include API routers
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting up...")
    logger.info(f"📝 API documentation available at /docs")
    logger.info(f"🔧 Environment: {'Development' if settings.DEBUG else 'Production'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info(f"👋 {settings.APP_NAME} shutting down...")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "api": {
            "v1": "/api/v1"
        }
    }

