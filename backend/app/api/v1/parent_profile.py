from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.parent_profile_service import ParentProfileService
from app.schemas.parent_profile import (
    ParentProfileResponse,
    ParentChildInfo,
    ChildDetailedInfo,
    ChildGradeReport,
    ChildAttendanceSummary,
    ChildAssignmentInfo,
    FeePaymentStatus,
    NotificationItem,
    ParentUpdateProfile
)
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=ParentProfileResponse)
def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current parent's profile"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only parents can access this endpoint
    if user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    profile = service.get_parent_profile(user_id, user.tenant_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile


@router.put("/me", response_model=ParentProfileResponse)
def update_my_profile(
    update_data: ParentUpdateProfile,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current parent's profile"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    updated_user = service.update_parent_profile(user_id, update_data, user.tenant_id)
    
    if not updated_user:
        raise HTTPException(status_code=404, detail="Failed to update profile")
    
    profile = service.get_parent_profile(user_id, user.tenant_id)
    return profile


@router.get("/me/children", response_model=List[ParentChildInfo])
def get_my_children(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all children of current parent"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    children = service.get_parent_children(user_id, user.tenant_id)
    
    return children


@router.get("/me/child/{child_id}", response_model=ChildDetailedInfo)
def get_child_details(
    child_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific child"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    child = service.get_child_details(user_id, child_id, user.tenant_id)
    
    if not child:
        raise HTTPException(
            status_code=404,
            detail="Child not found or you don't have access"
        )
    
    return child


@router.get("/me/child/{child_id}/grades", response_model=ChildGradeReport)
def get_child_grades(
    child_id: int,
    term: str = "Term 1",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get child's grade report"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    grades = service.get_child_grades(user_id, child_id, user.tenant_id, term)
    
    if not grades:
        raise HTTPException(
            status_code=404,
            detail="Child not found or you don't have access"
        )
    
    return grades


@router.get("/me/child/{child_id}/attendance", response_model=ChildAttendanceSummary)
def get_child_attendance(
    child_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get child's attendance summary"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    attendance = service.get_child_attendance(user_id, child_id, user.tenant_id)
    
    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Child not found or you don't have access"
        )
    
    return attendance


@router.get("/me/child/{child_id}/assignments", response_model=List[ChildAssignmentInfo])
def get_child_assignments(
    child_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get child's assignments"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    assignments = service.get_child_assignments(user_id, child_id, user.tenant_id)
    
    return assignments


@router.get("/me/fees", response_model=FeePaymentStatus)
def get_fee_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get fee payment status for all children"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    fees = service.get_fee_status(user_id, user.tenant_id)
    
    return fees


@router.get("/me/notifications", response_model=List[NotificationItem])
def get_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get school notifications"""
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")
    
    service = ParentProfileService(db)
    notifications = service.get_notifications(user_id, user.tenant_id)
    
    return notifications
