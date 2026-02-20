from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.timetable_service import TimetableService
from app.schemas.timetable import (
    TimetableCreate, TimetableUpdate, TimetableResponse,
    TimetableListResponse, TimetableListItem,
    PeriodCreate, PeriodUpdate, PeriodResponse,
    ConflictCheckResponse, ConflictItem,
    BulkPeriodsCreate,
)
from app.models.user import User

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")


# ═══════════════════════════════════════════════════════════════════════════
# Timetable endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=TimetableListResponse)
def list_timetables(
    class_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = TimetableService(db)
    items, total = service.get_timetables(user.tenant_id, class_id, status)
    return TimetableListResponse(
        timetables=[TimetableListItem(**item) for item in items],
        total=total,
    )


@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(
    timetable_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = TimetableService(db)
    result = service.get_timetable(timetable_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return result


@router.post("/", response_model=TimetableResponse, status_code=status.HTTP_201_CREATED)
def create_timetable(
    data: TimetableCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    try:
        t = service.create_timetable(data, user.tenant_id)
        return service.get_timetable(t.id, user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{timetable_id}", response_model=TimetableResponse)
def update_timetable(
    timetable_id: int,
    data: TimetableUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    result = service.update_timetable(timetable_id, data, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Timetable not found")
    return service.get_timetable(timetable_id, user.tenant_id)


@router.delete("/{timetable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable(
    timetable_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    if not service.delete_timetable(timetable_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Timetable not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# Period endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{timetable_id}/periods", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
def add_period(
    timetable_id: int,
    data: PeriodCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    try:
        p = service.add_period(timetable_id, data, user.tenant_id)
        detail = service.get_timetable(timetable_id, user.tenant_id)
        # Return matching period from detail
        for pd in detail.get("periods", []):
            if pd["id"] == p.id:
                return pd
        return PeriodResponse.model_validate(p)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{timetable_id}/periods/bulk", response_model=TimetableResponse)
def add_periods_bulk(
    timetable_id: int,
    data: BulkPeriodsCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add multiple periods at once"""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    try:
        service.add_periods_bulk(timetable_id, data.periods, user.tenant_id)
        return service.get_timetable(timetable_id, user.tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/periods/{period_id}", response_model=PeriodResponse)
def update_period(
    period_id: int,
    data: PeriodUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    p = service.update_period(period_id, data, user.tenant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Period not found")
    # Return from detail to get joined names
    tt_detail = service.get_timetable(p.timetable_id, user.tenant_id)
    for pd in tt_detail.get("periods", []):
        if pd["id"] == p.id:
            return pd
    return PeriodResponse.model_validate(p)


@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_period(
    period_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = TimetableService(db)
    if not service.delete_period(period_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Period not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# Conflict check endpoint
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/{timetable_id}/conflicts", response_model=ConflictCheckResponse)
def check_conflicts(
    timetable_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check for teacher and room scheduling conflicts."""
    user = _get_user(current_user, db)
    service = TimetableService(db)
    conflicts = service.check_conflicts(timetable_id, user.tenant_id)
    return ConflictCheckResponse(
        has_conflicts=len(conflicts) > 0,
        conflicts=[ConflictItem(**c) for c in conflicts],
    )
