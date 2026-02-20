from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.leave_service import LeaveService
from app.schemas.leave import (
    LeaveTypeCreate, LeaveTypeUpdate, LeaveTypeResponse, LeaveTypeListResponse,
    LeaveApplicationCreate, LeaveActionRequest, LeaveApplicationResponse,
    LeaveApplicationListResponse, LeaveBalanceResponse, LeaveCalendarEvent,
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
# Leave Types
# ═══════════════════════════════════════════════════════════════════════

@router.get("/types", response_model=LeaveTypeListResponse)
def list_leave_types(
    applies_to: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    items, total = service.get_leave_types(user.tenant_id, applies_to, is_active)
    return LeaveTypeListResponse(leave_types=[LeaveTypeResponse(**t) for t in items], total=total)


@router.post("/types", response_model=LeaveTypeResponse, status_code=status.HTTP_201_CREATED)
def create_leave_type(
    data: LeaveTypeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = LeaveService(db)
    return service.create_leave_type(data.model_dump(), user.tenant_id)


@router.put("/types/{type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    type_id: int,
    data: LeaveTypeUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = LeaveService(db)
    result = service.update_leave_type(type_id, data.model_dump(exclude_unset=True), user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Leave type not found")
    return result


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(
    type_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = LeaveService(db)
    if not service.delete_leave_type(type_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Leave type not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Leave Applications
# ═══════════════════════════════════════════════════════════════════════

@router.get("/applications", response_model=LeaveApplicationListResponse)
def list_applications(
    applicant_type: Optional[str] = None,
    teacher_id: Optional[int] = None,
    student_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    items, total = service.get_applications(user.tenant_id, applicant_type, teacher_id, student_id, status_filter, month, year)
    return LeaveApplicationListResponse(applications=[LeaveApplicationResponse(**a) for a in items], total=total)


@router.post("/applications", response_model=LeaveApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_leave(
    data: LeaveApplicationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    return service.apply_leave(data, user.tenant_id)


@router.put("/applications/{app_id}/action", response_model=LeaveApplicationResponse)
def action_leave(
    app_id: int,
    data: LeaveActionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = LeaveService(db)
    result = service.action_leave(app_id, data, user.id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Leave application not found")
    return result


@router.put("/applications/{app_id}/cancel", response_model=LeaveApplicationResponse)
def cancel_leave(
    app_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    result = service.cancel_leave(app_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="Leave application not found")
    return result


@router.delete("/applications/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = LeaveService(db)
    if not service.delete_application(app_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Leave application not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Balance & Calendar
# ═══════════════════════════════════════════════════════════════════════

@router.get("/balance/{applicant_type}/{applicant_id}", response_model=LeaveBalanceResponse)
def get_leave_balance(
    applicant_type: str,
    applicant_id: int,
    academic_year: str = "2025-26",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    return service.get_balance(applicant_type, applicant_id, user.tenant_id, academic_year)


@router.get("/calendar")
def leave_calendar(
    month: int,
    year: int,
    applicant_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = LeaveService(db)
    events = service.get_calendar(user.tenant_id, month, year, applicant_type)
    return {"events": [LeaveCalendarEvent(**e).model_dump() for e in events]}
