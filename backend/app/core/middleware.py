"""
Middleware for PreSkool ERP — optimized for 200+ college multi-tenant SaaS.

TenantMiddleware:
- Extracts tenant from X-Tenant-ID header or subdomain
- Validates tenant exists (with caching to avoid DB hit every request)
- Injects tenant context into request.state for downstream use
- Rejects unknown tenants with 403
"""
import time
import logging
from typing import Callable, Optional, Dict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.exceptions import PreSkoolException
from app.core.config import settings
from app.core.logging_config import (
    current_tenant_id, current_request_id, current_user_id,
    generate_request_id, get_logger,
)

logger = get_logger("middleware")

# ── In-memory tenant cache (avoids DB lookup every request) ───────────
# For 200+ tenants, this cache saves ~40,000 DB queries/min at steady state
_tenant_cache: Dict[str, dict] = {}  # {tenant_id: {"valid": bool, "expires": float}}
TENANT_CACHE_TTL = settings.TENANT_CACHE_TTL  # 300s default

# Public paths that don't require tenant context
PUBLIC_PATHS = frozenset({
    "/", "/docs", "/redoc", "/openapi.json",
    "/api/v1/health", "/api/v1/auth/login", "/api/v1/auth/register",
    "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
})


def _is_public_path(path: str) -> bool:
    """Check if path is public (no tenant required)."""
    if path in PUBLIC_PATHS:
        return True
    if path.startswith("/uploads/") or path.startswith("/static/"):
        return True
    return False


def _get_cached_tenant(tenant_id: str) -> Optional[bool]:
    """Check if tenant is in cache and not expired."""
    entry = _tenant_cache.get(tenant_id)
    if entry and time.time() < entry["expires"]:
        return entry["valid"]
    return None


def _cache_tenant(tenant_id: str, valid: bool):
    """Cache tenant validation result."""
    _tenant_cache[tenant_id] = {
        "valid": valid,
        "expires": time.time() + TENANT_CACHE_TTL,
    }
    # Evict expired entries if cache grows too large
    if len(_tenant_cache) > settings.MAX_TENANTS * 2:
        now = time.time()
        expired = [k for k, v in _tenant_cache.items() if now >= v["expires"]]
        for k in expired:
            del _tenant_cache[k]


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured request/response logging with tenant + request_id context.
    Logs are tenant-tagged for per-college filtering in Loki/CloudWatch.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Generate and set request correlation ID
        request_id = generate_request_id()
        current_request_id.set(request_id)

        # Set tenant context from request state (set by TenantMiddleware)
        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id:
            current_tenant_id.set(tenant_id)

        # Process request
        response = await call_next(request)

        # Calculate processing time
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Structured log with extra fields (picked up by JSONFormatter)
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code} ({duration_ms}ms)",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "-",
            },
        )

        # Headers for tracing
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{duration_ms}ms"
        if tenant_id:
            response.headers["X-Tenant-ID"] = str(tenant_id)

        # Reset context vars
        current_request_id.set(None)
        current_tenant_id.set(None)
        current_user_id.set(None)

        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Multi-tenant isolation middleware for 200+ colleges.

    Tenant detection order:
    1. X-Tenant-ID header (API clients, mobile apps)
    2. Subdomain (college1.erp.preskool.com → tenant_id = "college1")
    3. Query parameter ?tenant_id= (fallback for testing)

    Performance:
    - Tenant validation is cached in-memory (300s TTL)
    - Cache avoids ~200 DB queries/sec at peak load
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip tenant check for public paths
        if _is_public_path(path):
            request.state.tenant_id = None
            return await call_next(request)

        # 1. Extract tenant from header
        tenant_id = request.headers.get(settings.TENANT_HEADER)

        # 2. Try subdomain (college1.erp.preskool.com)
        if not tenant_id:
            host = request.headers.get("host", "")
            parts = host.split(".")
            # Subdomain pattern: {tenant}.erp.preskool.com (4 parts)
            # or {tenant}.localhost (2 parts in dev)
            if len(parts) >= 3 and parts[0] not in ("www", "erp", "api", "staging"):
                tenant_id = parts[0]
            elif len(parts) == 2 and parts[1].startswith("localhost"):
                tenant_id = parts[0] if parts[0] not in ("localhost", "127") else None

        # 3. Query parameter fallback
        if not tenant_id:
            tenant_id = request.query_params.get("tenant_id")

        # No tenant found — reject (except health check)
        if not tenant_id:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Tenant identification required",
                    "detail": f"Provide {settings.TENANT_HEADER} header, "
                              "use subdomain, or pass ?tenant_id= parameter",
                },
            )

        # Validate tenant (cached)
        cached = _get_cached_tenant(tenant_id)
        if cached is False:
            return JSONResponse(
                status_code=403,
                # Issue 8: Generic message — do NOT reveal tenant ID in errors
                content={"error": "Access denied", "detail": "Unknown or inactive tenant"},
            )

        if cached is None:
            # Not in cache — validate against DB
            from app.core.database import SessionLocal
            from app.models.user import Tenant
            db = SessionLocal()
            try:
                tenant = db.query(Tenant).filter(
                    Tenant.id == tenant_id,
                    Tenant.is_active == True
                ).first()
                is_valid = tenant is not None
                _cache_tenant(tenant_id, is_valid)

                if not is_valid:
                    return JSONResponse(
                        status_code=403,
                        # Issue 8: Generic message — do NOT reveal tenant ID in errors
                        content={"error": "Access denied", "detail": "Unknown or inactive tenant"},
                    )
            finally:
                db.close()

        # Store validated tenant in request state
        request.state.tenant_id = tenant_id

        response = await call_next(request)
        return response


class ExceptionHandlerMiddleware(BaseHTTPMiddleware):
    """Global exception handler with tenant context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        except PreSkoolException as exc:
            tenant_id = getattr(request.state, "tenant_id", "-")
            logger.error(f"[{tenant_id}] PreSkool Exception: {exc.message}", exc_info=True)
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": exc.message,
                    "details": exc.details,
                    "status_code": exc.status_code,
                },
            )
        except Exception as exc:
            tenant_id = getattr(request.state, "tenant_id", "-")
            logger.error(f"[{tenant_id}] Unhandled Exception: {str(exc)}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "details": str(exc) if settings.DEBUG else None,
                    "status_code": 500,
                },
            )
