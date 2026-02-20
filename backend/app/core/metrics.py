"""
Application Metrics Module — Prometheus instrumentation for PreSkool ERP.

Provides:
- HTTP request metrics (latency histogram, request counter, in-flight gauge)
- Database metrics (query duration, pool utilization, tenant query count)
- Business KPIs (active users, API calls per tenant, fee collections)
- System metrics (Python GC, process CPU/memory)
- Custom /metrics endpoint for Prometheus scraping

Scaled for 200+ colleges: per-tenant labels where critical, aggregated where not.
"""
import time
import logging
from typing import Callable
from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info,
    generate_latest, CONTENT_TYPE_LATEST, REGISTRY,
    CollectorRegistry,
)
from prometheus_client.multiprocess import MultiProcessCollector
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match

logger = logging.getLogger("preskool.metrics")

# ═══════════════════════════════════════════════════════════════════════
# HTTP Metrics
# ═══════════════════════════════════════════════════════════════════════

HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    labelnames=["method", "path_template", "status_code"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=["method", "path_template", "status_code"],
)

HTTP_REQUESTS_IN_FLIGHT = Gauge(
    "http_requests_in_flight",
    "Number of HTTP requests currently being processed",
    labelnames=["method"],
)

HTTP_REQUEST_SIZE = Summary(
    "http_request_size_bytes",
    "HTTP request body size in bytes",
    labelnames=["method"],
)

HTTP_RESPONSE_SIZE = Summary(
    "http_response_size_bytes",
    "HTTP response body size in bytes",
    labelnames=["method"],
)

# ═══════════════════════════════════════════════════════════════════════
# Database Metrics
# ═══════════════════════════════════════════════════════════════════════

DB_QUERY_DURATION = Histogram(
    "db_query_duration_seconds",
    "Database query execution time",
    labelnames=["operation"],  # select, insert, update, delete
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 5.0],
)

DB_CONNECTIONS_ACTIVE = Gauge(
    "db_connections_active",
    "Number of active database connections",
)

DB_CONNECTIONS_POOL_SIZE = Gauge(
    "db_connections_pool_size",
    "Database connection pool size",
)

DB_CONNECTIONS_OVERFLOW = Gauge(
    "db_connections_overflow",
    "Number of overflow connections beyond pool size",
)

# ═══════════════════════════════════════════════════════════════════════
# Application / Business KPIs
# ═══════════════════════════════════════════════════════════════════════

TENANT_REQUESTS = Counter(
    "tenant_requests_total",
    "Total API requests per tenant (college)",
    labelnames=["tenant_id"],
)

ACTIVE_TENANTS = Gauge(
    "active_tenants",
    "Number of active tenants (colleges) with requests in last 5 minutes",
)

AUTH_ATTEMPTS = Counter(
    "auth_attempts_total",
    "Authentication attempts",
    labelnames=["result"],  # success, failure
)

AUTH_ACTIVE_SESSIONS = Gauge(
    "auth_active_sessions",
    "Number of active user sessions",
)

STUDENT_COUNT = Gauge(
    "student_count",
    "Total number of students",
    labelnames=["tenant_id"],
)

TEACHER_COUNT = Gauge(
    "teacher_count",
    "Total number of teachers",
    labelnames=["tenant_id"],
)

FEE_COLLECTIONS = Counter(
    "fee_collections_total",
    "Total fee amount collected (in paise/cents)",
    labelnames=["tenant_id", "payment_method"],
)

ATTENDANCE_MARKED = Counter(
    "attendance_marked_total",
    "Total attendance records marked",
    labelnames=["tenant_id", "status"],  # present, absent, late
)

# ═══════════════════════════════════════════════════════════════════════
# Cache Metrics
# ═══════════════════════════════════════════════════════════════════════

CACHE_HITS = Counter(
    "cache_hits_total",
    "Redis/in-memory cache hits",
    labelnames=["cache_type"],  # redis, tenant_cache
)

CACHE_MISSES = Counter(
    "cache_misses_total",
    "Redis/in-memory cache misses",
    labelnames=["cache_type"],
)

# ═══════════════════════════════════════════════════════════════════════
# Application Info
# ═══════════════════════════════════════════════════════════════════════

APP_INFO = Info(
    "preskool_app",
    "PreSkool ERP application information",
)

APP_STARTUP_TIME = Gauge(
    "app_startup_timestamp_seconds",
    "Application startup Unix timestamp",
)


# ═══════════════════════════════════════════════════════════════════════
# Middleware: Auto-instrument HTTP endpoints
# ═══════════════════════════════════════════════════════════════════════

def _get_path_template(request: Request) -> str:
    """
    Extract route path template (e.g., /api/v1/students/{id})
    instead of actual path to prevent cardinality explosion.
    """
    for route in request.app.routes:
        match, _ = route.matches(request.scope)
        if match == Match.FULL:
            return getattr(route, "path", request.url.path)
    return request.url.path


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Auto-instrument all HTTP requests with Prometheus metrics.
    Low overhead: ~0.1ms per request.
    """

    EXCLUDED_PATHS = frozenset({"/metrics", "/healthz", "/ready"})

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint itself
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        method = request.method
        path_template = _get_path_template(request)

        # Track in-flight
        HTTP_REQUESTS_IN_FLIGHT.labels(method=method).inc()

        # Request size
        content_length = request.headers.get("content-length")
        if content_length:
            HTTP_REQUEST_SIZE.labels(method=method).observe(int(content_length))

        # Track tenant requests
        tenant_id = getattr(request.state, "tenant_id", None)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            status = str(response.status_code)
        except Exception:
            status = "500"
            raise
        finally:
            duration = time.perf_counter() - start

            # Record metrics
            HTTP_REQUEST_DURATION.labels(
                method=method, path_template=path_template, status_code=status,
            ).observe(duration)

            HTTP_REQUESTS_TOTAL.labels(
                method=method, path_template=path_template, status_code=status,
            ).inc()

            HTTP_REQUESTS_IN_FLIGHT.labels(method=method).dec()

            # Per-tenant counter (only for API paths to limit cardinality)
            if tenant_id and path_template.startswith("/api/"):
                TENANT_REQUESTS.labels(tenant_id=tenant_id).inc()

        # Response size
        resp_size = response.headers.get("content-length")
        if resp_size:
            HTTP_RESPONSE_SIZE.labels(method=method).observe(int(resp_size))

        return response


# ═══════════════════════════════════════════════════════════════════════
# /metrics endpoint
# ═══════════════════════════════════════════════════════════════════════

async def metrics_endpoint(request: Request) -> Response:
    """Prometheus scrape endpoint."""
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST,
    )


# ═══════════════════════════════════════════════════════════════════════
# Setup function
# ═══════════════════════════════════════════════════════════════════════

def setup_metrics(app: FastAPI):
    """
    Initialize Prometheus metrics for the FastAPI app.
    Called once during application startup.
    """
    from app.core.config import settings

    # Set app info
    APP_INFO.info({
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "service": "preskool-backend",
    })
    APP_STARTUP_TIME.set(time.time())

    # Add middleware
    app.add_middleware(PrometheusMiddleware)

    # Add /metrics endpoint
    app.add_route("/metrics", metrics_endpoint, methods=["GET"])

    logger.info("📊 Prometheus metrics initialized — /metrics endpoint active")
