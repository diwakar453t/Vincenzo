import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.student_service import StudentService
from app.schemas.student import StudentCreate
from datetime import date

def test_create():
    db = SessionLocal()
    service = StudentService(db)
    
    try:
        data = StudentCreate(
            student_id="STU-TEST-9999",
            first_name="Test",
            last_name="User",
            date_of_birth=date(2000, 1, 1),
            gender="male",
            email="teststudent9999@example.com",
            phone="1234567890",
            address="Test address",
            enrollment_date=date(2025, 1, 1),
            class_id=None,
            parent_id=None,
            status="active"
        )
        print("Attempting to create student...")
        student = service.create_student(data, tenant_id="demo-school")
        print(f"✅ Success! Created Student ID: {student.id}")
    except Exception as e:
        print(f"❌ Error during creation: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.rollback()
        db.close()

if __name__ == "__main__":
    test_create()
