"""
GDPR Compliance Models — PreSkool ERP
Implements GDPR (EU) and PDPA (India) data protection requirements.

Key rights:
- Art. 7: Right to withdraw consent
- Art. 15: Right of access (SAR — Subject Access Request)
- Art. 17: Right to erasure (right to be forgotten)
- Art. 20: Right to data portability
- Art. 21: Right to object
- Art. 22: Rights related to automated decision-making
"""
import enum
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.base import BaseModel


class ConsentType(str, enum.Enum):
    """Types of consent collected from users."""
    CORE_SERVICE = "core_service"          # Required for service delivery
    ANALYTICS = "analytics"               # Usage analytics / performance
    MARKETING = "marketing"               # Promotional communications
    THIRD_PARTY_SHARING = "third_party"   # Sharing with partners
    PROFILING = "profiling"               # Automated profiling
    SENSITIVE_DATA = "sensitive_data"     # Processing sensitive PII


class ConsentStatus(str, enum.Enum):
    GRANTED = "granted"
    WITHDRAWN = "withdrawn"
    PENDING = "pending"
    EXPIRED = "expired"


class DataRequestType(str, enum.Enum):
    """GDPR Data Subject Request types."""
    ACCESS = "access"             # Art. 15: Right of access
    PORTABILITY = "portability"   # Art. 20: Data export
    ERASURE = "erasure"           # Art. 17: Right to be forgotten
    RECTIFICATION = "rectification"  # Art. 16: Right to rectify
    RESTRICTION = "restriction"   # Art. 18: Restrict processing
    OBJECTION = "objection"       # Art. 21: Right to object


class DataRequestStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    PARTIALLY_COMPLETED = "partially_completed"


class UserConsent(Base):
    """
    Tracks user consent for each processing purpose.
    One record per user per consent type.
    Fully auditable: always add new record, never update.
    """

    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), nullable=False, index=True)

    consent_type = Column(SQLEnum(ConsentType, name="consent_type"), nullable=False)
    status = Column(SQLEnum(ConsentStatus, name="consent_status"), nullable=False)

    # When and how consent was given
    granted_at = Column(DateTime(timezone=True), nullable=True)
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Evidence (for compliance demonstration)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(512), nullable=True)
    consent_version = Column(String(20), nullable=False, default="1.0")  # Policy version
    consent_text_hash = Column(String(64), nullable=True)  # Hash of the exact text shown

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<UserConsent(user={self.user_id}, type={self.consent_type}, status={self.status})>"


class DataSubjectRequest(BaseModel):
    """
    GDPR Data Subject Request (DSR) / Subject Access Request (SAR).
    Must be processed within 30 days (GDPR) / 30 days (PDPA India).
    """

    __tablename__ = "data_subject_requests"

    request_type = Column(SQLEnum(DataRequestType, name="dsr_type"), nullable=False)
    status = Column(SQLEnum(DataRequestStatus, name="dsr_status"), nullable=False,
                    default=DataRequestStatus.PENDING, index=True)

    # Who is making the request
    data_subject_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    data_subject_email = Column(String(255), nullable=False)
    requester_note = Column(Text, nullable=True)  # Additional context from user

    # Processing
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin handling it
    due_date = Column(DateTime(timezone=True), nullable=False)  # 30 days from request
    completed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    response_note = Column(Text, nullable=True)  # Admin's response

    # Evidence
    verification_token = Column(String(128), nullable=True)  # To verify identity
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Export file (for portability requests)
    export_file_path = Column(String(512), nullable=True)
    export_format = Column(String(20), nullable=True, default="json")  # json, csv, pdf

    def __repr__(self):
        return f"<DataSubjectRequest(type={self.request_type}, status={self.status})>"


class PrivacyPolicyVersion(Base):
    """Track versions of privacy policy and terms of service."""

    __tablename__ = "privacy_policy_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(20), nullable=False, unique=True)
    effective_date = Column(DateTime(timezone=True), nullable=False)
    document_type = Column(String(50), nullable=False)  # privacy_policy | terms_of_service
    content_hash = Column(String(64), nullable=False)   # SHA-256 of policy document
    summary_of_changes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<PrivacyPolicyVersion(v={self.version}, type={self.document_type})>"


class DataRetentionPolicy(Base):
    """
    Per-data-category retention settings.
    Drives automated purge jobs via Celery.
    """

    __tablename__ = "data_retention_policies"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), nullable=False)
    data_category = Column(String(100), nullable=False)    # e.g., "student_records"
    retention_days = Column(Integer, nullable=False)        # Days to keep
    anonymise_on_expire = Column(Boolean, default=True)     # Anonymise vs delete
    legal_basis = Column(String(255), nullable=True)        # Justification for retention
    last_purge_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DataRetentionPolicy(category={self.data_category}, days={self.retention_days})>"
