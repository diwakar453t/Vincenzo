from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.class_service import ClassService
from app.schemas.class_schema import (
    ClassCreate,
    ClassUpdate,
    ClassResponse,
    ClassListResponse,
    ClassListItem
)
from app.schemas.student import StudentListItem
from app.models.user import User

router = APIRouter()


class AssignStudentsRequest(BaseModel):
    """Request body for assigning students to a class"""
    student_ids: List[int]


@router.get("/", response_model=ClassListResponse)
def list_classes(
    skip: int = 0,
    limit: int = 50,
    academic_year: Optional[str] = None,
    grade_level: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all classes with pagination and filtering"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ClassService(db)
    classes, total = service.get_classes(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        academic_year=academic_year,
        grade_level=grade_level
    )
    
    # Convert to list items with student count
    class_items = []
    for c in classes:
        student_count = service.get_student_count(c.id, user.tenant_id)
        class_items.append(
            ClassListItem(
                id=c.id,
                name=c.name,
                grade_level=c.grade_level,
                section=c.section,
                academic_year=c.academic_year,
                room_number=c.room_number,
                capacity=c.capacity,
                class_teacher_id=c.class_teacher_id,
                student_count=student_count
            )
        )
    
    return ClassListResponse(
        classes=class_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    class_data: ClassCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create classes")
    
    service = ClassService(db)
    class_obj = service.create_class(class_data, user.tenant_id)
    
    student_count = service.get_student_count(class_obj.id, user.tenant_id)
    response = ClassResponse.model_validate(class_obj)
    response.student_count = student_count
    
    return response


@router.get("/{class_id}", response_model=ClassResponse)
def get_class(
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single class by ID"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ClassService(db)
    class_obj = service.get_class(class_id, user.tenant_id)
    
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    student_count = service.get_student_count(class_id, user.tenant_id)
    response = ClassResponse.model_validate(class_obj)
    response.student_count = student_count
    
    return response


@router.put("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    class_data: ClassUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update classes")
    
    service = ClassService(db)
    class_obj = service.update_class(class_id, class_data, user.tenant_id)
    
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    
    student_count = service.get_student_count(class_id, user.tenant_id)
    response = ClassResponse.model_validate(class_obj)
    response.student_count = student_count
    
    return response


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete classes")
    
    service = ClassService(db)
    
    try:
        success = service.delete_class(class_id, user.tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Class not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{class_id}/students", response_model=List[StudentListItem])
def get_class_students(
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students in a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = ClassService(db)
    students = service.get_class_students(class_id, user.tenant_id)
    
    return [
        StudentListItem(
            id=s.id,
            student_id=s.student_id,
            first_name=s.first_name,
            last_name=s.last_name,
            full_name=s.full_name,
            email=s.email,
            phone=s.phone,
            class_id=s.class_id,
            status=s.status,
            enrollment_date=s.enrollment_date
        )
        for s in students
    ]


@router.post("/{class_id}/students")
def assign_students_to_class(
    class_id: int,
    request: AssignStudentsRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign multiple students to a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign students")
    
    service = ClassService(db)
    
    try:
        count = service.assign_students(class_id, request.student_ids, user.tenant_id)
        return {"message": f"Successfully assigned {count} students to class"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
