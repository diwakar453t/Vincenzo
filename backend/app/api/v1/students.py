from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.student_service import StudentService
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentListResponse,
    StudentListItem
)
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=StudentListResponse)
def list_students(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    class_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all students with pagination and filtering"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admins, teachers, and super_admin can view all students
    if user.role not in ["admin", "teacher", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Enforce safe pagination limits
    limit = min(limit, 200)
    skip = max(skip, 0)
    
    service = StudentService(db)
    students, total = service.get_students(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        class_id=class_id,
        status=status
    )
    
    # Convert to list items
    student_items = [
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
    
    return StudentListResponse(
        students=student_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    student_data: StudentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new student"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can create students")
    
    service = StudentService(db)
    
    try:
        student = service.create_student(student_data, user.tenant_id)
        return StudentResponse.model_validate(student)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single student by ID"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = StudentService(db)
    student = service.get_student(student_id, user.tenant_id)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return StudentResponse.model_validate(student)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    student_data: StudentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a student"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update students")
    
    service = StudentService(db)
    student = service.update_student(student_id, student_data, user.tenant_id)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return StudentResponse.model_validate(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a student"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete students")
    
    service = StudentService(db)
    success = service.delete_student(student_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/bulk")
def bulk_import_students(
    csv_content: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk import students from CSV"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can import students")
    
    service = StudentService(db)
    results = service.bulk_import_students(csv_content, user.tenant_id)
    
    return results


@router.get("/export/csv")
def export_students(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all students to CSV"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can export students")
    
    service = StudentService(db)
    csv_data = service.export_students(user.tenant_id)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"}
    )
