"""Dashboard schemas for API responses."""
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class QuickStatItem(BaseModel):
    """Individual quick statistic item."""
    title: str
    value: str
    icon: str
    color: str
    trend: Optional[str] = None  # e.g., "+12%", "-5%"


class ActivityItem(BaseModel):
    """Recent activity item."""
    id: int
    type: str  # e.g., "student_added", "attendance_marked", "fee_paid"
    title: str
    description: str
    user_name: str
    timestamp: datetime
    icon: str


class UpcomingEventItem(BaseModel):
    """Upcoming event or exam."""
    id: int
    title: str
    event_type: str  # e.g., "exam", "holiday", "meeting", "event"
    date: datetime
    description: Optional[str] = None


class AttendanceSummaryData(BaseModel):
    """Attendance summary statistics."""
    total_students: int
    present: int
    absent: int
    leave: int
    present_percentage: float
    period: str  # e.g., "Today", "This Week", "This Month"


class DashboardStatistics(BaseModel):
    """Complete dashboard statistics response."""
    quick_stats: List[QuickStatItem]
    recent_activities: List[ActivityItem]
    upcoming_events: List[UpcomingEventItem]
    attendance_summary: Optional[AttendanceSummaryData] = None
    role: str
    user_name: str
