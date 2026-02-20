from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.models.class_model import Class
from app.models.student import Student
from app.schemas.class_schema import ClassCreate, ClassUpdate


class ClassService:
    """Service for class management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_classes(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        academic_year: Optional[str] = None,
        grade_level: Optional[int] = None
    ) -> tuple[List[Class], int]:
        """
        Get paginated list of classes with optional filters
        
        Returns: (classes, total_count)
        """
        query = self.db.query(Class).filter(Class.tenant_id == tenant_id)
        
        # Apply filters
        if academic_year:
            query = query.filter(Class.academic_year == academic_year)
        
        if grade_level:
            query = query.filter(Class.grade_level == grade_level)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        classes = query.offset(skip).limit(limit).all()
        
        return classes, total
    
    def get_class(self, class_id: int, tenant_id: str) -> Optional[Class]:
        """Get a single class by ID"""
        return self.db.query(Class).filter(
            Class.id == class_id,
            Class.tenant_id == tenant_id
        ).first()
    
    def create_class(self, class_data: ClassCreate, tenant_id: str) -> Class:
        """Create a new class"""
        class_obj = Class(
            **class_data.model_dump(),
            tenant_id=tenant_id
        )
        
        self.db.add(class_obj)
        self.db.commit()
        self.db.refresh(class_obj)
        
        return class_obj
    
    def update_class(
        self,
        class_id: int,
        class_data: ClassUpdate,
        tenant_id: str
    ) -> Optional[Class]:
        """Update an existing class"""
        class_obj = self.get_class(class_id, tenant_id)
        if not class_obj:
            return None
        
        # Update only provided fields
        update_data = class_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(class_obj, field, value)
        
        self.db.commit()
        self.db.refresh(class_obj)
        
        return class_obj
    
    def delete_class(self, class_id: int, tenant_id: str) -> bool:
        """Delete a class"""
        class_obj = self.get_class(class_id, tenant_id)
        if not class_obj:
            return False
        
        # Check if class has students
        student_count = self.db.query(Student).filter(
            Student.class_id == class_id,
            Student.tenant_id == tenant_id
        ).count()
        
        if student_count > 0:
            raise ValueError("Cannot delete class with enrolled students")
        
        self.db.delete(class_obj)
        self.db.commit()
        
        return True
    
    def get_class_students(
        self,
        class_id: int,
        tenant_id: str
    ) -> List[Student]:
        """Get all students in a class"""
        return self.db.query(Student).filter(
            Student.class_id == class_id,
            Student.tenant_id == tenant_id
        ).all()
    
    def assign_students(
        self,
        class_id: int,
        student_ids: List[int],
        tenant_id: str
    ) -> int:
        """
        Assign multiple students to a class
        
        Returns: count of students assigned
        """
        class_obj = self.get_class(class_id, tenant_id)
        if not class_obj:
            raise ValueError("Class not found")
        
        assigned_count = 0
        
        for student_id in student_ids:
            student = self.db.query(Student).filter(
                Student.id == student_id,
                Student.tenant_id == tenant_id
            ).first()
            
            if student:
                student.class_id = class_id
                assigned_count += 1
        
        self.db.commit()
        
        return assigned_count
    
    def get_student_count(self, class_id: int, tenant_id: str) -> int:
        """Get count of students in a class"""
        return self.db.query(Student).filter(
            Student.class_id == class_id,
            Student.tenant_id == tenant_id
        ).count()
