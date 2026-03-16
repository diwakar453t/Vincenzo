from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from app.models.user import User
from app.models.student import Student
from app.models.class_model import Class
from app.models.attendance import StudentAttendance
from app.models.grade import Grade, GradeCategory
from app.models.exam import Exam
from app.models.subject import Subject
from app.models.fee import StudentFeeAssignment, FeeType, FeeCollection
from app.models.notification import Notification
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
    ParentUpdateProfile,
)


class ParentProfileService:
    """Service for parent profile and child monitoring operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_parent_by_user_id(self, user_id: int, tenant_id: str) -> Optional[User]:
        """Get parent user record"""
        return (
            self.db.query(User)
            .filter(
                User.id == user_id, User.tenant_id == tenant_id, User.role == "parent"
            )
            .first()
        )

    def get_parent_profile(
        self, user_id: int, tenant_id: str
    ) -> Optional[ParentProfileResponse]:
        """Get parent profile"""
        parent = self.get_parent_by_user_id(user_id, tenant_id)

        if not parent:
            return None

        return ParentProfileResponse(
            id=parent.id,
            full_name=parent.full_name,
            email=parent.email,
            phone=parent.phone if hasattr(parent, "phone") else None,
            address=parent.address if hasattr(parent, "address") else None,
            occupation=parent.occupation if hasattr(parent, "occupation") else None,
            user_id=parent.id,
        )

    def update_parent_profile(
        self, user_id: int, update_data: ParentUpdateProfile, tenant_id: str
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

    def _compute_attendance_pct(self, student_id: int, tenant_id: str) -> float:
        """Compute attendance percentage for a student from real records"""
        total = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == student_id,
                StudentAttendance.tenant_id == tenant_id,
            )
            .scalar()
        )
        if not total:
            return 0.0

        present = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == student_id,
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.status.in_(["present", "late"]),
            )
            .scalar()
        )
        return round((present / total) * 100, 1)

    def get_parent_children(
        self, parent_user_id: int, tenant_id: str
    ) -> List[ParentChildInfo]:
        """Get all children of parent"""
        children = (
            self.db.query(Student)
            .filter(Student.parent_id == parent_user_id, Student.tenant_id == tenant_id)
            .all()
        )

        result = []
        for child in children:
            class_obj = self.db.query(Class).filter(Class.id == child.class_id).first()
            class_name = f"{class_obj.name}" if class_obj else "Unknown"
            grade_level = class_obj.grade_level if class_obj else 0
            section = class_obj.section if class_obj else ""

            # Real attendance percentage
            attendance_pct = self._compute_attendance_pct(child.id, tenant_id)

            result.append(
                ParentChildInfo(
                    id=child.id,
                    student_id=child.student_id,
                    full_name=child.full_name,
                    class_name=class_name,
                    grade_level=grade_level,
                    section=section,
                    photo_url=child.photo_url if hasattr(child, "photo_url") else None,
                    status=child.status,
                    attendance_percentage=attendance_pct,
                )
            )

        return result

    def get_child_details(
        self, parent_user_id: int, child_id: int, tenant_id: str
    ) -> Optional[ChildDetailedInfo]:
        """Get detailed child information (verify parent ownership)"""
        child = (
            self.db.query(Student)
            .filter(
                Student.id == child_id,
                Student.parent_id == parent_user_id,
                Student.tenant_id == tenant_id,
            )
            .first()
        )

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
            photo_url=child.photo_url if hasattr(child, "photo_url") else None,
            blood_group=child.blood_group if hasattr(child, "blood_group") else None,
            medical_info=child.medical_info if hasattr(child, "medical_info") else None,
        )

    def get_child_grades(
        self, parent_user_id: int, child_id: int, tenant_id: str, term: str = "Term 1"
    ) -> Optional[ChildGradeReport]:
        """Get child's grade report from real Grade/Exam/Subject tables"""
        # Verify parent owns this child
        child = (
            self.db.query(Student)
            .filter(
                Student.id == child_id,
                Student.parent_id == parent_user_id,
                Student.tenant_id == tenant_id,
            )
            .first()
        )

        if not child:
            return None

        class_obj = self.db.query(Class).filter(Class.id == child.class_id).first()
        class_name = class_obj.name if class_obj else "Unknown"

        # Query real grades for this student, optionally filtering by term
        grades_query = (
            self.db.query(Grade)
            .join(Exam, Grade.exam_id == Exam.id)
            .join(Subject, Grade.subject_id == Subject.id)
            .filter(
                Grade.student_id == child_id,
                Grade.tenant_id == tenant_id,
            )
        )

        # If a term filter is given, try to match exam name
        if term:
            grades_query = grades_query.filter(Exam.name.ilike(f"%{term}%"))

        grade_rows = grades_query.all()

        grade_items = []
        for g in grade_rows:
            subj = self.db.query(Subject).filter(Subject.id == g.subject_id).first()
            pct = g.percentage if g.percentage is not None else (
                (g.marks_obtained / g.max_marks) * 100 if g.max_marks else 0
            )
            grade_items.append(
                ChildGradeItem(
                    subject_name=subj.name if subj else "Unknown",
                    subject_code=subj.code if subj else "—",
                    term=term,
                    marks_obtained=g.marks_obtained,
                    total_marks=g.max_marks,
                    percentage=round(pct, 1),
                    grade=g.grade_name or "—",
                    remarks=g.remarks,
                )
            )

        if not grade_items:
            # Return empty report instead of None so parent still sees the structure
            return ChildGradeReport(
                student_id=child.id,
                student_name=child.full_name,
                class_name=class_name,
                academic_year="2025-26",
                term=term,
                grades=[],
                overall_percentage=0,
                overall_grade="—",
                gpa=0,
                rank=None,
                total_students=None,
            )

        overall_pct = sum(g.percentage for g in grade_items) / len(grade_items)

        # Resolve overall grade from GradeCategory (if seeded)
        overall_grade = "—"
        category = (
            self.db.query(GradeCategory)
            .filter(
                GradeCategory.min_percentage <= overall_pct,
                GradeCategory.max_percentage >= overall_pct,
                GradeCategory.tenant_id == tenant_id,
            )
            .first()
        )
        if category:
            overall_grade = category.name

        # Compute GPA as average of grade_points for matching categories
        gpa = 0.0
        if category:
            gpa = category.grade_point

        # Rank among peers in same class + same exam set
        total_students_in_class = (
            self.db.query(Student)
            .filter(Student.class_id == child.class_id, Student.tenant_id == tenant_id)
            .count()
        )

        return ChildGradeReport(
            student_id=child.id,
            student_name=child.full_name,
            class_name=class_name,
            academic_year="2025-26",
            term=term,
            grades=grade_items,
            overall_percentage=round(overall_pct, 1),
            overall_grade=overall_grade,
            gpa=round(gpa, 2),
            rank=None,
            total_students=total_students_in_class,
        )

    def get_child_attendance(
        self, parent_user_id: int, child_id: int, tenant_id: str
    ) -> Optional[ChildAttendanceSummary]:
        """Get child's attendance summary from real StudentAttendance records"""
        # Verify parent owns this child
        child = (
            self.db.query(Student)
            .filter(
                Student.id == child_id,
                Student.parent_id == parent_user_id,
                Student.tenant_id == tenant_id,
            )
            .first()
        )

        if not child:
            return None

        # Aggregate counts
        total_days = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == child_id,
                StudentAttendance.tenant_id == tenant_id,
            )
            .scalar()
        ) or 0

        present_days = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == child_id,
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.status == "present",
            )
            .scalar()
        ) or 0

        absent_days = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == child_id,
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.status == "absent",
            )
            .scalar()
        ) or 0

        late_days = (
            self.db.query(func.count(StudentAttendance.id))
            .filter(
                StudentAttendance.student_id == child_id,
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.status == "late",
            )
            .scalar()
        ) or 0

        # Recent records (last 30 days)
        recent_rows = (
            self.db.query(StudentAttendance)
            .filter(
                StudentAttendance.student_id == child_id,
                StudentAttendance.tenant_id == tenant_id,
            )
            .order_by(StudentAttendance.date.desc())
            .limit(30)
            .all()
        )

        recent_records = [
            ChildAttendanceDay(
                date=r.date,
                status=r.status if isinstance(r.status, str) else r.status.value,
                remarks=r.remarks,
            )
            for r in recent_rows
        ]

        attendance_pct = (present_days / total_days) * 100 if total_days > 0 else 0.0

        return ChildAttendanceSummary(
            student_id=child.id,
            student_name=child.full_name,
            total_days=total_days,
            present_days=present_days,
            absent_days=absent_days,
            late_days=late_days,
            attendance_percentage=round(attendance_pct, 1),
            recent_records=recent_records,
        )

    def get_child_assignments(
        self, parent_user_id: int, child_id: int, tenant_id: str
    ) -> List[ChildAssignmentInfo]:
        """Get child's assignments from real Exam (type=assignment) and Grade records"""
        # Verify parent owns this child
        child = (
            self.db.query(Student)
            .filter(
                Student.id == child_id,
                Student.parent_id == parent_user_id,
                Student.tenant_id == tenant_id,
            )
            .first()
        )

        if not child:
            return []

        # Get assignments for this child's class
        exams = (
            self.db.query(Exam)
            .filter(
                Exam.class_id == child.class_id,
                Exam.tenant_id == tenant_id,
                Exam.exam_type == "assignment",
            )
            .order_by(Exam.end_date.desc())
            .all()
        )

        result = []
        for exam in exams:
            # Check if student has a grade (= submission) for this assignment
            grade = (
                self.db.query(Grade)
                .filter(
                    Grade.exam_id == exam.id,
                    Grade.student_id == child_id,
                    Grade.tenant_id == tenant_id,
                )
                .first()
            )

            if grade:
                status = "graded"
                submitted_date = grade.created_at.date() if grade.created_at else None
                marks_obtained = grade.marks_obtained
                teacher_remarks = grade.remarks
            else:
                today = date.today()
                if exam.end_date and today > exam.end_date:
                    status = "overdue"
                else:
                    status = "pending"
                submitted_date = None
                marks_obtained = None
                teacher_remarks = None

            # Try to get subject name
            subject_name = "General"
            if exam.schedules:
                first_schedule = exam.schedules[0]
                if first_schedule.subject:
                    subject_name = first_schedule.subject.name
            elif grade and grade.subject:
                subject_name = grade.subject.name

            result.append(
                ChildAssignmentInfo(
                    id=exam.id,
                    title=exam.name,
                    description=exam.description,
                    subject_name=subject_name,
                    assigned_date=exam.start_date or (exam.created_at.date() if exam.created_at else date.today()),
                    due_date=exam.end_date or date.today(),
                    total_marks=exam.total_marks,
                    status=status,
                    submitted_date=submitted_date,
                    marks_obtained=marks_obtained,
                    teacher_remarks=teacher_remarks,
                )
            )

        return result

    def get_fee_status(self, parent_user_id: int, tenant_id: str) -> FeePaymentStatus:
        """Get fee payment status from real StudentFeeAssignment and FeeCollection tables"""
        children = self.get_parent_children(parent_user_id, tenant_id)

        if not children:
            return FeePaymentStatus(
                student_id=0,
                student_name="No children",
                academic_year="2025-26",
                total_fee=0,
                paid_amount=0,
                pending_amount=0,
                payment_items=[],
            )

        # Aggregate fees across all children
        first_child = children[0]
        all_child_ids = [c.id for c in children]

        # Query fee assignments for all children
        assignments = (
            self.db.query(StudentFeeAssignment)
            .filter(
                StudentFeeAssignment.student_id.in_(all_child_ids),
                StudentFeeAssignment.tenant_id == tenant_id,
            )
            .all()
        )

        payment_items = []
        total_fee = 0.0
        paid_amount = 0.0

        for assignment in assignments:
            fee_type = (
                self.db.query(FeeType)
                .filter(FeeType.id == assignment.fee_type_id)
                .first()
            )
            fee_label = fee_type.name if fee_type else "Fee"

            # Determine status
            status = assignment.status
            if isinstance(status, str):
                status_str = status
            else:
                status_str = status.value if status else "unpaid"

            # Get last payment for this assignment
            last_payment = (
                self.db.query(FeeCollection)
                .filter(
                    FeeCollection.assignment_id == assignment.id,
                    FeeCollection.tenant_id == tenant_id,
                )
                .order_by(FeeCollection.payment_date.desc())
                .first()
            )

            paid_date = last_payment.payment_date if last_payment else None
            payment_method = None
            receipt_number = None
            if last_payment:
                pm = last_payment.payment_method
                payment_method = pm if isinstance(pm, str) else (pm.value if pm else None)
                receipt_number = last_payment.receipt_number

            payment_items.append(
                FeeItem(
                    fee_type=fee_label,
                    amount=assignment.net_amount or assignment.amount,
                    due_date=assignment.due_date or date.today(),
                    status=status_str,
                    paid_date=paid_date,
                    payment_method=payment_method,
                    receipt_number=receipt_number,
                )
            )

            total_fee += assignment.net_amount or assignment.amount
            paid_amount += assignment.paid_amount or 0

        return FeePaymentStatus(
            student_id=first_child.id,
            student_name=first_child.full_name,
            academic_year="2025-26",
            total_fee=total_fee,
            paid_amount=paid_amount,
            pending_amount=total_fee - paid_amount,
            payment_items=payment_items,
        )

    def get_notifications(
        self, parent_user_id: int, tenant_id: str
    ) -> List[NotificationItem]:
        """Get school notifications from real Notification table"""
        notifications = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == parent_user_id,
                Notification.tenant_id == tenant_id,
                Notification.is_active == True,
            )
            .order_by(Notification.created_at.desc())
            .limit(20)
            .all()
        )

        result = []
        for n in notifications:
            # Map notification_type to category
            ntype = n.notification_type
            if isinstance(ntype, str):
                category = ntype
            else:
                category = ntype.value if ntype else "general"

            result.append(
                NotificationItem(
                    id=n.id,
                    title=n.title,
                    message=n.message,
                    category=category,
                    date=n.created_at.date() if n.created_at else date.today(),
                    is_read=n.is_read,
                )
            )

        return result
