"""
API v1 router configuration
"""

from fastapi import APIRouter
from app.api.v1 import health, auth, dashboard, students, teachers, classes, subjects, student_profile, teacher_profile, parent_profile, guardians, rooms, syllabus, timetable, exams, grades, departments, attendance, leaves, payroll, fees, library, hostel, transport, sports, reports, notifications, search, files, settings, payments, plugins, webhooks, gdpr

api_router = APIRouter()

# Public endpoints
api_router.include_router(health.router, tags=["health"])

# Authentication endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Dashboard endpoints (requires authentication)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# Student endpoints (requires authentication + student role)
api_router.include_router(student_profile.router, prefix="/student-profile", tags=["student-profile"])

# Teacher endpoints (requires authentication + teacher role)
api_router.include_router(teacher_profile.router, prefix="/teacher-profile", tags=["teacher-profile"])

# Parent endpoints (requires authentication + parent role)
api_router.include_router(parent_profile.router, prefix="/parent-profile", tags=["parent-profile"])

# Admin endpoints (requires authentication + admin role)
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(guardians.router, prefix="/guardians", tags=["guardians"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
api_router.include_router(syllabus.router, prefix="/syllabus", tags=["syllabus"])
api_router.include_router(timetable.router, prefix="/timetable", tags=["timetable"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(grades.router, prefix="/grades", tags=["grades"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(leaves.router, prefix="/leaves", tags=["leaves"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["payroll"])
api_router.include_router(fees.router, prefix="/fees", tags=["fees"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(hostel.router, prefix="/hostel", tags=["hostel"])
api_router.include_router(transport.router, prefix="/transport", tags=["transport"])
api_router.include_router(sports.router, prefix="/sports", tags=["sports"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(plugins.router, prefix="/plugins", tags=["plugins"])

# Observability & Webhooks
api_router.include_router(webhooks.router, tags=["webhooks"])

# GDPR & Data Privacy
api_router.include_router(gdpr.router, prefix="/gdpr", tags=["gdpr", "privacy"])
