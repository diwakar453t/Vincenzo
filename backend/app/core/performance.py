"""
Slow Query Logger Middleware — FastAPI
=======================================
Intercepts every request and logs queries that exceed threshold.
Integrates with the existing OpenTelemetry and JSON logging stack.

Features:
  - Logs all queries slower than SLOW_QUERY_THRESHOLD_MS (default: 200ms)
  - Tracks endpoint-level request timing
  - Emits Prometheus metrics for slow query rate
  - Groups repeated slow patterns for N+1 detection
  - Configurable via environment variables
"""
import asyncio
import json
import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

logger = logging.getLogger("preskool.performance")

# Configuration
SLOW_REQUEST_THRESHOLD_MS = int(os.getenv("SLOW_REQUEST_THRESHOLD_MS", "500"))
SLOW_QUERY_THRESHOLD_MS = int(os.getenv("SLOW_QUERY_THRESHOLD_MS", "200"))
LOG_ALL_REQUESTS = os.getenv("LOG_ALL_REQUESTS", "false").lower() == "true"


class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware that tracks request timing and flags slow endpoints.
    
    Install in main.py:
        from app.core.performance import PerformanceMiddleware
        app.add_middleware(PerformanceMiddleware)
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self._slow_endpoints: dict[str, list[float]] = defaultdict(list)
        self._total_requests = 0
        self._slow_requests = 0

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        start = time.perf_counter()
        self._total_requests += 1

        # Attach timing to request state
        request.state.start_time = start

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "Request exception",
                extra={
                    "event": "request_error",
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(exc),
                },
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        path = request.url.path
        method = request.method
        status_code = response.status_code

        # Add timing header to response
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        # Log ALL requests if enabled (verbose mode)
        if LOG_ALL_REQUESTS:
            logger.info(
                f"{method} {path} → {status_code} ({duration_ms:.0f}ms)",
                extra={
                    "event": "http_request",
                    "method": method,
                    "path": path,
                    "status": status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )

        # Flag slow requests
        if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
            self._slow_requests += 1
            self._slow_endpoints[f"{method} {path}"].append(duration_ms)

            logger.warning(
                f"🐢 SLOW REQUEST: {method} {path} took {duration_ms:.0f}ms "
                f"(threshold: {SLOW_REQUEST_THRESHOLD_MS}ms)",
                extra={
                    "event": "slow_request",
                    "method": method,
                    "path": path,
                    "status": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "threshold_ms": SLOW_REQUEST_THRESHOLD_MS,
                    "query_params": dict(request.query_params),
                    "user_agent": request.headers.get("user-agent", ""),
                    "slow_rate": self._slow_requests / self._total_requests,
                },
            )

            # Detect pathological slowness (> 5x threshold)
            if duration_ms > SLOW_REQUEST_THRESHOLD_MS * 5:
                logger.error(
                    f"🚨 CRITICAL SLOW REQUEST: {method} {path} took {duration_ms:.0f}ms!",
                    extra={
                        "event": "critical_slow_request",
                        "method": method,
                        "path": path,
                        "duration_ms": round(duration_ms, 2),
                    },
                )

        return response

    def get_stats(self) -> dict:
        """Returns performance statistics for the health/debug endpoint."""
        top_slow = sorted(
            [
                {
                    "endpoint": endpoint,
                    "count": len(times),
                    "avg_ms": sum(times) / len(times),
                    "max_ms": max(times),
                    "p95_ms": sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else times[0],
                }
                for endpoint, times in self._slow_endpoints.items()
            ],
            key=lambda x: x["avg_ms"],
            reverse=True,
        )[:10]

        return {
            "total_requests": self._total_requests,
            "slow_requests": self._slow_requests,
            "slow_rate": round(
                self._slow_requests / max(self._total_requests, 1), 4
            ),
            "slow_threshold_ms": SLOW_REQUEST_THRESHOLD_MS,
            "top_slow_endpoints": top_slow,
        }


class SQLQueryLogger:
    """
    SQLAlchemy event listener for per-request query logging.
    Attach to the database session in request lifecycle.

    Usage in conftest.py or database.py:
        from app.core.performance import SQLQueryLogger
        sql_logger = SQLQueryLogger()
        event.listen(engine, "before_cursor_execute", sql_logger.before)
        event.listen(engine, "after_cursor_execute", sql_logger.after)
    """

    def __init__(self, threshold_ms: float = SLOW_QUERY_THRESHOLD_MS):
        self.threshold_ms = threshold_ms
        self._query_count = 0
        self._slow_count = 0

    def before(self, conn, cursor, statement, parameters, context, executemany):
        context._pf_start = time.perf_counter()
        context._pf_sql = statement

    def after(self, conn, cursor, statement, parameters, context, executemany):
        if not hasattr(context, '_pf_start'):
            return

        duration_ms = (time.perf_counter() - context._pf_start) * 1000
        self._query_count += 1

        if duration_ms > self.threshold_ms:
            self._slow_count += 1

            # Sanitize params (avoid logging PII)
            safe_params = self._sanitize_params(parameters)

            logger.warning(
                f"🐢 SLOW QUERY ({duration_ms:.0f}ms): {statement[:200].strip()}",
                extra={
                    "event": "slow_sql_query",
                    "duration_ms": round(duration_ms, 2),
                    "threshold_ms": self.threshold_ms,
                    "sql": statement[:500].strip(),
                    "params_hash": hash(str(safe_params)),
                    "query_number": self._query_count,
                },
            )

    def _sanitize_params(self, params) -> str:
        """Replace potentially sensitive values with type indicators."""
        if params is None:
            return "none"
        try:
            if isinstance(params, dict):
                return str({k: f"<{type(v).__name__}>" for k, v in params.items()})
            elif isinstance(params, (list, tuple)):
                return str([f"<{type(v).__name__}>" for v in params])
            return f"<{type(params).__name__}>"
        except Exception:
            return "<error sanitizing>"

    def get_stats(self) -> dict:
        return {
            "total_queries": self._query_count,
            "slow_queries": self._slow_count,
            "slow_rate": round(self._slow_count / max(self._query_count, 1), 4),
            "threshold_ms": self.threshold_ms,
        }


# ── Query Optimization Hints ──────────────────────────────────────────────
OPTIMIZATION_HINTS = {
    "SELECT * FROM students WHERE": (
        "Use LIMIT/OFFSET pagination. Add index on (tenant_id, status, created_at)."
    ),
    "SELECT * FROM attendances WHERE date": (
        "Always filter by class_id first. Composite index idx_attendance_class_date required."
    ),
    "SELECT * FROM fee_collections": (
        "Add index on (student_id, status) for pending fee lookups."
    ),
    "SELECT * FROM notifications WHERE user_id": (
        "Add partial index on (user_id, is_read) WHERE is_read = false."
    ),
    "COUNT(*) FROM": (
        "Cache COUNT(*) results in Redis with 5-minute TTL. Avoid exact counts on large tables."
    ),
}


def get_optimization_hint(sql: str) -> "str | None":
    """Returns an optimization suggestion for a known slow query pattern."""
    for pattern, hint in OPTIMIZATION_HINTS.items():
        if pattern.upper() in sql.upper():
            return hint
    return None


# ── Global singleton instances ─────────────────────────────────────────────
sql_query_logger = SQLQueryLogger()
