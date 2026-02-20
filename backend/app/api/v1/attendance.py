from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.attendance_service import AttendanceService
from app.schemas.attendance import (
    StudentAttendanceCreate, StudentAttendanceBulk, StudentAttendanceUpdate,
    StudentAttendanceResponse, StudentAttendanceListResponse,
    StaffAttendanceCreate, StaffAttendanceBulk, StaffAttendanceUpdate,
    StaffAttendanceResponse, StaffAttendanceListResponse,
    AttendanceStats, StudentAttendanceReport, ClassAttendanceReport,
    MonthlyAttendanceResponse,
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
# Student Attendance
# ═══════════════════════════════════════════════════════════════════════

@router.get("/students", response_model=StudentAttendanceListResponse)
def list_student_attendance(
    class_id: Optional[int] = None,
    student_id: Optional[int] = None,
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    from datetime import date as dt_date
    target = dt_date.fromisoformat(date) if date else None
    items, total = service.get_student_attendance(user.tenant_id, class_id, student_id, target, month, year)
    return StudentAttendanceListResponse(records=[StudentAttendanceResponse(**r) for r in items], total=total)


@router.post("/students", response_model=StudentAttendanceResponse, status_code=status.HTTP_201_CREATED)
def mark_student(
    data: StudentAttendanceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    a = service.mark_student_attendance(data, user.tenant_id)
    d = service._student_att_dict(a)
    return d


@router.post("/students/bulk", response_model=StudentAttendanceListResponse)
def bulk_mark_students(
    data: StudentAttendanceBulk,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    items = service.bulk_mark_student_attendance(data, user.tenant_id)
    return StudentAttendanceListResponse(records=[StudentAttendanceResponse(**r) for r in items], total=len(items))


@router.delete("/students/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_attendance(
    attendance_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    if not service.delete_student_attendance(attendance_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Staff Attendance
# ═══════════════════════════════════════════════════════════════════════

@router.get("/staff", response_model=StaffAttendanceListResponse)
def list_staff_attendance(
    teacher_id: Optional[int] = None,
    date: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    from datetime import date as dt_date
    target = dt_date.fromisoformat(date) if date else None
    items, total = service.get_staff_attendance(user.tenant_id, teacher_id, target, month, year)
    return StaffAttendanceListResponse(records=[StaffAttendanceResponse(**r) for r in items], total=total)


@router.post("/staff", response_model=StaffAttendanceResponse, status_code=status.HTTP_201_CREATED)
def mark_staff(
    data: StaffAttendanceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    a = service.mark_staff_attendance(data, user.tenant_id)
    d = service._staff_att_dict(a)
    return d


@router.post("/staff/bulk", response_model=StaffAttendanceListResponse)
def bulk_mark_staff(
    data: StaffAttendanceBulk,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    items = service.bulk_mark_staff_attendance(data, user.tenant_id)
    return StaffAttendanceListResponse(records=[StaffAttendanceResponse(**r) for r in items], total=len(items))


@router.delete("/staff/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff_attendance(
    attendance_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = AttendanceService(db)
    if not service.delete_staff_attendance(attendance_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Record not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# Statistics & Reports
# ═══════════════════════════════════════════════════════════════════════

@router.get("/students/stats/{student_id}", response_model=AttendanceStats)
def student_stats(
    student_id: int,
    academic_year: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    return service.student_attendance_stats(student_id, user.tenant_id, academic_year)


@router.get("/staff/stats/{teacher_id}", response_model=AttendanceStats)
def staff_stats(
    teacher_id: int,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    return service.staff_attendance_stats(teacher_id, user.tenant_id, month, year)


@router.get("/class-report/{class_id}", response_model=ClassAttendanceReport)
def class_daily_report(
    class_id: int,
    date: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    from datetime import date as dt_date
    return service.class_daily_report(class_id, dt_date.fromisoformat(date), user.tenant_id)


@router.get("/students/monthly/{student_id}", response_model=MonthlyAttendanceResponse)
def student_monthly(
    student_id: int,
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    return service.student_monthly_view(student_id, month, year, user.tenant_id)


@router.get("/staff/monthly/{teacher_id}", response_model=MonthlyAttendanceResponse)
def staff_monthly(
    teacher_id: int,
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    return service.staff_monthly_view(teacher_id, month, year, user.tenant_id)


@router.get("/class-report/{class_id}/full")
def class_full_report(
    class_id: int,
    academic_year: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = AttendanceService(db)
    return service.class_attendance_report(class_id, user.tenant_id, academic_year)
