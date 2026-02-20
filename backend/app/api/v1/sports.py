"""
Sports Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.sports import (
    SportCreate, SportUpdate, SportResponse, SportListResponse,
    ParticipationCreate, ParticipationUpdate, ParticipationResponse, ParticipationListResponse,
    AchievementCreate, AchievementUpdate, AchievementResponse, AchievementListResponse,
    SportsStatsResponse,
)
from app.services.sports_service import SportsService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ═══════════════════════════════════════════════════════════════════════
# Sports
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=SportListResponse)
def list_sports(
    category: Optional[str] = None, status: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    sports, total = SportsService(db).get_sports(user.tenant_id, category=category, status=status)
    return SportListResponse(sports=[SportResponse(**s) for s in sports], total=total)


@router.post("/", response_model=SportResponse)
def create_sport(data: SportCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    return SportResponse(**SportsService(db).create_sport(data.model_dump(), user.tenant_id))


@router.put("/{sport_id}", response_model=SportResponse)
def update_sport(sport_id: int, data: SportUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return SportResponse(**SportsService(db).update_sport(sport_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{sport_id}")
def delete_sport(sport_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        SportsService(db).delete_sport(sport_id, user.tenant_id)
        return {"message": "Sport deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Participations (Registration)
# ═══════════════════════════════════════════════════════════════════════

@router.post("/register", response_model=ParticipationResponse)
def register_student(data: ParticipationCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return ParticipationResponse(**SportsService(db).register_student(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/participations", response_model=ParticipationListResponse)
def list_participations(
    sport_id: Optional[int] = None, student_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    parts, total = SportsService(db).get_participations(user.tenant_id, sport_id=sport_id,
                                                         student_id=student_id, status=status)
    return ParticipationListResponse(participations=[ParticipationResponse(**p) for p in parts], total=total)


@router.put("/participations/{part_id}", response_model=ParticipationResponse)
def update_participation(part_id: int, data: ParticipationUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return ParticipationResponse(**SportsService(db).update_participation(part_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/participations/{part_id}")
def delete_participation(part_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        SportsService(db).delete_participation(part_id, user.tenant_id)
        return {"message": "Participation removed"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Achievements
# ═══════════════════════════════════════════════════════════════════════

@router.post("/achievements", response_model=AchievementResponse)
def create_achievement(data: AchievementCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AchievementResponse(**SportsService(db).create_achievement(data.model_dump(), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/achievements", response_model=AchievementListResponse)
def list_achievements(
    sport_id: Optional[int] = None, student_id: Optional[int] = None,
    level: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    achs, total = SportsService(db).get_achievements(user.tenant_id, sport_id=sport_id,
                                                      student_id=student_id, level=level)
    return AchievementListResponse(achievements=[AchievementResponse(**a) for a in achs], total=total)


@router.put("/achievements/{ach_id}", response_model=AchievementResponse)
def update_achievement(ach_id: int, data: AchievementUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        return AchievementResponse(**SportsService(db).update_achievement(ach_id, data.model_dump(exclude_unset=True), user.tenant_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/achievements/{ach_id}")
def delete_achievement(ach_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        SportsService(db).delete_achievement(ach_id, user.tenant_id)
        return {"message": "Achievement deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Stats
# ═══════════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=SportsStatsResponse)
def sports_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return SportsStatsResponse(**SportsService(db).get_stats(user.tenant_id))
