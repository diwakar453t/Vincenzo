"""
Sports Management service
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.sports import Sport, SportParticipation, SportAchievement, ParticipationStatus
from app.models.student import Student


class SportsService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Sports CRUD ─────────────────────────────────────────────────────

    def get_sports(self, tenant_id: str, category: str = None, status: str = None):
        q = self.db.query(Sport).filter(Sport.tenant_id == tenant_id)
        if category:
            q = q.filter(Sport.category == category)
        if status:
            q = q.filter(Sport.status == status)
        sports = q.order_by(Sport.name).all()
        return [self._sport_dict(s) for s in sports], len(sports)

    def create_sport(self, data: dict, tenant_id: str):
        sport = Sport(**data, tenant_id=tenant_id)
        self.db.add(sport)
        self.db.commit()
        self.db.refresh(sport)
        return self._sport_dict(sport)

    def update_sport(self, sport_id: int, data: dict, tenant_id: str):
        sport = self.db.query(Sport).filter(Sport.id == sport_id, Sport.tenant_id == tenant_id).first()
        if not sport:
            raise ValueError("Sport not found")
        for k, v in data.items():
            if v is not None:
                setattr(sport, k, v)
        self.db.commit()
        self.db.refresh(sport)
        return self._sport_dict(sport)

    def delete_sport(self, sport_id: int, tenant_id: str):
        sport = self.db.query(Sport).filter(Sport.id == sport_id, Sport.tenant_id == tenant_id).first()
        if not sport:
            raise ValueError("Sport not found")
        if sport.current_participants > 0:
            raise ValueError("Cannot delete sport with active participants")
        self.db.delete(sport)
        self.db.commit()

    def _sport_dict(self, s: Sport) -> dict:
        achievements_count = self.db.query(SportAchievement).filter(SportAchievement.sport_id == s.id).count()
        return {
            "id": s.id, "tenant_id": s.tenant_id,
            "name": s.name, "code": s.code,
            "category": s.category.value if hasattr(s.category, 'value') else str(s.category),
            "description": s.description,
            "coach_name": s.coach_name, "coach_phone": s.coach_phone,
            "venue": s.venue, "practice_schedule": s.practice_schedule,
            "max_participants": s.max_participants,
            "current_participants": s.current_participants,
            "available_slots": s.max_participants - s.current_participants,
            "season": s.season, "registration_fee": s.registration_fee,
            "equipment_provided": s.equipment_provided,
            "status": s.status.value if hasattr(s.status, 'value') else str(s.status),
            "is_active": s.is_active,
            "achievements_count": achievements_count,
            "created_at": s.created_at, "updated_at": s.updated_at,
        }

    # ─── Participations ──────────────────────────────────────────────────

    def register_student(self, data: dict, tenant_id: str):
        sport = self.db.query(Sport).filter(Sport.id == data["sport_id"], Sport.tenant_id == tenant_id).first()
        if not sport:
            raise ValueError("Sport not found")
        if sport.current_participants >= sport.max_participants:
            raise ValueError("Sport is at maximum capacity")

        existing = self.db.query(SportParticipation).filter(
            SportParticipation.sport_id == data["sport_id"],
            SportParticipation.student_id == data["student_id"],
            SportParticipation.tenant_id == tenant_id,
            SportParticipation.status.in_([ParticipationStatus.registered, ParticipationStatus.active]),
        ).first()
        if existing:
            raise ValueError("Student already registered for this sport")

        participation = SportParticipation(
            sport_id=data["sport_id"], student_id=data["student_id"],
            registration_date=date.today(),
            position=data.get("position"), jersey_number=data.get("jersey_number"),
            remarks=data.get("remarks"), tenant_id=tenant_id,
            status=ParticipationStatus.registered,
        )
        self.db.add(participation)
        sport.current_participants += 1
        self.db.commit()
        self.db.refresh(participation)
        return self._participation_dict(participation)

    def update_participation(self, part_id: int, data: dict, tenant_id: str):
        part = self.db.query(SportParticipation).filter(
            SportParticipation.id == part_id, SportParticipation.tenant_id == tenant_id
        ).first()
        if not part:
            raise ValueError("Participation not found")

        old_status = part.status
        for k, v in data.items():
            if v is not None:
                setattr(part, k, v)

        # If dropped, decrement participant count
        if data.get("status") == "dropped" and old_status != ParticipationStatus.dropped:
            part.end_date = date.today()
            sport = self.db.query(Sport).filter(Sport.id == part.sport_id).first()
            if sport and sport.current_participants > 0:
                sport.current_participants -= 1

        self.db.commit()
        self.db.refresh(part)
        return self._participation_dict(part)

    def get_participations(self, tenant_id: str, sport_id: int = None,
                           student_id: int = None, status: str = None):
        q = self.db.query(SportParticipation).filter(SportParticipation.tenant_id == tenant_id)
        if sport_id:
            q = q.filter(SportParticipation.sport_id == sport_id)
        if student_id:
            q = q.filter(SportParticipation.student_id == student_id)
        if status:
            q = q.filter(SportParticipation.status == status)
        parts = q.order_by(SportParticipation.registration_date.desc()).all()
        return [self._participation_dict(p) for p in parts], len(parts)

    def delete_participation(self, part_id: int, tenant_id: str):
        part = self.db.query(SportParticipation).filter(
            SportParticipation.id == part_id, SportParticipation.tenant_id == tenant_id
        ).first()
        if not part:
            raise ValueError("Participation not found")
        sport = self.db.query(Sport).filter(Sport.id == part.sport_id).first()
        if sport and part.status in [ParticipationStatus.registered, ParticipationStatus.active]:
            if sport.current_participants > 0:
                sport.current_participants -= 1
        self.db.delete(part)
        self.db.commit()

    def _participation_dict(self, p: SportParticipation) -> dict:
        sport = self.db.query(Sport).filter(Sport.id == p.sport_id).first()
        student = self.db.query(Student).filter(Student.id == p.student_id).first()
        return {
            "id": p.id, "tenant_id": p.tenant_id,
            "sport_id": p.sport_id, "sport_name": sport.name if sport else None,
            "student_id": p.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "registration_date": str(p.registration_date),
            "end_date": str(p.end_date) if p.end_date else None,
            "position": p.position, "jersey_number": p.jersey_number,
            "fee_paid": p.fee_paid,
            "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
            "remarks": p.remarks,
            "created_at": p.created_at, "updated_at": p.updated_at,
        }

    # ─── Achievements ────────────────────────────────────────────────────

    def create_achievement(self, data: dict, tenant_id: str):
        sport = self.db.query(Sport).filter(Sport.id == data["sport_id"], Sport.tenant_id == tenant_id).first()
        if not sport:
            raise ValueError("Sport not found")
        if data.get("event_date"):
            data["event_date"] = date.fromisoformat(data["event_date"])
        else:
            data.pop("event_date", None)
        ach = SportAchievement(**data, tenant_id=tenant_id)
        self.db.add(ach)
        self.db.commit()
        self.db.refresh(ach)
        return self._achievement_dict(ach)

    def update_achievement(self, ach_id: int, data: dict, tenant_id: str):
        ach = self.db.query(SportAchievement).filter(
            SportAchievement.id == ach_id, SportAchievement.tenant_id == tenant_id
        ).first()
        if not ach:
            raise ValueError("Achievement not found")
        if data.get("event_date"):
            data["event_date"] = date.fromisoformat(data["event_date"])
        for k, v in data.items():
            if v is not None:
                setattr(ach, k, v)
        self.db.commit()
        self.db.refresh(ach)
        return self._achievement_dict(ach)

    def delete_achievement(self, ach_id: int, tenant_id: str):
        ach = self.db.query(SportAchievement).filter(
            SportAchievement.id == ach_id, SportAchievement.tenant_id == tenant_id
        ).first()
        if not ach:
            raise ValueError("Achievement not found")
        self.db.delete(ach)
        self.db.commit()

    def get_achievements(self, tenant_id: str, sport_id: int = None,
                         student_id: int = None, level: str = None):
        q = self.db.query(SportAchievement).filter(SportAchievement.tenant_id == tenant_id)
        if sport_id:
            q = q.filter(SportAchievement.sport_id == sport_id)
        if student_id:
            q = q.filter(SportAchievement.student_id == student_id)
        if level:
            q = q.filter(SportAchievement.level == level)
        achs = q.order_by(SportAchievement.created_at.desc()).all()
        return [self._achievement_dict(a) for a in achs], len(achs)

    def _achievement_dict(self, a: SportAchievement) -> dict:
        sport = self.db.query(Sport).filter(Sport.id == a.sport_id).first()
        student = self.db.query(Student).filter(Student.id == a.student_id).first() if a.student_id else None
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "sport_id": a.sport_id, "sport_name": sport.name if sport else None,
            "student_id": a.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "title": a.title,
            "achievement_type": a.achievement_type.value if hasattr(a.achievement_type, 'value') else str(a.achievement_type),
            "level": a.level.value if hasattr(a.level, 'value') else str(a.level),
            "event_name": a.event_name,
            "event_date": str(a.event_date) if a.event_date else None,
            "event_venue": a.event_venue, "description": a.description,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }

    # ─── Stats ───────────────────────────────────────────────────────────

    def get_stats(self, tenant_id: str):
        all_sports = self.db.query(Sport).filter(Sport.tenant_id == tenant_id).all()
        active_sports = [s for s in all_sports if s.is_active]
        total_participants = self.db.query(SportParticipation).filter(
            SportParticipation.tenant_id == tenant_id,
            SportParticipation.status.in_([ParticipationStatus.registered, ParticipationStatus.active]),
        ).count()
        total_achievements = self.db.query(SportAchievement).filter(
            SportAchievement.tenant_id == tenant_id
        ).count()

        # Category breakdown
        cat_counts: dict = {}
        for s in active_sports:
            cat = s.category.value if hasattr(s.category, 'value') else str(s.category)
            if cat not in cat_counts:
                cat_counts[cat] = {"category": cat, "count": 0, "participants": 0}
            cat_counts[cat]["count"] += 1
            cat_counts[cat]["participants"] += s.current_participants

        # Achievement breakdown by level
        ach_levels: dict = {}
        achs = self.db.query(SportAchievement).filter(SportAchievement.tenant_id == tenant_id).all()
        for a in achs:
            lev = a.level.value if hasattr(a.level, 'value') else str(a.level)
            if lev not in ach_levels:
                ach_levels[lev] = {"level": lev, "count": 0}
            ach_levels[lev]["count"] += 1

        return {
            "total_sports": len(all_sports),
            "active_sports": len(active_sports),
            "total_participants": total_participants,
            "total_achievements": total_achievements,
            "category_breakdown": list(cat_counts.values()),
            "achievement_breakdown": list(ach_levels.values()),
        }
