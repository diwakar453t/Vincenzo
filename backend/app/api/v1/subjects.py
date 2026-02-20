from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.subject_service import SubjectService
from app.schemas.subject import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    SubjectListResponse,
    SubjectListItem,
    SubjectGroupCreate,
    SubjectGroupUpdate,
    SubjectGroupResponse,
    SubjectGroupListItem,
    SubjectGroupListResponse,
    ClassSubjectCreate,
    ClassSubjectInfo,
    ClassSubjectsResponse,
)
from app.models.user import User

router = APIRouter()


# ─── Helper: get user or raise ───────────────────────────────────────────

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
# Subject endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=SubjectListResponse)
def list_subjects(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    subject_type: Optional[str] = None,
    group_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all subjects with pagination and filtering"""
    user = _get_user(current_user, db)
    service = SubjectService(db)
    subjects, total = service.get_subjects(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        subject_type=subject_type,
        group_id=group_id,
    )

    subject_items = [
        SubjectListItem(
            id=s.id,
            name=s.name,
            code=s.code,
            credits=s.credits,
            subject_type=s.subject_type or "theory",
            group_id=s.group_id,
            group_name=s.group.name if s.group else None,
        )
        for s in subjects
    ]

    return SubjectListResponse(
        subjects=subject_items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_data: SubjectCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subject"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    try:
        subject = service.create_subject(subject_data, user.tenant_id)
        resp = SubjectResponse.model_validate(subject)
        resp.group_name = subject.group.name if subject.group else None
        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single subject by ID"""
    user = _get_user(current_user, db)
    service = SubjectService(db)
    subject = service.get_subject(subject_id, user.tenant_id)

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    resp = SubjectResponse.model_validate(subject)
    resp.group_name = subject.group.name if subject.group else None
    return resp


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subject"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    try:
        subject = service.update_subject(subject_id, subject_data, user.tenant_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        resp = SubjectResponse.model_validate(subject)
        resp.group_name = subject.group.name if subject.group else None
        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subject"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    try:
        success = service.delete_subject(subject_id, user.tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Subject not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# Subject Group endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/groups/list", response_model=SubjectGroupListResponse)
def list_subject_groups(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all subject groups"""
    user = _get_user(current_user, db)
    service = SubjectService(db)
    groups = service.get_groups(user.tenant_id)

    group_items = [
        SubjectGroupListItem(
            id=g.id,
            name=g.name,
            description=g.description,
            subject_count=service.get_group_subject_count(g.id, user.tenant_id),
        )
        for g in groups
    ]

    return SubjectGroupListResponse(groups=group_items, total=len(group_items))


@router.post("/groups", response_model=SubjectGroupResponse, status_code=status.HTTP_201_CREATED)
def create_subject_group(
    data: SubjectGroupCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new subject group"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    group = service.create_group(data, user.tenant_id)
    return SubjectGroupResponse.model_validate(group)


@router.put("/groups/{group_id}", response_model=SubjectGroupResponse)
def update_subject_group(
    group_id: int,
    data: SubjectGroupUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a subject group"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    group = service.update_group(group_id, data, user.tenant_id)
    if not group:
        raise HTTPException(status_code=404, detail="Subject group not found")
    return SubjectGroupResponse.model_validate(group)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject_group(
    group_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a subject group"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    success = service.delete_group(group_id, user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subject group not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════
# Class-Subject Assignment endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{subject_id}/assign/{class_id}", status_code=status.HTTP_200_OK)
def assign_subject_to_class(
    subject_id: int,
    class_id: int,
    data: ClassSubjectCreate = ClassSubjectCreate(),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a subject to a class"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    try:
        service.assign_subject_to_class(
            subject_id=subject_id,
            class_id=class_id,
            tenant_id=user.tenant_id,
            teacher_id=data.teacher_id,
        )
        return {"message": "Subject assigned to class successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{subject_id}/unassign/{class_id}", status_code=status.HTTP_200_OK)
def unassign_subject_from_class(
    subject_id: int,
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove subject assignment from a class"""
    user = _get_user(current_user, db)
    _require_admin(user)

    service = SubjectService(db)
    success = service.unassign_subject_from_class(subject_id, class_id, user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")

    return {"message": "Subject unassigned from class successfully"}


@router.get("/class/{class_id}/subjects", response_model=ClassSubjectsResponse)
def get_class_subjects(
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all subjects assigned to a class"""
    user = _get_user(current_user, db)

    from app.models.class_model import Class
    class_obj = db.query(Class).filter(
        Class.id == class_id, Class.tenant_id == user.tenant_id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    service = SubjectService(db)
    subjects = service.get_class_subjects(class_id, user.tenant_id)

    return ClassSubjectsResponse(
        class_id=class_id,
        class_name=class_obj.name,
        subjects=[ClassSubjectInfo(**s) for s in subjects],
        total=len(subjects),
    )
