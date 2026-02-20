from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import date
import csv
import io

from app.models.student import Student, StudentStatus
from app.schemas.student import StudentCreate, StudentUpdate, StudentListItem


class StudentService:
    """Service for student management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_students(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        class_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> tuple[List[Student], int]:
        """
        Get paginated list of students with optional filters
        
        Returns: (students, total_count)
        """
        query = self.db.query(Student).filter(Student.tenant_id == tenant_id)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Student.first_name.ilike(search_term)) |
                (Student.last_name.ilike(search_term)) |
                (Student.student_id.ilike(search_term)) |
                (Student.email.ilike(search_term))
            )
        
        if class_id:
            query = query.filter(Student.class_id == class_id)
        
        if status:
            query = query.filter(Student.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        students = query.offset(skip).limit(limit).all()
        
        return students, total
    
    def get_student(self, student_id: int, tenant_id: str) -> Optional[Student]:
        """Get a single student by ID"""
        return self.db.query(Student).filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id
        ).first()
    
    def get_student_by_student_id(self, student_id_str: str, tenant_id: str) -> Optional[Student]:
        """Get a student by student_id string"""
        return self.db.query(Student).filter(
            Student.student_id == student_id_str,
            Student.tenant_id == tenant_id
        ).first()
    
    def create_student(self, student_data: StudentCreate, tenant_id: str) -> Student:
        """Create a new student"""
        # Check if student_id already exists
        existing = self.get_student_by_student_id(student_data.student_id, tenant_id)
        if existing:
            raise ValueError(f"Student with ID {student_data.student_id} already exists")
        
        student = Student(
            **student_data.model_dump(),
            tenant_id=tenant_id
        )
        
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        
        return student
    
    def update_student(
        self,
        student_id: int,
        student_data: StudentUpdate,
        tenant_id: str
    ) -> Optional[Student]:
        """Update an existing student"""
        student = self.get_student(student_id, tenant_id)
        if not student:
            return None
        
        # Update only provided fields
        update_data = student_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        
        self.db.commit()
        self.db.refresh(student)
        
        return student
    
    def delete_student(self, student_id: int, tenant_id: str) -> bool:
        """Soft delete a student by setting status to inactive"""
        student = self.get_student(student_id, tenant_id)
        if not student:
            return False
        
        student.status = StudentStatus.INACTIVE.value
        self.db.commit()
        
        return True
    
    def bulk_import_students(
        self,
        csv_data: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Bulk import students from CSV data
        
        Returns: {
            "success": count,
            "failed": count,
            "errors": [...]
        }
        """
        results = {
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        csv_file = io.StringIO(csv_data)
        reader = csv.DictReader(csv_file)
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # Parse the row data
                student_data = StudentCreate(
                    student_id=row.get('student_id'),
                    first_name=row.get('first_name'),
                    last_name=row.get('last_name'),
                    date_of_birth=date.fromisoformat(row.get('date_of_birth')),
                    gender=row.get('gender'),
                    email=row.get('email') or None,
                    phone=row.get('phone') or None,
                    address=row.get('address') or None,
                    enrollment_date=date.fromisoformat(row.get('enrollment_date')),
                    class_id=int(row.get('class_id')) if row.get('class_id') else None,
                    parent_id=int(row.get('parent_id')) if row.get('parent_id') else None,
                    status=row.get('status', 'active')
                )
                
                self.create_student(student_data, tenant_id)
                results["success"] += 1
                
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "row": row_num,
                    "error": str(e)
                })
        
        return results
    
    def export_students(self, tenant_id: str) -> str:
        """Export all students to CSV format"""
        students = self.db.query(Student).filter(
            Student.tenant_id == tenant_id
        ).all()
        
        output = io.StringIO()
        fieldnames = [
            'student_id', 'first_name', 'last_name', 'date_of_birth',
            'gender', 'email', 'phone', 'enrollment_date', 'class_id',
            'status'
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for student in students:
            writer.writerow({
                'student_id': student.student_id,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'date_of_birth': student.date_of_birth.isoformat(),
                'gender': student.gender,
                'email': student.email or '',
                'phone': student.phone or '',
                'enrollment_date': student.enrollment_date.isoformat(),
                'class_id': student.class_id or '',
                'status': student.status
            })
        
        return output.getvalue()
