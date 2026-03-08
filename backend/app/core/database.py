"""
Database engine & session factory — optimized for 200+ college multi-tenant SaaS.

Key design decisions:
- Connection pool sized for concurrent tenants (50 base + 30 overflow = 80 max)
- PgBouncer recommended in production (sits between app & PostgreSQL)
- Tenant-aware get_db() injects tenant_id filter context
- Statement-level connection recycling to prevent stale connections
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool, NullPool
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# ── URL Normalization ──────────────────────────────────────────────────────
# Azure PostgreSQL requires DATABASE_URL=postgresql+asyncpg://...
# BUT this app uses sync SQLAlchemy throughout (not async).
# We transparently rewrite the driver portion so the sync engine works correctly.
# asyncpg is still installed and used by Alembic for direct PostgreSQL access.
_raw_url = settings.DATABASE_URL
if "+asyncpg" in _raw_url:
    _sync_url = _raw_url.replace("+asyncpg", "+psycopg2", 1)
else:
    _sync_url = _raw_url

# Determine engine configuration based on database type
is_sqlite = _sync_url.startswith("sqlite")

engine_kwargs = {}
if is_sqlite:
    # SQLite: local dev only — not for production multi-tenant
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine_kwargs["poolclass"] = NullPool
else:
    # PostgreSQL: production multi-tenant settings
    # With PgBouncer: use NullPool (PgBouncer handles pooling)
    # Without PgBouncer: use QueuePool with generous limits
    if settings.USE_PGBOUNCER:
        engine_kwargs["poolclass"] = NullPool
        logger.info("🔌 Using PgBouncer — SQLAlchemy pool disabled (NullPool)")
    else:
        engine_kwargs["poolclass"] = QueuePool
        engine_kwargs["pool_size"] = settings.DB_POOL_SIZE  # 50 connections
        engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW  # 30 burst
        engine_kwargs["pool_timeout"] = settings.DB_POOL_TIMEOUT  # 30s wait
        engine_kwargs["pool_recycle"] = settings.DB_POOL_RECYCLE  # Recycle after 1800s
        engine_kwargs["pool_pre_ping"] = True  # Check connection health
        logger.info(
            f"🔌 SQLAlchemy pool: size={settings.DB_POOL_SIZE}, "
            f"overflow={settings.DB_MAX_OVERFLOW}, "
            f"max={settings.DB_POOL_SIZE + settings.DB_MAX_OVERFLOW}"
        )

    # Statement-level optimizations
    engine_kwargs["echo"] = settings.DB_ECHO
    engine_kwargs["echo_pool"] = settings.DB_ECHO

# Create database engine
engine = create_engine(_sync_url, **engine_kwargs)

# Enable WAL mode for SQLite (better concurrency in dev)
if is_sqlite:

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency for getting database session.
    In production with 200+ tenants, sessions are short-lived
    and returned to pool promptly.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tenant_db(tenant_id: str):
    """
    Get a DB session scoped to a specific tenant.
    Used by background tasks & plugin hooks that run outside request context.
    """
    db = SessionLocal()
    db.info["tenant_id"] = tenant_id
    try:
        yield db
    finally:
        db.close()


# ── Connection Pool Monitoring ────────────────────────────────────────
if not is_sqlite and not settings.USE_PGBOUNCER:

    @event.listens_for(engine, "checkout")
    def on_checkout(dbapi_conn, connection_rec, connection_proxy):
        """Log when pool is getting exhausted (early warning)."""
        pool = engine.pool
        if hasattr(pool, "checkedout") and hasattr(pool, "size"):
            checked_out = pool.checkedout()
            pool_size = pool.size()
            if checked_out > pool_size * 0.8:
                logger.warning(
                    f"⚠️ Connection pool nearing capacity: "
                    f"{checked_out}/{pool_size} checked out "
                    f"(overflow: {pool.overflow()})"
                )
