"""Database seeding utilities for PreSkool ERP."""
import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import Tenant, User, UserRole
from app.core.auth import get_password_hash


async def seed_tenants(db: Session):
    """Seed initial tenant data."""
    tenants_data = [
        {"id": "demo-school", "name": "Demo School", "domain": "demo.preskool.local"},
        {"id": "test-college", "name": "Test College", "domain": "test.preskool.local"},
    ]
    
    for tenant_data in tenants_data:
        existing = db.query(Tenant).filter_by(id=tenant_data["id"]).first()
        if not existing:
            tenant = Tenant(**tenant_data, is_active=True)
            db.add(tenant)
    
    db.commit()
    print("✓ Tenants seeded successfully")


async def seed_admin_users(db: Session):
    """Seed initial admin users for each tenant."""
    users_data = [
        {
            "tenant_id": "demo-school",
            "email": "admin@demo.preskool.local",
            "password": "Admin@123",  # Change this in production!
            "full_name": "Demo Admin",
            "role": UserRole.ADMIN,
        },
        {
            "tenant_id": "test-college",
            "email": "admin@test.preskool.local",
            "password": "Admin@123",  # Change this in production!
            "full_name": "Test Admin",
            "role": UserRole.ADMIN,
        },
    ]
    
    for user_data in users_data:
        existing = db.query(User).filter_by(email=user_data["email"]).first()
        if not existing:
            password = user_data.pop("password")
            user = User(
                **user_data,
                hashed_password=get_password_hash(password),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
    
    db.commit()
    print("✓ Admin users seeded successfully")


async def run_seeds():
    """Run all database seeds."""
    db = SessionLocal()
    try:
        print("Starting database seeding...")
        await seed_tenants(db)
        await seed_admin_users(db)
        print("✅ Database seeding completed!")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_seeds())
