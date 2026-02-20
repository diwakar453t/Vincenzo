"""
Audit Log Model — PreSkool ERP
Immutable record of all data access and modifications.

Compliance: GDPR Article 5(2), ISO 27001 A.12.4, IT Act 2000 (India)

Features:
- Captures WHO, WHAT, WHEN, WHERE for every sensitive operation
- Tamper detection: SHA-256 chain hash (each record links to prior)
- Before/after values stored as hashed digest (privacy-preserving)
- Retention: logs kept for 7 years (compliance), archived after 1 year
"""
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum, Index
from sqlalchemy.sql import func
from app.core.database import Base


class AuditAction(str, enum.Enum):
    """Actions that trigger audit log entries."""
    # Data operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    IMPORT = "import"

    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    TOKEN_REFRESH = "token_refresh"

    # GDPR actions
    DATA_EXPORT = "data_export"        # Right to portability
    DATA_ERASURE = "data_erasure"      # Right to erasure
    CONSENT_GIVEN = "consent_given"
    CONSENT_WITHDRAWN = "consent_withdrawn"
    DATA_RECTIFICATION = "data_rectification"
    ACCESS_REQUEST = "access_request"  # Subject access request

    # Admin operations
    USER_CREATED = "user_created"
    USER_DEACTIVATED = "user_deactivated"
    ROLE_CHANGED = "role_changed"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    TENANT_CREATED = "tenant_created"
    CONFIG_CHANGED = "config_changed"

    # Security events
    RATE_LIMITED = "rate_limited"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    CSRF_VIOLATION = "csrf_violation"
    INJECT_ATTEMPT = "inject_attempt"


class AuditResource(str, enum.Enum):
    """Resource types that can be audited."""
    USER = "user"
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ATTENDANCE = "attendance"
    GRADE = "grade"
    FEE = "fee"
    PAYMENT = "payment"
    PAYROLL = "payroll"
    EXAM = "exam"
    REPORT = "report"
    FILE = "file"
    TENANT = "tenant"
    SETTING = "setting"
    SESSION = "session"
    GDPR = "gdpr"
    SECURITY = "security"
    SYSTEM = "system"


class AuditLog(Base):
    """
    Immutable audit log entry.
    Records are NEVER updated or deleted (append-only for compliance).
    Archive after 1 year, retain for 7 years total.
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # When
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Who
    user_id = Column(Integer, nullable=True, index=True)      # Null for anonymous/system
    user_email = Column(String(255), nullable=True)           # Stored for forensics
    user_role = Column(String(50), nullable=True)
    tenant_id = Column(String(50), nullable=True, index=True)
    client_ip = Column(String(50), nullable=True)
    user_agent = Column(String(512), nullable=True)
    request_id = Column(String(64), nullable=True)            # Trace correlation

    # What
    action = Column(
        SQLEnum(AuditAction, name="audit_action", create_type=True),
        nullable=False,
        index=True,
    )
    resource_type = Column(
        SQLEnum(AuditResource, name="audit_resource", create_type=True),
        nullable=False,
        index=True,
    )
    resource_id = Column(String(255), nullable=True, index=True)  # ID of affected record
    resource_name = Column(String(255), nullable=True)             # Human-readable name

    # Change details (privacy-preserving: hashed, not raw values)
    changes = Column(Text, nullable=True)  # JSON of {field: {before_hash, after_hash}}
    extra_data = Column(Text, nullable=True)  # JSON of additional context (sanitised)

    # Outcome
    status = Column(String(20), nullable=False, default="success")  # success | failure | blocked
    failure_reason = Column(String(512), nullable=True)

    # Tamper detection: each record hashes the previous record's hash
    # Forms an audit chain — any modification breaks the chain
    record_hash = Column(String(64), nullable=True)          # SHA-256 of this record
    previous_hash = Column(String(64), nullable=True)        # Hash of prior record (chain)

    # GDPR specifics
    legal_basis = Column(String(100), nullable=True)          # e.g., "legitimate_interest"
    data_category = Column(String(50), nullable=True)         # e.g., "SENSITIVE_PII"

    __table_args__ = (
        # Composite indexes for efficient querying
        Index("ix_audit_tenant_timestamp", "tenant_id", "timestamp"),
        Index("ix_audit_user_action", "user_id", "action"),
        Index("ix_audit_resource", "resource_type", "resource_id"),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource={self.resource_type})>"
