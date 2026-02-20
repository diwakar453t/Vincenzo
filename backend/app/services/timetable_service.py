from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional

from app.models.timetable import Timetable, Period
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.room import Room
from app.schemas.timetable import (
    TimetableCreate, TimetableUpdate, PeriodCreate, PeriodUpdate,
)


class TimetableService:
    """Service for timetable and period management with conflict detection."""

    def __init__(self, db: Session):
        self.db = db

    # ─── Helpers ─────────────────────────────────────────────────────────

    def _period_to_dict(self, p: Period) -> dict:
        return {
            "id": p.id,
            "timetable_id": p.timetable_id,
            "day_of_week": p.day_of_week,
            "start_time": p.start_time,
            "end_time": p.end_time,
            "subject_id": p.subject_id,
            "teacher_id": p.teacher_id,
            "room_id": p.room_id,
            "period_type": p.period_type,
            "subject_name": p.subject.name if p.subject else None,
            "teacher_name": f"{p.teacher.first_name} {p.teacher.last_name}" if p.teacher else None,
            "room_name": p.room.display_name if p.room else None,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }

    def _timetable_to_list_item(self, t: Timetable) -> dict:
        return {
            "id": t.id,
            "class_id": t.class_id,
            "class_name": t.class_ref.name if t.class_ref else None,
            "academic_year": t.academic_year,
            "name": t.name,
            "status": t.status,
            "total_periods": len(t.periods) if t.periods else 0,
        }

    def _timetable_to_detail(self, t: Timetable) -> dict:
        return {
            "id": t.id,
            "tenant_id": t.tenant_id,
            "class_id": t.class_id,
            "class_name": t.class_ref.name if t.class_ref else None,
            "academic_year": t.academic_year,
            "name": t.name,
            "status": t.status,
            "periods": [self._period_to_dict(p) for p in t.periods] if t.periods else [],
            "total_periods": len(t.periods) if t.periods else 0,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }

    # ─── Timetable CRUD ─────────────────────────────────────────────────

    def get_timetables(self, tenant_id: str, class_id: Optional[int] = None, status: Optional[str] = None) -> tuple:
        query = self.db.query(Timetable).filter(Timetable.tenant_id == tenant_id)
        if class_id:
            query = query.filter(Timetable.class_id == class_id)
        if status:
            query = query.filter(Timetable.status == status)
        total = query.count()
        items = query.order_by(Timetable.updated_at.desc()).all()
        return [self._timetable_to_list_item(t) for t in items], total

    def get_timetable(self, timetable_id: int, tenant_id: str) -> Optional[dict]:
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        return self._timetable_to_detail(t) if t else None

    def create_timetable(self, data: TimetableCreate, tenant_id: str) -> Timetable:
        # Verify class exists
        cls = self.db.query(Class).filter(Class.id == data.class_id, Class.tenant_id == tenant_id).first()
        if not cls:
            raise ValueError("Class not found")
        # Check for duplicate
        existing = self.db.query(Timetable).filter(
            Timetable.class_id == data.class_id,
            Timetable.academic_year == data.academic_year,
            Timetable.tenant_id == tenant_id
        ).first()
        if existing:
            raise ValueError(f"A timetable already exists for this class and academic year")

        t = Timetable(**data.model_dump(), tenant_id=tenant_id)
        if not t.name:
            t.name = f"{cls.name} — {data.academic_year}"
        self.db.add(t)
        self.db.commit()
        self.db.refresh(t)
        return t

    def update_timetable(self, timetable_id: int, data: TimetableUpdate, tenant_id: str) -> Optional[Timetable]:
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        if not t:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(t, field, value)
        self.db.commit()
        self.db.refresh(t)
        return t

    def delete_timetable(self, timetable_id: int, tenant_id: str) -> bool:
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        if not t:
            return False
        self.db.delete(t)
        self.db.commit()
        return True

    # ─── Period CRUD ─────────────────────────────────────────────────────

    def add_period(self, timetable_id: int, data: PeriodCreate, tenant_id: str) -> Period:
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        if not t:
            raise ValueError("Timetable not found")

        p = Period(**data.model_dump(), timetable_id=timetable_id, tenant_id=tenant_id)
        self.db.add(p)
        self.db.commit()
        self.db.refresh(p)
        return p

    def add_periods_bulk(self, timetable_id: int, periods: List[PeriodCreate], tenant_id: str) -> List[Period]:
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        if not t:
            raise ValueError("Timetable not found")

        result = []
        for data in periods:
            p = Period(**data.model_dump(), timetable_id=timetable_id, tenant_id=tenant_id)
            self.db.add(p)
            result.append(p)
        self.db.commit()
        for p in result:
            self.db.refresh(p)
        return result

    def update_period(self, period_id: int, data: PeriodUpdate, tenant_id: str) -> Optional[Period]:
        p = self.db.query(Period).filter(Period.id == period_id, Period.tenant_id == tenant_id).first()
        if not p:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(p, field, value)
        self.db.commit()
        self.db.refresh(p)
        return p

    def delete_period(self, period_id: int, tenant_id: str) -> bool:
        p = self.db.query(Period).filter(Period.id == period_id, Period.tenant_id == tenant_id).first()
        if not p:
            return False
        self.db.delete(p)
        self.db.commit()
        return True

    # ─── Conflict Detection ──────────────────────────────────────────────

    def _times_overlap(self, s1: str, e1: str, s2: str, e2: str) -> bool:
        """Check if two time ranges overlap (HH:MM strings)."""
        return s1 < e2 and s2 < e1

    def check_conflicts(self, timetable_id: int, tenant_id: str) -> List[dict]:
        """Check for teacher and room conflicts across all timetables in the same year/tenant."""
        t = self.db.query(Timetable).filter(Timetable.id == timetable_id, Timetable.tenant_id == tenant_id).first()
        if not t:
            return []

        conflicts = []

        # Get all periods for this timetable
        my_periods = self.db.query(Period).filter(Period.timetable_id == timetable_id).all()

        # Get all other timetables for the same academic year
        other_timetables = self.db.query(Timetable).filter(
            Timetable.tenant_id == tenant_id,
            Timetable.academic_year == t.academic_year,
            Timetable.id != timetable_id,
        ).all()

        other_period_ids = [ot.id for ot in other_timetables]
        if not other_period_ids:
            return conflicts

        other_periods = self.db.query(Period).filter(Period.timetable_id.in_(other_period_ids)).all()

        for my_p in my_periods:
            if my_p.period_type != "class":
                continue

            for other_p in other_periods:
                if other_p.period_type != "class":
                    continue
                if my_p.day_of_week != other_p.day_of_week:
                    continue
                if not self._times_overlap(my_p.start_time, my_p.end_time, other_p.start_time, other_p.end_time):
                    continue

                # Same teacher?
                if my_p.teacher_id and other_p.teacher_id and my_p.teacher_id == other_p.teacher_id:
                    teacher = self.db.query(Teacher).filter(Teacher.id == my_p.teacher_id).first()
                    other_tt = self.db.query(Timetable).filter(Timetable.id == other_p.timetable_id).first()
                    other_class_name = other_tt.class_ref.name if other_tt and other_tt.class_ref else "Unknown"
                    conflicts.append({
                        "type": "teacher_conflict",
                        "message": f"Teacher {teacher.full_name if teacher else 'Unknown'} is already assigned to {other_class_name} at this time",
                        "day_of_week": my_p.day_of_week,
                        "start_time": my_p.start_time,
                        "end_time": my_p.end_time,
                        "conflicting_class": other_class_name,
                    })

                # Same room?
                if my_p.room_id and other_p.room_id and my_p.room_id == other_p.room_id:
                    room = self.db.query(Room).filter(Room.id == my_p.room_id).first()
                    other_tt = self.db.query(Timetable).filter(Timetable.id == other_p.timetable_id).first()
                    other_class_name = other_tt.class_ref.name if other_tt and other_tt.class_ref else "Unknown"
                    conflicts.append({
                        "type": "room_conflict",
                        "message": f"Room {room.display_name if room else 'Unknown'} is already booked by {other_class_name} at this time",
                        "day_of_week": my_p.day_of_week,
                        "start_time": my_p.start_time,
                        "end_time": my_p.end_time,
                        "conflicting_class": other_class_name,
                    })

        return conflicts
