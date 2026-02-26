"""Feature Flags API router — enable/disable platform modules per plan."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()

# ─── In-memory feature flags (persisted to Settings table in production) ─────
# Defaults — overridden by DB values if present
_DEFAULT_FLAGS = {
    "ai_study_assistant":          {"enabled": True,  "scope": "Premium+",    "description": "Student AI tutor"},
    "face_recognition_attendance": {"enabled": False, "scope": "Enterprise",  "description": "Biometric check-in"},
    "whatsapp_notifications":      {"enabled": True,  "scope": "Standard+",   "description": "WA Business API"},
    "analytics_v2_beta":           {"enabled": False, "scope": "Beta",        "description": "New ML-powered insights"},
    "digital_library":             {"enabled": True,  "scope": "Premium+",    "description": "e-Book integration"},
    "online_fee_payment":          {"enabled": True,  "scope": "Standard+",   "description": "Razorpay/Stripe gateway"},
    "transport_tracking":          {"enabled": False, "scope": "Enterprise",  "description": "Live GPS bus tracking"},
    "hostel_management":           {"enabled": True,  "scope": "Standard+",   "description": "Hostel and room management"},
    "multi_campus":                {"enabled": False, "scope": "Enterprise",  "description": "Multiple campus support"},
    "parent_app":                  {"enabled": True,  "scope": "Standard+",   "description": "Parent mobile portal"},
}


def _get_admin_or_super(current_user: dict, db: Session) -> User:
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Super Admin access required",
        )
    return user


class FeatureFlag(BaseModel):
    name: str
    enabled: bool
    scope: str
    description: str


class ToggleRequest(BaseModel):
    enabled: bool


@router.get("", response_model=List[FeatureFlag])
def list_feature_flags(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all platform feature flags."""
    _get_admin_or_super(current_user, db)
    # Try to read persisted overrides from settings table
    try:
        from app.services.settings_service import SettingsService
        svc = SettingsService(db)
        persisted = svc.get_all_settings(tenant_id=None) or {}
    except Exception:
        persisted = {}

    flags = []
    for name, defaults in _DEFAULT_FLAGS.items():
        key = f"flag_{name}"
        enabled = persisted.get(key, defaults["enabled"])
        if isinstance(enabled, str):
            enabled = enabled.lower() == "true"
        flags.append(FeatureFlag(
            name=name,
            enabled=bool(enabled),
            scope=defaults["scope"],
            description=defaults["description"],
        ))
    return flags


@router.patch("/{flag_name}", response_model=FeatureFlag)
def toggle_feature_flag(
    flag_name: str,
    body: ToggleRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable or disable a specific feature flag."""
    _get_admin_or_super(current_user, db)

    if flag_name not in _DEFAULT_FLAGS:
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_name}' not found")

    # Persist to settings table
    try:
        from app.services.settings_service import SettingsService
        svc = SettingsService(db)
        svc.upsert_setting(key=f"flag_{flag_name}", value=str(body.enabled).lower(), tenant_id=None)
    except Exception:
        # Fall back to in-memory update if settings service doesn t support global scope
        _DEFAULT_FLAGS[flag_name]["enabled"] = body.enabled

    defaults = _DEFAULT_FLAGS[flag_name]
    return FeatureFlag(
        name=flag_name,
        enabled=body.enabled,
        scope=defaults["scope"],
        description=defaults["description"],
    )
