"""
OpenTelemetry Distributed Tracing — PreSkool ERP (200+ Colleges).

Provides:
- Auto-instrumentation for FastAPI, SQLAlchemy, Redis, HTTP clients
- Manual spans for critical business operations
- Trace context propagation (W3C TraceContext + B3)
- Tenant-tagged traces for per-college filtering in Jaeger
- Correlation with structured logs (trace_id in log output)
- Export to Jaeger via OTLP (gRPC) or HTTP

Architecture:
    FastAPI Request → OTel Middleware → Auto-span created
        → SQLAlchemy (auto-instrumented) → DB span
        → Redis (auto-instrumented) → Cache span
        → HTTP client calls (auto-instrumented) → External span
    All spans exported → Jaeger Collector → Jaeger UI
"""
import logging
from typing import Optional
from contextvars import ContextVar

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.trace import StatusCode, Status

from app.core.config import settings

logger = logging.getLogger("preskool.tracing")

# ── Tracer singleton ──────────────────────────────────────────────────
_tracer: Optional[trace.Tracer] = None


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance."""
    global _tracer
    if _tracer is None:
        _tracer = trace.get_tracer("preskool-backend", settings.APP_VERSION)
    return _tracer


def setup_tracing(app):
    """
    Initialize OpenTelemetry tracing for the FastAPI application.

    Configures:
    1. TracerProvider with service name and environment
    2. OTLP exporter → Jaeger Collector (gRPC on port 4317)
    3. Auto-instrumentation for FastAPI, SQLAlchemy, Redis, HTTP
    4. W3C TraceContext + B3 propagation
    5. Logging integration (trace_id injected into log records)
    """
    # Skip in test environments
    if settings.APP_ENV == "testing":
        logger.info("⏭️ Tracing disabled in test environment")
        return

    # Resource: identifies this service in Jaeger
    resource = Resource.create({
        SERVICE_NAME: "preskool-backend",
        "service.version": settings.APP_VERSION,
        "deployment.environment": settings.APP_ENV,
        "service.namespace": "preskool",
    })

    # TracerProvider
    provider = TracerProvider(resource=resource)

    # Exporter: send spans to Jaeger via OTLP gRPC
    jaeger_endpoint = getattr(settings, "OTEL_EXPORTER_ENDPOINT", "http://localhost:4317")

    if settings.APP_ENV == "development":
        # Development: console output + Jaeger (if available)
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        try:
            otlp_exporter = OTLPSpanExporter(
                endpoint=jaeger_endpoint,
                insecure=True,
            )
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        except Exception as e:
            logger.warning(f"Could not connect to Jaeger at {jaeger_endpoint}: {e}")
    else:
        # Production: OTLP only (no console noise)
        otlp_exporter = OTLPSpanExporter(
            endpoint=jaeger_endpoint,
            insecure=True,
        )
        provider.add_span_processor(
            BatchSpanProcessor(
                otlp_exporter,
                max_queue_size=2048,
                max_export_batch_size=512,
                schedule_delay_millis=5000,
            )
        )

    trace.set_tracer_provider(provider)

    # Context propagation (W3C + B3 for cross-service compatibility)
    set_global_textmap(CompositePropagator([
        TraceContextTextMapPropagator(),
        B3MultiFormat(),
    ]))

    # ── Auto-Instrumentation ─────────────────────────────────────────

    # FastAPI: auto-create spans for each endpoint
    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="health,metrics,ready,healthz",
        server_request_hook=_server_request_hook,
        client_response_hook=_client_response_hook,
    )

    # SQLAlchemy: trace every DB query
    from app.core.database import engine
    SQLAlchemyInstrumentor().instrument(
        engine=engine,
        enable_commenter=True,  # Adds trace context as SQL comments
    )

    # Redis: trace cache operations
    RedisInstrumentor().instrument()

    # HTTP client (requests library): trace outgoing calls
    RequestsInstrumentor().instrument()

    # Logging: inject trace_id into log records
    LoggingInstrumentor().instrument(
        set_logging_format=True,
        log_level=logging.INFO,
    )

    global _tracer
    _tracer = trace.get_tracer("preskool-backend", settings.APP_VERSION)

    logger.info(
        f"🔍 OpenTelemetry tracing initialized — "
        f"exporter={jaeger_endpoint}, env={settings.APP_ENV}"
    )


# ═══════════════════════════════════════════════════════════════════════
# Hooks: Enrich spans with tenant/user context
# ═══════════════════════════════════════════════════════════════════════

def _server_request_hook(span, scope):
    """Add tenant and request context to incoming request spans."""
    if span and span.is_recording():
        headers = dict(scope.get("headers", []))
        tenant_id = headers.get(b"x-tenant-id", b"").decode()
        if tenant_id:
            span.set_attribute("tenant.id", tenant_id)
        span.set_attribute("http.server_name", "preskool-backend")


def _client_response_hook(span, scope, response):
    """Enrich response spans with status info."""
    if span and span.is_recording():
        status_code = response.get("status_code", 0)
        if status_code >= 400:
            span.set_status(Status(StatusCode.ERROR, f"HTTP {status_code}"))


# ═══════════════════════════════════════════════════════════════════════
# Decorators: Manual tracing for critical business operations
# ═══════════════════════════════════════════════════════════════════════

def trace_operation(operation_name: str, attributes: dict = None):
    """
    Decorator to trace a critical business operation.

    Usage:
        @trace_operation("student.enrollment", {"module": "students"})
        def enroll_student(db, data):
            ...
    """
    def decorator(func):
        import functools

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            tracer = get_tracer()
            with tracer.start_as_current_span(
                operation_name,
                attributes=attributes or {},
            ) as span:
                try:
                    # Add tenant context from kwargs if available
                    tenant_id = kwargs.get("tenant_id")
                    if tenant_id:
                        span.set_attribute("tenant.id", tenant_id)

                    result = func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            tracer = get_tracer()
            with tracer.start_as_current_span(
                operation_name,
                attributes=attributes or {},
            ) as span:
                try:
                    tenant_id = kwargs.get("tenant_id")
                    if tenant_id:
                        span.set_attribute("tenant.id", tenant_id)

                    result = await func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def trace_db_operation(operation: str, table: str):
    """
    Create a span for a database operation.

    Usage:
        with trace_db_operation("select", "students") as span:
            results = db.query(Student).filter(...)
            span.set_attribute("db.row_count", len(results))
    """
    tracer = get_tracer()
    span = tracer.start_span(
        f"db.{operation}.{table}",
        attributes={
            "db.system": "postgresql",
            "db.operation": operation,
            "db.sql.table": table,
        },
    )
    return trace.use_span(span, end_on_exit=True)


def trace_cache_operation(operation: str, key_pattern: str = ""):
    """
    Create a span for a cache operation.

    Usage:
        with trace_cache_operation("get", "tenant:*:students"):
            result = redis.get(cache_key)
    """
    tracer = get_tracer()
    span = tracer.start_span(
        f"cache.{operation}",
        attributes={
            "cache.system": "redis",
            "cache.operation": operation,
            "cache.key_pattern": key_pattern,
        },
    )
    return trace.use_span(span, end_on_exit=True)


def trace_external_call(service: str, operation: str):
    """
    Create a span for an external API call.

    Usage:
        with trace_external_call("razorpay", "create_payment"):
            response = razorpay_client.order.create(data)
    """
    tracer = get_tracer()
    span = tracer.start_span(
        f"external.{service}.{operation}",
        attributes={
            "external.service": service,
            "external.operation": operation,
        },
    )
    return trace.use_span(span, end_on_exit=True)


# ═══════════════════════════════════════════════════════════════════════
# Utility: Get current trace/span IDs for log correlation
# ═══════════════════════════════════════════════════════════════════════

def get_current_trace_id() -> Optional[str]:
    """Get the current trace ID (for log correlation)."""
    span = trace.get_current_span()
    if span and span.get_span_context().trace_id:
        return format(span.get_span_context().trace_id, "032x")
    return None


def get_current_span_id() -> Optional[str]:
    """Get the current span ID."""
    span = trace.get_current_span()
    if span and span.get_span_context().span_id:
        return format(span.get_span_context().span_id, "016x")
    return None
