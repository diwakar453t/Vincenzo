from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.guardian_service import GuardianService
from app.schemas.guardian import (
    GuardianCreate,
    GuardianUpdate,
    GuardianResponse,
    GuardianListResponse,
    GuardianListItem,
    LinkedStudentInfo,
)
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=GuardianListResponse)
def list_guardians(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    relationship_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all guardians with pagination and filtering"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    service = GuardianService(db)
    guardians, total = service.get_guardians(
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        relationship_type=relationship_type
    )
    
    guardian_items = [
        GuardianListItem(
            id=g.id,
            first_name=g.first_name,
            last_name=g.last_name,
            full_name=g.full_name,
            email=g.email,
            phone=g.phone,
            relationship_type=g.relationship_type,
            status=g.status,
            student_count=len(g.students) if g.students else 0
        )
        for g in guardians
    ]
    
    return GuardianListResponse(
        guardians=guardian_items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=GuardianResponse, status_code=status.HTTP_201_CREATED)
def create_guardian(
    guardian_data: GuardianCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new guardian"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create guardians")
    
    service = GuardianService(db)
    
    try:
        guardian = service.create_guardian(guardian_data, user.tenant_id)
        
        linked_students = [
            LinkedStudentInfo(
                id=s.id,
                student_id=s.student_id,
                full_name=s.full_name,
                class_id=s.class_id,
                status=s.status
            )
            for s in (guardian.students or [])
        ]
        
        response = GuardianResponse.model_validate(guardian)
        response.linked_students = linked_students
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{guardian_id}", response_model=GuardianResponse)
def get_guardian(
    guardian_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single guardian by ID"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    service = GuardianService(db)
    guardian = service.get_guardian(guardian_id, user.tenant_id)
    
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    
    linked_students = [
        LinkedStudentInfo(
            id=s.id,
            student_id=s.student_id,
            full_name=s.full_name,
            class_id=s.class_id,
            status=s.status
        )
        for s in (guardian.students or [])
    ]
    
    response = GuardianResponse.model_validate(guardian)
    response.linked_students = linked_students
    return response


@router.put("/{guardian_id}", response_model=GuardianResponse)
def update_guardian(
    guardian_id: int,
    guardian_data: GuardianUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a guardian"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update guardians")
    
    service = GuardianService(db)
    guardian = service.update_guardian(guardian_id, guardian_data, user.tenant_id)
    
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    
    linked_students = [
        LinkedStudentInfo(
            id=s.id,
            student_id=s.student_id,
            full_name=s.full_name,
            class_id=s.class_id,
            status=s.status
        )
        for s in (guardian.students or [])
    ]
    
    response = GuardianResponse.model_validate(guardian)
    response.linked_students = linked_students
    return response


@router.delete("/{guardian_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guardian(
    guardian_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a guardian"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete guardians")
    
    service = GuardianService(db)
    success = service.delete_guardian(guardian_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Guardian not found")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{guardian_id}/link/{student_id}", status_code=status.HTTP_200_OK)
def link_student(
    guardian_id: int,
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Link a student to a guardian"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can link students")
    
    service = GuardianService(db)
    success = service.link_student(guardian_id, student_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Guardian or student not found")
    
    return {"message": "Student linked successfully"}


@router.delete("/{guardian_id}/unlink/{student_id}", status_code=status.HTTP_200_OK)
def unlink_student(
    guardian_id: int,
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlink a student from a guardian"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unlink students")
    
    service = GuardianService(db)
    success = service.unlink_student(guardian_id, student_id, user.tenant_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Guardian or student not found")
    
    return {"message": "Student unlinked successfully"}
