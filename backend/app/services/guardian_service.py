from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any

from app.models.guardian import Guardian, GuardianStatus
from app.models.student import Student
from app.schemas.guardian import GuardianCreate, GuardianUpdate


class GuardianService:
    """Service for guardian management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_guardians(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status: Optional[str] = None,
        relationship_type: Optional[str] = None
    ) -> tuple[List[Guardian], int]:
        """Get paginated list of guardians with optional filters"""
        query = self.db.query(Guardian).filter(Guardian.tenant_id == tenant_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Guardian.first_name.ilike(search_term)) |
                (Guardian.last_name.ilike(search_term)) |
                (Guardian.email.ilike(search_term)) |
                (Guardian.phone.ilike(search_term))
            )
        
        if status:
            query = query.filter(Guardian.status == status)
        
        if relationship_type:
            query = query.filter(Guardian.relationship_type == relationship_type)
        
        total = query.count()
        guardians = query.offset(skip).limit(limit).all()
        
        return guardians, total
    
    def get_guardian(self, guardian_id: int, tenant_id: str) -> Optional[Guardian]:
        """Get a single guardian by ID"""
        return self.db.query(Guardian).filter(
            Guardian.id == guardian_id,
            Guardian.tenant_id == tenant_id
        ).first()
    
    def create_guardian(self, guardian_data: GuardianCreate, tenant_id: str) -> Guardian:
        """Create a new guardian and optionally link students"""
        data = guardian_data.model_dump(exclude={'student_ids'})
        student_ids = guardian_data.student_ids or []
        
        guardian = Guardian(**data, tenant_id=tenant_id)
        
        # Link students if provided
        if student_ids:
            students = self.db.query(Student).filter(
                Student.id.in_(student_ids),
                Student.tenant_id == tenant_id
            ).all()
            guardian.students = students
        
        self.db.add(guardian)
        self.db.commit()
        self.db.refresh(guardian)
        
        return guardian
    
    def update_guardian(
        self,
        guardian_id: int,
        guardian_data: GuardianUpdate,
        tenant_id: str
    ) -> Optional[Guardian]:
        """Update an existing guardian"""
        guardian = self.get_guardian(guardian_id, tenant_id)
        if not guardian:
            return None
        
        update_data = guardian_data.model_dump(exclude_unset=True, exclude={'student_ids'})
        for field, value in update_data.items():
            setattr(guardian, field, value)
        
        # Update student links if provided
        if guardian_data.student_ids is not None:
            students = self.db.query(Student).filter(
                Student.id.in_(guardian_data.student_ids),
                Student.tenant_id == tenant_id
            ).all()
            guardian.students = students
        
        self.db.commit()
        self.db.refresh(guardian)
        
        return guardian
    
    def delete_guardian(self, guardian_id: int, tenant_id: str) -> bool:
        """Soft delete a guardian by setting status to inactive"""
        guardian = self.get_guardian(guardian_id, tenant_id)
        if not guardian:
            return False
        
        guardian.status = GuardianStatus.INACTIVE.value
        self.db.commit()
        
        return True
    
    def link_student(self, guardian_id: int, student_id: int, tenant_id: str) -> bool:
        """Link a student to a guardian"""
        guardian = self.get_guardian(guardian_id, tenant_id)
        if not guardian:
            return False
        
        student = self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
        if not student:
            return False
        
        if student not in guardian.students:
            guardian.students.append(student)
            self.db.commit()
        
        return True
    
    def unlink_student(self, guardian_id: int, student_id: int, tenant_id: str) -> bool:
        """Unlink a student from a guardian"""
        guardian = self.get_guardian(guardian_id, tenant_id)
        if not guardian:
            return False
        
        student = self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
        if not student:
            return False
        
        if student in guardian.students:
            guardian.students.remove(student)
            self.db.commit()
        
        return True
