"""
Audit Logger Service — PreSkool ERP
Centralized service for writing immutable audit trail entries.

Usage:
    audit = AuditLogger()

    # Log a data access
    await audit.log(db, AuditAction.READ, AuditResource.STUDENT,
                    resource_id=str(student.id), request=request)

    # Log a data change with before/after values
    await audit.log_change(db, student_before, student_after,
                           action=AuditAction.UPDATE, request=request)

    # Log GDPR action
    await audit.log_gdpr(db, AuditAction.DATA_ERASURE,
                         user_id=123, request=request)
"""
import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Optional, Dict

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, AuditAction, AuditResource
from app.core.encryption import DataClassification, hash_pii

logger = logging.getLogger("preskool.audit")


class AuditLogger:
    """
    Writes tamper-evident audit log entries.

    Chain hash mechanism:
        record_hash = SHA-256(id + timestamp + user_id + action + resource + previous_hash)
        Each record includes previous_hash forming an immutable chain.
        Any modification to historical records breaks the chain.
    """

    def log(
        self,
        db: Session,
        action: AuditAction,
        resource_type: AuditResource,
        *,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        tenant_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
        status: str = "success",
        failure_reason: Optional[str] = None,
        legal_basis: Optional[str] = "legitimate_interest",
        data_category: Optional[str] = None,
        changes: Optional[Dict] = None,
    ) -> AuditLog:
        """Write a single audit log entry."""

        # Sanitise metadata — remove any PII that shouldn't be in audit logs
        safe_metadata = self._sanitise_metadata(metadata)

        # Get previous record hash for chain
        previous_hash = self._get_last_hash(db, tenant_id)

        # Build the entry
        entry = AuditLog(
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            tenant_id=tenant_id,
            client_ip=client_ip,
            user_agent=user_agent[:512] if user_agent else None,
            request_id=request_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            changes=json.dumps(changes) if changes else None,
            extra_data=json.dumps(safe_metadata) if safe_metadata else None,
            status=status,
            failure_reason=failure_reason,
            legal_basis=legal_basis,
            data_category=data_category,
            previous_hash=previous_hash,
        )

        db.add(entry)
        db.flush()  # Get the ID

        # Compute and store chain hash
        entry.record_hash = self._compute_hash(entry, previous_hash)
        db.commit()

        # Structured log for Loki/CloudWatch
        logger.info(
            f"AUDIT: {action.value} {resource_type.value} id={resource_id} "
            f"user={user_id} tenant={tenant_id} status={status}",
            extra={
                "audit_action": action.value,
                "audit_resource": resource_type.value,
                "audit_resource_id": resource_id,
                "audit_user_id": user_id,
                "audit_tenant_id": tenant_id,
                "audit_status": status,
                "client_ip": client_ip,
            },
        )

        return entry

    def log_from_request(
        self,
        db: Session,
        action: AuditAction,
        resource_type: AuditResource,
        request,  # FastAPI Request
        *,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        current_user: Optional[dict] = None,
        metadata: Optional[Dict] = None,
        status: str = "success",
        failure_reason: Optional[str] = None,
        changes: Optional[Dict] = None,
        data_category: Optional[str] = None,
    ) -> AuditLog:
        """
        Convenience method — extracts user/IP context from FastAPI request.
        """
        user_id = int(current_user["sub"]) if current_user else None
        user_email = current_user.get("email") if current_user else None
        user_role = current_user.get("role") if current_user else None
        tenant_id = (
            getattr(request.state, "tenant_id", None)
            or (current_user.get("tenant_id") if current_user else None)
        )
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        from app.core.logging_config import current_request_id
        request_id = current_request_id.get(None)

        return self.log(
            db,
            action,
            resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            tenant_id=tenant_id,
            client_ip=client_ip,
            user_agent=user_agent,
            request_id=request_id,
            metadata=metadata,
            status=status,
            failure_reason=failure_reason,
            changes=changes,
            data_category=data_category,
        )

    def log_change(
        self,
        db: Session,
        before: Any,
        after: Any,
        action: AuditAction,
        resource_type: AuditResource,
        request,
        current_user: Optional[dict] = None,
    ) -> AuditLog:
        """
        Log a model change with privacy-preserving before/after hashes.
        Does NOT store raw PII values — only hashes for integrity verification.
        """
        changes = {}
        if before and after:
            before_dict = {c.name: getattr(before, c.name, None)
                           for c in before.__table__.columns}
            after_dict = {c.name: getattr(after, c.name, None)
                          for c in after.__table__.columns}

            for field, new_val in after_dict.items():
                old_val = before_dict.get(field)
                if old_val != new_val:
                    # Hash values for privacy — proves change without exposing data
                    changes[field] = {
                        "before": hash_pii(str(old_val)) if old_val is not None else None,
                        "after": hash_pii(str(new_val)) if new_val is not None else None,
                        "is_pii": DataClassification.should_mask_in_logs(field),
                    }

        resource_id = str(getattr(after, "id", None) or getattr(before, "id", None))
        resource_type_name = after.__tablename__ if after else before.__tablename__

        try:
            resource_enum = AuditResource(resource_type_name.rstrip("s"))
        except ValueError:
            resource_enum = AuditResource.SYSTEM

        return self.log_from_request(
            db, action, resource_enum, request,
            resource_id=resource_id,
            current_user=current_user,
            changes=changes,
        )

    def log_gdpr(
        self,
        db: Session,
        action: AuditAction,
        request,
        *,
        data_subject_id: int,
        data_subject_email: Optional[str] = None,
        requesting_user: Optional[dict] = None,
        details: Optional[str] = None,
    ) -> AuditLog:
        """Log a GDPR-specific action (export, erasure, consent, SAR)."""
        return self.log_from_request(
            db, action, AuditResource.GDPR, request,
            resource_id=str(data_subject_id),
            resource_name=data_subject_email,
            current_user=requesting_user,
            metadata={"details": details, "legal_basis": "gdpr_rights"},
            data_category="PERSONAL_DATA",
        )

    def verify_chain(self, db: Session, tenant_id: Optional[str] = None, limit: int = 100) -> dict:
        """
        Verify audit log chain integrity.
        Returns: {valid: bool, broken_at: int|None, checked: int}
        """
        query = db.query(AuditLog).order_by(AuditLog.id)
        if tenant_id:
            query = query.filter(AuditLog.tenant_id == tenant_id)
        entries = query.limit(limit).all()

        prev_hash = None
        for entry in entries:
            expected = self._compute_hash(entry, prev_hash)
            if entry.record_hash != expected:
                logger.error(f"🔴 Audit chain broken at record id={entry.id}")
                return {"valid": False, "broken_at": entry.id, "checked": len(entries)}
            prev_hash = entry.record_hash

        return {"valid": True, "broken_at": None, "checked": len(entries)}

    # ── Private helpers ──────────────────────────────────────────────

    def _compute_hash(self, entry: AuditLog, previous_hash: Optional[str]) -> str:
        """Compute SHA-256 chain hash for an audit record."""
        components = "|".join(filter(None, [
            str(entry.id),
            str(entry.timestamp),
            str(entry.user_id),
            str(entry.action),
            str(entry.resource_type),
            str(entry.resource_id),
            str(entry.tenant_id),
            str(entry.status),
            str(previous_hash or "GENESIS"),
        ]))
        return hashlib.sha256(components.encode("utf-8")).hexdigest()

    def _get_last_hash(self, db: Session, tenant_id: Optional[str]) -> Optional[str]:
        """Get the most recent record hash for chain linking."""
        query = db.query(AuditLog.record_hash).order_by(AuditLog.id.desc())
        if tenant_id:
            query = query.filter(AuditLog.tenant_id == tenant_id)
        last = query.first()
        return last[0] if last else None

    def _sanitise_metadata(self, metadata: Optional[Dict]) -> Optional[Dict]:
        """Remove PII from metadata before storing in audit log."""
        if not metadata:
            return metadata
        sanitised = {}
        for key, value in metadata.items():
            if DataClassification.should_mask_in_logs(key):
                sanitised[key] = DataClassification.mask_for_log(str(value), key)
            else:
                sanitised[key] = value
        return sanitised


# Singleton audit logger
audit_logger = AuditLogger()
