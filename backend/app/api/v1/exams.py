from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.exam_service import ExamService
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamListResponse, ExamListItem,
    ExamScheduleCreate, ExamScheduleUpdate, ExamScheduleResponse,
    ExamCalendarResponse, CalendarEvent,
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


# ═══════════════════════════════════════════════════════════════════════
# Exam endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ExamListResponse)
def list_exams(
    class_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    exam_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = ExamService(db)
    items, total = service.get_exams(user.tenant_id, class_id, status_filter, exam_type, search)
    return ExamListResponse(exams=[ExamListItem(**i) for i in items], total=total)


@router.get("/calendar", response_model=ExamCalendarResponse)
def exam_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    class_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = ExamService(db)
    events = service.get_calendar(user.tenant_id, month, year, class_id)
    return ExamCalendarResponse(events=[CalendarEvent(**e) for e in events])


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = ExamService(db)
    result = service.get_exam(exam_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Exam not found")
    return result


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    data: ExamCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    try:
        e = service.create_exam(data, user.tenant_id)
        return service.get_exam(e.id, user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: int,
    data: ExamUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    result = service.update_exam(exam_id, data, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Exam not found")
    return service.get_exam(exam_id, user.tenant_id)


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    if not service.delete_exam(exam_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Exam not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Schedule endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.post("/{exam_id}/schedules", response_model=ExamScheduleResponse, status_code=status.HTTP_201_CREATED)
def add_schedule(
    exam_id: int,
    data: ExamScheduleCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    try:
        s = service.add_schedule(exam_id, data, user.tenant_id)
        detail = service.get_exam(exam_id, user.tenant_id)
        for sch in detail.get("schedules", []):
            if sch["id"] == s.id:
                return sch
        return ExamScheduleResponse.model_validate(s)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/schedules/{schedule_id}", response_model=ExamScheduleResponse)
def update_schedule(
    schedule_id: int,
    data: ExamScheduleUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    s = service.update_schedule(schedule_id, data, user.tenant_id)
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    detail = service.get_exam(s.exam_id, user.tenant_id)
    for sch in detail.get("schedules", []):
        if sch["id"] == s.id:
            return sch
    return ExamScheduleResponse.model_validate(s)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = ExamService(db)
    if not service.delete_schedule(schedule_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Schedule not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
