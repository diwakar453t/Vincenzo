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
    ExceptionHandlerMiddleware,
)
from app.core.metrics import setup_metrics
from app.core.tracing import setup_tracing
from app.core.security import setup_security
from app.api.v1 import api_router

# Set up logging
logger = setup_logging()

# Import all models so they register with Base
import app.models  # noqa: F401 — registers all ORM models with Base.metadata

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
    # Enable Swagger docs in all environments for API verification
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    redirect_slashes=False,
    contact={
        "name": "PreSkool Support",
        "email": "support@preskool.com",
    },
    license_info={"name": "MIT"},
)

# Add middleware (order matters — LAST added runs FIRST in request pipeline!)
# 1. Exception handler (catches all exceptions)
app.add_middleware(ExceptionHandlerMiddleware)

# 2. Trusted host middleware (security)
# Issue 7: Use settings.ALLOWED_HOSTS which includes production domains.
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

# 3. Tenant middleware
app.add_middleware(TenantMiddleware)

# 4. Logging middleware
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

# CORS middleware — must be added LAST so it runs FIRST in request pipeline
# This ensures OPTIONS preflight requests are handled before any other middleware
cors_origins = (
    settings.CORS_ORIGINS
    if settings.APP_ENV == "development"
    else settings.CORS_PRODUCTION_ORIGINS
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    max_age=settings.CORS_MAX_AGE,
)

# Mount uploads directory for serving syllabus documents
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    # Validate security configuration before accepting traffic
    settings.validate_jwt_secret()

    # Auto-create tables for local SQLite development only.
    # In production (PostgreSQL), Alembic handles schema via `alembic upgrade head`.
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    if is_sqlite:
        from app.core.database import engine, Base
        Base.metadata.create_all(bind=engine)
        logger.info("💾 SQLite tables created/verified (dev mode)")

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
        base.update(
            {
                "version": settings.APP_VERSION,
                "documentation": {"swagger": "/docs", "redoc": "/redoc"},
                "api": {"v1": "/api/v1"},
            }
        )
    return base


@app.get("/api/v1/debug/test-modules")
def debug_test_modules():
    """Temporary debug endpoint to diagnose 500 errors."""
    from app.core.database import SessionLocal

    results = {}
    db = SessionLocal()
    try:
        # Test hostel
        try:
            from app.services.hostel_service import HostelService

            hostels, total = HostelService(db).get_hostels("demo-school")
            results["hostel"] = {"status": "OK", "count": total}
        except Exception as e:
            results["hostel"] = {
                "status": "ERROR",
                "error": str(e),
                "type": type(e).__name__,
            }

        # Test sports
        try:
            from app.services.sports_service import SportsService

            sports, total = SportsService(db).get_sports("demo-school")
            results["sports"] = {"status": "OK", "count": total}
        except Exception as e:
            results["sports"] = {
                "status": "ERROR",
                "error": str(e),
                "type": type(e).__name__,
            }

        # Test library
        try:
            from app.services.library_service import LibraryService

            books, total = LibraryService(db).get_books("demo-school")
            results["library"] = {"status": "OK", "count": total}
        except Exception as e:
            results["library"] = {
                "status": "ERROR",
                "error": str(e),
                "type": type(e).__name__,
            }

        # Test transport
        try:
            from app.services.transport_service import TransportService

            stats = TransportService(db).get_stats("demo-school")
            results["transport"] = {"status": "OK", "stats": str(stats)[:200]}
        except Exception as e:
            results["transport"] = {
                "status": "ERROR",
                "error": str(e),
                "type": type(e).__name__,
            }

        # Test payments
        try:
            from app.services.payment_service import PaymentService

            stats = PaymentService(db).get_stats("demo-school")
            results["payments"] = {"status": "OK"}
        except Exception as e:
            results["payments"] = {
                "status": "ERROR",
                "error": str(e),
                "type": type(e).__name__,
            }

    finally:
        db.close()
    return results
