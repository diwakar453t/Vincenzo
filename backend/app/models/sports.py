"""
Sports Management models
"""
import enum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, Date, Enum, ForeignKey
from app.models.base import BaseModel


class SportCategory(str, enum.Enum):
    team = "team"
    individual = "individual"
    aquatic = "aquatic"
    athletics = "athletics"
    combat = "combat"
    racquet = "racquet"
    other = "other"


class SportStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    seasonal = "seasonal"


class ParticipationStatus(str, enum.Enum):
    registered = "registered"
    active = "active"
    dropped = "dropped"
    completed = "completed"


class AchievementLevel(str, enum.Enum):
    school = "school"
    district = "district"
    state = "state"
    national = "national"
    international = "international"


class AchievementType(str, enum.Enum):
    gold = "gold"
    silver = "silver"
    bronze = "bronze"
    participation = "participation"
    mvp = "mvp"
    best_player = "best_player"
    special = "special"


class Sport(BaseModel):
    __tablename__ = "sports"

    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=True)
    category = Column(Enum(SportCategory), nullable=False, default=SportCategory.team)
    description = Column(Text, nullable=True)
    coach_name = Column(String(200), nullable=True)
    coach_phone = Column(String(20), nullable=True)
    venue = Column(String(200), nullable=True)
    practice_schedule = Column(String(200), nullable=True)  # e.g., "Mon,Wed,Fri 4:00-5:30 PM"
    max_participants = Column(Integer, nullable=False, default=30)
    current_participants = Column(Integer, nullable=False, default=0)
    season = Column(String(50), nullable=True)
    registration_fee = Column(Float, nullable=False, default=0)
    equipment_provided = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(SportStatus), nullable=False, default=SportStatus.active)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Sport(name={self.name}, category={self.category})>"


class SportParticipation(BaseModel):
    __tablename__ = "sport_participations"

    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    registration_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    position = Column(String(50), nullable=True)  # e.g. "Captain", "Goalkeeper"
    jersey_number = Column(String(10), nullable=True)
    fee_paid = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(ParticipationStatus), nullable=False, default=ParticipationStatus.registered)
    remarks = Column(Text, nullable=True)

    def __repr__(self):
        return f"<SportParticipation(sport={self.sport_id}, student={self.student_id})>"


class SportAchievement(BaseModel):
    __tablename__ = "sport_achievements"

    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(300), nullable=False)
    achievement_type = Column(Enum(AchievementType), nullable=False, default=AchievementType.participation)
    level = Column(Enum(AchievementLevel), nullable=False, default=AchievementLevel.school)
    event_name = Column(String(300), nullable=True)
    event_date = Column(Date, nullable=True)
    event_venue = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)

    def __repr__(self):
        return f"<SportAchievement(title={self.title}, type={self.achievement_type})>"
