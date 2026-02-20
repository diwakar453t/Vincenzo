# Import all models here to ensure they are registered with SQLAlchemy
from app.models.base import BaseModel
from app.models.user import User, Tenant, UserRole
from app.models.student import Student, StudentStatus, Gender
from app.models.teacher import Teacher, TeacherStatus
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.subject_group import SubjectGroup
from app.models.class_subject import ClassSubject
from app.models.guardian import Guardian, GuardianStatus, Relationship, guardian_students
from app.models.room import Room, RoomType, RoomStatus
from app.models.syllabus import Syllabus, SyllabusTopic, SyllabusStatus
from app.models.timetable import Timetable, Period, DayOfWeek
from app.models.exam import Exam, ExamSchedule, ExamType, ExamStatus
from app.models.grade import Grade, GradeCategory
from app.models.department import Department, Designation
from app.models.attendance import StudentAttendance, StaffAttendance, AttendanceStatus
from app.models.leave import LeaveType, LeaveApplication, LeaveStatus, ApplicantType
from app.models.payroll import PayrollComponent, SalaryStructure, SalaryStructureItem, Payroll, PayrollItem, ComponentType, PayrollStatus
from app.models.fee import FeeGroup, FeeType, StudentFeeAssignment, FeeCollection, PaymentStatus, PaymentMethod
from app.models.library import Book, LibraryMember, IssueReturn, BookStatus, MemberType, MembershipStatus, IssueStatus
from app.models.hostel import Hostel, HostelRoom, RoomAllocation, HostelType, HostelRoomType, HostelRoomStatus, AllocationStatus
from app.models.transport import TransportRoute, Vehicle, TransportAssignment, VehicleType, VehicleStatus, RouteStatus, AssignmentStatus as TransportAssignmentStatus
from app.models.sports import Sport, SportParticipation, SportAchievement, SportCategory, SportStatus, ParticipationStatus as SportParticipationStatus, AchievementLevel, AchievementType
from app.models.report import Report, ReportType, ReportFormat, ReportStatus
from app.models.notification import Notification, NotificationPreference, NotificationType, NotificationChannel, NotificationPriority
from app.models.uploaded_file import UploadedFile, FileShare, FileCategory, FileVisibility
from app.models.settings import SchoolSettings, AcademicYear, SystemPreference, SettingCategory
from app.models.payment import PaymentTransaction, PaymentStatus, PaymentMethod, PaymentPurpose
from app.models.plugin import PluginRecord

__all__ = [
    "BaseModel",
    "User",
    "Tenant",
    "UserRole",
    "Student",
    "StudentStatus",
    "Gender",
    "Teacher",
    "TeacherStatus",
    "Class",
    "Subject",
    "SubjectGroup",
    "ClassSubject",
    "Guardian",
    "GuardianStatus",
    "Relationship",
    "guardian_students",
    "Room",
    "RoomType",
    "RoomStatus",
    "Syllabus",
    "SyllabusTopic",
    "SyllabusStatus",
    "Timetable",
    "Period",
    "DayOfWeek",
    "Exam",
    "ExamSchedule",
    "ExamType",
    "ExamStatus",
    "Grade",
    "GradeCategory",
    "Department",
    "Designation",
    "StudentAttendance",
    "StaffAttendance",
    "AttendanceStatus",
    "LeaveType",
    "LeaveApplication",
    "LeaveStatus",
    "ApplicantType",
    "PayrollComponent",
    "SalaryStructure",
    "SalaryStructureItem",
    "Payroll",
    "PayrollItem",
    "ComponentType",
    "PayrollStatus",
    "FeeGroup",
    "FeeType",
    "StudentFeeAssignment",
    "FeeCollection",
    "PaymentStatus",
    "PaymentMethod",
    "Book",
    "LibraryMember",
    "IssueReturn",
    "BookStatus",
    "MemberType",
    "MembershipStatus",
    "IssueStatus",
    "Hostel",
    "HostelRoom",
    "RoomAllocation",
    "HostelType",
    "HostelRoomType",
    "HostelRoomStatus",
    "AllocationStatus",
    "TransportRoute",
    "Vehicle",
    "TransportAssignment",
    "VehicleType",
    "VehicleStatus",
    "RouteStatus",
    "TransportAssignmentStatus",
    "Sport",
    "SportParticipation",
    "SportAchievement",
    "SportCategory",
    "SportStatus",
    "SportParticipationStatus",
    "AchievementLevel",
    "AchievementType",
    "Report",
    "ReportType",
    "ReportFormat",
    "ReportStatus",
    "Notification",
    "NotificationPreference",
    "NotificationType",
    "NotificationChannel",
    "NotificationPriority",
    "UploadedFile",
    "FileShare",
    "FileCategory",
    "FileVisibility",
    "SchoolSettings",
    "AcademicYear",
    "SystemPreference",
    "SettingCategory",
    "PaymentTransaction",
    "PaymentStatus",
    "PaymentMethod",
    "PaymentPurpose",
    "PluginRecord",
]
