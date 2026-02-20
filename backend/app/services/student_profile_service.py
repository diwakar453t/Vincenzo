from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, datetime
from app.models.student import Student
from app.models.class_model import Class
from app.models.teacher import Teacher
from app.schemas.student_profile import (
    StudentProfileResponse,
    StudentClassInfo,
    StudentScheduleItem,
    StudentGradeItem,
    StudentAssignment,
    StudentAttendanceSummary,
    StudentGradesResponse,
    StudentAssignmentsResponse,
    StudentUpdateProfile
)


class StudentProfileService:
    """Service for student profile and academic data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_student_by_user_id(self, user_id: int, tenant_id: str) -> Optional[Student]:
        """Get student record from user_id (for parent role, this would be different)"""
        # For now, we find student by checking if email matches
        # In production, you'd have a proper user_id -> student_id mapping
        return self.db.query(Student).filter(
            Student.tenant_id == tenant_id
        ).first()  # TODO: Add proper user_id mapping
    
    def get_student_profile(self, student_id: int, tenant_id: str) -> Optional[StudentProfileResponse]:
        """Get student profile with class information"""
        student = self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not student:
            return None
        
        class_name = None
        if student.class_id:
            class_obj = self.db.query(Class).filter(Class.id == student.class_id).first()
            if class_obj:
                class_name = class_obj.name
        
        return StudentProfileResponse(
            id=student.id,
            student_id=student.student_id,
            first_name=student.first_name,
            last_name=student.last_name,
            full_name=student.full_name,
            date_of_birth=student.date_of_birth,
            gender=student.gender,
            email=student.email,
            phone=student.phone,
            address=student.address,
            enrollment_date=student.enrollment_date,
            status=student.status,
            photo_url=student.photo_url,
            emergency_contact=student.emergency_contact,
            emergency_contact_name=student.emergency_contact_name,
            class_id=student.class_id,
            class_name=class_name
        )
    
    def update_student_profile(
        self,
        student_id: int,
        update_data: StudentUpdateProfile,
        tenant_id: str
    ) -> Optional[Student]:
        """Update student profile (limited fields)"""
        student = self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not student:
            return None
        
        # Only allow updating certain fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(student, field, value)
        
        self.db.commit()
        self.db.refresh(student)
        
        return student
    
    def get_student_classes(self, student_id: int, tenant_id: str) -> List[StudentClassInfo]:
        """Get classes the student is enrolled in"""
        student = self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not student or not student.class_id:
            return []
        
        class_obj = self.db.query(Class).filter(Class.id == student.class_id).first()
        if not class_obj:
            return []
        
        teacher_name = None
        if class_obj.class_teacher_id:
            teacher = self.db.query(Teacher).filter(Teacher.id == class_obj.class_teacher_id).first()
            if teacher:
                teacher_name = teacher.full_name
        
        # TODO: Get actual subjects from class_subjects table
        subjects = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"]
        
        return [StudentClassInfo(
            id=class_obj.id,
            name=class_obj.name,
            grade_level=class_obj.grade_level,
            section=class_obj.section,
            room_number=class_obj.room_number,
            class_teacher_name=teacher_name,
            subjects=subjects
        )]
    
    def get_student_schedule(self, student_id: int, tenant_id: str) -> List[StudentScheduleItem]:
        """Get weekly schedule/timetable - MOCK DATA"""
        # Mock schedule data
        schedule = [
            # Monday
            StudentScheduleItem(day="Monday", period=1, start_time="08:00", end_time="09:00", 
                              subject_name="Mathematics", subject_code="MATH101", 
                              teacher_name="Mr. Smith", room_number="101"),
            StudentScheduleItem(day="Monday", period=2, start_time="09:00", end_time="10:00",
                              subject_name="Science", subject_code="SCI101",
                              teacher_name="Mrs. Johnson", room_number="205"),
            StudentScheduleItem(day="Monday", period=3, start_time="10:30", end_time="11:30",
                              subject_name="English", subject_code="ENG101",
                              teacher_name="Ms. Davis", room_number="102"),
            StudentScheduleItem(day="Monday", period=4, start_time="11:30", end_time="12:30",
                              subject_name="Social Studies", subject_code="SOC101",
                              teacher_name="Mr. Wilson", room_number="203"),
            StudentScheduleItem(day="Monday", period=5, start_time="13:30", end_time="14:30",
                              subject_name="Computer Science", subject_code="CS101",
                              teacher_name="Dr. Brown", room_number="Lab-1"),
            
            # Tuesday
            StudentScheduleItem(day="Tuesday", period=1, start_time="08:00", end_time="09:00",
                              subject_name="Science", subject_code="SCI101",
                              teacher_name="Mrs. Johnson", room_number="205"),
            StudentScheduleItem(day="Tuesday", period=2, start_time="09:00", end_time="10:00",
                              subject_name="Mathematics", subject_code="MATH101",
                              teacher_name="Mr. Smith", room_number="101"),
            StudentScheduleItem(day="Tuesday", period=3, start_time="10:30", end_time="11:30",
                              subject_name="Physical Education", subject_code="PE101",
                              teacher_name="Coach Taylor", room_number="Gym"),
            StudentScheduleItem(day="Tuesday", period=4, start_time="11:30", end_time="12:30",
                              subject_name="English", subject_code="ENG101",
                              teacher_name="Ms. Davis", room_number="102"),
            StudentScheduleItem(day="Tuesday", period=5, start_time="13:30", end_time="14:30",
                              subject_name="Art", subject_code="ART101",
                              teacher_name="Ms. Garcia", room_number="Art Room"),
        ]
        
        # Add more days...
        return schedule
    
    def get_student_grades(self, student_id: int, tenant_id: str) -> StudentGradesResponse:
        """Get all grades for student - MOCK DATA"""
        # Mock grades data
        grades = [
            StudentGradeItem(
                subject_name="Mathematics",
                subject_code="MATH101",
                term="Term 1",
                marks_obtained=85,
                total_marks=100,
                percentage=85.0,
                grade="A",
                remarks="Excellent performance",
                date=date.today() - timedelta(days=30)
            ),
            StudentGradeItem(
                subject_name="Science",
                subject_code="SCI101",
                term="Term 1",
                marks_obtained=78,
                total_marks=100,
                percentage=78.0,
                grade="B+",
                remarks="Good work",
                date=date.today() - timedelta(days=30)
            ),
            StudentGradeItem(
                subject_name="English",
                subject_code="ENG101",
                term="Term 1",
                marks_obtained=92,
                total_marks=100,
                percentage=92.0,
                grade="A+",
                remarks="Outstanding",
                date=date.today() - timedelta(days=30)
            ),
            StudentGradeItem(
                subject_name="Computer Science",
                subject_code="CS101",
                term="Term 1",
                marks_obtained=88,
                total_marks=100,
                percentage=88.0,
                grade="A",
                remarks="Very good",
                date=date.today() - timedelta(days=30)
            ),
            StudentGradeItem(
                subject_name="Social Studies",
                subject_code="SOC101",
                term="Term 1",
                marks_obtained=75,
                total_marks=100,
                percentage=75.0,
                grade="B",
                remarks="Satisfactory",
                date=date.today() - timedelta(days=30)
            ),
        ]
        
        # Calculate GPA (on 4.0 scale)
        total_percentage = sum(g.percentage for g in grades)
        overall_percentage = total_percentage / len(grades) if grades else 0
        gpa = (overall_percentage / 100) * 4.0
        
        return StudentGradesResponse(
            grades=grades,
            gpa=round(gpa, 2),
            overall_percentage=round(overall_percentage, 2),
            rank=5  # Mock rank
        )
    
    def get_student_assignments(
        self,
        student_id: int,
        tenant_id: str,
        status: Optional[str] = None
    ) -> StudentAssignmentsResponse:
        """Get assignments - MOCK DATA"""
        # Mock assignments data
        all_assignments = [
            StudentAssignment(
                id=1,
                title="Quadratic Equations Worksheet",
                subject_name="Mathematics",
                subject_code="MATH101",
                description="Solve problems 1-20 from chapter 5",
                due_date=date.today() + timedelta(days=3),
                assigned_date=date.today() - timedelta(days=4),
                status="pending",
                submission_date=None,
                marks_obtained=None,
                total_marks=20,
                teacher_name="Mr. Smith"
            ),
            StudentAssignment(
                id=2,
                title="Essay on Climate Change",
                subject_name="English",
                subject_code="ENG101",
                description="Write a 500-word essay on climate change impacts",
                due_date=date.today() + timedelta(days=7),
                assigned_date=date.today() - timedelta(days=3),
                status="pending",
                submission_date=None,
                marks_obtained=None,
                total_marks=25,
                teacher_name="Ms. Davis"
            ),
            StudentAssignment(
                id=3,
                title="Science Lab Report",
                subject_name="Science",
                subject_code="SCI101",
                description="Complete lab report for experiment 3",
                due_date=date.today() - timedelta(days=1),
                assigned_date=date.today() - timedelta(days=10),
                status="overdue",
                submission_date=None,
                marks_obtained=None,
                total_marks=30,
                teacher_name="Mrs. Johnson"
            ),
            StudentAssignment(
                id=4,
                title="Python Programming Project",
                subject_name="Computer Science",
                subject_code="CS101",
                description="Create a simple calculator program",
                due_date=date.today() - timedelta(days=5),
                assigned_date=date.today() - timedelta(days=14),
                status="submitted",
                submission_date=date.today() - timedelta(days=6),
                marks_obtained=28,
                total_marks=30,
                teacher_name="Dr. Brown"
            ),
        ]
        
        # Filter by status if provided
        if status:
            assignments = [a for a in all_assignments if a.status == status]
        else:
            assignments = all_assignments
        
        pending = len([a for a in all_assignments if a.status == "pending"])
        submitted = len([a for a in all_assignments if a.status == "submitted"])
        overdue = len([a for a in all_assignments if a.status == "overdue"])
        
        return StudentAssignmentsResponse(
            assignments=assignments,
            total=len(all_assignments),
            pending_count=pending,
            submitted_count=submitted,
            overdue_count=overdue
        )
    
    def get_student_attendance(
        self,
        student_id: int,
        tenant_id: str,
        period: Optional[str] = "month"
    ) -> StudentAttendanceSummary:
        """Get attendance summary - MOCK DATA"""
        # Mock attendance data
        return StudentAttendanceSummary(
            total_days=60,
            present_days=54,
            absent_days=4,
            leave_days=2,
            attendance_percentage=90.0,
            subject_wise_attendance=[
                {"subject": "Mathematics", "present": 28, "total": 30, "percentage": 93.3},
                {"subject": "Science", "present": 27, "total": 30, "percentage": 90.0},
                {"subject": "English", "present": 29, "total": 30, "percentage": 96.7},
                {"subject": "Computer Science", "present": 26, "total": 30, "percentage": 86.7},
                {"subject": "Social Studies", "present": 28, "total": 30, "percentage": 93.3},
            ],
            recent_records=[
                {"date": str(date.today() - timedelta(days=i)), 
                 "status": "present" if i % 5 != 0 else "absent",
                 "subject": "All"}
                for i in range(10)
            ]
        )
