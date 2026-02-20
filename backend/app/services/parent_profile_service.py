from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from app.models.user import User
from app.models.student import Student
from app.models.class_model import Class
from app.schemas.parent_profile import (
    ParentProfileResponse,
    ParentChildInfo,
    ChildDetailedInfo,
    ChildGradeReport,
    ChildGradeItem,
    ChildAttendanceSummary,
    ChildAttendanceDay,
    ChildAssignmentInfo,
    FeePaymentStatus,
    FeeItem,
    NotificationItem,
    ParentUpdateProfile
)


class ParentProfileService:
    """Service for parent profile and child monitoring operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_parent_by_user_id(self, user_id: int, tenant_id: str) -> Optional[User]:
        """Get parent user record"""
        return self.db.query(User).filter(
            User.id == user_id,
            User.tenant_id == tenant_id,
            User.role == "parent"
        ).first()
    
    def get_parent_profile(self, user_id: int, tenant_id: str) -> Optional[ParentProfileResponse]:
        """Get parent profile"""
        parent = self.get_parent_by_user_id(user_id, tenant_id)
        
        if not parent:
            return None
        
        return ParentProfileResponse(
            id=parent.id,
            full_name=parent.full_name,
            email=parent.email,
            phone=parent.phone if hasattr(parent, 'phone') else None,
            address=parent.address if hasattr(parent, 'address') else None,
            occupation=parent.occupation if hasattr(parent, 'occupation') else None,
            user_id=parent.id
        )
    
    def update_parent_profile(
        self,
        user_id: int,
        update_data: ParentUpdateProfile,
        tenant_id: str
    ) -> Optional[User]:
        """Update parent profile"""
        parent = self.get_parent_by_user_id(user_id, tenant_id)
        
        if not parent:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(parent, field, value)
        
        self.db.commit()
        self.db.refresh(parent)
        
        return parent
    
    def get_parent_children(self, parent_user_id: int, tenant_id: str) -> List[ParentChildInfo]:
        """Get all children of parent"""
        children = self.db.query(Student).filter(
            Student.parent_id == parent_user_id,
            Student.tenant_id == tenant_id
        ).all()
        
        result = []
        for child in children:
            class_obj = self.db.query(Class).filter(Class.id == child.class_id).first()
            class_name = f"{class_obj.name}" if class_obj else "Unknown"
            grade_level = class_obj.grade_level if class_obj else 0
            section = class_obj.section if class_obj else ""
            
            # Mock attendance percentage
            attendance_pct = 92.5
            
            result.append(ParentChildInfo(
                id=child.id,
                student_id=child.student_id,
                full_name=child.full_name,
                class_name=class_name,
                grade_level=grade_level,
                section=section,
                photo_url=child.photo_url if hasattr(child, 'photo_url') else None,
                status=child.status,
                attendance_percentage=attendance_pct
            ))
        
        return result
    
    def get_child_details(
        self,
        parent_user_id: int,
        child_id: int,
        tenant_id: str
    ) -> Optional[ChildDetailedInfo]:
        """Get detailed child information (verify parent ownership)"""
        child = self.db.query(Student).filter(
            Student.id == child_id,
            Student.parent_id == parent_user_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not child:
            return None
        
        class_obj = self.db.query(Class).filter(Class.id == child.class_id).first()
        class_name = class_obj.name if class_obj else "Unknown"
        grade_level = class_obj.grade_level if class_obj else 0
        section = class_obj.section if class_obj else ""
        
        return ChildDetailedInfo(
            id=child.id,
            student_id=child.student_id,
            first_name=child.first_name,
            last_name=child.last_name,
            full_name=child.full_name,
            email=child.email,
            phone=child.phone,
            date_of_birth=child.date_of_birth,
            gender=child.gender,
            class_id=child.class_id,
            class_name=class_name,
            grade_level=grade_level,
            section=section,
            enrollment_date=child.enrollment_date,
            status=child.status,
            address=child.address,
            photo_url=child.photo_url if hasattr(child, 'photo_url') else None,
            blood_group=child.blood_group if hasattr(child, 'blood_group') else None,
            medical_info=child.medical_info if hasattr(child, 'medical_info') else None
        )
    
    def get_child_grades(
        self,
        parent_user_id: int,
        child_id: int,
        tenant_id: str,
        term: str = "Term 1"
    ) -> Optional[ChildGradeReport]:
        """Get child's grade report - MOCK DATA"""
        # Verify parent owns this child
        child = self.db.query(Student).filter(
            Student.id == child_id,
            Student.parent_id == parent_user_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not child:
            return None
        
        class_obj = self.db.query(Class).filter(Class.id == child.class_id).first()
        class_name = class_obj.name if class_obj else "Unknown"
        
        # Mock grades
        mock_grades = [
            ChildGradeItem(
                subject_name="Mathematics",
                subject_code="MATH101",
                term=term,
                marks_obtained=85,
                total_marks=100,
                percentage=85.0,
                grade="A",
                remarks="Excellent performance"
            ),
            ChildGradeItem(
                subject_name="Science",
                subject_code="SCI101",
                term=term,
                marks_obtained=78,
                total_marks=100,
                percentage=78.0,
                grade="B+",
                remarks="Good understanding"
            ),
            ChildGradeItem(
                subject_name="English",
                subject_code="ENG101",
                term=term,
                marks_obtained=92,
                total_marks=100,
                percentage=92.0,
                grade="A+",
                remarks="Outstanding work"
            ),
            ChildGradeItem(
                subject_name="Social Studies",
                subject_code="SS101",
                term=term,
                marks_obtained=80,
                total_marks=100,
                percentage=80.0,
                grade="A-",
                remarks="Very good"
            ),
        ]
        
        overall_pct = sum(g.percentage for g in mock_grades) / len(mock_grades)
        
        return ChildGradeReport(
            student_id=child.id,
            student_name=child.full_name,
            class_name=class_name,
            academic_year="2025-2026",
            term=term,
            grades=mock_grades,
            overall_percentage=overall_pct,
            overall_grade="A",
            gpa=3.8,
            rank=5,
            total_students=30
        )
    
    def get_child_attendance(
        self,
        parent_user_id: int,
        child_id: int,
        tenant_id: str
    ) -> Optional[ChildAttendanceSummary]:
        """Get child's attendance summary - MOCK DATA"""
        # Verify parent owns this child
        child = self.db.query(Student).filter(
            Student.id == child_id,
            Student.parent_id == parent_user_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not child:
            return None
        
        # Mock recent attendance
        today = date.today()
        recent_records = []
        for i in range(10):
            day = today - timedelta(days=i)
            status = "present" if i % 7 != 0 else "absent"
            recent_records.append(ChildAttendanceDay(
                date=day,
                status=status,
                remarks=None if status == "present" else "Sick leave"
            ))
        
        total_days = 100
        present_days = 92
        absent_days = 6
        late_days = 2
        
        return ChildAttendanceSummary(
            student_id=child.id,
            student_name=child.full_name,
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            late_days=late_days,
            attendance_percentage=(present_days / total_days) * 100,
            recent_records=recent_records
        )
    
    def get_child_assignments(
        self,
        parent_user_id: int,
        child_id: int,
        tenant_id: str
    ) -> List[ChildAssignmentInfo]:
        """Get child's assignments - MOCK DATA"""
        # Verify parent owns this child
        child = self.db.query(Student).filter(
            Student.id == child_id,
            Student.parent_id == parent_user_id,
            Student.tenant_id == tenant_id
        ).first()
        
        if not child:
            return []
        
        today = date.today()
        
        return [
            ChildAssignmentInfo(
                id=1,
                title="Math Chapter 5 Problems",
                description="Complete exercises 1-20",
                subject_name="Mathematics",
                assigned_date=today - timedelta(days=5),
                due_date=today + timedelta(days=2),
                total_marks=20,
                status="pending",
                submitted_date=None,
                marks_obtained=None,
                teacher_remarks=None
            ),
            ChildAssignmentInfo(
                id=2,
                title="Science Lab Report",
                description="Document the experiment results",
                subject_name="Science",
                assigned_date=today - timedelta(days=10),
                due_date=today - timedelta(days=2),
                total_marks=30,
                status="graded",
                submitted_date=today - timedelta(days=3),
                marks_obtained=27,
                teacher_remarks="Excellent documentation and analysis"
            ),
        ]
    
    def get_fee_status(
        self,
        parent_user_id: int,
        tenant_id: str
    ) -> FeePaymentStatus:
        """Get fee payment status for all children - MOCK DATA"""
        children = self.get_parent_children(parent_user_id, tenant_id)
        
        if not children:
            return FeePaymentStatus(
                student_id=0,
                student_name="No children",
                academic_year="2025-2026",
                total_fee=0,
                paid_amount=0,
                pending_amount=0,
                payment_items=[]
            )
        
        # For simplicity, show first child's fees
        first_child = children[0]
        
        today = date.today()
        payment_items = [
            FeeItem(
                fee_type="Tuition Fee (Term 1)",
                amount=5000,
                due_date=date(2025, 4, 30),
                status="paid",
                paid_date=date(2025, 4, 15),
                payment_method="Online",
                receipt_number="RCP-2025-001"
            ),
            FeeItem(
                fee_type="Tuition Fee (Term 2)",
                amount=5000,
                due_date=date(2025, 9, 30),
                status="pending",
                paid_date=None,
                payment_method=None,
                receipt_number=None
            ),
            FeeItem(
                fee_type="Activity Fee",
                amount=1000,
                due_date=date(2025, 10, 15),
                status="pending",
                paid_date=None,
                payment_method=None,
                receipt_number=None
            ),
        ]
        
        total_fee = sum(item.amount for item in payment_items)
        paid_amount = sum(item.amount for item in payment_items if item.status == "paid")
        
        return FeePaymentStatus(
            student_id=first_child.id,
            student_name=first_child.full_name,
            academic_year="2025-2026",
            total_fee=total_fee,
            paid_amount=paid_amount,
            pending_amount=total_fee - paid_amount,
            payment_items=payment_items
        )
    
    def get_notifications(
        self,
        parent_user_id: int,
        tenant_id: str
    ) -> List[NotificationItem]:
        """Get school notifications - MOCK DATA"""
        today = date.today()
        
        return [
            NotificationItem(
                id=1,
                title="Parent-Teacher Meeting",
                message="Scheduled for next Saturday at 10 AM. Please confirm attendance.",
                category="event",
                date=today - timedelta(days=2),
                is_read=False
            ),
            NotificationItem(
                id=2,
                title="Fee Payment Reminder",
                message="Term 2 tuition fee payment is due by September 30th.",
                category="fee",
                date=today - timedelta(days=5),
                is_read=True
            ),
            NotificationItem(
                id=3,
                title="Annual Sports Day",
                message="Annual sports day will be held on October 15th. All parents are invited.",
                category="event",
                date=today - timedelta(days=7),
                is_read=True
            ),
        ]
