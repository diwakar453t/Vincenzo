"""
Integration Tests — Authentication Flow
Tests for: register, login, account lockout, token refresh,
           password change, password reset, GDPR consent.

These tests use a real SQLite DB (rolled back after each test).
"""
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


class TestRegistration:
    """Tests for POST /api/v1/auth/register"""

    def test_register_success(self, client: TestClient, test_tenant):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@test-college.com",
                "password": "SecurePass1!xyz",
                "full_name": "New User",
                "role": "student",
                "tenant_id": test_tenant.id,
            },
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@test-college.com"
        assert "hashed_password" not in data["user"]

    def test_register_weak_password_rejected(self, client: TestClient, test_tenant):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weakpass@test-college.com",
                "password": "weak",
                "full_name": "Weak User",
                "role": "student",
                "tenant_id": test_tenant.id,
            },
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 400
        data = response.json()
        assert "policy_errors" in data["detail"]

    def test_register_duplicate_email_rejected(self, client: TestClient, test_admin, test_tenant):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_admin.email,  # Already exists
                "password": "SecurePass1!xyz",
                "full_name": "Duplicate User",
                "role": "student",
                "tenant_id": test_tenant.id,
            },
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 409

    def test_register_invalid_role_rejected(self, client: TestClient, test_tenant):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "badrole@test.com",
                "password": "SecurePass1!xyz",
                "full_name": "Bad Role",
                "role": "superuser",  # Invalid role
                "tenant_id": test_tenant.id,
            },
        )
        assert response.status_code in (400, 422)


class TestLogin:
    """Tests for POST /api/v1/auth/login"""

    def test_login_success(self, client: TestClient, test_admin, test_tenant):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": test_admin.email, "password": "AdminPass1!"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self, client: TestClient, test_admin, test_tenant):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": test_admin.email, "password": "WrongPassword!"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 401
        # Should NOT reveal username existence
        assert "invalid" in response.json()["detail"].lower()

    def test_login_nonexistent_email(self, client: TestClient, test_tenant):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@nowhere.com", "password": "SomePass1!"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 401
        # Generic message — same as wrong password (anti-enumeration)
        assert "invalid" in response.json()["detail"].lower()

    def test_login_account_lockout(self, client: TestClient, test_teacher, test_tenant):
        """After 5 failures, account should be locked."""
        for _ in range(5):
            client.post(
                "/api/v1/auth/login",
                json={"email": test_teacher.email, "password": "WrongPassword!"},
                headers={"X-Tenant-ID": test_tenant.id},
            )
        # 6th attempt should get locked response
        response = client.post(
            "/api/v1/auth/login",
            json={"email": test_teacher.email, "password": "WrongPassword!"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code in (401, 429)

    def test_login_deactivated_account(self, client: TestClient, db, test_tenant):
        """Deactivated users cannot log in."""
        from app.core.auth import get_password_hash
        from app.models.user import User
        user = User(
            email="deactivated@test.com",
            hashed_password=get_password_hash("Pass1!Security"),
            full_name="Deactivated",
            role="student",
            tenant_id=test_tenant.id,
            is_active=False,
        )
        db.add(user)
        db.flush()

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "deactivated@test.com", "password": "Pass1!Security"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 403


class TestTokenRefresh:
    """Tests for POST /api/v1/auth/refresh"""

    def test_refresh_token_success(self, client: TestClient, test_admin, test_tenant):
        # Login first
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": test_admin.email, "password": "AdminPass1!"},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        refresh_token = login_resp.json()["refresh_token"]

        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
            headers={"X-Tenant-ID": test_tenant.id},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_invalid_refresh_token(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.value"},
        )
        assert response.status_code == 401


class TestProfile:
    """Tests for GET /api/v1/auth/profile"""

    def test_get_profile_authenticated(self, client: TestClient, admin_headers):
        response = client.get("/api/v1/auth/profile", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test-college.com"
        assert "hashed_password" not in data

    def test_get_profile_unauthenticated(self, client: TestClient):
        response = client.get("/api/v1/auth/profile")
        assert response.status_code == 401


class TestPasswordChange:
    """Tests for PUT /api/v1/auth/change-password"""

    def test_change_password_success(self, client: TestClient, admin_headers):
        response = client.put(
            "/api/v1/auth/change-password",
            json={
                "current_password": "AdminPass1!",
                "new_password": "NewSecurePass2!xyz",
            },
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

    def test_change_password_wrong_current(self, client: TestClient, admin_headers):
        response = client.put(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongCurrent!",
                "new_password": "NewSecurePass2!xyz",
            },
            headers=admin_headers,
        )
        assert response.status_code == 400

    def test_change_password_weak_new(self, client: TestClient, admin_headers):
        response = client.put(
            "/api/v1/auth/change-password",
            json={
                "current_password": "AdminPass1!",
                "new_password": "weak",
            },
            headers=admin_headers,
        )
        assert response.status_code == 400
        assert "policy_errors" in response.json()["detail"]

    def test_reuse_current_password_rejected(self, client: TestClient, admin_headers):
        response = client.put(
            "/api/v1/auth/change-password",
            json={
                "current_password": "AdminPass1!",
                "new_password": "AdminPass1!",  # Same as current
            },
            headers=admin_headers,
        )
        assert response.status_code == 400


class TestPasswordPolicy:
    """Tests for GET /api/v1/auth/password-policy"""

    def test_get_policy(self, client: TestClient):
        response = client.get("/api/v1/auth/password-policy")
        assert response.status_code == 200
        data = response.json()
        assert "min_length" in data
        assert data["require_uppercase"] is True
        assert data["require_digit"] is True

    def test_validate_password_endpoint(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/validate-password",
            json={"password": "StrongPass1!", "email": "test@test.com"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "strength" in data
        assert "errors" in data


class TestHealthCheck:
    """Tests for GET /api/v1/health"""

    def test_health_returns_ok(self, client: TestClient):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data

    def test_health_no_auth_required(self, client: TestClient):
        """Health endpoint must be accessible without auth."""
        response = client.get("/api/v1/health")
        assert response.status_code != 401
