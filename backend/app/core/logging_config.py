"""
Structured JSON Logging for PreSkool ERP — 200+ College SaaS.

Features:
- JSON-formatted logs for machine parsing (Loki, ELK, CloudWatch)
- Tenant-tagged logs for per-college filtering
- Request correlation IDs for tracing
- Automatic context injection (tenant, user, request_id)
- Performance timing for slow query detection
- Log level per environment (DEBUG dev, INFO prod)
"""
import logging
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Optional
from app.core.config import settings

# ── Context Variables (thread-safe, async-safe) ───────────────────────
current_tenant_id: ContextVar[Optional[str]] = ContextVar("current_tenant_id", default=None)
current_request_id: ContextVar[Optional[str]] = ContextVar("current_request_id", default=None)
current_user_id: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)


class JSONFormatter(logging.Formatter):
    """
    Produces structured JSON log lines for centralized log aggregation.
    
    Output:
    {"timestamp":"2026-02-20T02:45:00Z","level":"INFO","logger":"app.api",
     "message":"GET /api/v1/students","tenant_id":"college1",
     "request_id":"abc-123","duration_ms":45,"service":"preskool-backend"}
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "preskool-backend",
            "environment": settings.APP_ENV,
        }

        # Inject context if available
        tenant_id = current_tenant_id.get()
        if tenant_id:
            log_entry["tenant_id"] = tenant_id

        request_id = current_request_id.get()
        if request_id:
            log_entry["request_id"] = request_id

        user_id = current_user_id.get()
        if user_id:
            log_entry["user_id"] = str(user_id)

        # Extra fields from log record
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, "status_code"):
            log_entry["status_code"] = record.status_code
        if hasattr(record, "method"):
            log_entry["method"] = record.method
        if hasattr(record, "path"):
            log_entry["path"] = record.path
        if hasattr(record, "client_ip"):
            log_entry["client_ip"] = record.client_ip

        # Exception info
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
            }

        # Source location (debug mode only)
        if settings.DEBUG:
            log_entry["source"] = {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            }

        return json.dumps(log_entry, default=str, ensure_ascii=False)


class HumanReadableFormatter(logging.Formatter):
    """
    Pretty console output for local development.
    Format: [2026-02-20 02:45:00] [college1] INFO  app.api — GET /students → 200 (45ms)
    """

    COLORS = {
        "DEBUG": "\033[36m",    # Cyan
        "INFO": "\033[32m",     # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",    # Red
        "CRITICAL": "\033[1;31m",  # Bold Red
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        tenant = current_tenant_id.get() or "-"
        color = self.COLORS.get(record.levelname, "")
        level = f"{color}{record.levelname:<8}{self.RESET}"

        msg = f"[{ts}] [{tenant}] {level} {record.name} — {record.getMessage()}"

        if record.exc_info and record.exc_info[1]:
            msg += f"\n{self.formatException(record.exc_info)}"

        return msg


def setup_logging() -> logging.Logger:
    """
    Configure application logging based on environment.
    - Development: colored human-readable console output
    - Production: structured JSON to stdout (for Fluentd/Promtail collection)
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    # Clear existing handlers
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(log_level)

    # Choose formatter based on environment
    handler = logging.StreamHandler(sys.stdout)
    if settings.APP_ENV == "development":
        handler.setFormatter(HumanReadableFormatter())
    else:
        handler.setFormatter(JSONFormatter())

    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("alembic").setLevel(logging.INFO)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logger = logging.getLogger("preskool")
    logger.info(
        f"Logging configured — level={logging.getLevelName(log_level)}, "
        f"format={'JSON' if settings.APP_ENV != 'development' else 'human'}, "
        f"env={settings.APP_ENV}"
    )

    return logger


def generate_request_id() -> str:
    """Generate a unique request ID for correlation."""
    return str(uuid.uuid4())[:12]


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a module."""
    return logging.getLogger(f"preskool.{name}")
