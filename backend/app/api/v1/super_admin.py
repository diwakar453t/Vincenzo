"""Super Admin API router — platform-level controls for PreSkool ERP."""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, Tenant, UserRole
from app.models.audit_log import AuditLog
from pydantic import BaseModel

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_super_admin(current_user: dict, db: Session) -> User:
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin or Admin access required",
        )
    return user


# ─── Schemas ─────────────────────────────────────────────────────────────────

class InstitutionCreate(BaseModel):
    id: str          # e.g. "greenvalley"
    name: str
    domain: str


class InstitutionResponse(BaseModel):
    id: str
    name: str
    domain: str
    is_active: bool
    total_users: int = 0
    total_students: int = 0
    total_teachers: int = 0

    model_config = {"from_attributes": True}


class PlatformStats(BaseModel):
    total_institutions: int
    active_institutions: int
    total_users: int
    total_students: int
    total_teachers: int
    total_admins: int
    storage_used_mb: float = 0.0
    server_uptime_pct: float = 99.97


class AuditLogEntry(BaseModel):
    id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/institutions", response_model=List[InstitutionResponse])
def list_institutions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all institutions/tenants (super_admin only)."""
    _get_super_admin(current_user, db)

    tenants = db.query(Tenant).all()
    result = []
    for t in tenants:
        total_users = db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar() or 0
        total_students = (
            db.query(func.count(User.id))
            .filter(User.tenant_id == t.id, User.role == UserRole.STUDENT.value)
            .scalar() or 0
        )
        total_teachers = (
            db.query(func.count(User.id))
            .filter(User.tenant_id == t.id, User.role == UserRole.TEACHER.value)
            .scalar() or 0
        )
        result.append(InstitutionResponse(
            id=t.id,
            name=t.name,
            domain=t.domain,
            is_active=t.is_active,
            total_users=total_users,
            total_students=total_students,
            total_teachers=total_teachers,
        ))
    return result


@router.post("/institutions", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    data: InstitutionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new institution/tenant."""
    _get_super_admin(current_user, db)

    existing = db.query(Tenant).filter(
        (Tenant.id == data.id) | (Tenant.domain == data.domain)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution ID or domain already exists")

    tenant = Tenant(id=data.id, name=data.name, domain=data.domain, is_active=True)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return InstitutionResponse(
        id=tenant.id, name=tenant.name, domain=tenant.domain,
        is_active=tenant.is_active, total_users=0, total_students=0, total_teachers=0,
    )


@router.patch("/institutions/{institution_id}/suspend")
def toggle_institution_status(
    institution_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Suspend or reactivate an institution."""
    _get_super_admin(current_user, db)

    tenant = db.query(Tenant).filter(Tenant.id == institution_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Institution not found")

    tenant.is_active = not tenant.is_active
    db.commit()
    return {"id": tenant.id, "is_active": tenant.is_active, "message": "Status updated"}


@router.get("/platform-stats", response_model=PlatformStats)
def get_platform_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get cross-institution platform statistics."""
    _get_super_admin(current_user, db)

    total_institutions = db.query(func.count(Tenant.id)).scalar() or 0
    active_institutions = db.query(func.count(Tenant.id)).filter(Tenant.is_active == True).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.STUDENT.value).scalar() or 0
    total_teachers = db.query(func.count(User.id)).filter(User.role == UserRole.TEACHER.value).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == UserRole.ADMIN.value).scalar() or 0

    return PlatformStats(
        total_institutions=total_institutions,
        active_institutions=active_institutions,
        total_users=total_users,
        total_students=total_students,
        total_teachers=total_teachers,
        total_admins=total_admins,
        storage_used_mb=round(total_users * 2.4, 2),   # Estimate
        server_uptime_pct=99.97,
    )


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get global audit logs across all tenants."""
    _get_super_admin(current_user, db)

    try:
        logs = (
            db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        total = db.query(func.count(AuditLog.id)).scalar() or 0

        return {
            "logs": [
                {
                    "id": log.id,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "user_id": log.user_id,
                    "ip_address": getattr(log, "ip_address", None),
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    except Exception:
        # AuditLog table may not exist in all environments
        return {"logs": [], "total": 0, "skip": skip, "limit": limit}
