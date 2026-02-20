from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.grade_service import GradeService
from app.schemas.grade import (
    GradeCategoryCreate, GradeCategoryUpdate, GradeCategoryResponse, GradeCategoryListResponse,
    GradeCreate, GradeUpdate, GradeBulkEntry, GradeResponse, GradeListResponse,
    StudentGPA, ReportCardResponse,
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
# Grade Category (scale) endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=GradeCategoryListResponse)
def list_categories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = GradeService(db)
    cats = service.get_categories(user.tenant_id)
    return GradeCategoryListResponse(categories=[GradeCategoryResponse(**c) for c in cats])


@router.post("/categories", response_model=GradeCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: GradeCategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    c = service.create_category(data, user.tenant_id)
    cats = service.get_categories(user.tenant_id)
    for cat in cats:
        if cat["id"] == c.id:
            return cat
    return GradeCategoryResponse.model_validate(c)


@router.put("/categories/{category_id}", response_model=GradeCategoryResponse)
def update_category(
    category_id: int,
    data: GradeCategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    c = service.update_category(category_id, data, user.tenant_id)
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    cats = service.get_categories(user.tenant_id)
    for cat in cats:
        if cat["id"] == c.id:
            return cat
    return GradeCategoryResponse.model_validate(c)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    if not service.delete_category(category_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/categories/seed", response_model=GradeCategoryListResponse)
def seed_categories(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seed default grading scale (A+…F) if none exists."""
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    service.seed_default_categories(user.tenant_id)
    cats = service.get_categories(user.tenant_id)
    return GradeCategoryListResponse(categories=[GradeCategoryResponse(**c) for c in cats])


# ═══════════════════════════════════════════════════════════════════════
# Grade endpoints
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=GradeListResponse)
def list_grades(
    exam_id: Optional[int] = None,
    class_id: Optional[int] = None,
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = GradeService(db)
    items, total = service.get_grades(user.tenant_id, exam_id, class_id, student_id, subject_id)
    return GradeListResponse(grades=[GradeResponse(**g) for g in items], total=total)


@router.post("/", response_model=GradeResponse, status_code=status.HTTP_201_CREATED)
def create_grade(
    data: GradeCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    g = service.create_grade(data, user.tenant_id)
    items, _ = service.get_grades(user.tenant_id, student_id=g.student_id, exam_id=g.exam_id, subject_id=g.subject_id)
    return items[0] if items else GradeResponse.model_validate(g)


@router.post("/bulk", response_model=GradeListResponse)
def bulk_create_grades(
    data: GradeBulkEntry,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    service.bulk_create_grades(data, user.tenant_id)
    items, total = service.get_grades(user.tenant_id, exam_id=data.exam_id, subject_id=data.subject_id, class_id=data.class_id)
    return GradeListResponse(grades=[GradeResponse(**g) for g in items], total=total)


@router.put("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    data: GradeUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    g = service.update_grade(grade_id, data, user.tenant_id)
    if not g:
        raise HTTPException(status_code=404, detail="Grade not found")
    items, _ = service.get_grades(user.tenant_id, student_id=g.student_id, exam_id=g.exam_id, subject_id=g.subject_id)
    return items[0] if items else GradeResponse.model_validate(g)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    _require_admin(user)
    service = GradeService(db)
    if not service.delete_grade(grade_id, user.tenant_id):
        raise HTTPException(status_code=404, detail="Grade not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# GPA & Report Card
# ═══════════════════════════════════════════════════════════════════════

@router.get("/gpa/{student_id}/{exam_id}", response_model=StudentGPA)
def get_student_gpa(
    student_id: int,
    exam_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = GradeService(db)
    result = service.calculate_gpa(student_id, exam_id, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="No grades found for this student/exam")
    return result


@router.get("/report-card/{student_id}", response_model=ReportCardResponse)
def get_report_card(
    student_id: int,
    academic_year: str = "2025-26",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    service = GradeService(db)
    result = service.generate_report_card(student_id, academic_year, user.tenant_id)
    if not result:
        raise HTTPException(status_code=404, detail="No grades found for this student")
    return result
