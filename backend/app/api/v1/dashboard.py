"""Dashboard API router for PreSkool ERP."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardStatistics
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/statistics", response_model=DashboardStatistics)
def get_dashboard_statistics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics based on current user's role.
    
    Returns role-specific dashboard data including:
    - Quick statistics cards
    - Recent activities
    - Upcoming events
    - Attendance summary (for applicable roles)
    """
    # Get the actual User object from the database
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    # Get dashboard data from service
    dashboard_service = DashboardService(db)
    statistics = dashboard_service.get_statistics_for_role(user)
    
    return statistics
