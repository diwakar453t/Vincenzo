from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    """
    Application settings — optimized for 200+ college multi-tenant SaaS.
    All values configurable via environment variables.
    """

    # ── Application ───────────────────────────────────────────────────
    APP_NAME: str = "PreSkool ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False          # NEVER True in production
    APP_ENV: str = "development" # Override to 'production' in prod

    # ── Database — PostgreSQL (mandatory in production) ────────────────
    DATABASE_URL: str = "sqlite:///./preskool.db"

    # Connection Pool (without PgBouncer)
    DB_POOL_SIZE: int = 50           # Base connections (200 colleges = high concurrency)
    DB_MAX_OVERFLOW: int = 30        # Burst capacity (total max: 80)
    DB_POOL_TIMEOUT: int = 30        # Seconds to wait for a connection
    DB_POOL_RECYCLE: int = 1800      # Recycle connections every 30 minutes
    DB_ECHO: bool = False            # SQL logging (disable in production)

    # PgBouncer (recommended for production — handles pooling externally)
    USE_PGBOUNCER: bool = False      # Set True when PgBouncer is in front of PG

    # ── Redis ─────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_MAX_CONNECTIONS: int = 100  # Redis connection pool
    REDIS_KEY_PREFIX: str = "preskool:"  # Namespace all Redis keys

    # ── Authentication — JWT ──────────────────────────────────────────
    # REQUIRED: generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
    JWT_SECRET_KEY: str = "CHANGE_ME_BEFORE_PRODUCTION_USE_token_hex_32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Issue 12: Configurable bcrypt rounds (12 = good default, increase for higher security)
    BCRYPT_ROUNDS: int = 12

    # ── Trusted Hosts (TrustedHostMiddleware) ─────────────────────────
    # Issue 7: Production hosts must be listed here or all prod requests will be rejected
    ALLOWED_HOSTS: list = [
        "localhost",
        "127.0.0.1",
        "*.preskool.local",
        "erp.preskool.com",
        "*.erp.preskool.com",
        "*.railway.app",
        "*.up.railway.app",
        "*.vercel.app",
    ]

    def validate_jwt_secret(self) -> None:
        """Raise if JWT secret is weak or default."""
        weak = {
            "CHANGE_ME_BEFORE_PRODUCTION_USE_token_hex_32",
            "your-secret-key-change-in-production",
            "change-me-in-production-32chars!!",
            "secret", "password", "test", "",
        }
        if self.APP_ENV == "production" and (
            self.JWT_SECRET_KEY in weak or len(self.JWT_SECRET_KEY) < 32
        ):
            raise RuntimeError(
                "SECURITY: JWT_SECRET_KEY is weak or default. "
                "Generate one with: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )

    # ── Keycloak (optional SSO) ───────────────────────────────────────
    KEYCLOAK_URL: str = "http://localhost:8080"
    KEYCLOAK_REALM: str = "preskool"
    KEYCLOAK_CLIENT_ID: str = "preskool-api"
    KEYCLOAK_CLIENT_SECRET: Optional[str] = None

    # ── CORS (restrictive in production) ─────────────────────────────
    CORS_ORIGINS: list = [
        "http://localhost:3000",       # React dev server
        "http://localhost:5173",       # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    CORS_PRODUCTION_ORIGINS: list = [
        "https://erp.preskool.com",
        "https://*.erp.preskool.com",  # Tenant subdomains
        "https://*.railway.app",       # Railway backend URL
        "https://*.up.railway.app",
        "https://*.vercel.app",        # Vercel frontend
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    CORS_ALLOW_HEADERS: list = [
        "Authorization", "Content-Type", "X-Tenant-ID",
        "X-Request-ID", "X-CSRF-Token", "Accept",
    ]
    CORS_MAX_AGE: int = 600  # Preflight cache: 10 minutes
    # ── File Uploads (S3 in production, local in dev) ─────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB (student docs, bulk imports)

    # S3 Storage (production)
    S3_ENABLED: bool = False
    S3_BUCKET: str = "preskool-uploads"
    S3_REGION: str = "ap-south-1"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None  # For MinIO/localstack

    # ── Multi-Tenancy ─────────────────────────────────────────────────
    TENANT_HEADER: str = "X-Tenant-ID"      # Header name for tenant identification
    TENANT_ISOLATION: str = "row"            # "row" (shared DB) or "schema" (per-schema)
    MAX_TENANTS: int = 500                   # Max supported tenants
    TENANT_CACHE_TTL: int = 300              # Cache tenant info for 5 min (seconds)

    # ── Rate Limiting ─────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 120         # Per tenant, per minute
    RATE_LIMIT_BURST: int = 30               # Burst allowance

    # ── Background Tasks / Celery ─────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── OpenTelemetry / Tracing ───────────────────────────────────────
    OTEL_ENABLED: bool = False  # Enable only when OTEL exporter is available
    OTEL_EXPORTER_ENDPOINT: str = "http://localhost:4317"  # Jaeger OTLP gRPC
    OTEL_SERVICE_NAME: str = "preskool-backend"

    # ── Razorpay (UPI Payments) ───────────────────────────────────────
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_ENABLED: bool = False

    # ── Data Privacy & Encryption (Field-Level AES-256-GCM) ──────────
    # REQUIRED in production: python3 -c "import secrets; print(secrets.token_hex(32))"
    ENCRYPTION_MASTER_KEY: Optional[str] = None  # Master key for field-level encryption
    ENCRYPTION_SALT: str = "preskool-erp-v1-CHANGE-PER-DEPLOYMENT"  # Unique per deploy
    ENCRYPTION_OLD_KEY_1: Optional[str] = None   # For key rotation

    # ── GDPR & Data Retention ─────────────────────────────────────────
    GDPR_DEFAULT_RETENTION_DAYS: int = 365 * 7   # 7 years for financial records
    GDPR_ERASURE_GRACE_DAYS: int = 30            # 30-day grace after erasure request
    GDPR_DSR_DEADLINE_DAYS: int = 30             # Data subject request deadline
    GDPR_CONTACT_EMAIL: str = "privacy@preskool.com"
    AUDIT_LOG_RETENTION_DAYS: int = 365          # Active audit logs (archive after 1yr)
    AUDIT_LOG_ARCHIVE_DAYS: int = 365 * 7        # Total audit retention (7 years)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
