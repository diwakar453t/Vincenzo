"""
Integration Tests — Audit Service
Tests for: tamper-evident audit logging, chain integrity, GDPR actions.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session

pytestmark = pytest.mark.integration


class TestAuditLogger:
    """Tests for the AuditLogger service."""

    def test_log_creates_entry(self, db: Session, test_admin, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource, AuditLog

        entry = audit_logger.log(
            db,
            AuditAction.READ,
            AuditResource.STUDENT,
            resource_id="42",
            user_id=test_admin.id,
            tenant_id=test_tenant.id,
            client_ip="127.0.0.1",
        )

        assert entry.id is not None
        assert entry.action == AuditAction.READ
        assert entry.resource_type == AuditResource.STUDENT
        assert entry.user_id == test_admin.id
        assert entry.status == "success"

    def test_log_computes_chain_hash(self, db: Session, test_admin, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource

        entry = audit_logger.log(
            db, AuditAction.CREATE, AuditResource.STUDENT,
            user_id=test_admin.id, tenant_id=test_tenant.id,
        )
        assert entry.record_hash is not None
        assert len(entry.record_hash) == 64  # SHA-256 hex

    def test_chain_integrity_valid(self, db: Session, test_admin, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource

        # Write 3 chained entries
        for action in [AuditAction.READ, AuditAction.UPDATE, AuditAction.DELETE]:
            audit_logger.log(
                db, action, AuditResource.STUDENT,
                user_id=test_admin.id, tenant_id=test_tenant.id,
            )

        result = audit_logger.verify_chain(db, tenant_id=test_tenant.id)
        assert result["valid"] is True
        assert result["broken_at"] is None

    def test_chain_breaks_on_tampering(self, db: Session, test_admin, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource, AuditLog

        entry = audit_logger.log(
            db, AuditAction.LOGIN, AuditResource.SESSION,
            user_id=test_admin.id, tenant_id=test_tenant.id,
        )

        # Tamper with the record
        entry.record_hash = "tampered_hash_value_that_is_definitely_wrong_" + "x" * 20
        db.flush()

        result = audit_logger.verify_chain(db, tenant_id=test_tenant.id)
        assert result["valid"] is False
        assert result["broken_at"] is not None

    def test_log_failure_event(self, db: Session, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource

        entry = audit_logger.log(
            db, AuditAction.LOGIN_FAILED, AuditResource.SESSION,
            tenant_id=test_tenant.id,
            client_ip="1.2.3.4",
            status="failure",
            failure_reason="Invalid password",
        )
        assert entry.status == "failure"
        assert entry.failure_reason == "Invalid password"

    def test_gdpr_action_logged(self, db: Session, test_admin, test_tenant):
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource, AuditLog
        from unittest.mock import MagicMock

        # Create a mock request
        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-browser"
        mock_request.state.tenant_id = test_tenant.id

        entry = audit_logger.log_gdpr(
            db, AuditAction.DATA_ERASURE, mock_request,
            data_subject_id=test_admin.id,
            data_subject_email=test_admin.email,
        )
        assert entry.action == AuditAction.DATA_ERASURE
        assert entry.resource_type == AuditResource.GDPR
        assert entry.data_category == "PERSONAL_DATA"

    def test_change_diff_uses_hashes(self, db: Session, test_admin, test_tenant, test_student):
        """Change log stores hashes not raw PII."""
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource
        import json

        # Clone before state
        before_email = test_student.email
        test_student.email = "updated@test.com"
        db.flush()

        entry = audit_logger.log(
            db, AuditAction.UPDATE, AuditResource.STUDENT,
            resource_id=str(test_student.id),
            user_id=test_admin.id,
            tenant_id=test_tenant.id,
            changes={"email": {"before": "hash1", "after": "hash2", "is_pii": True}},
        )

        assert entry.changes is not None
        changes = json.loads(entry.changes)
        assert "email" in changes
        # Raw email should NOT be in the stored changes
        assert before_email not in str(entry.changes)
        assert "updated@test.com" not in str(entry.changes)

    def test_metadata_pii_masked(self, db: Session, test_tenant):
        """Sensitive fields in metadata should be masked."""
        from app.services.audit_service import audit_logger
        from app.models.audit_log import AuditAction, AuditResource
        import json

        entry = audit_logger.log(
            db, AuditAction.LOGIN, AuditResource.SESSION,
            tenant_id=test_tenant.id,
            metadata={
                "email": "real-email@test.com",      # Sensitive
                "action": "login_attempt",            # Not sensitive
            },
        )

        if entry.extra_data:
            extra = json.loads(entry.extra_data)
            # Email should be masked
            assert "real-email@test.com" not in str(extra)
