#!/usr/bin/env python3
"""
PreSkool ERP — Initial Seed Data Script
========================================
Creates the demo-school tenant, superadmin user, admin user,
a sample teacher, and a sample student for end-to-end testing.

Run AFTER `alembic upgrade head`:
    cd backend
    python seeds/seed_initial_data.py
"""

import sys
import os
from pathlib import Path
from datetime import date

# Ensure the backend app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.core.auth import get_password_hash
from app.models.user import User, Tenant, UserRole
from app.models.student import Student, StudentStatus
from app.models.teacher import Teacher
import app.models  # noqa: F401 — ensures all models are registered

PRIMARY_TENANT_ID = "demo-school"
PRIMARY_TENANT_NAME = "Demo School"

SUPERADMIN_EMAIL = "superadmin@preskool.com"
SUPERADMIN_PASSWORD = "SuperAdmin@1234"

ADMIN_EMAIL = "admin@demo-school.com"
ADMIN_PASSWORD = "Admin@1234"

TEACHER_EMAIL = "teacher@demo-school.com"
TEACHER_PASSWORD = "Teacher@1234"

STUDENT_EMAIL = "student@demo-school.com"
STUDENT_PASSWORD = "Student@1234"

PARENT_EMAIL = "parent@demo-school.com"
PARENT_PASSWORD = "Parent@1234"


def seed_all():
    db = SessionLocal()
    try:
        print("🌱 Starting seed process...")

        # ── 1. Ensure tables exist (SQLite dev only) ───────────────────
        is_sqlite = settings.DATABASE_URL.startswith("sqlite")
        if is_sqlite:
            Base.metadata.create_all(bind=engine)
            print("💾 SQLite tables created/verified")

        # ── 2. Tenant ────────────────────────────────────────────────────
        tenant = db.query(Tenant).filter(Tenant.id == PRIMARY_TENANT_ID).first()
        if not tenant:
            tenant = Tenant(
                id=PRIMARY_TENANT_ID,
                name=PRIMARY_TENANT_NAME,
                domain="demo-school.preskool.com",
                is_active=True,
            )
            db.add(tenant)
            db.commit()
            print(f"  ✅ Tenant created: {PRIMARY_TENANT_ID}")
        else:
            print(f"  ⏭  Tenant already exists: {PRIMARY_TENANT_ID}")

        # ── Helper: create user if not exists ────────────────────────────
        def upsert_user(email: str, password: str, full_name: str, role: str) -> User:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash(password),
                    full_name=full_name,
                    role=role,
                    tenant_id=PRIMARY_TENANT_ID,
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"  ✅ User created: {email} [{role}]")
            else:
                print(f"  ⏭  User already exists: {email}")
            return user

        # ── 3. Super Admin (no tenant enforced — global) ─────────────────
        upsert_user(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, "Super Admin", UserRole.SUPER_ADMIN.value)

        # ── 4. Admin ─────────────────────────────────────────────────────
        upsert_user(ADMIN_EMAIL, ADMIN_PASSWORD, "School Admin", UserRole.ADMIN.value)

        # ── 5. Sample Teacher User ────────────────────────────────────────
        teacher_user = upsert_user(TEACHER_EMAIL, TEACHER_PASSWORD, "Jane Smith", UserRole.TEACHER.value)

        # ── 6. Sample Student User ────────────────────────────────────────
        student_user = upsert_user(STUDENT_EMAIL, STUDENT_PASSWORD, "John Doe", UserRole.STUDENT.value)

        # ── 7. Sample Parent User ─────────────────────────────────────────
        upsert_user(PARENT_EMAIL, PARENT_PASSWORD, "Parent Doe", UserRole.PARENT.value)

        # ── 8. Teacher record ─────────────────────────────────────────────
        existing_teacher = (
            db.query(Teacher)
            .filter(Teacher.employee_id == "EMP001", Teacher.tenant_id == PRIMARY_TENANT_ID)
            .first()
        )
        if not existing_teacher:
            teacher = Teacher(
                employee_id="EMP001",
                first_name="Jane",
                last_name="Smith",
                date_of_birth=date(1985, 3, 20),
                gender="female",
                phone="0000000001",
                specialization="Mathematics",
                hire_date=date.today(),
                status="active",
                tenant_id=PRIMARY_TENANT_ID,
                user_id=teacher_user.id,
            )
            db.add(teacher)
            db.commit()
            print("  ✅ Teacher record created: Jane Smith (EMP001)")
        else:
            print("  ⏭  Teacher already exists: EMP001")

        # ── 9. Student record ─────────────────────────────────────────────
        existing_student = (
            db.query(Student)
            .filter(Student.student_id == "STU001", Student.tenant_id == PRIMARY_TENANT_ID)
            .first()
        )
        if not existing_student:
            student = Student(
                student_id="STU001",
                first_name="John",
                last_name="Doe",
                date_of_birth=date(2005, 6, 15),
                gender="male",
                email=STUDENT_EMAIL,
                phone="0000000002",
                enrollment_date=date.today(),
                status=StudentStatus.ACTIVE.value,
                tenant_id=PRIMARY_TENANT_ID,
            )
            db.add(student)
            db.commit()
            print("  ✅ Student record created: John Doe (STU001)")
        else:
            print("  ⏭  Student already exists: STU001")

        print("\n" + "=" * 60)
        print("✅ Seed complete! Login credentials:")
        print("=" * 60)
        print(f"  Super Admin : {SUPERADMIN_EMAIL} / {SUPERADMIN_PASSWORD}")
        print(f"  Admin       : {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"  Teacher     : {TEACHER_EMAIL} / {TEACHER_PASSWORD}")
        print(f"  Student     : {STUDENT_EMAIL} / {STUDENT_PASSWORD}")
        print(f"  Parent      : {PARENT_EMAIL} / {PARENT_PASSWORD}")
        print("=" * 60)
        print(f"  Tenant ID   : {PRIMARY_TENANT_ID}")
        print("  Use X-Tenant-ID header or ?tenant_id=demo-school in API calls")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
