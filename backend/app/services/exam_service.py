from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import date

from app.models.exam import Exam, ExamSchedule
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.room import Room
from app.schemas.exam import ExamCreate, ExamUpdate, ExamScheduleCreate, ExamScheduleUpdate


class ExamService:
    """Service for exam and exam-schedule management."""

    def __init__(self, db: Session):
        self.db = db

    # ─── Helpers ─────────────────────────────────────────────────────

    def _schedule_to_dict(self, s: ExamSchedule) -> dict:
        return {
            "id": s.id,
            "exam_id": s.exam_id,
            "subject_id": s.subject_id,
            "exam_date": s.exam_date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "room_id": s.room_id,
            "max_marks": s.max_marks,
            "passing_marks": s.passing_marks,
            "instructions": s.instructions,
            "subject_name": s.subject.name if s.subject else None,
            "room_name": s.room.display_name if s.room else None,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }

    def _exam_to_list(self, e: Exam) -> dict:
        return {
            "id": e.id,
            "name": e.name,
            "exam_type": e.exam_type,
            "academic_year": e.academic_year,
            "status": e.status,
            "class_id": e.class_id,
            "class_name": e.class_ref.name if e.class_ref else None,
            "start_date": e.start_date,
            "end_date": e.end_date,
            "total_marks": e.total_marks,
            "passing_marks": e.passing_marks,
            "schedule_count": len(e.schedules) if e.schedules else 0,
        }

    def _exam_to_detail(self, e: Exam) -> dict:
        return {
            "id": e.id,
            "tenant_id": e.tenant_id,
            "name": e.name,
            "description": e.description,
            "exam_type": e.exam_type,
            "academic_year": e.academic_year,
            "status": e.status,
            "start_date": e.start_date,
            "end_date": e.end_date,
            "class_id": e.class_id,
            "class_name": e.class_ref.name if e.class_ref else None,
            "total_marks": e.total_marks,
            "passing_marks": e.passing_marks,
            "schedules": [self._schedule_to_dict(s) for s in e.schedules] if e.schedules else [],
            "schedule_count": len(e.schedules) if e.schedules else 0,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
        }

    # ─── Exam CRUD ───────────────────────────────────────────────────

    def get_exams(self, tenant_id: str, class_id: Optional[int] = None,
                  status: Optional[str] = None, exam_type: Optional[str] = None,
                  search: Optional[str] = None) -> tuple:
        q = self.db.query(Exam).filter(Exam.tenant_id == tenant_id)
        if class_id:
            q = q.filter(Exam.class_id == class_id)
        if status:
            q = q.filter(Exam.status == status)
        if exam_type:
            q = q.filter(Exam.exam_type == exam_type)
        if search:
            q = q.filter(Exam.name.ilike(f"%{search}%"))
        total = q.count()
        items = q.order_by(Exam.start_date.desc().nullslast(), Exam.created_at.desc()).all()
        return [self._exam_to_list(e) for e in items], total

    def get_exam(self, exam_id: int, tenant_id: str) -> Optional[dict]:
        e = self.db.query(Exam).filter(Exam.id == exam_id, Exam.tenant_id == tenant_id).first()
        return self._exam_to_detail(e) if e else None

    def create_exam(self, data: ExamCreate, tenant_id: str) -> Exam:
        cls = self.db.query(Class).filter(Class.id == data.class_id, Class.tenant_id == tenant_id).first()
        if not cls:
            raise ValueError("Class not found")
        e = Exam(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(e)
        self.db.commit()
        self.db.refresh(e)
        return e

    def update_exam(self, exam_id: int, data: ExamUpdate, tenant_id: str) -> Optional[Exam]:
        e = self.db.query(Exam).filter(Exam.id == exam_id, Exam.tenant_id == tenant_id).first()
        if not e:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(e, field, value)
        self.db.commit()
        self.db.refresh(e)
        return e

    def delete_exam(self, exam_id: int, tenant_id: str) -> bool:
        e = self.db.query(Exam).filter(Exam.id == exam_id, Exam.tenant_id == tenant_id).first()
        if not e:
            return False
        self.db.delete(e)
        self.db.commit()
        return True

    # ─── Schedule CRUD ───────────────────────────────────────────────

    def add_schedule(self, exam_id: int, data: ExamScheduleCreate, tenant_id: str) -> ExamSchedule:
        e = self.db.query(Exam).filter(Exam.id == exam_id, Exam.tenant_id == tenant_id).first()
        if not e:
            raise ValueError("Exam not found")
        s = ExamSchedule(**data.model_dump(), exam_id=exam_id, tenant_id=tenant_id)
        self.db.add(s)
        self.db.commit()
        self.db.refresh(s)
        return s

    def update_schedule(self, schedule_id: int, data: ExamScheduleUpdate, tenant_id: str) -> Optional[ExamSchedule]:
        s = self.db.query(ExamSchedule).filter(ExamSchedule.id == schedule_id, ExamSchedule.tenant_id == tenant_id).first()
        if not s:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(s, field, value)
        self.db.commit()
        self.db.refresh(s)
        return s

    def delete_schedule(self, schedule_id: int, tenant_id: str) -> bool:
        s = self.db.query(ExamSchedule).filter(ExamSchedule.id == schedule_id, ExamSchedule.tenant_id == tenant_id).first()
        if not s:
            return False
        self.db.delete(s)
        self.db.commit()
        return True

    # ─── Calendar ────────────────────────────────────────────────────

    def get_calendar(self, tenant_id: str, month: Optional[int] = None,
                     year: Optional[int] = None, class_id: Optional[int] = None) -> List[dict]:
        """Get exam schedule events for calendar view."""
        q = (
            self.db.query(ExamSchedule)
            .join(Exam, ExamSchedule.exam_id == Exam.id)
            .filter(Exam.tenant_id == tenant_id)
        )
        if class_id:
            q = q.filter(Exam.class_id == class_id)
        if month and year:
            from sqlalchemy import extract
            q = q.filter(
                extract('month', ExamSchedule.exam_date) == month,
                extract('year', ExamSchedule.exam_date) == year,
            )
        elif year:
            from sqlalchemy import extract
            q = q.filter(extract('year', ExamSchedule.exam_date) == year)

        schedules = q.order_by(ExamSchedule.exam_date).all()
        events = []
        for s in schedules:
            events.append({
                "id": s.id,
                "exam_id": s.exam_id,
                "exam_name": s.exam.name if s.exam else "",
                "subject_name": s.subject.name if s.subject else "",
                "class_name": s.exam.class_ref.name if s.exam and s.exam.class_ref else None,
                "exam_date": s.exam_date,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "room_name": s.room.display_name if s.room else None,
                "exam_type": s.exam.exam_type if s.exam else "",
                "status": s.exam.status if s.exam else "",
            })
        return events
