"""
Settings & Configuration API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.settings import (
    SchoolSettingsUpdate, SchoolSettingsResponse,
    AcademicYearCreate, AcademicYearUpdate, AcademicYearResponse,
    PreferenceUpsert, PreferenceResponse, BulkPreferenceUpdate,
)
from app.services.settings_service import SettingsService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ═══════════════════════════════════════════════════════════════════════
# School Settings
# ═══════════════════════════════════════════════════════════════════════

@router.get("/school", response_model=SchoolSettingsResponse)
def get_school_settings(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return SchoolSettingsResponse(**SettingsService(db).get_school_settings(user.tenant_id))


@router.put("/school", response_model=SchoolSettingsResponse)
def update_school_settings(data: SchoolSettingsUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = SettingsService(db).update_school_settings(user.tenant_id, data.model_dump(exclude_none=True))
    return SchoolSettingsResponse(**result)


# ═══════════════════════════════════════════════════════════════════════
# Academic Years
# ═══════════════════════════════════════════════════════════════════════

@router.get("/academic-years", response_model=list[AcademicYearResponse])
def list_academic_years(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    years = SettingsService(db).list_academic_years(user.tenant_id)
    return [AcademicYearResponse(**y) for y in years]


@router.get("/academic-years/current")
def get_current_academic_year(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    year = SettingsService(db).get_current_academic_year(user.tenant_id)
    if not year:
        return {"message": "No current academic year set"}
    return AcademicYearResponse(**year)


@router.post("/academic-years", response_model=AcademicYearResponse)
def create_academic_year(data: AcademicYearCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = SettingsService(db).create_academic_year(user.tenant_id, data.model_dump())
    return AcademicYearResponse(**result)


@router.put("/academic-years/{year_id}", response_model=AcademicYearResponse)
def update_academic_year(year_id: int, data: AcademicYearUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = SettingsService(db).update_academic_year(year_id, user.tenant_id, data.model_dump(exclude_none=True))
    return AcademicYearResponse(**result)


@router.delete("/academic-years/{year_id}")
def delete_academic_year(year_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    SettingsService(db).delete_academic_year(year_id, user.tenant_id)
    return {"message": "Academic year deleted"}


# ═══════════════════════════════════════════════════════════════════════
# System Preferences
# ═══════════════════════════════════════════════════════════════════════

@router.get("/preferences", response_model=list[PreferenceResponse])
def get_preferences(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    prefs = SettingsService(db).get_all_preferences(user.tenant_id, category=category)
    return [PreferenceResponse(**p) for p in prefs]


@router.get("/preferences/{key}", response_model=PreferenceResponse)
def get_preference(key: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return PreferenceResponse(**SettingsService(db).get_preference(user.tenant_id, key))


@router.put("/preferences", response_model=PreferenceResponse)
def upsert_preference(data: PreferenceUpsert, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = SettingsService(db).upsert_preference(user.tenant_id, data.model_dump())
    return PreferenceResponse(**result)


@router.put("/preferences/bulk", response_model=list[PreferenceResponse])
def bulk_update_preferences(data: BulkPreferenceUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    results = SettingsService(db).bulk_update_preferences(user.tenant_id, [p.model_dump() for p in data.preferences])
    return [PreferenceResponse(**r) for r in results]


@router.delete("/preferences/{key}")
def delete_preference(key: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    SettingsService(db).delete_preference(user.tenant_id, key)
    return {"message": f"Preference '{key}' deleted"}
