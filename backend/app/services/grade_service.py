from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List

from app.models.grade import Grade, GradeCategory
from app.models.student import Student
from app.models.exam import Exam
from app.models.subject import Subject
from app.models.class_model import Class
from app.schemas.grade import GradeCategoryCreate, GradeCategoryUpdate, GradeCreate, GradeUpdate, GradeBulkEntry


class GradeService:
    """Service for grade category, grade entry, GPA calculation, and report cards."""

    def __init__(self, db: Session):
        self.db = db

    # ─── Grade Category (scale) ──────────────────────────────────────

    def get_categories(self, tenant_id: str) -> List[dict]:
        cats = (self.db.query(GradeCategory)
                .filter(GradeCategory.tenant_id == tenant_id)
                .order_by(GradeCategory.order, GradeCategory.min_percentage.desc())
                .all())
        return [self._cat_dict(c) for c in cats]

    def create_category(self, data: GradeCategoryCreate, tenant_id: str) -> GradeCategory:
        c = GradeCategory(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(c)
        self.db.commit()
        self.db.refresh(c)
        return c

    def update_category(self, cat_id: int, data: GradeCategoryUpdate, tenant_id: str) -> Optional[GradeCategory]:
        c = self.db.query(GradeCategory).filter(GradeCategory.id == cat_id, GradeCategory.tenant_id == tenant_id).first()
        if not c:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(c, field, value)
        self.db.commit()
        self.db.refresh(c)
        return c

    def delete_category(self, cat_id: int, tenant_id: str) -> bool:
        c = self.db.query(GradeCategory).filter(GradeCategory.id == cat_id, GradeCategory.tenant_id == tenant_id).first()
        if not c:
            return False
        self.db.delete(c)
        self.db.commit()
        return True

    def seed_default_categories(self, tenant_id: str) -> List[GradeCategory]:
        """Seed default grading scale if none exists."""
        existing = self.db.query(GradeCategory).filter(GradeCategory.tenant_id == tenant_id).count()
        if existing > 0:
            return []
        defaults = [
            {"name": "A+", "min_percentage": 90, "max_percentage": 100, "grade_point": 4.0, "description": "Outstanding", "is_passing": True, "order": 1},
            {"name": "A",  "min_percentage": 80, "max_percentage": 89.99, "grade_point": 3.7, "description": "Excellent", "is_passing": True, "order": 2},
            {"name": "B+", "min_percentage": 70, "max_percentage": 79.99, "grade_point": 3.3, "description": "Very Good", "is_passing": True, "order": 3},
            {"name": "B",  "min_percentage": 60, "max_percentage": 69.99, "grade_point": 3.0, "description": "Good", "is_passing": True, "order": 4},
            {"name": "C+", "min_percentage": 50, "max_percentage": 59.99, "grade_point": 2.5, "description": "Above Average", "is_passing": True, "order": 5},
            {"name": "C",  "min_percentage": 40, "max_percentage": 49.99, "grade_point": 2.0, "description": "Average", "is_passing": True, "order": 6},
            {"name": "D",  "min_percentage": 33, "max_percentage": 39.99, "grade_point": 1.5, "description": "Below Average", "is_passing": True, "order": 7},
            {"name": "F",  "min_percentage": 0,  "max_percentage": 32.99, "grade_point": 0.0, "description": "Fail", "is_passing": False, "order": 8},
        ]
        cats = []
        for d in defaults:
            c = GradeCategory(**d, tenant_id=tenant_id)
            self.db.add(c)
            cats.append(c)
        self.db.commit()
        for c in cats:
            self.db.refresh(c)
        return cats

    # ─── Resolve grade ───────────────────────────────────────────────

    def _resolve_grade(self, percentage: float, tenant_id: str) -> tuple:
        """Returns (grade_name, grade_point, is_passing)."""
        cats = (self.db.query(GradeCategory)
                .filter(GradeCategory.tenant_id == tenant_id)
                .order_by(GradeCategory.min_percentage.desc())
                .all())
        for c in cats:
            if c.min_percentage <= percentage <= c.max_percentage:
                return c.name, c.grade_point, c.is_passing
        return None, None, True

    # ─── Grade CRUD ──────────────────────────────────────────────────

    def get_grades(self, tenant_id: str, exam_id: Optional[int] = None,
                   class_id: Optional[int] = None, student_id: Optional[int] = None,
                   subject_id: Optional[int] = None) -> tuple:
        q = self.db.query(Grade).filter(Grade.tenant_id == tenant_id)
        if exam_id:
            q = q.filter(Grade.exam_id == exam_id)
        if class_id:
            q = q.filter(Grade.class_id == class_id)
        if student_id:
            q = q.filter(Grade.student_id == student_id)
        if subject_id:
            q = q.filter(Grade.subject_id == subject_id)
        total = q.count()
        items = q.order_by(Grade.created_at.desc()).all()
        return [self._grade_dict(g) for g in items], total

    def create_grade(self, data: GradeCreate, tenant_id: str) -> Grade:
        percentage = (data.marks_obtained / data.max_marks * 100) if data.max_marks > 0 else 0
        gn, gp, _ = self._resolve_grade(percentage, tenant_id)
        g = Grade(
            **data.model_dump(),
            tenant_id=tenant_id,
            percentage=round(percentage, 2),
            grade_name=gn,
            grade_point=gp,
        )
        self.db.add(g)
        self.db.commit()
        self.db.refresh(g)
        return g

    def bulk_create_grades(self, data: GradeBulkEntry, tenant_id: str) -> List[Grade]:
        created = []
        for entry in data.grades:
            sid = entry.get("student_id")
            mo = entry.get("marks_obtained", 0)
            remarks = entry.get("remarks")
            percentage = (mo / data.max_marks * 100) if data.max_marks > 0 else 0
            gn, gp, _ = self._resolve_grade(percentage, tenant_id)
            # Upsert: update existing grade or create new
            existing = self.db.query(Grade).filter(
                Grade.tenant_id == tenant_id,
                Grade.student_id == sid,
                Grade.exam_id == data.exam_id,
                Grade.subject_id == data.subject_id,
            ).first()
            if existing:
                existing.marks_obtained = mo
                existing.max_marks = data.max_marks
                existing.percentage = round(percentage, 2)
                existing.grade_name = gn
                existing.grade_point = gp
                existing.remarks = remarks
                created.append(existing)
            else:
                g = Grade(
                    student_id=sid, exam_id=data.exam_id, subject_id=data.subject_id,
                    class_id=data.class_id, academic_year=data.academic_year,
                    marks_obtained=mo, max_marks=data.max_marks,
                    percentage=round(percentage, 2), grade_name=gn, grade_point=gp,
                    remarks=remarks, tenant_id=tenant_id,
                )
                self.db.add(g)
                created.append(g)
        self.db.commit()
        for g in created:
            self.db.refresh(g)
        return created

    def update_grade(self, grade_id: int, data: GradeUpdate, tenant_id: str) -> Optional[Grade]:
        g = self.db.query(Grade).filter(Grade.id == grade_id, Grade.tenant_id == tenant_id).first()
        if not g:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(g, field, value)
        # Recalculate
        percentage = (g.marks_obtained / g.max_marks * 100) if g.max_marks > 0 else 0
        gn, gp, _ = self._resolve_grade(percentage, tenant_id)
        g.percentage = round(percentage, 2)
        g.grade_name = gn
        g.grade_point = gp
        self.db.commit()
        self.db.refresh(g)
        return g

    def delete_grade(self, grade_id: int, tenant_id: str) -> bool:
        g = self.db.query(Grade).filter(Grade.id == grade_id, Grade.tenant_id == tenant_id).first()
        if not g:
            return False
        self.db.delete(g)
        self.db.commit()
        return True

    # ─── GPA / Percentage ────────────────────────────────────────────

    def calculate_gpa(self, student_id: int, exam_id: int, tenant_id: str) -> Optional[dict]:
        grades = (self.db.query(Grade)
                  .filter(Grade.tenant_id == tenant_id, Grade.student_id == student_id, Grade.exam_id == exam_id)
                  .all())
        if not grades:
            return None

        student = self.db.query(Student).filter(Student.id == student_id).first()
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()

        subjects = []
        total_mo = 0
        total_max = 0
        gp_sum = 0
        all_pass = True

        for g in grades:
            pct = g.percentage or 0
            _, _, is_pass = self._resolve_grade(pct, tenant_id)
            if not is_pass:
                all_pass = False
            subjects.append({
                "subject_id": g.subject_id,
                "subject_name": g.subject.name if g.subject else "",
                "marks_obtained": g.marks_obtained,
                "max_marks": g.max_marks,
                "percentage": pct,
                "grade_name": g.grade_name,
                "grade_point": g.grade_point or 0,
                "remarks": g.remarks,
            })
            total_mo += g.marks_obtained
            total_max += g.max_marks
            gp_sum += (g.grade_point or 0)

        overall_pct = (total_mo / total_max * 100) if total_max > 0 else 0
        gpa = gp_sum / len(grades) if grades else 0
        gn, _, _ = self._resolve_grade(overall_pct, tenant_id)

        return {
            "student_id": student_id,
            "student_name": student.full_name if student else "",
            "exam_id": exam_id,
            "exam_name": exam.name if exam else "",
            "class_name": grades[0].class_ref.name if grades[0].class_ref else None,
            "academic_year": grades[0].academic_year,
            "subjects": subjects,
            "total_marks_obtained": total_mo,
            "total_max_marks": total_max,
            "overall_percentage": round(overall_pct, 2),
            "gpa": round(gpa, 2),
            "grade": gn,
            "result": "Pass" if all_pass else "Fail",
        }

    # ─── Report Card ─────────────────────────────────────────────────

    def generate_report_card(self, student_id: int, academic_year: str, tenant_id: str) -> Optional[dict]:
        """Generate a full report card across all exams for a student in an academic year."""
        student = self.db.query(Student).filter(Student.id == student_id, Student.tenant_id == tenant_id).first()
        if not student:
            return None

        # Get all exams this student has grades for
        exam_ids = (self.db.query(Grade.exam_id)
                    .filter(Grade.tenant_id == tenant_id, Grade.student_id == student_id, Grade.academic_year == academic_year)
                    .distinct().all())

        exams_data = []
        for (eid,) in exam_ids:
            gpa_data = self.calculate_gpa(student_id, eid, tenant_id)
            if gpa_data:
                exams_data.append(gpa_data)

        if not exams_data:
            return None

        cum_pct = sum(e["overall_percentage"] for e in exams_data) / len(exams_data) if exams_data else 0
        cum_gpa = sum(e["gpa"] for e in exams_data) / len(exams_data) if exams_data else 0
        overall_result = "Pass" if all(e["result"] == "Pass" for e in exams_data) else "Fail"

        # Get class name
        first_grade = (self.db.query(Grade)
                       .filter(Grade.tenant_id == tenant_id, Grade.student_id == student_id, Grade.academic_year == academic_year)
                       .first())

        return {
            "student_id": student_id,
            "student_name": student.full_name,
            "admission_number": getattr(student, 'admission_number', None),
            "class_name": first_grade.class_ref.name if first_grade and first_grade.class_ref else None,
            "academic_year": academic_year,
            "exams": exams_data,
            "cumulative_gpa": round(cum_gpa, 2),
            "cumulative_percentage": round(cum_pct, 2),
            "overall_result": overall_result,
        }

    # ─── Helpers ─────────────────────────────────────────────────────

    def _cat_dict(self, c: GradeCategory) -> dict:
        return {
            "id": c.id, "tenant_id": c.tenant_id, "name": c.name,
            "min_percentage": c.min_percentage, "max_percentage": c.max_percentage,
            "grade_point": c.grade_point, "description": c.description,
            "is_passing": c.is_passing, "order": c.order,
            "created_at": c.created_at, "updated_at": c.updated_at,
        }

    def _grade_dict(self, g: Grade) -> dict:
        return {
            "id": g.id, "tenant_id": g.tenant_id,
            "student_id": g.student_id, "exam_id": g.exam_id,
            "subject_id": g.subject_id, "class_id": g.class_id,
            "academic_year": g.academic_year,
            "marks_obtained": g.marks_obtained, "max_marks": g.max_marks,
            "percentage": g.percentage, "grade_name": g.grade_name,
            "grade_point": g.grade_point, "remarks": g.remarks,
            "student_name": g.student.full_name if g.student else None,
            "exam_name": g.exam.name if g.exam else None,
            "subject_name": g.subject.name if g.subject else None,
            "class_name": g.class_ref.name if g.class_ref else None,
            "created_at": g.created_at, "updated_at": g.updated_at,
        }
