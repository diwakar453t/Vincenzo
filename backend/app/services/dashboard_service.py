"""Dashboard service for business logic and data aggregation."""
from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, UserRole
from app.schemas.dashboard import (
    QuickStatItem,
    ActivityItem,
    UpcomingEventItem,
    AttendanceSummaryData,
    DashboardStatistics,
)


class DashboardService:
    """Service for dashboard-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_statistics_for_role(
        self, current_user: User
    ) -> DashboardStatistics:
        """Get dashboard statistics based on user role."""
        if current_user.role in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
            return self._get_admin_dashboard(current_user)
        elif current_user.role == UserRole.TEACHER.value:
            return self._get_teacher_dashboard(current_user)
        elif current_user.role == UserRole.STUDENT.value:
            return self._get_student_dashboard(current_user)
        elif current_user.role == UserRole.PARENT.value:
            return self._get_parent_dashboard(current_user)
        else:
            # Default fallback
            return self._get_default_dashboard(current_user)

    def _get_admin_dashboard(self, user: User) -> DashboardStatistics:
        """Get admin-specific dashboard data."""
        # Get counts from database (with tenant filtering)
        total_users = (
            self.db.query(func.count(User.id))
            .filter(User.tenant_id == user.tenant_id)
            .scalar()
        )
        
        total_students = (
            self.db.query(func.count(User.id))
            .filter(User.tenant_id == user.tenant_id)
            .filter(User.role == UserRole.STUDENT.value)
            .scalar()
        )
        
        total_teachers = (
            self.db.query(func.count(User.id))
            .filter(User.tenant_id == user.tenant_id)
            .filter(User.role == UserRole.TEACHER.value)
            .scalar()
        )
        
        total_parents = (
            self.db.query(func.count(User.id))
            .filter(User.tenant_id == user.tenant_id)
            .filter(User.role == UserRole.PARENT.value)
            .scalar()
        )

        # Mock data for modules not yet implemented
        total_courses = 32
        upcoming_events_count = 5

        quick_stats = [
            QuickStatItem(
                title="Total Students",
                value=str(total_students),
                icon="People",
                color="#3D5EE1",
                trend="+12%" if total_students > 0 else None,
            ),
            QuickStatItem(
                title="Total Teachers",
                value=str(total_teachers),
                icon="School",
                color="#10b981",
                trend="+5%" if total_teachers > 0 else None,
            ),
            QuickStatItem(
                title="Total Courses",
                value=str(total_courses),
                icon="MenuBook",
                color="#f59e0b",
            ),
            QuickStatItem(
                title="Upcoming Events",
                value=str(upcoming_events_count),
                icon="EventNote",
                color="#ef4444",
            ),
        ]

        recent_activities = self._get_recent_activities_admin(user)
        upcoming_events = self._get_upcoming_events_admin(user)
        attendance_summary = self._get_attendance_summary_admin(user)

        return DashboardStatistics(
            quick_stats=quick_stats,
            recent_activities=recent_activities,
            upcoming_events=upcoming_events,
            attendance_summary=attendance_summary,
            role=user.role,
            user_name=user.full_name,
        )

    def _get_teacher_dashboard(self, user: User) -> DashboardStatistics:
        """Get teacher-specific dashboard data."""
        quick_stats = [
            QuickStatItem(
                title="My Classes",
                value="4",
                icon="Class",
                color="#3D5EE1",
            ),
            QuickStatItem(
                title="Total Students",
                value="120",
                icon="People",
                color="#10b981",
            ),
            QuickStatItem(
                title="Pending Assignments",
                value="8",
                icon="Assignment",
                color="#f59e0b",
            ),
            QuickStatItem(
                title="Today's Classes",
                value="3",
                icon="Schedule",
                color="#ef4444",
            ),
        ]

        recent_activities = self._get_recent_activities_teacher(user)
        upcoming_events = self._get_upcoming_events_teacher(user)

        return DashboardStatistics(
            quick_stats=quick_stats,
            recent_activities=recent_activities,
            upcoming_events=upcoming_events,
            role=user.role,
            user_name=user.full_name,
        )

    def _get_student_dashboard(self, user: User) -> DashboardStatistics:
        """Get student-specific dashboard data."""
        quick_stats = [
            QuickStatItem(
                title="Attendance",
                value="92%",
                icon="CalendarMonth",
                color="#10b981",
                trend="+2%",
            ),
            QuickStatItem(
                title="Assignments",
                value="5",
                icon="Assignment",
                color="#f59e0b",
            ),
            QuickStatItem(
                title="Upcoming Exams",
                value="3",
                icon="Assessment",
                color="#ef4444",
            ),
            QuickStatItem(
                title="Average Grade",
                value="A-",
                icon="Grade",
                color="#3D5EE1",
            ),
        ]

        recent_activities = self._get_recent_activities_student(user)
        upcoming_events = self._get_upcoming_events_student(user)

        return DashboardStatistics(
            quick_stats=quick_stats,
            recent_activities=recent_activities,
            upcoming_events=upcoming_events,
            role=user.role,
            user_name=user.full_name,
        )

    def _get_parent_dashboard(self, user: User) -> DashboardStatistics:
        """Get parent-specific dashboard data."""
        quick_stats = [
            QuickStatItem(
                title="Children",
                value="2",
                icon="FamilyRestroom",
                color="#3D5EE1",
            ),
            QuickStatItem(
                title="Attendance",
                value="94%",
                icon="CalendarMonth",
                color="#10b981",
            ),
            QuickStatItem(
                title="Fee Due",
                value="₹15,000",
                icon="AttachMoney",
                color="#f59e0b",
            ),
            QuickStatItem(
                title="Notifications",
                value="7",
                icon="Notifications",
                color="#ef4444",
            ),
        ]

        recent_activities = self._get_recent_activities_parent(user)
        upcoming_events = self._get_upcoming_events_parent(user)

        return DashboardStatistics(
            quick_stats=quick_stats,
            recent_activities=recent_activities,
            upcoming_events=upcoming_events,
            role=user.role,
            user_name=user.full_name,
        )

    def _get_default_dashboard(self, user: User) -> DashboardStatistics:
        """Get default dashboard for unknown roles."""
        return DashboardStatistics(
            quick_stats=[],
            recent_activities=[],
            upcoming_events=[],
            role=user.role,
            user_name=user.full_name,
        )

    # Activity and event methods (mock data for now)

    def _get_recent_activities_admin(self, user: User) -> List[ActivityItem]:
        """Get recent activities for admin."""
        now = datetime.utcnow()
        return [
            ActivityItem(
                id=1,
                type="student_added",
                title="New Student Enrolled",
                description="John Doe enrolled in Class 10-A",
                user_name="Admin",
                timestamp=now - timedelta(hours=2),
                icon="PersonAdd",
            ),
            ActivityItem(
                id=2,
                type="attendance_marked",
                title="Attendance Marked",
                description="Class 9-B attendance marked by Mr. Smith",
                user_name="Mr. Smith",
                timestamp=now - timedelta(hours=5),
                icon="CheckCircle",
            ),
            ActivityItem(
                id=3,
                type="fee_paid",
                title="Fee Payment Received",
                description="₹25,000 received from Parent of Jane Smith",
                user_name="Finance Team",
                timestamp=now - timedelta(days=1),
                icon="Payment",
            ),
        ]

    def _get_recent_activities_teacher(self, user: User) -> List[ActivityItem]:
        """Get recent activities for teacher."""
        now = datetime.utcnow()
        return [
            ActivityItem(
                id=1,
                type="assignment_submitted",
                title="Assignment Submitted",
                description="15 students submitted Math Assignment #5",
                user_name="Students",
                timestamp=now - timedelta(hours=1),
                icon="Assignment",
            ),
            ActivityItem(
                id=2,
                type="grade_updated",
                title="Grades Posted",
                description="Physics Quiz grades published",
                user_name=user.full_name,
                timestamp=now - timedelta(hours=4),
                icon="Grade",
            ),
        ]

    def _get_recent_activities_student(self, user: User) -> List[ActivityItem]:
        """Get recent activities for student."""
        now = datetime.utcnow()
        return [
            ActivityItem(
                id=1,
                type="grade_received",
                title="Grade Posted",
                description="You received A on Math Assignment #4",
                user_name="Mr. Johnson",
                timestamp=now - timedelta(hours=3),
                icon="Grade",
            ),
            ActivityItem(
                id=2,
                type="assignment_due",
                title="Assignment Due Soon",
                description="Chemistry Lab Report due in 2 days",
                user_name="System",
                timestamp=now - timedelta(hours=6),
                icon="Warning",
            ),
        ]

    def _get_recent_activities_parent(self, user: User) -> List[ActivityItem]:
        """Get recent activities for parent."""
        now = datetime.utcnow()
        return [
            ActivityItem(
                id=1,
                type="attendance_alert",
                title="Attendance Update",
                description="Your child was marked present today",
                user_name="School",
                timestamp=now - timedelta(hours=2),
                icon="CheckCircle",
            ),
            ActivityItem(
                id=2,
                type="grade_update",
                title="Grade Update",
                description="New grades posted for Science exam",
                user_name="Science Teacher",
                timestamp=now - timedelta(days=1),
                icon="Grade",
            ),
        ]

    def _get_upcoming_events_admin(self, user: User) -> List[UpcomingEventItem]:
        """Get upcoming events for admin."""
        now = datetime.utcnow()
        return [
            UpcomingEventItem(
                id=1,
                title="Annual Sports Day",
                event_type="event",
                date=now + timedelta(days=5),
                description="School annual sports competition",
            ),
            UpcomingEventItem(
                id=2,
                title="Parent-Teacher Meeting",
                event_type="meeting",
                date=now + timedelta(days=10),
                description="Quarterly PTM for all classes",
            ),
            UpcomingEventItem(
                id=3,
                title="Mid-term Examinations",
                event_type="exam",
                date=now + timedelta(days=15),
                description="Mid-term exams for grades 9-12",
            ),
        ]

    def _get_upcoming_events_teacher(self, user: User) -> List[UpcomingEventItem]:
        """Get upcoming events for teacher."""
        now = datetime.utcnow()
        return [
            UpcomingEventItem(
                id=1,
                title="Class 10-A Physics Exam",
                event_type="exam",
                date=now + timedelta(days=3),
                description="Chapter 5-7 coverage",
            ),
            UpcomingEventItem(
                id=2,
                title="Staff Meeting",
                event_type="meeting",
                date=now + timedelta(days=7),
                description="Monthly staff coordination meeting",
            ),
        ]

    def _get_upcoming_events_student(self, user: User) -> List[UpcomingEventItem]:
        """Get upcoming events for student."""
        now = datetime.utcnow()
        return [
            UpcomingEventItem(
                id=1,
                title="Math Exam",
                event_type="exam",
                date=now + timedelta(days=4),
                description="Chapters 1-5",
            ),
            UpcomingEventItem(
                id=2,
                title="Science Project Submission",
                event_type="assignment",
                date=now + timedelta(days=6),
                description="Final project deadline",
            ),
        ]

    def _get_upcoming_events_parent(self, user: User) -> List[UpcomingEventItem]:
        """Get upcoming events for parent."""
        now = datetime.utcnow()
        return [
            UpcomingEventItem(
                id=1,
                title="Fee Payment Due",
                event_type="payment",
                date=now + timedelta(days=7),
                description="Quarterly fee payment",
            ),
            UpcomingEventItem(
                id=2,
                title="Parent-Teacher Meeting",
                event_type="meeting",
                date=now + timedelta(days=10),
                description="Discuss academic progress",
            ),
        ]

    def _get_attendance_summary_admin(self, user: User) -> AttendanceSummaryData:
        """Get attendance summary for admin (all students)."""
        # Mock data - will be replaced with real queries when attendance module is built
        total_students = (
            self.db.query(func.count(User.id))
            .filter(User.tenant_id == user.tenant_id)
            .filter(User.role == UserRole.STUDENT.value)
            .scalar()
        ) or 100  # Default to 100 if no students
        
        present = int(total_students * 0.85)  # 85% attendance
        absent = int(total_students * 0.10)   # 10% absent
        leave = total_students - present - absent  # Rest on leave
        
        return AttendanceSummaryData(
            total_students=total_students,
            present=present,
            absent=absent,
            leave=leave,
            present_percentage=85.0,
            period="Today",
        )
