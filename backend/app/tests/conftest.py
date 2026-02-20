"""
Shared pytest fixtures and configuration for PreSkool ERP test suite.

Fixture hierarchy:
  engine  (session-scoped)  — SQLite in-memory engine
    └── db  (function-scoped)  — DB session with rollback after each test
          └── client  (function-scoped)  — TestClient with auth headers
                └── auth_headers  — JWT tokens for each role

Test factories (Factory Boy):
  UserFactory, StudentFactory, TenantFactory, etc.
"""
import os
import pytest
from datetime import datetime, timezone
from typing import Generator, Dict, Any

# Set test environment BEFORE any app imports
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_preskool.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only-32bytes!")
os.environ.setdefault("ENCRYPTION_MASTER_KEY", "test-encryption-key-for-testing-only!!")
os.environ.setdefault("OTEL_ENABLED", "False")
os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "100000")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.core.database import Base, get_db
from app.core.auth import get_password_hash, create_access_token
from app.main import app
from app.models.user import User, Tenant, UserRole
from app.models.student import Student, StudentStatus, Gender


# ═══════════════════════════════════════════════════════════════════════
# DATABASE FIXTURES
# ═══════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def engine():
    """Session-scoped SQLite engine for fast in-memory tests."""
    engine = create_engine(
        "sqlite:///./test_preskool.db",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    # Cleanup test DB file
    import os
    try:
        os.remove("./test_preskool.db")
    except FileNotFoundError:
        pass


@pytest.fixture(scope="function")
def db(engine) -> Generator[Session, None, None]:
    """
    Function-scoped DB session with automatic rollback.
    Each test gets a clean transaction that's rolled back at the end.
    This is faster than recreating tables every test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(bind=connection, autoflush=False)
    session = TestSession()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ═══════════════════════════════════════════════════════════════════════
# TEST DATA FACTORIES
# ═══════════════════════════════════════════════════════════════════════

@pytest.fixture
def test_tenant(db: Session) -> Tenant:
    """Create a test tenant."""
    tenant = Tenant(
        id="test-college",
        name="Test College",
        domain="test-college.preskool.local",
        is_active=True,
    )
    db.add(tenant)
    db.flush()
    return tenant


@pytest.fixture
def test_admin(db: Session, test_tenant: Tenant) -> User:
    """Create an admin test user."""
    user = User(
        email="admin@test-college.com",
        hashed_password=get_password_hash("AdminPass1!"),
        full_name="Test Admin",
        role=UserRole.ADMIN,
        tenant_id=test_tenant.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def test_teacher(db: Session, test_tenant: Tenant) -> User:
    """Create a teacher test user."""
    user = User(
        email="teacher@test-college.com",
        hashed_password=get_password_hash("TeacherPass1!"),
        full_name="Test Teacher",
        role=UserRole.TEACHER,
        tenant_id=test_tenant.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def test_student_user(db: Session, test_tenant: Tenant) -> User:
    """Create a student user account."""
    user = User(
        email="student@test-college.com",
        hashed_password=get_password_hash("StudentPass1!"),
        full_name="Test Student",
        role=UserRole.STUDENT,
        tenant_id=test_tenant.id,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def test_student(db: Session, test_tenant: Tenant) -> Student:
    """Create a student record."""
    from datetime import date
    student = Student(
        student_id="STU001",
        first_name="Alice",
        last_name="Smith",
        date_of_birth=date(2000, 5, 15),
        gender=Gender.FEMALE,
        email="alice@test-college.com",
        phone="+91-9876543210",
        enrollment_date=date(2022, 7, 1),
        status=StudentStatus.ACTIVE,
        tenant_id=test_tenant.id,
    )
    db.add(student)
    db.flush()
    return student


# ═══════════════════════════════════════════════════════════════════════
# AUTH FIXTURES
# ═══════════════════════════════════════════════════════════════════════

def _make_token(user: User) -> str:
    """Generate a real JWT for a user."""
    return create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tenant_id": user.tenant_id,
    })


@pytest.fixture
def admin_token(test_admin: User) -> str:
    return _make_token(test_admin)


@pytest.fixture
def teacher_token(test_teacher: User) -> str:
    return _make_token(test_teacher)


@pytest.fixture
def student_token(test_student_user: User) -> str:
    return _make_token(test_student_user)


@pytest.fixture
def admin_headers(admin_token: str, test_tenant: Tenant) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {admin_token}",
        "X-Tenant-ID": test_tenant.id,
        "Content-Type": "application/json",
    }


@pytest.fixture
def teacher_headers(teacher_token: str, test_tenant: Tenant) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {teacher_token}",
        "X-Tenant-ID": test_tenant.id,
        "Content-Type": "application/json",
    }


@pytest.fixture
def student_headers(student_token: str, test_tenant: Tenant) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {student_token}",
        "X-Tenant-ID": test_tenant.id,
        "Content-Type": "application/json",
    }


# ═══════════════════════════════════════════════════════════════════════
# HTTP CLIENT FIXTURES
# ═══════════════════════════════════════════════════════════════════════

@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Synchronous TestClient with DB dependency override.
    Auth headers injected per-test via admin_headers fixture.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass  # Rollback handled by db fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(db: Session) -> AsyncClient:
    """Async HTTP client for async endpoint testing."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════
# UTILITY FIXTURES
# ═══════════════════════════════════════════════════════════════════════

@pytest.fixture
def faker_instance():
    """Faker instance for generating realistic test data."""
    from faker import Faker
    return Faker("en_IN")  # Indian locale for realistic data


@pytest.fixture
def mock_redis(mocker):
    """Mock Redis to avoid real Redis dependency in unit tests."""
    mock = mocker.MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = 1
    return mock


@pytest.fixture(autouse=True)
def reset_security_state():
    """Reset rate limiter and lockout state between tests."""
    from app.core.security import _rate_limiter, account_lockout
    _rate_limiter._ip_buckets.clear()
    _rate_limiter._tenant_buckets.clear()
    _rate_limiter._endpoint_buckets.clear()
    account_lockout._attempts.clear()
    yield
    # Clean up after test
    _rate_limiter._ip_buckets.clear()
    account_lockout._attempts.clear()
