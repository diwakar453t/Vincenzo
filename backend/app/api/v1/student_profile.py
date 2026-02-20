from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.student_profile_service import StudentProfileService
from app.schemas.student_profile import (
    StudentProfileResponse,
    StudentClassInfo,
    StudentScheduleItem,
    StudentGradesResponse,
    StudentAssignmentsResponse,
    StudentAttendanceSummary,
    StudentUpdateProfile
)
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=StudentProfileResponse)
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's profile"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only students can access this endpoint
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    
    # For now, get the first student for this tenant (in production, map user_id to student_id)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    profile = service.get_student_profile(student.id, user.tenant_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.put("/me", response_model=StudentProfileResponse)
def update_my_profile(
    update_data: StudentUpdateProfile,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current student's profile (limited fields)"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    updated_student = service.update_student_profile(student.id, update_data, user.tenant_id)
    if not updated_student:
        raise HTTPException(status_code=404, detail="Failed to update profile")
    
    profile = service.get_student_profile(updated_student.id, user.tenant_id)
    return profile


@router.get("/me/classes", response_model=list[StudentClassInfo])
def get_my_classes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's enrolled classes"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    classes = service.get_student_classes(student.id, user.tenant_id)
    return classes


@router.get("/me/schedule", response_model=list[StudentScheduleItem])
def get_my_schedule(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's class schedule/timetable"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    schedule = service.get_student_schedule(student.id, user.tenant_id)
    return schedule


@router.get("/me/grades", response_model=StudentGradesResponse)
def get_my_grades(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's grades and GPA"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    grades = service.get_student_grades(student.id, user.tenant_id)
    return grades


@router.get("/me/assignments", response_model=StudentAssignmentsResponse)
def get_my_assignments(
    status: Optional[str] = None,  # pending, submitted, overdue
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's assignments"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    assignments = service.get_student_assignments(student.id, user.tenant_id, status)
    return assignments


@router.get("/me/attendance", response_model=StudentAttendanceSummary)
def get_my_attendance(
    period: Optional[str] = "month",  # month, term, year
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's attendance summary"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    service = StudentProfileService(db)
    student = service.get_student_by_user_id(user_id, user.tenant_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    attendance = service.get_student_attendance(student.id, user.tenant_id, period)
    return attendance
