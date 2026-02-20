"""
Report Generation Service
Generates reports by querying existing data models — attendance, grades, fees, etc.
"""
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.report import Report, ReportType, ReportFormat, ReportStatus
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.attendance import StudentAttendance, StaffAttendance, AttendanceStatus
from app.models.fee import FeeCollection, StudentFeeAssignment, PaymentStatus


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Saved reports CRUD ──────────────────────────────────────────────

    def get_saved_reports(self, tenant_id: str, report_type: str = None):
        q = self.db.query(Report).filter(Report.tenant_id == tenant_id, Report.is_active == True)
        if report_type:
            q = q.filter(Report.report_type == report_type)
        reports = q.order_by(Report.created_at.desc()).limit(50).all()
        return [self._report_dict(r) for r in reports], len(reports)

    def save_report(self, data: dict, tenant_id: str, user_id: int):
        report = Report(
            title=data.get("title", f"Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}"),
            report_type=data["report_type"],
            format=data.get("format", "json"),
            status=ReportStatus.saved,
            parameters=data.get("parameters"),
            summary=data.get("summary"),
            record_count=data.get("record_count", 0),
            generated_by=user_id,
            tenant_id=tenant_id,
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return self._report_dict(report)

    def delete_report(self, report_id: int, tenant_id: str):
        report = self.db.query(Report).filter(Report.id == report_id, Report.tenant_id == tenant_id).first()
        if not report:
            raise ValueError("Report not found")
        self.db.delete(report)
        self.db.commit()

    def _report_dict(self, r: Report) -> dict:
        return {
            "id": r.id, "tenant_id": r.tenant_id,
            "title": r.title,
            "report_type": r.report_type.value if hasattr(r.report_type, 'value') else str(r.report_type),
            "format": r.format.value if hasattr(r.format, 'value') else str(r.format),
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "parameters": r.parameters, "summary": r.summary,
            "record_count": r.record_count, "generated_by": r.generated_by,
            "is_active": r.is_active,
            "created_at": r.created_at, "updated_at": r.updated_at,
        }

    # ─── helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _att_status_val(status) -> str:
        if hasattr(status, 'value'):
            return status.value
        return str(status)

    # ─── Report generators ───────────────────────────────────────────────

    def generate_student_attendance(self, tenant_id: str, start_date: str = None,
                                     end_date: str = None, class_id: int = None,
                                     student_id: int = None) -> dict:
        sd = date.fromisoformat(start_date) if start_date else date.today() - timedelta(days=30)
        ed = date.fromisoformat(end_date) if end_date else date.today()

        q = self.db.query(Student).filter(Student.tenant_id == tenant_id, Student.is_active == True)
        if class_id:
            q = q.filter(Student.current_class_id == class_id)
        if student_id:
            q = q.filter(Student.id == student_id)
        students = q.all()

        rows = []
        total_present = total_absent = total_late = 0
        for s in students:
            att = self.db.query(StudentAttendance).filter(
                StudentAttendance.student_id == s.id,
                StudentAttendance.date >= sd, StudentAttendance.date <= ed,
                StudentAttendance.tenant_id == tenant_id,
            ).all()
            present = sum(1 for a in att if self._att_status_val(a.status) == 'present')
            absent = sum(1 for a in att if self._att_status_val(a.status) == 'absent')
            late = sum(1 for a in att if self._att_status_val(a.status) == 'late')
            total_days = len(att)
            pct = round((present / total_days) * 100, 1) if total_days > 0 else 0
            rows.append({
                "student_id": s.id, "name": f"{s.first_name} {s.last_name}",
                "admission_number": s.admission_number,
                "total_days": total_days, "present": present, "absent": absent,
                "late": late, "attendance_pct": pct,
            })
            total_present += present; total_absent += absent; total_late += late

        return {
            "title": "Student Attendance Report",
            "report_type": "student_attendance",
            "generated_at": datetime.now().isoformat(),
            "parameters": {"start_date": str(sd), "end_date": str(ed), "class_id": class_id, "student_id": student_id},
            "summary": {
                "total_students": len(students), "period": f"{sd} to {ed}",
                "total_present": total_present, "total_absent": total_absent,
                "total_late": total_late,
                "avg_attendance_pct": round(sum(r["attendance_pct"] for r in rows) / max(len(rows), 1), 1),
            },
            "columns": ["student_id", "name", "admission_number", "total_days", "present", "absent", "late", "attendance_pct"],
            "data": rows, "record_count": len(rows),
        }

    def generate_staff_attendance(self, tenant_id: str, start_date: str = None,
                                   end_date: str = None, teacher_id: int = None) -> dict:
        sd = date.fromisoformat(start_date) if start_date else date.today() - timedelta(days=30)
        ed = date.fromisoformat(end_date) if end_date else date.today()

        q = self.db.query(Teacher).filter(Teacher.tenant_id == tenant_id, Teacher.is_active == True)
        if teacher_id:
            q = q.filter(Teacher.id == teacher_id)
        teachers = q.all()

        rows = []
        for t in teachers:
            att = self.db.query(StaffAttendance).filter(
                StaffAttendance.teacher_id == t.id,
                StaffAttendance.date >= sd, StaffAttendance.date <= ed,
                StaffAttendance.tenant_id == tenant_id,
            ).all()
            present = sum(1 for a in att if self._att_status_val(a.status) == 'present')
            absent = sum(1 for a in att if self._att_status_val(a.status) == 'absent')
            total_days = len(att)
            pct = round((present / total_days) * 100, 1) if total_days > 0 else 0
            rows.append({
                "teacher_id": t.id, "name": f"{t.first_name} {t.last_name}",
                "employee_id": t.employee_id,
                "total_days": total_days, "present": present, "absent": absent,
                "attendance_pct": pct,
            })

        return {
            "title": "Staff Attendance Report",
            "report_type": "staff_attendance",
            "generated_at": datetime.now().isoformat(),
            "parameters": {"start_date": str(sd), "end_date": str(ed), "teacher_id": teacher_id},
            "summary": {
                "total_staff": len(teachers), "period": f"{sd} to {ed}",
                "avg_attendance_pct": round(sum(r["attendance_pct"] for r in rows) / max(len(rows), 1), 1),
            },
            "columns": ["teacher_id", "name", "employee_id", "total_days", "present", "absent", "attendance_pct"],
            "data": rows, "record_count": len(rows),
        }

    def generate_academic_performance(self, tenant_id: str, class_id: int = None,
                                       student_id: int = None) -> dict:
        from app.models.grade import Grade

        q = self.db.query(Student).filter(Student.tenant_id == tenant_id, Student.is_active == True)
        if class_id:
            q = q.filter(Student.current_class_id == class_id)
        if student_id:
            q = q.filter(Student.id == student_id)
        students = q.all()

        rows = []
        for s in students:
            grades = self.db.query(Grade).filter(
                Grade.student_id == s.id, Grade.tenant_id == tenant_id
            ).all()
            total_exams = len(grades)
            if total_exams == 0:
                rows.append({
                    "student_id": s.id, "name": f"{s.first_name} {s.last_name}",
                    "admission_number": s.admission_number,
                    "total_exams": 0, "avg_marks": 0, "highest": 0, "lowest": 0, "grade_summary": "N/A",
                })
                continue

            marks_list = [g.marks_obtained for g in grades if g.marks_obtained is not None]
            avg_marks = round(sum(marks_list) / max(len(marks_list), 1), 1) if marks_list else 0
            highest = max(marks_list) if marks_list else 0
            lowest = min(marks_list) if marks_list else 0

            grade_vals = [g.grade_name for g in grades if g.grade_name]
            grade_summary = ", ".join(set(str(gv) for gv in grade_vals[:5])) if grade_vals else "N/A"

            rows.append({
                "student_id": s.id, "name": f"{s.first_name} {s.last_name}",
                "admission_number": s.admission_number,
                "total_exams": total_exams, "avg_marks": avg_marks,
                "highest": highest, "lowest": lowest, "grade_summary": grade_summary,
            })

        return {
            "title": "Academic Performance Report",
            "report_type": "academic_performance",
            "generated_at": datetime.now().isoformat(),
            "parameters": {"class_id": class_id, "student_id": student_id},
            "summary": {
                "total_students": len(students),
                "avg_performance": round(sum(r["avg_marks"] for r in rows) / max(len(rows), 1), 1),
                "students_with_grades": sum(1 for r in rows if r["total_exams"] > 0),
            },
            "columns": ["student_id", "name", "admission_number", "total_exams", "avg_marks", "highest", "lowest", "grade_summary"],
            "data": rows, "record_count": len(rows),
        }

    def generate_financial_summary(self, tenant_id: str, start_date: str = None,
                                    end_date: str = None) -> dict:
        sd = date.fromisoformat(start_date) if start_date else date.today().replace(month=1, day=1)
        ed = date.fromisoformat(end_date) if end_date else date.today()

        collections = self.db.query(FeeCollection).filter(
            FeeCollection.tenant_id == tenant_id,
            FeeCollection.payment_date >= sd,
            FeeCollection.payment_date <= ed,
        ).all()

        total_collected = sum(c.amount for c in collections)
        total_due = self.db.query(func.sum(StudentFeeAssignment.balance)).filter(
            StudentFeeAssignment.tenant_id == tenant_id,
            StudentFeeAssignment.status != PaymentStatus.PAID,
        ).scalar() or 0

        # Monthly breakdown
        monthly: dict = {}
        for c in collections:
            month_key = c.payment_date.strftime("%Y-%m") if hasattr(c.payment_date, 'strftime') else str(c.payment_date)[:7]
            if month_key not in monthly:
                monthly[month_key] = {"month": month_key, "collected": 0, "transactions": 0}
            monthly[month_key]["collected"] += c.amount
            monthly[month_key]["transactions"] += 1

        # Payment method breakdown
        methods: dict = {}
        for c in collections:
            method = c.payment_method.value if hasattr(c.payment_method, 'value') else str(c.payment_method)
            if method not in methods:
                methods[method] = {"method": method, "amount": 0, "count": 0}
            methods[method]["amount"] += c.amount
            methods[method]["count"] += 1

        rows = sorted(monthly.values(), key=lambda x: x["month"])

        return {
            "title": "Financial Summary Report",
            "report_type": "financial_summary",
            "generated_at": datetime.now().isoformat(),
            "parameters": {"start_date": str(sd), "end_date": str(ed)},
            "summary": {
                "period": f"{sd} to {ed}",
                "total_collected": total_collected,
                "outstanding_dues": float(total_due),
                "total_transactions": len(collections),
                "payment_methods": list(methods.values()),
            },
            "columns": ["month", "collected", "transactions"],
            "data": rows, "record_count": len(rows),
        }

    def generate_fee_collection(self, tenant_id: str, start_date: str = None,
                                 end_date: str = None, class_id: int = None) -> dict:
        sd = date.fromisoformat(start_date) if start_date else date.today() - timedelta(days=30)
        ed = date.fromisoformat(end_date) if end_date else date.today()

        q = self.db.query(FeeCollection).filter(
            FeeCollection.tenant_id == tenant_id,
            FeeCollection.payment_date >= sd,
            FeeCollection.payment_date <= ed,
        )
        collections = q.all()

        rows = []
        for c in collections:
            student = self.db.query(Student).filter(Student.id == c.student_id).first()

            if class_id and student and student.current_class_id != class_id:
                continue

            rows.append({
                "collection_id": c.id,
                "student_name": f"{student.first_name} {student.last_name}" if student else "N/A",
                "admission_number": student.admission_number if student else "N/A",
                "amount_paid": c.amount,
                "payment_date": str(c.payment_date),
                "payment_method": c.payment_method.value if hasattr(c.payment_method, 'value') else str(c.payment_method),
                "receipt_number": c.receipt_number or "",
            })

        return {
            "title": "Fee Collection Report",
            "report_type": "fee_collection",
            "generated_at": datetime.now().isoformat(),
            "parameters": {"start_date": str(sd), "end_date": str(ed), "class_id": class_id},
            "summary": {
                "period": f"{sd} to {ed}",
                "total_collections": len(rows),
                "total_amount": sum(r["amount_paid"] for r in rows),
            },
            "columns": ["collection_id", "student_name", "admission_number", "amount_paid", "payment_date", "payment_method", "receipt_number"],
            "data": rows, "record_count": len(rows),
        }

    def generate_report(self, report_type: str, tenant_id: str, **kwargs) -> dict:
        generators = {
            "student_attendance": self.generate_student_attendance,
            "staff_attendance": self.generate_staff_attendance,
            "academic_performance": self.generate_academic_performance,
            "financial_summary": self.generate_financial_summary,
            "fee_collection": self.generate_fee_collection,
        }
        gen = generators.get(report_type)
        if not gen:
            raise ValueError(f"Unknown report type: {report_type}")
        return gen(tenant_id, **kwargs)

    # ─── Export helpers ──────────────────────────────────────────────────

    def export_csv(self, report_data: dict) -> str:
        import csv
        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=report_data["columns"])
        writer.writeheader()
        writer.writerows(report_data["data"])
        return output.getvalue()

    # ─── Dashboard stats ─────────────────────────────────────────────────

    def get_dashboard(self, tenant_id: str) -> dict:
        reports = self.db.query(Report).filter(
            Report.tenant_id == tenant_id, Report.is_active == True
        ).order_by(Report.created_at.desc()).limit(10).all()
        total = self.db.query(Report).filter(
            Report.tenant_id == tenant_id, Report.is_active == True
        ).count()

        return {
            "total_reports": total,
            "recent_reports": [self._report_dict(r) for r in reports],
            "available_report_types": [
                {"type": "student_attendance", "label": "Student Attendance", "icon": "📋", "description": "Detailed student attendance with percentage"},
                {"type": "staff_attendance", "label": "Staff Attendance", "icon": "👨‍🏫", "description": "Teacher/staff attendance tracking"},
                {"type": "academic_performance", "label": "Academic Performance", "icon": "📊", "description": "Student grades and exam performance"},
                {"type": "financial_summary", "label": "Financial Summary", "icon": "💰", "description": "Revenue, collections, and dues overview"},
                {"type": "fee_collection", "label": "Fee Collection", "icon": "🧾", "description": "Detailed fee collection records"},
            ],
        }
