from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import date
import csv
import io
import pandas as pd
import string
import random

from app.models.student import Student, StudentStatus
from app.schemas.student import StudentCreate, StudentUpdate, StudentListItem
from app.models.user import User, UserRole
from app.models.guardian import Guardian, guardian_students
from app.core.auth import get_password_hash


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
        
    def bulk_import_students_excel(
        self,
        df: pd.DataFrame,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Bulk import students from Excel DataFrame
        Creates users, students, and parents
        """
        results = {
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        for index, row in df.iterrows():
            try:
                roll_number = str(row.get('roll_number', '')).strip()
                student_name = str(row.get('student_name', '')).strip()
                parent_name = str(row.get('parent_name', '')).strip()
                parent_phone = str(row.get('parent_phone', '')).strip()
                
                if not roll_number or roll_number == 'nan':
                    raise ValueError("Missing roll_number")
                if not student_name or student_name == 'nan':
                    raise ValueError("Missing student_name")
                    
                parts = student_name.split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""
                
                # Check if student exists
                if self.get_student_by_student_id(roll_number, tenant_id):
                    raise ValueError(f"Student with ID {roll_number} already exists")
                    
                password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
                
                # 1. Create User
                user = User(
                    email=f"{roll_number.lower()}@student.local",
                    username=roll_number,
                    hashed_password=get_password_hash(password),
                    full_name=student_name,
                    role=UserRole.STUDENT,
                    tenant_id=tenant_id,
                    is_active=True
                )
                self.db.add(user)
                self.db.flush()
                
                # 2. Create Student
                student = Student(
                    student_id=roll_number,
                    first_name=first_name,
                    last_name=last_name,
                    full_name=student_name,
                    date_of_birth=date.today(), # Placeholder
                    gender="Other",
                    user_id=user.id,
                    enrollment_date=date.today(),
                    tenant_id=tenant_id,
                    status=StudentStatus.ACTIVE.value
                )
                self.db.add(student)
                self.db.flush()
                
                # 3. Create Parent
                if parent_name and parent_name != 'nan':
                    p_parts = parent_name.split(' ', 1)
                    p_first = p_parts[0]
                    p_last = p_parts[1] if len(p_parts) > 1 else ""
                    parent = Guardian(
                        first_name=p_first,
                        last_name=p_last,
                        full_name=parent_name,
                        phone=parent_phone if parent_phone != 'nan' else None,
                        relationship_type="Parent",
                        tenant_id=tenant_id
                    )
                    self.db.add(parent)
                    self.db.flush()
                    
                    student.guardians.append(parent)
                
                self.db.commit()
                results["success"] += 1
                
            except Exception as e:
                self.db.rollback()
                results["failed"] += 1
                results["errors"].append({
                    "row": index + 2, # Excel row (1-indexed + header)
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
