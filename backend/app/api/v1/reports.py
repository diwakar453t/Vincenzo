"""
Reports API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import io
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.reports import (
    ReportRequest, ReportResponse, ReportListResponse,
    ReportDataResponse, DashboardStatsResponse,
)
from app.services.report_service import ReportService

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
# Dashboard
# ═══════════════════════════════════════════════════════════════════════

@router.get("/dashboard", response_model=DashboardStatsResponse)
def report_dashboard(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return DashboardStatsResponse(**ReportService(db).get_dashboard(user.tenant_id))


# ═══════════════════════════════════════════════════════════════════════
# Generate reports
# ═══════════════════════════════════════════════════════════════════════

@router.post("/generate", response_model=ReportDataResponse)
def generate_report(req: ReportRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    try:
        kwargs = {}
        if req.start_date:
            kwargs["start_date"] = req.start_date
        if req.end_date:
            kwargs["end_date"] = req.end_date
        if req.class_id:
            kwargs["class_id"] = req.class_id
        if req.student_id:
            kwargs["student_id"] = req.student_id
        if req.teacher_id:
            kwargs["teacher_id"] = req.teacher_id

        data = ReportService(db).generate_report(req.report_type, user.tenant_id, **kwargs)
        return ReportDataResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Individual report type shortcuts (GET)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/student-attendance", response_model=ReportDataResponse)
def student_attendance_report(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    class_id: Optional[int] = None, student_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    data = ReportService(db).generate_student_attendance(
        user.tenant_id, start_date=start_date, end_date=end_date,
        class_id=class_id, student_id=student_id,
    )
    return ReportDataResponse(**data)


@router.get("/staff-attendance", response_model=ReportDataResponse)
def staff_attendance_report(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    teacher_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    data = ReportService(db).generate_staff_attendance(
        user.tenant_id, start_date=start_date, end_date=end_date,
        teacher_id=teacher_id,
    )
    return ReportDataResponse(**data)


@router.get("/academic-performance", response_model=ReportDataResponse)
def academic_performance_report(
    class_id: Optional[int] = None, student_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    data = ReportService(db).generate_academic_performance(
        user.tenant_id, class_id=class_id, student_id=student_id,
    )
    return ReportDataResponse(**data)


@router.get("/financial-summary", response_model=ReportDataResponse)
def financial_summary_report(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    data = ReportService(db).generate_financial_summary(
        user.tenant_id, start_date=start_date, end_date=end_date,
    )
    return ReportDataResponse(**data)


@router.get("/fee-collection", response_model=ReportDataResponse)
def fee_collection_report(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    class_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    data = ReportService(db).generate_fee_collection(
        user.tenant_id, start_date=start_date, end_date=end_date,
        class_id=class_id,
    )
    return ReportDataResponse(**data)


# ═══════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════

@router.post("/export/csv")
def export_csv(req: ReportRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    try:
        kwargs = {}
        if req.start_date: kwargs["start_date"] = req.start_date
        if req.end_date: kwargs["end_date"] = req.end_date
        if req.class_id: kwargs["class_id"] = req.class_id
        if req.student_id: kwargs["student_id"] = req.student_id
        if req.teacher_id: kwargs["teacher_id"] = req.teacher_id

        svc = ReportService(db)
        data = svc.generate_report(req.report_type, user.tenant_id, **kwargs)
        csv_content = svc.export_csv(data)
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={req.report_type}_report.csv"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════
# Saved reports
# ═══════════════════════════════════════════════════════════════════════

@router.get("/saved", response_model=ReportListResponse)
def list_saved_reports(
    report_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    reports, total = ReportService(db).get_saved_reports(user.tenant_id, report_type=report_type)
    return ReportListResponse(reports=[ReportResponse(**r) for r in reports], total=total)


@router.post("/save", response_model=ReportResponse)
def save_report(req: ReportRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        kwargs = {}
        if req.start_date: kwargs["start_date"] = req.start_date
        if req.end_date: kwargs["end_date"] = req.end_date
        if req.class_id: kwargs["class_id"] = req.class_id
        if req.student_id: kwargs["student_id"] = req.student_id

        svc = ReportService(db)
        data = svc.generate_report(req.report_type, user.tenant_id, **kwargs)
        saved = svc.save_report({
            "title": data["title"],
            "report_type": req.report_type,
            "format": req.format,
            "parameters": data["parameters"],
            "summary": str(data["summary"]),
            "record_count": data["record_count"],
        }, user.tenant_id, user.id)
        return ReportResponse(**saved)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/saved/{report_id}")
def delete_saved_report(report_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _require_admin(user)
    try:
        ReportService(db).delete_report(report_id, user.tenant_id)
        return {"message": "Report deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
