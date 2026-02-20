"""
Sports Management schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── Sport ───────────────────────────────────────────────────────────────

class SportCreate(BaseModel):
    name: str
    code: Optional[str] = None
    category: str = "team"
    description: Optional[str] = None
    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    venue: Optional[str] = None
    practice_schedule: Optional[str] = None
    max_participants: int = 30
    season: Optional[str] = None
    registration_fee: float = 0
    equipment_provided: bool = False


class SportUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    venue: Optional[str] = None
    practice_schedule: Optional[str] = None
    max_participants: Optional[int] = None
    season: Optional[str] = None
    registration_fee: Optional[float] = None
    equipment_provided: Optional[bool] = None
    is_active: Optional[bool] = None


class SportResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    code: Optional[str] = None
    category: str
    description: Optional[str] = None
    coach_name: Optional[str] = None
    coach_phone: Optional[str] = None
    venue: Optional[str] = None
    practice_schedule: Optional[str] = None
    max_participants: int
    current_participants: int
    available_slots: Optional[int] = 0
    season: Optional[str] = None
    registration_fee: float
    equipment_provided: bool
    status: str
    is_active: bool
    achievements_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Participation ──────────────────────────────────────────────────────

class ParticipationCreate(BaseModel):
    sport_id: int
    student_id: int
    position: Optional[str] = None
    jersey_number: Optional[str] = None
    remarks: Optional[str] = None


class ParticipationUpdate(BaseModel):
    position: Optional[str] = None
    jersey_number: Optional[str] = None
    fee_paid: Optional[bool] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class ParticipationResponse(BaseModel):
    id: int
    tenant_id: str
    sport_id: int
    sport_name: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    registration_date: str
    end_date: Optional[str] = None
    position: Optional[str] = None
    jersey_number: Optional[str] = None
    fee_paid: bool
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Achievement ─────────────────────────────────────────────────────────

class AchievementCreate(BaseModel):
    sport_id: int
    student_id: Optional[int] = None
    title: str
    achievement_type: str = "participation"
    level: str = "school"
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    event_venue: Optional[str] = None
    description: Optional[str] = None


class AchievementUpdate(BaseModel):
    title: Optional[str] = None
    achievement_type: Optional[str] = None
    level: Optional[str] = None
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    event_venue: Optional[str] = None
    description: Optional[str] = None
    student_id: Optional[int] = None


class AchievementResponse(BaseModel):
    id: int
    tenant_id: str
    sport_id: int
    sport_name: Optional[str] = None
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    title: str
    achievement_type: str
    level: str
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    event_venue: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Lists & Stats ──────────────────────────────────────────────────────

class SportListResponse(BaseModel):
    sports: List[SportResponse]
    total: int

class ParticipationListResponse(BaseModel):
    participations: List[ParticipationResponse]
    total: int

class AchievementListResponse(BaseModel):
    achievements: List[AchievementResponse]
    total: int

class SportsStatsResponse(BaseModel):
    total_sports: int
    active_sports: int
    total_participants: int
    total_achievements: int
    category_breakdown: List[dict]
    achievement_breakdown: List[dict]
