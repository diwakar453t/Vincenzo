# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Backend Dockerfile (Multi-stage)
# ═══════════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ──────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps for compiled packages (psycopg2, bcrypt, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy & install requirements first (Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Production ──────────────────────────────────────────────
FROM python:3.12-slim AS production

# Non-root user for security
RUN groupadd -r preskool && \
    useradd -r -g preskool -d /app -s /sbin/nologin preskool

WORKDIR /app

# Runtime-only deps (no gcc)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Copy startup script and make executable (must be done as root before USER switch)
RUN chmod +x /app/start.sh

# Create data directories
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R preskool:preskool /app

USER preskool

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

EXPOSE ${PORT}

# start.sh uses 'set -f' (noglob) before calling uvicorn so the '*' in
# --forwarded-allow-ips is never shell-expanded to filenames.
CMD ["/app/start.sh"]
