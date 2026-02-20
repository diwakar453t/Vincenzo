from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.subject import Subject
from app.models.subject_group import SubjectGroup
from app.models.class_subject import ClassSubject
from app.models.class_model import Class
from app.models.teacher import Teacher
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectGroupCreate, SubjectGroupUpdate


class SubjectService:
    """Service for subject management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ─── Subject CRUD ────────────────────────────────────────────────────

    def get_subjects(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        subject_type: Optional[str] = None,
        group_id: Optional[int] = None,
    ) -> tuple[List[Subject], int]:
        """Get paginated list of subjects with optional filters"""
        query = self.db.query(Subject).filter(Subject.tenant_id == tenant_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Subject.name.ilike(search_term)) |
                (Subject.code.ilike(search_term))
            )
        
        if subject_type:
            query = query.filter(Subject.subject_type == subject_type)
        
        if group_id:
            query = query.filter(Subject.group_id == group_id)
        
        total = query.count()
        subjects = query.order_by(Subject.name).offset(skip).limit(limit).all()
        
        return subjects, total
    
    def get_subject(self, subject_id: int, tenant_id: str) -> Optional[Subject]:
        """Get a single subject by ID"""
        return self.db.query(Subject).filter(
            Subject.id == subject_id,
            Subject.tenant_id == tenant_id
        ).first()
    
    def get_subject_by_code(self, code: str, tenant_id: str) -> Optional[Subject]:
        """Get a subject by code"""
        return self.db.query(Subject).filter(
            Subject.code == code,
            Subject.tenant_id == tenant_id
        ).first()
    
    def create_subject(self, subject_data: SubjectCreate, tenant_id: str) -> Subject:
        """Create a new subject"""
        existing = self.get_subject_by_code(subject_data.code, tenant_id)
        if existing:
            raise ValueError(f"Subject with code {subject_data.code} already exists")
        
        subject = Subject(
            **subject_data.model_dump(),
            tenant_id=tenant_id
        )
        
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        
        return subject
    
    def update_subject(
        self,
        subject_id: int,
        subject_data: SubjectUpdate,
        tenant_id: str
    ) -> Optional[Subject]:
        """Update an existing subject"""
        subject = self.get_subject(subject_id, tenant_id)
        if not subject:
            return None
        
        if subject_data.code and subject_data.code != subject.code:
            existing = self.get_subject_by_code(subject_data.code, tenant_id)
            if existing:
                raise ValueError(f"Subject with code {subject_data.code} already exists")
        
        update_data = subject_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subject, field, value)
        
        self.db.commit()
        self.db.refresh(subject)
        
        return subject
    
    def delete_subject(self, subject_id: int, tenant_id: str) -> bool:
        """Delete a subject"""
        subject = self.get_subject(subject_id, tenant_id)
        if not subject:
            return False
        
        # Check if assigned to any class
        assignment_count = self.db.query(ClassSubject).filter(
            ClassSubject.subject_id == subject_id,
            ClassSubject.tenant_id == tenant_id
        ).count()
        if assignment_count > 0:
            raise ValueError("Cannot delete subject that is assigned to classes. Unassign it first.")
        
        self.db.delete(subject)
        self.db.commit()
        
        return True

    # ─── Subject Group CRUD ──────────────────────────────────────────────

    def get_groups(self, tenant_id: str) -> List[SubjectGroup]:
        """Get all subject groups for a tenant"""
        return self.db.query(SubjectGroup).filter(
            SubjectGroup.tenant_id == tenant_id
        ).order_by(SubjectGroup.name).all()

    def get_group(self, group_id: int, tenant_id: str) -> Optional[SubjectGroup]:
        """Get a single subject group by ID"""
        return self.db.query(SubjectGroup).filter(
            SubjectGroup.id == group_id,
            SubjectGroup.tenant_id == tenant_id
        ).first()

    def create_group(self, data: SubjectGroupCreate, tenant_id: str) -> SubjectGroup:
        """Create a new subject group"""
        group = SubjectGroup(**data.model_dump(), tenant_id=tenant_id)
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group

    def update_group(self, group_id: int, data: SubjectGroupUpdate, tenant_id: str) -> Optional[SubjectGroup]:
        """Update a subject group"""
        group = self.get_group(group_id, tenant_id)
        if not group:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(group, field, value)
        
        self.db.commit()
        self.db.refresh(group)
        return group

    def delete_group(self, group_id: int, tenant_id: str) -> bool:
        """Delete a subject group (sets subjects' group_id to null)"""
        group = self.get_group(group_id, tenant_id)
        if not group:
            return False
        
        # Unlink subjects from this group
        self.db.query(Subject).filter(
            Subject.group_id == group_id,
            Subject.tenant_id == tenant_id
        ).update({Subject.group_id: None})
        
        self.db.delete(group)
        self.db.commit()
        return True

    def get_group_subject_count(self, group_id: int, tenant_id: str) -> int:
        """Get the number of subjects in a group"""
        return self.db.query(Subject).filter(
            Subject.group_id == group_id,
            Subject.tenant_id == tenant_id
        ).count()

    # ─── Class-Subject Assignment ────────────────────────────────────────

    def assign_subject_to_class(
        self,
        subject_id: int,
        class_id: int,
        tenant_id: str,
        teacher_id: Optional[int] = None
    ) -> ClassSubject:
        """Assign a subject to a class"""
        # Verify subject exists
        subject = self.get_subject(subject_id, tenant_id)
        if not subject:
            raise ValueError("Subject not found")
        
        # Verify class exists
        class_obj = self.db.query(Class).filter(
            Class.id == class_id, Class.tenant_id == tenant_id
        ).first()
        if not class_obj:
            raise ValueError("Class not found")
        
        # Check if already assigned
        existing = self.db.query(ClassSubject).filter(
            ClassSubject.class_id == class_id,
            ClassSubject.subject_id == subject_id,
            ClassSubject.tenant_id == tenant_id
        ).first()
        if existing:
            raise ValueError("Subject is already assigned to this class")
        
        assignment = ClassSubject(
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher_id,
            tenant_id=tenant_id
        )
        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def unassign_subject_from_class(
        self,
        subject_id: int,
        class_id: int,
        tenant_id: str
    ) -> bool:
        """Remove a subject assignment from a class"""
        assignment = self.db.query(ClassSubject).filter(
            ClassSubject.class_id == class_id,
            ClassSubject.subject_id == subject_id,
            ClassSubject.tenant_id == tenant_id
        ).first()
        if not assignment:
            return False
        
        self.db.delete(assignment)
        self.db.commit()
        return True

    def get_class_subjects(self, class_id: int, tenant_id: str) -> list:
        """Get all subjects assigned to a class with teacher info"""
        class_obj = self.db.query(Class).filter(
            Class.id == class_id, Class.tenant_id == tenant_id
        ).first()
        if not class_obj:
            return []
        
        assignments = self.db.query(ClassSubject).filter(
            ClassSubject.class_id == class_id,
            ClassSubject.tenant_id == tenant_id
        ).all()
        
        result = []
        for a in assignments:
            teacher_name = None
            if a.teacher_id and a.teacher:
                teacher_name = f"{a.teacher.first_name} {a.teacher.last_name}"
            
            result.append({
                "id": a.id,
                "subject_id": a.subject.id,
                "subject_name": a.subject.name,
                "subject_code": a.subject.code,
                "teacher_id": a.teacher_id,
                "teacher_name": teacher_name,
            })
        
        return result
