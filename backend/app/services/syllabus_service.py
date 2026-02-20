import os
import uuid
from datetime import date
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.syllabus import Syllabus, SyllabusTopic
from app.models.subject import Subject
from app.models.class_model import Class
from app.schemas.syllabus import SyllabusCreate, SyllabusUpdate, SyllabusTopicCreate, SyllabusTopicUpdate
from app.core.config import settings


class SyllabusService:
    """Service for syllabus management operations."""

    def __init__(self, db: Session):
        self.db = db

    # ─── Helper: build list item dict ────────────────────────────────────

    def _to_list_item(self, s: Syllabus) -> dict:
        total = len(s.topics) if s.topics else 0
        completed = sum(1 for t in s.topics if t.is_completed) if s.topics else 0
        return {
            "id": s.id,
            "title": s.title,
            "academic_year": s.academic_year,
            "status": s.status,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else None,
            "class_id": s.class_id,
            "class_name": s.class_ref.name if s.class_ref else None,
            "total_topics": total,
            "completed_topics": completed,
            "progress": round((completed / total * 100) if total > 0 else 0, 1),
        }

    def _to_detail(self, s: Syllabus) -> dict:
        total = len(s.topics) if s.topics else 0
        completed = sum(1 for t in s.topics if t.is_completed) if s.topics else 0
        return {
            **s.__dict__,
            "subject_name": s.subject.name if s.subject else None,
            "class_name": s.class_ref.name if s.class_ref else None,
            "topics": s.topics or [],
            "total_topics": total,
            "completed_topics": completed,
            "progress": round((completed / total * 100) if total > 0 else 0, 1),
        }

    # ─── Syllabus CRUD ───────────────────────────────────────────────────

    def get_syllabi(
        self,
        tenant_id: str,
        subject_id: Optional[int] = None,
        class_id: Optional[int] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[dict], int]:
        query = self.db.query(Syllabus).filter(Syllabus.tenant_id == tenant_id)

        if subject_id:
            query = query.filter(Syllabus.subject_id == subject_id)
        if class_id:
            query = query.filter(Syllabus.class_id == class_id)
        if status:
            query = query.filter(Syllabus.status == status)
        if search:
            query = query.filter(Syllabus.title.ilike(f"%{search}%"))

        total = query.count()
        syllabi = query.order_by(Syllabus.updated_at.desc()).all()
        return [self._to_list_item(s) for s in syllabi], total

    def get_syllabus(self, syllabus_id: int, tenant_id: str) -> Optional[dict]:
        s = self.db.query(Syllabus).filter(
            Syllabus.id == syllabus_id, Syllabus.tenant_id == tenant_id
        ).first()
        if not s:
            return None
        return self._to_detail(s)

    def create_syllabus(self, data: SyllabusCreate, tenant_id: str) -> Syllabus:
        # Verify subject and class exist
        subject = self.db.query(Subject).filter(Subject.id == data.subject_id, Subject.tenant_id == tenant_id).first()
        if not subject:
            raise ValueError("Subject not found")
        cls = self.db.query(Class).filter(Class.id == data.class_id, Class.tenant_id == tenant_id).first()
        if not cls:
            raise ValueError("Class not found")

        syllabus = Syllabus(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(syllabus)
        self.db.commit()
        self.db.refresh(syllabus)
        return syllabus

    def update_syllabus(self, syllabus_id: int, data: SyllabusUpdate, tenant_id: str) -> Optional[Syllabus]:
        s = self.db.query(Syllabus).filter(Syllabus.id == syllabus_id, Syllabus.tenant_id == tenant_id).first()
        if not s:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(s, field, value)
        self.db.commit()
        self.db.refresh(s)
        return s

    def delete_syllabus(self, syllabus_id: int, tenant_id: str) -> bool:
        s = self.db.query(Syllabus).filter(Syllabus.id == syllabus_id, Syllabus.tenant_id == tenant_id).first()
        if not s:
            return False
        self.db.delete(s)
        self.db.commit()
        return True

    # ─── Topic CRUD ──────────────────────────────────────────────────────

    def add_topic(self, syllabus_id: int, data: SyllabusTopicCreate, tenant_id: str) -> SyllabusTopic:
        s = self.db.query(Syllabus).filter(Syllabus.id == syllabus_id, Syllabus.tenant_id == tenant_id).first()
        if not s:
            raise ValueError("Syllabus not found")

        topic = SyllabusTopic(
            **data.model_dump(),
            syllabus_id=syllabus_id,
            tenant_id=tenant_id,
        )
        self.db.add(topic)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    def update_topic(self, topic_id: int, data: SyllabusTopicUpdate, tenant_id: str) -> Optional[SyllabusTopic]:
        t = self.db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id, SyllabusTopic.tenant_id == tenant_id).first()
        if not t:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(t, field, value)
        self.db.commit()
        self.db.refresh(t)
        return t

    def delete_topic(self, topic_id: int, tenant_id: str) -> bool:
        t = self.db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id, SyllabusTopic.tenant_id == tenant_id).first()
        if not t:
            return False
        # Remove associated file if exists
        if t.document_path:
            try:
                os.remove(t.document_path)
            except OSError:
                pass
        self.db.delete(t)
        self.db.commit()
        return True

    def toggle_topic_completion(self, topic_id: int, tenant_id: str) -> Optional[SyllabusTopic]:
        t = self.db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id, SyllabusTopic.tenant_id == tenant_id).first()
        if not t:
            return None
        t.is_completed = not t.is_completed
        t.completed_date = date.today() if t.is_completed else None
        self.db.commit()
        self.db.refresh(t)
        return t

    # ─── Document Upload ─────────────────────────────────────────────────

    def save_topic_document(self, topic_id: int, tenant_id: str, file_data: bytes, filename: str) -> Optional[SyllabusTopic]:
        t = self.db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id, SyllabusTopic.tenant_id == tenant_id).first()
        if not t:
            return None

        # Remove old file
        if t.document_path:
            try:
                os.remove(t.document_path)
            except OSError:
                pass

        # Save new file
        upload_dir = os.path.join(settings.UPLOAD_DIR, "syllabus", tenant_id)
        os.makedirs(upload_dir, exist_ok=True)

        ext = os.path.splitext(filename)[1]
        safe_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(upload_dir, safe_name)

        with open(file_path, "wb") as f:
            f.write(file_data)

        t.document_path = file_path
        t.document_name = filename
        self.db.commit()
        self.db.refresh(t)
        return t

    def delete_topic_document(self, topic_id: int, tenant_id: str) -> Optional[SyllabusTopic]:
        t = self.db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id, SyllabusTopic.tenant_id == tenant_id).first()
        if not t:
            return None
        if t.document_path:
            try:
                os.remove(t.document_path)
            except OSError:
                pass
            t.document_path = None
            t.document_name = None
            self.db.commit()
            self.db.refresh(t)
        return t
