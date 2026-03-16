from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.student import Student
from app.models.class_subject import ClassSubject
from app.models.timetable import Period, Timetable
from app.models.subject import Subject
from app.models.room import Room
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.attendance import StudentAttendance
from app.schemas.teacher_profile import (
    TeacherProfileResponse,
    TeacherClassInfo,
    TeacherStudentInfo,
    GradeEntry,
    AssignmentCreate,
    AssignmentResponse,
    AttendanceEntry,
    TeacherScheduleItem,
    TeacherUpdateProfile,
)


class TeacherProfileService:
    """Service for teacher profile and teaching operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_teacher_by_user_id(self, user_id: int, tenant_id: str) -> Optional[Teacher]:
        """Get teacher record from user_id"""
        return (
            self.db.query(Teacher)
            .filter(Teacher.user_id == user_id, Teacher.tenant_id == tenant_id)
            .first()
        )

    def get_teacher_profile(
        self, teacher_id: int, tenant_id: str
    ) -> Optional[TeacherProfileResponse]:
        """Get teacher profile"""
        teacher = (
            self.db.query(Teacher)
            .filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant_id)
            .first()
        )

        if not teacher:
            return None

        return TeacherProfileResponse.model_validate(teacher)

    def update_teacher_profile(
        self, teacher_id: int, update_data: TeacherUpdateProfile, tenant_id: str
    ) -> Optional[Teacher]:
        """Update teacher profile (limited fields)"""
        teacher = (
            self.db.query(Teacher)
            .filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant_id)
            .first()
        )

        if not teacher:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(teacher, field, value)

        self.db.commit()
        self.db.refresh(teacher)

        return teacher

    def get_teacher_classes(
        self, teacher_id: int, tenant_id: str
    ) -> List[TeacherClassInfo]:
        """Get classes assigned to teacher"""
        # Classes where teacher is class teacher
        class_teacher_classes = (
            self.db.query(Class)
            .filter(Class.class_teacher_id == teacher_id, Class.tenant_id == tenant_id)
            .all()
        )

        # Classes where teacher teaches subjects
        subject_classes_query = (
            self.db.query(Class)
            .join(ClassSubject, Class.id == ClassSubject.class_id)
            .filter(
                ClassSubject.teacher_id == teacher_id,
                ClassSubject.tenant_id == tenant_id,
            )
            .distinct()
            .all()
        )

        # Combine and deduplicate
        all_classes = list(
            {c.id: c for c in class_teacher_classes + subject_classes_query}.values()
        )

        result = []
        for class_obj in all_classes:
            student_count = (
                self.db.query(Student)
                .filter(
                    Student.class_id == class_obj.id, Student.tenant_id == tenant_id
                )
                .count()
            )

            result.append(
                TeacherClassInfo(
                    id=class_obj.id,
                    name=class_obj.name,
                    grade_level=class_obj.grade_level,
                    section=class_obj.section,
                    room_number=class_obj.room_number,
                    student_count=student_count,
                    is_class_teacher=(class_obj.class_teacher_id == teacher_id),
                )
            )

        return result

    def get_teacher_students(
        self, teacher_id: int, tenant_id: str, class_id: Optional[int] = None
    ) -> List[TeacherStudentInfo]:
        """Get students in teacher's classes"""
        # Get teacher's classes
        teacher_classes = self.get_teacher_classes(teacher_id, tenant_id)
        class_ids = [c.id for c in teacher_classes]

        if not class_ids:
            return []

        query = self.db.query(Student).filter(
            Student.class_id.in_(class_ids), Student.tenant_id == tenant_id
        )

        if class_id:
            query = query.filter(Student.class_id == class_id)

        students = query.all()

        result = []
        for student in students:
            class_obj = (
                self.db.query(Class).filter(Class.id == student.class_id).first()
            )
            class_name = class_obj.name if class_obj else "Unknown"

            result.append(
                TeacherStudentInfo(
                    id=student.id,
                    student_id=student.student_id,
                    full_name=student.full_name,
                    class_name=class_name,
                    email=student.email,
                    phone=student.phone,
                    status=student.status,
                )
            )

        return result

    def get_class_students(
        self, teacher_id: int, class_id: int, tenant_id: str
    ) -> List[TeacherStudentInfo]:
        """Get students in a specific class (verify teacher has access)"""
        # Verify teacher teaches this class
        teacher_classes = self.get_teacher_classes(teacher_id, tenant_id)
        class_ids = [c.id for c in teacher_classes]

        if class_id not in class_ids:
            return []  # Teacher doesn't have access to this class

        return self.get_teacher_students(teacher_id, tenant_id, class_id)

    # ── Real DB implementations ──────────────────────────────────────

    def create_assignment(
        self, teacher_id: int, assignment_data: AssignmentCreate, tenant_id: str
    ) -> dict:
        """Create an assignment as an Exam record with type 'assignment'"""
        exam = Exam(
            name=assignment_data.title,
            description=assignment_data.description,
            exam_type="assignment",
            academic_year="2025-26",
            status="upcoming",
            start_date=date.today(),
            end_date=assignment_data.due_date,
            class_id=assignment_data.class_id,
            total_marks=assignment_data.total_marks,
            passing_marks=0,
            tenant_id=tenant_id,
        )
        self.db.add(exam)
        self.db.commit()
        self.db.refresh(exam)

        return {
            "id": exam.id,
            "title": exam.name,
            "description": exam.description,
            "subject_id": assignment_data.subject_id,
            "class_id": exam.class_id,
            "due_date": str(exam.end_date),
            "total_marks": exam.total_marks,
            "assigned_date": str(exam.start_date),
            "teacher_id": teacher_id,
        }

    def get_teacher_assignments(
        self, teacher_id: int, tenant_id: str
    ) -> List[AssignmentResponse]:
        """Get assignments (exams of type 'assignment') for teacher's classes"""
        teacher_classes = self.get_teacher_classes(teacher_id, tenant_id)
        class_ids = [c.id for c in teacher_classes]
        class_map = {c.id: c.name for c in teacher_classes}

        if not class_ids:
            return []

        exams = (
            self.db.query(Exam)
            .filter(
                Exam.class_id.in_(class_ids),
                Exam.tenant_id == tenant_id,
                Exam.exam_type == "assignment",
            )
            .order_by(Exam.end_date.desc())
            .all()
        )

        result = []
        for exam in exams:
            class_name = class_map.get(exam.class_id, "Unknown")

            # Count submissions (grades entered for this exam)
            submission_count = (
                self.db.query(Grade)
                .filter(Grade.exam_id == exam.id, Grade.tenant_id == tenant_id)
                .count()
            )

            # Total students in this class
            total_students = (
                self.db.query(Student)
                .filter(
                    Student.class_id == exam.class_id,
                    Student.tenant_id == tenant_id,
                )
                .count()
            )

            # Try to get subject name from exam schedules or first grade
            subject_name = "General"
            first_grade = (
                self.db.query(Grade)
                .filter(Grade.exam_id == exam.id)
                .first()
            )
            if first_grade and first_grade.subject:
                subject_name = first_grade.subject.name

            result.append(
                AssignmentResponse(
                    id=exam.id,
                    title=exam.name,
                    description=exam.description,
                    subject_name=subject_name,
                    class_name=class_name,
                    due_date=exam.end_date or date.today(),
                    total_marks=exam.total_marks,
                    assigned_date=exam.start_date or exam.created_at.date() if exam.created_at else date.today(),
                    submission_count=submission_count,
                    pending_count=max(0, total_students - submission_count),
                )
            )

        return result

    def enter_grades(
        self, teacher_id: int, grade_data: GradeEntry, tenant_id: str
    ) -> dict:
        """Enter or update a student grade in the grades table"""
        # Look for an existing exam for this term + class, or find the latest
        exam = (
            self.db.query(Exam)
            .filter(
                Exam.class_id == grade_data.class_id,
                Exam.tenant_id == tenant_id,
                Exam.name.ilike(f"%{grade_data.term}%"),
            )
            .first()
        )

        if not exam:
            # Create an exam record for this term
            exam = Exam(
                name=f"{grade_data.term} Exam",
                exam_type="mid_term" if "mid" in grade_data.term.lower() else "final",
                academic_year="2025-26",
                status="completed",
                class_id=grade_data.class_id,
                total_marks=grade_data.total_marks,
                passing_marks=grade_data.total_marks * 0.35,
                tenant_id=tenant_id,
            )
            self.db.add(exam)
            self.db.commit()
            self.db.refresh(exam)

        # Check for existing grade
        existing = (
            self.db.query(Grade)
            .filter(
                Grade.student_id == grade_data.student_id,
                Grade.exam_id == exam.id,
                Grade.subject_id == grade_data.subject_id,
                Grade.tenant_id == tenant_id,
            )
            .first()
        )

        percentage = (
            (grade_data.marks_obtained / grade_data.total_marks) * 100
            if grade_data.total_marks > 0
            else 0
        )

        if existing:
            existing.marks_obtained = grade_data.marks_obtained
            existing.max_marks = grade_data.total_marks
            existing.percentage = percentage
            existing.grade_name = grade_data.grade
            existing.remarks = grade_data.remarks
        else:
            grade = Grade(
                student_id=grade_data.student_id,
                exam_id=exam.id,
                subject_id=grade_data.subject_id,
                class_id=grade_data.class_id,
                academic_year="2025-26",
                marks_obtained=grade_data.marks_obtained,
                max_marks=grade_data.total_marks,
                percentage=percentage,
                grade_name=grade_data.grade,
                remarks=grade_data.remarks,
                tenant_id=tenant_id,
            )
            self.db.add(grade)

        self.db.commit()

        return {
            "success": True,
            "message": "Grade entered successfully",
            "exam_id": exam.id,
            "grade": grade_data.model_dump(),
        }

    def mark_attendance(
        self, teacher_id: int, attendance_data: AttendanceEntry, tenant_id: str
    ) -> dict:
        """Mark attendance for students — persists to student_attendance table"""
        count = 0
        for record in attendance_data.attendance_records:
            student_id = record.get("student_id")
            status = record.get("status", "present")

            # Upsert: check if record already exists for this student + date
            existing = (
                self.db.query(StudentAttendance)
                .filter(
                    StudentAttendance.student_id == student_id,
                    StudentAttendance.date == attendance_data.date,
                    StudentAttendance.tenant_id == tenant_id,
                )
                .first()
            )

            if existing:
                existing.status = status
                existing.class_id = attendance_data.class_id
            else:
                att = StudentAttendance(
                    student_id=student_id,
                    class_id=attendance_data.class_id,
                    date=attendance_data.date,
                    status=status,
                    tenant_id=tenant_id,
                )
                self.db.add(att)

            count += 1

        self.db.commit()

        return {
            "success": True,
            "message": f"Attendance marked for {count} students",
            "date": str(attendance_data.date),
            "class_id": attendance_data.class_id,
        }

    def get_teacher_schedule(
        self, teacher_id: int, tenant_id: str
    ) -> List[TeacherScheduleItem]:
        """Get teacher's weekly schedule from the timetable/periods tables"""
        periods = (
            self.db.query(Period)
            .join(Timetable, Period.timetable_id == Timetable.id)
            .filter(
                Period.teacher_id == teacher_id,
                Timetable.tenant_id == tenant_id,
            )
            .order_by(Period.day_of_week, Period.start_time)
            .all()
        )

        result = []
        for idx, period in enumerate(periods, start=1):
            # Resolve names via relationships or fallback queries
            subject_name = "Free Period"
            if period.subject:
                subject_name = period.subject.name

            class_name = "—"
            if period.timetable and period.timetable.class_ref:
                cls = period.timetable.class_ref
                class_name = f"{cls.name}-{cls.section}" if cls.section else cls.name

            room_number = None
            if period.room:
                room_number = period.room.room_number

            result.append(
                TeacherScheduleItem(
                    day=period.day_of_week.capitalize(),
                    period=idx,
                    start_time=period.start_time,
                    end_time=period.end_time,
                    class_name=class_name,
                    subject_name=subject_name,
                    room_number=room_number,
                )
            )

        return result
