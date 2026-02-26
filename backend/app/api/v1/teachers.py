from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.teacher_service import TeacherService
from app.schemas.teacher import (
    TeacherCreate,
    TeacherUpdate,
    TeacherResponse,
    TeacherListResponse,
    TeacherListItem
)
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=TeacherListResponse)
def list_teachers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    specialization: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all teachers with pagination and filtering"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admins can view all teachers
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    service = TeacherService(db)
    teachers, total = service.get_teachers(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        specialization=specialization
    )
    
    # Convert to list items
    teacher_items = [
        TeacherListItem(
            id=t.id,
            employee_id=t.employee_id,
            first_name=t.first_name,
            last_name=t.last_name,
            full_name=t.full_name,
            phone=t.phone,
            specialization=t.specialization,
            status=t.status,
            hire_date=t.hire_date
        )
        for t in teachers
    ]
    
    return TeacherListResponse(
        teachers=teacher_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    teacher_data: TeacherCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create teachers")
    
    service = TeacherService(db)
    
    try:
        teacher = service.create_teacher(teacher_data, user.tenant_id)
        return TeacherResponse.model_validate(teacher)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher(
    teacher_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single teacher by ID"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = TeacherService(db)
    teacher = service.get_teacher(teacher_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    return TeacherResponse.model_validate(teacher)


@router.put("/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: int,
    teacher_data: TeacherUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update teachers")
    
    service = TeacherService(db)
    teacher = service.update_teacher(teacher_id, teacher_data, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    return TeacherResponse.model_validate(teacher)


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete teachers")
    
    service = TeacherService(db)
    success = service.delete_teacher(teacher_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{teacher_id}/classes/{class_id}")
def assign_class_teacher(
    teacher_id: int,
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a teacher as class teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can assign class teachers")
    
    service = TeacherService(db)
    success = service.assign_class_as_teacher(teacher_id, class_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Teacher or class not found")
    
    return {"message": "Teacher assigned as class teacher successfully"}


@router.post("/{teacher_id}/subjects/{subject_id}/classes/{class_id}")
def assign_subject_teacher(
    teacher_id: int,
    subject_id: int,
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a teacher to teach a subject in a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can assign subject teachers")
    
    service = TeacherService(db)
    success = service.assign_subject(teacher_id, subject_id, class_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Teacher, subject, or class not found")
    
    return {"message": "Teacher assigned to subject successfully"}
