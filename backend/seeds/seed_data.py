#!/usr/bin/env python3
"""
PreSkool ERP Demo Data Seeder
==============================
Populates the database with realistic demo data so you can immediately
see real data in all 4 dashboards after login.

Usage (from /backend directory):
    source venv/bin/activate
    python seeds/seed_data.py

Demo accounts created:
    Super Admin: superadmin@demo.preskool.local  / SuperAdmin@1234
    Admin:       admin@demo.preskool.local        / Admin@1234
    Teacher 1:   teacher1@demo.preskool.local     / Teacher@1234
    Teacher 2:   teacher2@demo.preskool.local     / Teacher@1234
    Student 1:   student1@demo.preskool.local     / Student@1234
    Student 2:   student2@demo.preskool.local     / Student@1234
    Parent:      parent@demo.preskool.local        / Parent@1234
"""
import os, sys
from datetime import date, timedelta
from pathlib import Path

# ── Allow running from project root ─────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("DATABASE_URL", "sqlite:///./preskool.db")
os.environ.setdefault("JWT_SECRET_KEY", "change-me-in-production-32chars!!")
os.environ.setdefault("ENCRYPTION_MASTER_KEY", "change-me-encryption-key-32bytes!!")
os.environ.setdefault("OTEL_ENABLED", "False")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.core.auth import get_password_hash
from app.models.user import User, Tenant, UserRole
from app.models.student import Student, StudentStatus, Gender
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.subject import Subject
from app.models.department import Department
from app.models.attendance import StudentAttendance, StaffAttendance
from app.models.grade import Grade
from app.models.fee import FeeGroup, FeeType, FeeAssignment, FeeCollection
from app.models.notification import Notification
from app.models.timetable import Timetable
from app.models.guardian import Guardian
from app.models.leave import Leave

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

TENANT_ID = "demo-school"

print("🌱 Starting PreSkool ERP demo data seeder...")


# ─── Helper: idempotent upsert ────────────────────────────────────────────────
def get_or_create(model, defaults=None, **kwargs):
    obj = db.query(model).filter_by(**kwargs).first()
    if obj:
        return obj, False
    params = {**kwargs, **(defaults or {})}
    obj = model(**params)
    db.add(obj)
    db.flush()
    return obj, True


# ─── 1. Tenant ────────────────────────────────────────────────────────────────
tenant, created = get_or_create(Tenant, id=TENANT_ID,
    defaults={"name": "Demo School", "domain": "demo.preskool.local", "is_active": True})
if created: print("  ✅ Tenant created")


# ─── 2. Users ─────────────────────────────────────────────────────────────────
users_data = [
    {"email": "superadmin@demo.preskool.local", "full_name": "Super Admin",    "role": UserRole.SUPER_ADMIN.value, "password": "SuperAdmin@1234"},
    {"email": "admin@demo.preskool.local",       "full_name": "School Admin",   "role": UserRole.ADMIN.value,       "password": "Admin@1234"},
    {"email": "teacher1@demo.preskool.local",    "full_name": "Priya Sharma",   "role": UserRole.TEACHER.value,     "password": "Teacher@1234"},
    {"email": "teacher2@demo.preskool.local",    "full_name": "Arun Patel",     "role": UserRole.TEACHER.value,     "password": "Teacher@1234"},
    {"email": "student1@demo.preskool.local",    "full_name": "Rahul Kumar",    "role": UserRole.STUDENT.value,     "password": "Student@1234"},
    {"email": "student2@demo.preskool.local",    "full_name": "Sneha Gupta",    "role": UserRole.STUDENT.value,     "password": "Student@1234"},
    {"email": "student3@demo.preskool.local",    "full_name": "Amit Singh",     "role": UserRole.STUDENT.value,     "password": "Student@1234"},
    {"email": "parent@demo.preskool.local",      "full_name": "Rajesh Kumar",   "role": UserRole.PARENT.value,      "password": "Parent@1234"},
]
user_objs = {}
for u in users_data:
    pwd = u.pop("password")
    obj, created = get_or_create(User, email=u["email"],
        defaults={**u, "hashed_password": get_password_hash(pwd), "tenant_id": TENANT_ID,
                  "is_active": True, "is_verified": True})
    if created: print(f"  ✅ User: {obj.full_name} ({obj.role})")
    user_objs[obj.email] = obj
db.commit()


# ─── 3. Department ───────────────────────────────────────────────────────────
dept, _ = get_or_create(Department, name="Mathematics Department", tenant_id=TENANT_ID,
    defaults={"description": "Core sciences & math", "code": "MATH", "head_teacher_id": None})
db.commit()


# ─── 4. Teachers ─────────────────────────────────────────────────────────────
t1_user = user_objs["teacher1@demo.preskool.local"]
t2_user = user_objs["teacher2@demo.preskool.local"]

teacher1, created = get_or_create(Teacher, email="teacher1@demo.preskool.local", tenant_id=TENANT_ID,
    defaults={"employee_id": "TCH001", "first_name": "Priya", "last_name": "Sharma",
              "full_name": "Priya Sharma", "department_id": dept.id,
              "specialization": "Mathematics", "hire_date": date(2020, 6, 1),
              "status": "active", "phone": "9876543210"})
if created: print("  ✅ Teacher 1 profile")
teacher2, _ = get_or_create(Teacher, email="teacher2@demo.preskool.local", tenant_id=TENANT_ID,
    defaults={"employee_id": "TCH002", "first_name": "Arun", "last_name": "Patel",
              "full_name": "Arun Patel", "department_id": dept.id,
              "specialization": "Physics", "hire_date": date(2019, 7, 15),
              "status": "active", "phone": "9876543211"})
dept.head_teacher_id = teacher1.id
db.commit()


# ─── 5. Classes ──────────────────────────────────────────────────────────────
class10a, created = get_or_create(Class, name="Class 10-A", tenant_id=TENANT_ID,
    defaults={"grade_level": "10", "section": "A", "capacity": 40,
              "class_teacher_id": teacher1.id, "room_number": "A101", "academic_year": "2025-26"})
if created: print("  ✅ Class 10-A")
class9a, _ = get_or_create(Class, name="Class 9-A", tenant_id=TENANT_ID,
    defaults={"grade_level": "9", "section": "A", "capacity": 35,
              "class_teacher_id": teacher2.id, "room_number": "B201", "academic_year": "2025-26"})
db.commit()


# ─── 6. Subjects ─────────────────────────────────────────────────────────────
subjects_data = [
    ("Mathematics",      "MATH101", "#3D5EE1"),
    ("Physics",          "PHY101",  "#845EF7"),
    ("English",          "ENG101",  "#28A745"),
    ("Chemistry",        "CHEM101", "#FFC107"),
    ("Computer Science", "CS101",   "#17A2B8"),
]
subject_objs = {}
for name, code, color in subjects_data:
    s, created = get_or_create(Subject, code=code, tenant_id=TENANT_ID,
        defaults={"name": name, "description": f"{name} curriculum", "class_id": class10a.id,
                  "teacher_id": teacher1.id, "credits": 3})
    if created: print(f"  ✅ Subject: {name}")
    subject_objs[code] = s
db.commit()


# ─── 7. Students ─────────────────────────────────────────────────────────────
students_raw = [
    ("student1@demo.preskool.local", "STU001", "Rahul", "Kumar",   Gender.MALE,   class10a.id),
    ("student2@demo.preskool.local", "STU002", "Sneha", "Gupta",   Gender.FEMALE, class10a.id),
    ("student3@demo.preskool.local", "STU003", "Amit",  "Singh",   Gender.MALE,   class9a.id),
]
student_objs = []
for email, sid, fn, ln, gender, cls_id in students_raw:
    s, created = get_or_create(Student, student_id=sid, tenant_id=TENANT_ID,
        defaults={"first_name": fn, "last_name": ln, "full_name": f"{fn} {ln}",
                  "date_of_birth": date(2008, 3, 15), "gender": gender,
                  "email": email, "phone": "9800000001",
                  "enrollment_date": date(2023, 6, 1),
                  "status": StudentStatus.ACTIVE, "class_id": cls_id,
                  "address": "123 Demo Street, Mumbai"})
    if created: print(f"  ✅ Student: {fn} {ln}")
    student_objs.append(s)
db.commit()


# ─── 8. Grades ───────────────────────────────────────────────────────────────
grade_data = [
    (student_objs[0], subject_objs["MATH101"], 87, 100, "A",  "Mid Term"),
    (student_objs[0], subject_objs["PHY101"],  74, 100, "B+", "Mid Term"),
    (student_objs[0], subject_objs["ENG101"],  91, 100, "A+", "Mid Term"),
    (student_objs[0], subject_objs["CHEM101"], 65, 100, "B",  "Mid Term"),
    (student_objs[0], subject_objs["CS101"],   95, 100, "A+", "Mid Term"),
    (student_objs[1], subject_objs["MATH101"], 78, 100, "B+", "Mid Term"),
    (student_objs[1], subject_objs["PHY101"],  82, 100, "A",  "Mid Term"),
    (student_objs[1], subject_objs["ENG101"],  89, 100, "A",  "Mid Term"),
    (student_objs[2], subject_objs["MATH101"], 62, 100, "C+", "Mid Term"),
    (student_objs[2], subject_objs["PHY101"],  55, 100, "C",  "Mid Term"),
]
for stu, sub, marks, total, grade_letter, term in grade_data:
    exists = db.query(Grade).filter_by(
        student_id=stu.id, subject_id=sub.id, term=term, tenant_id=TENANT_ID
    ).first()
    if not exists:
        g = Grade(student_id=stu.id, subject_id=sub.id,
                  marks_obtained=marks, total_marks=total, grade=grade_letter,
                  term=term, tenant_id=TENANT_ID, exam_date=date.today() - timedelta(days=30))
        db.add(g)
        print(f"  ✅ Grade: {stu.first_name} - {sub.name} = {grade_letter}")
db.commit()


# ─── 9. Attendance (last 10 days) ────────────────────────────────────────────
today = date.today()
for i in range(10):
    att_date = today - timedelta(days=i)
    if att_date.weekday() >= 5:  # Skip weekends
        continue
    for stu in student_objs:
        exists = db.query(StudentAttendance).filter_by(
            student_id=stu.id, date=att_date, tenant_id=TENANT_ID
        ).first()
        if not exists:
            att_status = "present" if i % 5 != 0 else "absent"
            db.add(StudentAttendance(
                student_id=stu.id, date=att_date,
                status=att_status, class_id=stu.class_id,
                marked_by_id=teacher1.id, tenant_id=TENANT_ID
            ))
db.commit()
print("  ✅ 10-day attendance records created")


# ─── 10. Fees ────────────────────────────────────────────────────────────────
fee_group, _ = get_or_create(FeeGroup, name="Annual Tuition 2025-26", tenant_id=TENANT_ID,
    defaults={"description": "Annual school fees", "academic_year": "2025-26", "is_active": True})
fee_type, _ = get_or_create(FeeType, name="Tuition Fee", tenant_id=TENANT_ID,
    defaults={"fee_group_id": fee_group.id, "amount": 30000,
              "due_date": date(2026, 3, 31), "class_id": class10a.id,
              "is_mandatory": True, "academic_year": "2025-26"})
# Assign fee to students
for stu in student_objs:
    exists = db.query(FeeAssignment).filter_by(student_id=stu.id, fee_type_id=fee_type.id).first()
    if not exists:
        db.add(FeeAssignment(student_id=stu.id, fee_type_id=fee_type.id,
                             status="pending", tenant_id=TENANT_ID))
# Fee collection for student 1 (paid)
if not db.query(FeeCollection).filter_by(student_id=student_objs[0].id, tenant_id=TENANT_ID).first():
    db.add(FeeCollection(
        student_id=student_objs[0].id, fee_type_id=fee_type.id,
        amount_paid=30000, payment_date=date(2026, 1, 10),
        payment_method="online", receipt_number="REC001",
        collected_by_id=user_objs["admin@demo.preskool.local"].id,
        tenant_id=TENANT_ID
    ))
db.commit()
print("  ✅ Fee structure and collections created")


# ─── 11. Notifications ───────────────────────────────────────────────────────
notifs = [
    ("Annual Day Celebration – March 20", "School annual day celebration for all students and parents."),
    ("Term 3 Exam Schedule Released",     "Final term examinations begin from March 15th."),
    ("Library Book Return Deadline",      "All library books must be returned by Feb 28th."),
    ("Sports Day Registration Open",      "Register your child for Annual Sports Day events."),
]
for title, msg in notifs:
    if not db.query(Notification).filter_by(title=title, tenant_id=TENANT_ID).first():
        db.add(Notification(
            title=title, message=msg, recipient_type="all",
            sender_id=user_objs["admin@demo.preskool.local"].id,
            tenant_id=TENANT_ID, is_read=False
        ))
db.commit()
print("  ✅ 4 notifications created")


# ─── 12. Guardian ────────────────────────────────────────────────────────────
g, created = get_or_create(Guardian, email="parent@demo.preskool.local", tenant_id=TENANT_ID,
    defaults={"first_name": "Rajesh", "last_name": "Kumar", "full_name": "Rajesh Kumar",
              "phone": "9800000099", "relation": "father",
              "address": "123 Demo Street, Mumbai"})
if created:
    # Link to student 1
    student_objs[0].guardian_id = g.id if hasattr(Student, 'guardian_id') else None
    print("  ✅ Guardian profile created")
db.commit()


print("\n" + "═" * 60)
print("✅ SEEDING COMPLETE!")
print("═" * 60)
print("\n📋 DEMO LOGIN CREDENTIALS:")
print("  Super Admin: superadmin@demo.preskool.local  / SuperAdmin@1234")
print("  Admin:       admin@demo.preskool.local        / Admin@1234")
print("  Teacher:     teacher1@demo.preskool.local     / Teacher@1234")
print("  Student:     student1@demo.preskool.local     / Student@1234")
print("  Parent:      parent@demo.preskool.local        / Parent@1234")
print("\n🚀 Start the backend: uvicorn app.main:app --reload")
print("🌐 Frontend:          npm run dev  (in /frontend)")
print("📖 Swagger UI:        http://localhost:8000/docs")
print("═" * 60)
