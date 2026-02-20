"""
Settings & Configuration Service
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.settings import SchoolSettings, AcademicYear, SystemPreference
import logging

logger = logging.getLogger(__name__)

DEFAULT_PREFERENCES = [
    {"key": "date_format", "value": "DD/MM/YYYY", "category": "system", "description": "Date display format", "value_type": "string"},
    {"key": "time_format", "value": "12h", "category": "system", "description": "Time display format (12h/24h)", "value_type": "string"},
    {"key": "currency", "value": "INR", "category": "fees", "description": "Currency code", "value_type": "string"},
    {"key": "currency_symbol", "value": "₹", "category": "fees", "description": "Currency symbol", "value_type": "string"},
    {"key": "attendance_threshold", "value": "75", "category": "attendance", "description": "Minimum attendance percentage", "value_type": "number"},
    {"key": "late_fee_amount", "value": "100", "category": "fees", "description": "Late fee penalty amount", "value_type": "number"},
    {"key": "grading_system", "value": "percentage", "category": "academic", "description": "Grading system (percentage/gpa/grade)", "value_type": "string"},
    {"key": "primary_color", "value": "#3D5EE1", "category": "theme", "description": "Primary brand color", "value_type": "string"},
    {"key": "sidebar_color", "value": "#1a1a2e", "category": "theme", "description": "Sidebar background color", "value_type": "string"},
    {"key": "dark_mode", "value": "false", "category": "theme", "description": "Enable dark mode", "value_type": "boolean"},
    {"key": "enable_sms", "value": "false", "category": "notification", "description": "Enable SMS notifications", "value_type": "boolean"},
    {"key": "enable_email", "value": "true", "category": "notification", "description": "Enable email notifications", "value_type": "boolean"},
    {"key": "school_hours_start", "value": "08:00", "category": "system", "description": "School hours start time", "value_type": "string"},
    {"key": "school_hours_end", "value": "15:00", "category": "system", "description": "School hours end time", "value_type": "string"},
    {"key": "language", "value": "en", "category": "system", "description": "Default language", "value_type": "string"},
]


class SettingsService:
    def __init__(self, db: Session):
        self.db = db

    # ═════════════════════════════════════════════════════════════════════
    # School Settings
    # ═════════════════════════════════════════════════════════════════════

    def get_school_settings(self, tenant_id: str) -> dict:
        settings = self.db.query(SchoolSettings).filter(
            SchoolSettings.tenant_id == tenant_id
        ).first()
        if not settings:
            settings = SchoolSettings(tenant_id=tenant_id, school_name="PreSkool")
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return self._school_dict(settings)

    def update_school_settings(self, tenant_id: str, data: dict) -> dict:
        settings = self.db.query(SchoolSettings).filter(
            SchoolSettings.tenant_id == tenant_id
        ).first()
        if not settings:
            settings = SchoolSettings(tenant_id=tenant_id)
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)

        for key, val in data.items():
            if val is not None and hasattr(settings, key):
                setattr(settings, key, val)
        self.db.commit()
        self.db.refresh(settings)
        logger.info(f"🏫 School settings updated for tenant {tenant_id}")
        return self._school_dict(settings)

    # ═════════════════════════════════════════════════════════════════════
    # Academic Years
    # ═════════════════════════════════════════════════════════════════════

    def list_academic_years(self, tenant_id: str):
        years = self.db.query(AcademicYear).filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_active == True,
        ).order_by(AcademicYear.start_date.desc()).all()
        return [self._year_dict(y) for y in years]

    def create_academic_year(self, tenant_id: str, data: dict) -> dict:
        year = AcademicYear(tenant_id=tenant_id, **data)
        if data.get("is_current"):
            self.db.query(AcademicYear).filter(
                AcademicYear.tenant_id == tenant_id
            ).update({"is_current": False})
        self.db.add(year)
        self.db.commit()
        self.db.refresh(year)
        return self._year_dict(year)

    def update_academic_year(self, year_id: int, tenant_id: str, data: dict) -> dict:
        year = self.db.query(AcademicYear).filter(
            AcademicYear.id == year_id, AcademicYear.tenant_id == tenant_id
        ).first()
        if not year:
            raise HTTPException(status_code=404, detail="Academic year not found")
        if data.get("is_current"):
            self.db.query(AcademicYear).filter(
                AcademicYear.tenant_id == tenant_id
            ).update({"is_current": False})
        for key, val in data.items():
            if val is not None and hasattr(year, key):
                setattr(year, key, val)
        self.db.commit()
        self.db.refresh(year)
        return self._year_dict(year)

    def delete_academic_year(self, year_id: int, tenant_id: str):
        year = self.db.query(AcademicYear).filter(
            AcademicYear.id == year_id, AcademicYear.tenant_id == tenant_id
        ).first()
        if not year:
            raise HTTPException(status_code=404, detail="Academic year not found")
        year.is_active = False
        self.db.commit()

    def get_current_academic_year(self, tenant_id: str) -> dict:
        year = self.db.query(AcademicYear).filter(
            AcademicYear.tenant_id == tenant_id,
            AcademicYear.is_current == True,
        ).first()
        if not year:
            return None
        return self._year_dict(year)

    # ═════════════════════════════════════════════════════════════════════
    # System Preferences
    # ═════════════════════════════════════════════════════════════════════

    def get_all_preferences(self, tenant_id: str, category: str = None):
        self._seed_defaults(tenant_id)
        q = self.db.query(SystemPreference).filter(
            SystemPreference.tenant_id == tenant_id,
            SystemPreference.is_active == True,
        )
        if category:
            q = q.filter(SystemPreference.category == category)
        prefs = q.order_by(SystemPreference.category, SystemPreference.key).all()
        return [self._pref_dict(p) for p in prefs]

    def get_preference(self, tenant_id: str, key: str) -> dict:
        pref = self.db.query(SystemPreference).filter(
            SystemPreference.tenant_id == tenant_id,
            SystemPreference.key == key,
        ).first()
        if not pref:
            raise HTTPException(status_code=404, detail=f"Preference '{key}' not found")
        return self._pref_dict(pref)

    def upsert_preference(self, tenant_id: str, data: dict) -> dict:
        pref = self.db.query(SystemPreference).filter(
            SystemPreference.tenant_id == tenant_id,
            SystemPreference.key == data["key"],
        ).first()
        if pref:
            for k, v in data.items():
                if v is not None and hasattr(pref, k):
                    setattr(pref, k, v)
        else:
            pref = SystemPreference(tenant_id=tenant_id, **data)
            self.db.add(pref)
        self.db.commit()
        self.db.refresh(pref)
        return self._pref_dict(pref)

    def bulk_update_preferences(self, tenant_id: str, preferences: list) -> list:
        results = []
        for p in preferences:
            results.append(self.upsert_preference(tenant_id, p))
        return results

    def delete_preference(self, tenant_id: str, key: str):
        pref = self.db.query(SystemPreference).filter(
            SystemPreference.tenant_id == tenant_id,
            SystemPreference.key == key,
        ).first()
        if pref:
            pref.is_active = False
            self.db.commit()

    def _seed_defaults(self, tenant_id: str):
        """Seed default preferences if none exist."""
        count = self.db.query(SystemPreference).filter(
            SystemPreference.tenant_id == tenant_id
        ).count()
        if count == 0:
            for p in DEFAULT_PREFERENCES:
                self.db.add(SystemPreference(tenant_id=tenant_id, **p))
            self.db.commit()
            logger.info(f"⚙️ Seeded {len(DEFAULT_PREFERENCES)} default preferences for {tenant_id}")

    # ═════════════════════════════════════════════════════════════════════
    # Serializers
    # ═════════════════════════════════════════════════════════════════════

    def _school_dict(self, s) -> dict:
        return {c.name: getattr(s, c.name) for c in s.__table__.columns}

    def _year_dict(self, y) -> dict:
        return {c.name: getattr(y, c.name) for c in y.__table__.columns}

    def _pref_dict(self, p) -> dict:
        d = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        d["category"] = p.category.value if hasattr(p.category, 'value') else str(p.category)
        return d
