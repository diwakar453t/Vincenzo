"""
Settings & Configuration models
"""
import enum
from sqlalchemy import Column, String, Integer, Text, Boolean, Float, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SettingCategory(str, enum.Enum):
    school = "school"
    academic = "academic"
    system = "system"
    theme = "theme"
    notification = "notification"
    fees = "fees"
    attendance = "attendance"


class SchoolSettings(BaseModel):
    __tablename__ = "school_settings"

    # School Profile
    school_name = Column(String(300), nullable=False, default="PreSkool")
    school_code = Column(String(50), nullable=True)
    school_logo = Column(String(500), nullable=True)
    tagline = Column(String(300), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    pincode = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(300), nullable=True)
    established_year = Column(Integer, nullable=True)
    principal_name = Column(String(200), nullable=True)
    board_affiliation = Column(String(100), nullable=True)  # CBSE, ICSE, State Board
    school_type = Column(String(50), nullable=True)  # primary, secondary, higher_secondary

    def __repr__(self):
        return f"<SchoolSettings(name={self.school_name})>"


class AcademicYear(BaseModel):
    __tablename__ = "academic_years"

    name = Column(String(50), nullable=False)           # "2025-26"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<AcademicYear(name={self.name}, current={self.is_current})>"


class SystemPreference(BaseModel):
    __tablename__ = "system_preferences"

    key = Column(String(100), nullable=False, unique=True)
    value = Column(Text, nullable=True)
    category = Column(Enum(SettingCategory), default=SettingCategory.system, nullable=False)
    description = Column(String(300), nullable=True)
    value_type = Column(String(20), default="string")   # string, boolean, number, json
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<SystemPreference(key={self.key}, value={self.value})>"
