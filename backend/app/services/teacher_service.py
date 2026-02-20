from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.teacher import Teacher, TeacherStatus
from app.models.class_model import Class
from app.models.class_subject import ClassSubject
from app.schemas.teacher import TeacherCreate, TeacherUpdate


class TeacherService:
    """Service for teacher management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_teachers(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        status: Optional[str] = None,
        specialization: Optional[str] = None
    ) -> tuple[List[Teacher], int]:
        """
        Get paginated list of teachers with optional filters
        
        Returns: (teachers, total_count)
        """
        query = self.db.query(Teacher).filter(Teacher.tenant_id == tenant_id)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Teacher.first_name.ilike(search_term)) |
                (Teacher.last_name.ilike(search_term)) |
                (Teacher.employee_id.ilike(search_term))
            )
        
        if status:
            query = query.filter(Teacher.status == status)
        
        if specialization:
            query = query.filter(Teacher.specialization.ilike(f"%{specialization}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        teachers = query.offset(skip).limit(limit).all()
        
        return teachers, total
    
    def get_teacher(self, teacher_id: int, tenant_id: str) -> Optional[Teacher]:
        """Get a single teacher by ID"""
        return self.db.query(Teacher).filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id
        ).first()
    
    def get_teacher_by_employee_id(self, employee_id: str, tenant_id: str) -> Optional[Teacher]:
        """Get a teacher by employee_id string"""
        return self.db.query(Teacher).filter(
            Teacher.employee_id == employee_id,
            Teacher.tenant_id == tenant_id
        ).first()
    
    def get_teacher_by_user_id(self, user_id: int, tenant_id: str) -> Optional[Teacher]:
        """Get a teacher by user_id"""
        return self.db.query(Teacher).filter(
            Teacher.user_id == user_id,
            Teacher.tenant_id == tenant_id
        ).first()
    
    def create_teacher(self, teacher_data: TeacherCreate, tenant_id: str) -> Teacher:
        """Create a new teacher"""
        # Check if employee_id already exists
        existing = self.get_teacher_by_employee_id(teacher_data.employee_id, tenant_id)
        if existing:
            raise ValueError(f"Teacher with employee ID {teacher_data.employee_id} already exists")
        
        # Check if user_id already has a teacher profile
        existing_user = self.get_teacher_by_user_id(teacher_data.user_id, tenant_id)
        if existing_user:
            raise ValueError(f"User already has a teacher profile")
        
        teacher = Teacher(
            **teacher_data.model_dump(),
            tenant_id=tenant_id
        )
        
        self.db.add(teacher)
        self.db.commit()
        self.db.refresh(teacher)
        
        return teacher
    
    def update_teacher(
        self,
        teacher_id: int,
        teacher_data: TeacherUpdate,
        tenant_id: str
    ) -> Optional[Teacher]:
        """Update an existing teacher"""
        teacher = self.get_teacher(teacher_id, tenant_id)
        if not teacher:
            return None
        
        # Update only provided fields
        update_data = teacher_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(teacher, field, value)
        
        self.db.commit()
        self.db.refresh(teacher)
        
        return teacher
    
    def delete_teacher(self, teacher_id: int, tenant_id: str) -> bool:
        """Soft delete a teacher by setting status to resigned"""
        teacher = self.get_teacher(teacher_id, tenant_id)
        if not teacher:
            return False
        
        teacher.status = TeacherStatus.RESIGNED.value
        self.db.commit()
        
        return True
    
    def assign_class_as_teacher(
        self,
        teacher_id: int,
        class_id: int,
        tenant_id: str
    ) -> bool:
        """Assign a teacher as class teacher"""
        teacher = self.get_teacher(teacher_id, tenant_id)
        if not teacher:
            return False
        
        class_obj = self.db.query(Class).filter(
            Class.id == class_id,
            Class.tenant_id == tenant_id
        ).first()
        
        if not class_obj:
            return False
        
        class_obj.class_teacher_id = teacher_id
        self.db.commit()
        
        return True
    
    def assign_subject(
        self,
        teacher_id: int,
        subject_id: int,
        class_id: int,
        tenant_id: str
    ) -> bool:
        """Assign a teacher to teach a subject in a class"""
        teacher = self.get_teacher(teacher_id, tenant_id)
        if not teacher:
            return False
        
        # Check if assignment already exists
        existing = self.db.query(ClassSubject).filter(
            ClassSubject.class_id == class_id,
            ClassSubject.subject_id == subject_id,
            ClassSubject.tenant_id == tenant_id
        ).first()
        
        if existing:
            # Update existing assignment
            existing.teacher_id = teacher_id
        else:
            # Create new assignment
            class_subject = ClassSubject(
                class_id=class_id,
                subject_id=subject_id,
                teacher_id=teacher_id,
                tenant_id=tenant_id
            )
            self.db.add(class_subject)
        
        self.db.commit()
        return True
