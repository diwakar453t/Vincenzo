from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.teacher_profile_service import TeacherProfileService
from app.schemas.teacher_profile import (
    TeacherProfileResponse,
    TeacherClassInfo,
    TeacherStudentInfo,
    GradeEntry,
    AssignmentCreate,
    AssignmentResponse,
    AttendanceEntry,
    TeacherScheduleItem,
    TeacherUpdateProfile
)
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=TeacherProfileResponse)
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current teacher's profile"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only teachers can access this endpoint
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    profile = service.get_teacher_profile(teacher.id, user.tenant_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.put("/me", response_model=TeacherProfileResponse)
def update_my_profile(
    update_data: TeacherUpdateProfile,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current teacher's profile (limited fields)"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    updated_teacher = service.update_teacher_profile(teacher.id, update_data, user.tenant_id)
    if not updated_teacher:
        raise HTTPException(status_code=404, detail="Failed to update profile")
    
    profile = service.get_teacher_profile(updated_teacher.id, user.tenant_id)
    return profile


@router.get("/me/classes", response_model=List[TeacherClassInfo])
def get_my_classes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get classes assigned to current teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    classes = service.get_teacher_classes(teacher.id, user.tenant_id)
    return classes


@router.get("/me/students", response_model=List[TeacherStudentInfo])
def get_my_students(
    class_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get students in teacher's classes"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    students = service.get_teacher_students(teacher.id, user.tenant_id, class_id)
    return students


@router.get("/me/class/{class_id}/students", response_model=List[TeacherStudentInfo])
def get_class_students(
    class_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get students in a specific class (teacher must have access)"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    students = service.get_class_students(teacher.id, class_id, user.tenant_id)
    
    if not students:
        raise HTTPException(status_code=404, detail="Class not found or you don't have access")
    
    return students


@router.get("/me/schedule", response_model=List[TeacherScheduleItem])
def get_my_schedule(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get teacher's weekly schedule/timetable"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    schedule = service.get_teacher_schedule(teacher.id, user.tenant_id)
    return schedule


@router.post("/me/grades")
def enter_grades(
    grade_data: GradeEntry,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enter or update student grades"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    result = service.enter_grades(teacher.id, grade_data, user.tenant_id)
    return result


@router.get("/me/assignments", response_model=List[AssignmentResponse])
def get_my_assignments(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assignments created by teacher"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    assignments = service.get_teacher_assignments(teacher.id, user.tenant_id)
    return assignments


@router.post("/me/assignments")
def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new assignment"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    assignment = service.create_assignment(teacher.id, assignment_data, user.tenant_id)
    return assignment


@router.post("/me/attendance")
def mark_attendance(
    attendance_data: AttendanceEntry,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark attendance for a class"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    service = TeacherProfileService(db)
    teacher = service.get_teacher_by_user_id(user_id, user.tenant_id)
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    
    result = service.mark_attendance(teacher.id, attendance_data, user.tenant_id)
    return result
