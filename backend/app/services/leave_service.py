from datetime import date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.leave import LeaveType, LeaveApplication, LeaveStatus, ApplicantType
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.user import User
from app.schemas.leave import LeaveApplicationCreate, LeaveActionRequest


class LeaveService:
    def __init__(self, db: Session):
        self.db = db

    # ═══ Leave Types ═════════════════════════════════════════════════════

    def get_leave_types(self, tenant_id: str, applies_to: Optional[str] = None,
                         is_active: Optional[bool] = None) -> tuple:
        q = self.db.query(LeaveType).filter(LeaveType.tenant_id == tenant_id)
        if applies_to:
            q = q.filter(LeaveType.applies_to == applies_to)
        if is_active is not None:
            q = q.filter(LeaveType.is_active == is_active)
        items = q.order_by(LeaveType.name).all()
        return [self._type_dict(t) for t in items], len(items)

    def create_leave_type(self, data: dict, tenant_id: str):
        lt = LeaveType(**data, tenant_id=tenant_id)
        self.db.add(lt)
        self.db.commit()
        self.db.refresh(lt)
        return self._type_dict(lt)

    def update_leave_type(self, lt_id: int, data: dict, tenant_id: str):
        lt = self.db.query(LeaveType).filter(LeaveType.id == lt_id, LeaveType.tenant_id == tenant_id).first()
        if not lt:
            return None
        for k, v in data.items():
            if v is not None:
                setattr(lt, k, v)
        self.db.commit()
        self.db.refresh(lt)
        return self._type_dict(lt)

    def delete_leave_type(self, lt_id: int, tenant_id: str) -> bool:
        lt = self.db.query(LeaveType).filter(LeaveType.id == lt_id, LeaveType.tenant_id == tenant_id).first()
        if not lt:
            return False
        self.db.delete(lt)
        self.db.commit()
        return True

    # ═══ Leave Applications ══════════════════════════════════════════════

    def get_applications(self, tenant_id: str, applicant_type: Optional[str] = None,
                          teacher_id: Optional[int] = None, student_id: Optional[int] = None,
                          status: Optional[str] = None, month: Optional[int] = None,
                          year: Optional[int] = None) -> tuple:
        q = self.db.query(LeaveApplication).filter(LeaveApplication.tenant_id == tenant_id)
        if applicant_type:
            q = q.filter(LeaveApplication.applicant_type == applicant_type)
        if teacher_id:
            q = q.filter(LeaveApplication.teacher_id == teacher_id)
        if student_id:
            q = q.filter(LeaveApplication.student_id == student_id)
        if status:
            q = q.filter(LeaveApplication.status == status)
        if month and year:
            import calendar
            start = date(year, month, 1)
            end = date(year, month, calendar.monthrange(year, month)[1])
            q = q.filter(LeaveApplication.start_date <= end, LeaveApplication.end_date >= start)
        total = q.count()
        items = q.order_by(LeaveApplication.created_at.desc()).all()
        return [self._app_dict(a) for a in items], total

    def apply_leave(self, data: LeaveApplicationCreate, tenant_id: str):
        # Calculate days
        delta = (data.end_date - data.start_date).days + 1
        app = LeaveApplication(
            applicant_type=data.applicant_type,
            teacher_id=data.teacher_id,
            student_id=data.student_id,
            leave_type_id=data.leave_type_id,
            start_date=data.start_date,
            end_date=data.end_date,
            days=delta,
            reason=data.reason,
            status=LeaveStatus.PENDING,
            academic_year=data.academic_year,
            tenant_id=tenant_id,
        )
        self.db.add(app)
        self.db.commit()
        self.db.refresh(app)
        return self._app_dict(app)

    def action_leave(self, app_id: int, action: LeaveActionRequest, user_id: int, tenant_id: str):
        app = self.db.query(LeaveApplication).filter(
            LeaveApplication.id == app_id, LeaveApplication.tenant_id == tenant_id
        ).first()
        if not app:
            return None
        app.status = action.status
        app.admin_remarks = action.admin_remarks
        app.approved_by = user_id
        self.db.commit()
        self.db.refresh(app)
        return self._app_dict(app)

    def cancel_leave(self, app_id: int, tenant_id: str):
        app = self.db.query(LeaveApplication).filter(
            LeaveApplication.id == app_id, LeaveApplication.tenant_id == tenant_id
        ).first()
        if not app:
            return None
        app.status = LeaveStatus.CANCELLED
        self.db.commit()
        self.db.refresh(app)
        return self._app_dict(app)

    def delete_application(self, app_id: int, tenant_id: str) -> bool:
        app = self.db.query(LeaveApplication).filter(
            LeaveApplication.id == app_id, LeaveApplication.tenant_id == tenant_id
        ).first()
        if not app:
            return False
        self.db.delete(app)
        self.db.commit()
        return True

    # ═══ Leave Balance ═══════════════════════════════════════════════════

    def get_balance(self, applicant_type: str, applicant_id: int, tenant_id: str,
                     academic_year: str = "2025-26") -> dict:
        # Get applicant name
        if applicant_type == "teacher":
            person = self.db.query(Teacher).filter(Teacher.id == applicant_id).first()
            name = person.full_name if person else "—"
        else:
            person = self.db.query(Student).filter(Student.id == applicant_id).first()
            name = f"{person.first_name} {person.last_name}" if person else "—"

        # Get applicable leave types
        types = (self.db.query(LeaveType)
                 .filter(LeaveType.tenant_id == tenant_id,
                         LeaveType.applies_to == applicant_type,
                         LeaveType.is_active == True)
                 .all())

        balances = []
        for lt in types:
            # Used (approved)
            used = self.db.query(func.coalesce(func.sum(LeaveApplication.days), 0)).filter(
                LeaveApplication.tenant_id == tenant_id,
                LeaveApplication.leave_type_id == lt.id,
                LeaveApplication.status == LeaveStatus.APPROVED,
                LeaveApplication.academic_year == academic_year,
                LeaveApplication.teacher_id == applicant_id if applicant_type == "teacher" else LeaveApplication.student_id == applicant_id,
            ).scalar()

            # Pending
            pending = self.db.query(func.coalesce(func.sum(LeaveApplication.days), 0)).filter(
                LeaveApplication.tenant_id == tenant_id,
                LeaveApplication.leave_type_id == lt.id,
                LeaveApplication.status == LeaveStatus.PENDING,
                LeaveApplication.academic_year == academic_year,
                LeaveApplication.teacher_id == applicant_id if applicant_type == "teacher" else LeaveApplication.student_id == applicant_id,
            ).scalar()

            balances.append({
                "leave_type_id": lt.id,
                "leave_type_name": lt.name,
                "color": lt.color,
                "max_days": lt.max_days_per_year,
                "used_days": float(used),
                "remaining_days": float(lt.max_days_per_year - used),
                "pending_days": float(pending),
            })

        return {
            "applicant_type": applicant_type,
            "applicant_id": applicant_id,
            "applicant_name": name,
            "academic_year": academic_year,
            "balances": balances,
        }

    # ═══ Calendar ════════════════════════════════════════════════════════

    def get_calendar(self, tenant_id: str, month: int, year: int,
                      applicant_type: Optional[str] = None) -> list:
        import calendar
        start = date(year, month, 1)
        end = date(year, month, calendar.monthrange(year, month)[1])

        q = self.db.query(LeaveApplication).filter(
            LeaveApplication.tenant_id == tenant_id,
            LeaveApplication.start_date <= end,
            LeaveApplication.end_date >= start,
            LeaveApplication.status.in_([LeaveStatus.APPROVED, LeaveStatus.PENDING]),
        )
        if applicant_type:
            q = q.filter(LeaveApplication.applicant_type == applicant_type)
        apps = q.all()

        events = []
        for a in apps:
            if a.applicant_type.value == "teacher" and a.teacher:
                name = a.teacher.full_name
            elif a.applicant_type.value == "student" and a.student:
                name = f"{a.student.first_name} {a.student.last_name}"
            else:
                name = "—"
            events.append({
                "id": a.id,
                "applicant_name": name,
                "leave_type_name": a.leave_type.name if a.leave_type else "—",
                "color": a.leave_type.color if a.leave_type else "#999",
                "start_date": a.start_date,
                "end_date": a.end_date,
                "days": a.days,
                "status": a.status.value if hasattr(a.status, 'value') else a.status,
            })
        return events

    # ═══ Helpers ═════════════════════════════════════════════════════════

    def _type_dict(self, t: LeaveType) -> dict:
        return {
            "id": t.id, "tenant_id": t.tenant_id,
            "name": t.name, "code": t.code, "description": t.description,
            "max_days_per_year": t.max_days_per_year,
            "is_paid": t.is_paid, "is_active": t.is_active,
            "applies_to": t.applies_to.value if hasattr(t.applies_to, 'value') else t.applies_to,
            "color": t.color,
            "created_at": t.created_at, "updated_at": t.updated_at,
        }

    def _app_dict(self, a: LeaveApplication) -> dict:
        if a.applicant_type.value == "teacher" if hasattr(a.applicant_type, 'value') else a.applicant_type == "teacher":
            name = a.teacher.full_name if a.teacher else None
        else:
            name = f"{a.student.first_name} {a.student.last_name}" if a.student else None
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "applicant_type": a.applicant_type.value if hasattr(a.applicant_type, 'value') else a.applicant_type,
            "teacher_id": a.teacher_id, "student_id": a.student_id,
            "applicant_name": name,
            "leave_type_id": a.leave_type_id,
            "leave_type_name": a.leave_type.name if a.leave_type else None,
            "leave_type_color": a.leave_type.color if a.leave_type else None,
            "start_date": a.start_date, "end_date": a.end_date, "days": a.days,
            "reason": a.reason,
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "admin_remarks": a.admin_remarks,
            "approved_by": a.approved_by,
            "approver_name": None,
            "academic_year": a.academic_year,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }
