import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.core.logging_config import setup_logging
from app.core.middleware import (
    LoggingMiddleware,
    TenantMiddleware,
    ExceptionHandlerMiddleware
)
from app.core.metrics import setup_metrics
from app.core.tracing import setup_tracing
from app.core.security import setup_security
from app.api.v1 import api_router

# Set up logging
logger = setup_logging()

# Import all models so they register with Base
from app.models.user import User, Tenant  # noqa: E402

# Create database tables automatically for local dev
Base.metadata.create_all(bind=engine)
logger.info("💾 Database tables created/verified")

# Initialize Plugin System
from app.plugins.loader import PluginLoader
from app.plugins.registry import get_plugin_registry
from app.core.database import SessionLocal

_plugin_loader = PluginLoader()
get_plugin_registry().context.set_db_factory(SessionLocal)
_loaded = _plugin_loader.discover_and_load(auto_activate=True)
logger.info(f"🔌 Plugins loaded: {_loaded}")


# Initialize FastAPI app with enhanced metadata
_is_dev = settings.APP_ENV == "development"
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PreSkool ERP - Comprehensive School/College Management System",
    # Disable Swagger UI and OpenAPI schema in production
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
    contact={
        "name": "PreSkool Support",
        "email": "support@preskool.com",
    },
    license_info={"name": "MIT"},
)

# Add middleware (order matters!)
# 1. Exception handler (first to catch all exceptions)
app.add_middleware(ExceptionHandlerMiddleware)

# 2. CORS middleware (restrictive in production)
cors_origins = (
    settings.CORS_ORIGINS if settings.APP_ENV == "development"
    else settings.CORS_PRODUCTION_ORIGINS
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    max_age=settings.CORS_MAX_AGE,
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

# Initialize Prometheus metrics (/metrics endpoint + middleware)
setup_metrics(app)

# Initialize OpenTelemetry distributed tracing
if settings.OTEL_ENABLED:
    setup_tracing(app)

# Initialize security middleware (rate limiting, CSRF, headers, input validation)
setup_security(app)

# Mount uploads directory for serving syllabus documents
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    # Validate security configuration before accepting traffic
    settings.validate_jwt_secret()
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting up...")
    logger.info(f"📝 API docs: {'enabled' if _is_dev else 'DISABLED (production)'}")
    logger.info(f"🔧 Environment: {'Development' if settings.DEBUG else 'Production'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info(f"👋 {settings.APP_NAME} shutting down...")


@app.get("/")
async def root():
    """Root endpoint — health check info only (no internal details in production)."""
    base = {"app": settings.APP_NAME, "status": "running"}
    if _is_dev:
        base.update({
            "version": settings.APP_VERSION,
            "documentation": {"swagger": "/docs", "redoc": "/redoc"},
            "api": {"v1": "/api/v1"},
        })
    return base

