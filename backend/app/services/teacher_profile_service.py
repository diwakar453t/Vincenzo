from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.student import Student
from app.models.class_subject import ClassSubject
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


class TeacherProfileService:
    """Service for teacher profile and teaching operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_teacher_by_user_id(self, user_id: int, tenant_id: str) -> Optional[Teacher]:
        """Get teacher record from user_id"""
        return self.db.query(Teacher).filter(
            Teacher.user_id == user_id,
            Teacher.tenant_id == tenant_id
        ).first()
    
    def get_teacher_profile(self, teacher_id: int, tenant_id: str) -> Optional[TeacherProfileResponse]:
        """Get teacher profile"""
        teacher = self.db.query(Teacher).filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id
        ).first()
        
        if not teacher:
            return None
        
        return TeacherProfileResponse.model_validate(teacher)
    
    def update_teacher_profile(
        self,
        teacher_id: int,
        update_data: TeacherUpdateProfile,
        tenant_id: str
    ) -> Optional[Teacher]:
        """Update teacher profile (limited fields)"""
        teacher = self.db.query(Teacher).filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id
        ).first()
        
        if not teacher:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(teacher, field, value)
        
        self.db.commit()
        self.db.refresh(teacher)
        
        return teacher
    
    def get_teacher_classes(self, teacher_id: int, tenant_id: str) -> List[TeacherClassInfo]:
        """Get classes assigned to teacher"""
        # Classes where teacher is class teacher
        class_teacher_classes = self.db.query(Class).filter(
            Class.class_teacher_id == teacher_id,
            Class.tenant_id == tenant_id
        ).all()
        
        # Classes where teacher teaches subjects
        subject_classes_query = self.db.query(Class).join(
            ClassSubject, Class.id == ClassSubject.class_id
        ).filter(
            ClassSubject.teacher_id == teacher_id,
            ClassSubject.tenant_id == tenant_id
        ).distinct().all()
        
        # Combine and deduplicate
        all_classes = list({c.id: c for c in class_teacher_classes + subject_classes_query}.values())
        
        result = []
        for class_obj in all_classes:
            student_count = self.db.query(Student).filter(
                Student.class_id == class_obj.id,
                Student.tenant_id == tenant_id
            ).count()
            
            result.append(TeacherClassInfo(
                id=class_obj.id,
                name=class_obj.name,
                grade_level=class_obj.grade_level,
                section=class_obj.section,
                room_number=class_obj.room_number,
                student_count=student_count,
                is_class_teacher=(class_obj.class_teacher_id == teacher_id)
            ))
        
        return result
    
    def get_teacher_students(
        self,
        teacher_id: int,
        tenant_id: str,
        class_id: Optional[int] = None
    ) -> List[TeacherStudentInfo]:
        """Get students in teacher's classes"""
        # Get teacher's classes
        teacher_classes = self.get_teacher_classes(teacher_id, tenant_id)
        class_ids = [c.id for c in teacher_classes]
        
        if not class_ids:
            return []
        
        query = self.db.query(Student).filter(
            Student.class_id.in_(class_ids),
            Student.tenant_id == tenant_id
        )
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
        
        students = query.all()
        
        result = []
        for student in students:
            class_obj = self.db.query(Class).filter(Class.id == student.class_id).first()
            class_name = class_obj.name if class_obj else "Unknown"
            
            result.append(TeacherStudentInfo(
                id=student.id,
                student_id=student.student_id,
                full_name=student.full_name,
                class_name=class_name,
                email=student.email,
                phone=student.phone,
                status=student.status
            ))
        
        return result
    
    def get_class_students(
        self,
        teacher_id: int,
        class_id: int,
        tenant_id: str
    ) -> List[TeacherStudentInfo]:
        """Get students in a specific class (verify teacher has access)"""
        # Verify teacher teaches this class
        teacher_classes = self.get_teacher_classes(teacher_id, tenant_id)
        class_ids = [c.id for c in teacher_classes]
        
        if class_id not in class_ids:
            return []  # Teacher doesn't have access to this class
        
        return self.get_teacher_students(teacher_id, tenant_id, class_id)
    
    def create_assignment(
        self,
        teacher_id: int,
        assignment_data: AssignmentCreate,
        tenant_id: str
    ) -> dict:
        """Create assignment - MOCK DATA"""
        # In real implementation, this would create an assignment record
        # For now, return mock success response
        return {
            "id": 1,
            "title": assignment_data.title,
            "description": assignment_data.description,
            "subject_id": assignment_data.subject_id,
            "class_id": assignment_data.class_id,
            "due_date": assignment_data.due_date,
            "total_marks": assignment_data.total_marks,
            "assigned_date": date.today(),
            "teacher_id": teacher_id
        }
    
    def get_teacher_assignments(
        self,
        teacher_id: int,
        tenant_id: str
    ) -> List[AssignmentResponse]:
        """Get assignments created by teacher - MOCK DATA"""
        # Mock assignments
        return [
            AssignmentResponse(
                id=1,
                title="Math Quiz Chapter 5",
                description="Solve problems on quadratic equations",
                subject_name="Mathematics",
                class_name="10-A",
                due_date=date.today() + timedelta(days=7),
                total_marks=20,
                assigned_date=date.today() - timedelta(days=3),
                submission_count=15,
                pending_count=10
            ),
            AssignmentResponse(
                id=2,
                title="Science Lab Report",
                description="Complete experiment documentation",
                subject_name="Science",
                class_name="10-A",
                due_date=date.today() + timedelta(days=5),
                total_marks=30,
                assigned_date=date.today() - timedelta(days=5),
                submission_count=20,
                pending_count=5
            ),
        ]
    
    def enter_grades(
        self,
        teacher_id: int,
        grade_data: GradeEntry,
        tenant_id: str
    ) -> dict:
        """Enter/update grades - MOCK DATA"""
        # In real implementation, this would save to grades table
        return {
            "success": True,
            "message": "Grade entered successfully",
            "grade": grade_data.model_dump()
        }
    
    def mark_attendance(
        self,
        teacher_id: int,
        attendance_data: AttendanceEntry,
        tenant_id: str
    ) -> dict:
        """Mark attendance - MOCK DATA"""
        # In real implementation, this would save to attendance table
        return {
            "success": True,
            "message": f"Attendance marked for {len(attendance_data.attendance_records)} students",
            "date": attendance_data.date,
            "class_id": attendance_data.class_id
        }
    
    def get_teacher_schedule(
        self,
        teacher_id: int,
        tenant_id: str
    ) -> List[TeacherScheduleItem]:
        """Get teacher's weekly schedule - MOCK DATA"""
        return [
            TeacherScheduleItem(
                day="Monday",
                period=1,
                start_time="08:00",
                end_time="09:00",
                class_name="10-A",
                subject_name="Mathematics",
                room_number="101"
            ),
            TeacherScheduleItem(
                day="Monday",
                period=3,
                start_time="10:30",
                end_time="11:30",
                class_name="10-B",
                subject_name="Mathematics",
                room_number="102"
            ),
            TeacherScheduleItem(
                day="Tuesday",
                period=2,
                start_time="09:00",
                end_time="10:00",
                class_name="10-A",
                subject_name="Mathematics",
                room_number="101"
            ),
        ]
