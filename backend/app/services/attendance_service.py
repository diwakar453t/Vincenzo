import calendar
from datetime import date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.attendance import StudentAttendance, StaffAttendance, AttendanceStatus
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.schemas.attendance import (
    StudentAttendanceCreate, StudentAttendanceBulk, StaffAttendanceCreate, StaffAttendanceBulk,
)


class AttendanceService:
    def __init__(self, db: Session):
        self.db = db

    # ═══ Student attendance ══════════════════════════════════════════════

    def get_student_attendance(self, tenant_id: str, class_id: Optional[int] = None,
                                student_id: Optional[int] = None, target_date: Optional[date] = None,
                                month: Optional[int] = None, year: Optional[int] = None,
                                skip: int = 0, limit: int = 200) -> tuple:
        q = self.db.query(StudentAttendance).filter(StudentAttendance.tenant_id == tenant_id)
        if class_id:
            q = q.filter(StudentAttendance.class_id == class_id)
        if student_id:
            q = q.filter(StudentAttendance.student_id == student_id)
        if target_date:
            q = q.filter(StudentAttendance.date == target_date)
        if month and year:
            start = date(year, month, 1)
            end = date(year, month, calendar.monthrange(year, month)[1])
            q = q.filter(StudentAttendance.date.between(start, end))
        total = q.count()
        items = q.order_by(StudentAttendance.date.desc()).offset(skip).limit(limit).all()
        return [self._student_att_dict(a) for a in items], total

    def mark_student_attendance(self, data: StudentAttendanceCreate, tenant_id: str):
        existing = self.db.query(StudentAttendance).filter(
            StudentAttendance.tenant_id == tenant_id,
            StudentAttendance.student_id == data.student_id,
            StudentAttendance.date == data.date,
        ).first()
        if existing:
            existing.status = data.status
            existing.remarks = data.remarks
            existing.class_id = data.class_id
            self.db.commit()
            self.db.refresh(existing)
            return existing
        a = StudentAttendance(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def bulk_mark_student_attendance(self, data: StudentAttendanceBulk, tenant_id: str) -> List:
        results = []
        for entry in data.entries:
            sid = entry.get("student_id")
            status = entry.get("status", "present")
            remarks = entry.get("remarks")
            existing = self.db.query(StudentAttendance).filter(
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.student_id == sid,
                StudentAttendance.date == data.date,
            ).first()
            if existing:
                existing.status = status
                existing.remarks = remarks
                existing.class_id = data.class_id
                results.append(existing)
            else:
                a = StudentAttendance(
                    student_id=sid, class_id=data.class_id,
                    date=data.date, status=status, remarks=remarks,
                    academic_year=data.academic_year, tenant_id=tenant_id,
                )
                self.db.add(a)
                results.append(a)
        self.db.commit()
        for r in results:
            self.db.refresh(r)
        return [self._student_att_dict(r) for r in results]

    def delete_student_attendance(self, att_id: int, tenant_id: str) -> bool:
        a = self.db.query(StudentAttendance).filter(
            StudentAttendance.id == att_id, StudentAttendance.tenant_id == tenant_id
        ).first()
        if not a:
            return False
        self.db.delete(a)
        self.db.commit()
        return True

    # ═══ Staff attendance ════════════════════════════════════════════════

    def get_staff_attendance(self, tenant_id: str, teacher_id: Optional[int] = None,
                              target_date: Optional[date] = None,
                              month: Optional[int] = None, year: Optional[int] = None,
                              skip: int = 0, limit: int = 200) -> tuple:
        q = self.db.query(StaffAttendance).filter(StaffAttendance.tenant_id == tenant_id)
        if teacher_id:
            q = q.filter(StaffAttendance.teacher_id == teacher_id)
        if target_date:
            q = q.filter(StaffAttendance.date == target_date)
        if month and year:
            start = date(year, month, 1)
            end = date(year, month, calendar.monthrange(year, month)[1])
            q = q.filter(StaffAttendance.date.between(start, end))
        total = q.count()
        items = q.order_by(StaffAttendance.date.desc()).offset(skip).limit(limit).all()
        return [self._staff_att_dict(a) for a in items], total

    def mark_staff_attendance(self, data: StaffAttendanceCreate, tenant_id: str):
        existing = self.db.query(StaffAttendance).filter(
            StaffAttendance.tenant_id == tenant_id,
            StaffAttendance.teacher_id == data.teacher_id,
            StaffAttendance.date == data.date,
        ).first()
        if existing:
            existing.status = data.status
            existing.check_in = data.check_in
            existing.check_out = data.check_out
            existing.remarks = data.remarks
            self.db.commit()
            self.db.refresh(existing)
            return existing
        a = StaffAttendance(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def bulk_mark_staff_attendance(self, data: StaffAttendanceBulk, tenant_id: str) -> List:
        results = []
        for entry in data.entries:
            tid = entry.get("teacher_id")
            status = entry.get("status", "present")
            existing = self.db.query(StaffAttendance).filter(
                StaffAttendance.tenant_id == tenant_id,
                StaffAttendance.teacher_id == tid,
                StaffAttendance.date == data.date,
            ).first()
            if existing:
                existing.status = status
                existing.check_in = entry.get("check_in")
                existing.check_out = entry.get("check_out")
                existing.remarks = entry.get("remarks")
                results.append(existing)
            else:
                a = StaffAttendance(
                    teacher_id=tid, date=data.date, status=status,
                    check_in=entry.get("check_in"), check_out=entry.get("check_out"),
                    remarks=entry.get("remarks"), tenant_id=tenant_id,
                )
                self.db.add(a)
                results.append(a)
        self.db.commit()
        for r in results:
            self.db.refresh(r)
        return [self._staff_att_dict(r) for r in results]

    def delete_staff_attendance(self, att_id: int, tenant_id: str) -> bool:
        a = self.db.query(StaffAttendance).filter(
            StaffAttendance.id == att_id, StaffAttendance.tenant_id == tenant_id
        ).first()
        if not a:
            return False
        self.db.delete(a)
        self.db.commit()
        return True

    # ═══ Statistics ══════════════════════════════════════════════════════

    def student_attendance_stats(self, student_id: int, tenant_id: str,
                                  academic_year: Optional[str] = None) -> dict:
        q = self.db.query(StudentAttendance).filter(
            StudentAttendance.tenant_id == tenant_id,
            StudentAttendance.student_id == student_id,
        )
        if academic_year:
            q = q.filter(StudentAttendance.academic_year == academic_year)
        records = q.all()
        return self._calc_stats(records)

    def staff_attendance_stats(self, teacher_id: int, tenant_id: str,
                                month: Optional[int] = None, year: Optional[int] = None) -> dict:
        q = self.db.query(StaffAttendance).filter(
            StaffAttendance.tenant_id == tenant_id,
            StaffAttendance.teacher_id == teacher_id,
        )
        if month and year:
            start = date(year, month, 1)
            end = date(year, month, calendar.monthrange(year, month)[1])
            q = q.filter(StaffAttendance.date.between(start, end))
        records = q.all()
        return self._calc_stats(records)

    def class_daily_report(self, class_id: int, target_date: date, tenant_id: str) -> dict:
        cls = self.db.query(Class).filter(Class.id == class_id, Class.tenant_id == tenant_id).first()
        records = self.db.query(StudentAttendance).filter(
            StudentAttendance.tenant_id == tenant_id,
            StudentAttendance.class_id == class_id,
            StudentAttendance.date == target_date,
        ).all()
        total_students = self.db.query(Student).filter(
            Student.tenant_id == tenant_id, Student.class_id == class_id
        ).count()
        stats = self._count_statuses(records)
        pct = round(stats["present"] / total_students * 100, 1) if total_students > 0 else 0
        return {
            "class_id": class_id, "class_name": cls.name if cls else "—",
            "date": target_date, "total_students": total_students,
            **stats, "percentage": pct,
        }

    def student_monthly_view(self, student_id: int, month: int, year: int, tenant_id: str) -> dict:
        student = self.db.query(Student).filter(Student.id == student_id).first()
        start = date(year, month, 1)
        num_days = calendar.monthrange(year, month)[1]
        end = date(year, month, num_days)
        records = self.db.query(StudentAttendance).filter(
            StudentAttendance.tenant_id == tenant_id,
            StudentAttendance.student_id == student_id,
            StudentAttendance.date.between(start, end),
        ).all()
        by_date = {r.date: r.status.value if hasattr(r.status, 'value') else r.status for r in records}
        days = [{"date": date(year, month, d + 1), "status": by_date.get(date(year, month, d + 1))} for d in range(num_days)]
        return {
            "student_id": student_id,
            "name": f"{student.first_name} {student.last_name}" if student else "—",
            "month": month, "year": year, "days": days,
            "stats": self._calc_stats(records),
        }

    def staff_monthly_view(self, teacher_id: int, month: int, year: int, tenant_id: str) -> dict:
        teacher = self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
        start = date(year, month, 1)
        num_days = calendar.monthrange(year, month)[1]
        end = date(year, month, num_days)
        records = self.db.query(StaffAttendance).filter(
            StaffAttendance.tenant_id == tenant_id,
            StaffAttendance.teacher_id == teacher_id,
            StaffAttendance.date.between(start, end),
        ).all()
        by_date = {r.date: r.status.value if hasattr(r.status, 'value') else r.status for r in records}
        days = [{"date": date(year, month, d + 1), "status": by_date.get(date(year, month, d + 1))} for d in range(num_days)]
        return {
            "teacher_id": teacher_id,
            "name": teacher.full_name if teacher else "—",
            "month": month, "year": year, "days": days,
            "stats": self._calc_stats(records),
        }

    def class_attendance_report(self, class_id: int, tenant_id: str,
                                 academic_year: Optional[str] = None) -> List[dict]:
        """Per-student attendance report for a class."""
        students = (self.db.query(Student)
                    .filter(Student.tenant_id == tenant_id, Student.class_id == class_id)
                    .order_by(Student.first_name).all())
        result = []
        cls = self.db.query(Class).filter(Class.id == class_id).first()
        for s in students:
            stats = self.student_attendance_stats(s.id, tenant_id, academic_year)
            result.append({
                "student_id": s.id,
                "student_name": f"{s.first_name} {s.last_name}",
                "admission_number": s.admission_number,
                "class_name": cls.name if cls else None,
                "stats": stats,
            })
        return result

    # ═══ Helpers ═════════════════════════════════════════════════════════

    def _calc_stats(self, records) -> dict:
        counts = self._count_statuses(records)
        total = len(records)
        pct = round(counts["present"] / total * 100, 1) if total > 0 else 0
        return {"total_days": total, **counts, "percentage": pct}

    def _count_statuses(self, records) -> dict:
        counts = {"present": 0, "absent": 0, "late": 0, "half_day": 0, "excused": 0}
        for r in records:
            s = r.status.value if hasattr(r.status, 'value') else r.status
            if s in counts:
                counts[s] += 1
        return counts

    def _student_att_dict(self, a: StudentAttendance) -> dict:
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "student_id": a.student_id,
            "student_name": f"{a.student.first_name} {a.student.last_name}" if a.student else None,
            "admission_number": a.student.admission_number if a.student else None,
            "class_id": a.class_id,
            "class_name": a.class_ref.name if a.class_ref else None,
            "date": a.date,
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "remarks": a.remarks,
            "academic_year": a.academic_year,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }

    def _staff_att_dict(self, a: StaffAttendance) -> dict:
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "teacher_id": a.teacher_id,
            "teacher_name": a.teacher.full_name if a.teacher else None,
            "date": a.date,
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "check_in": a.check_in, "check_out": a.check_out,
            "remarks": a.remarks,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }
