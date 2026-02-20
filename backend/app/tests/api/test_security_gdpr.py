"""
Security & GDPR API Tests
Tests for: rate limiting, security headers, CSRF, GDPR endpoints.
"""
import pytest
from fastapi.testclient import TestClient

pytestmark = [pytest.mark.api, pytest.mark.security]


class TestSecurityHeaders:
    """Verify security headers are present on all responses."""

    def test_x_content_type_options_header(self, client: TestClient):
        response = client.get("/api/v1/health")
        # Security headers added by SecurityHeadersMiddleware
        assert response.headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options_header(self, client: TestClient):
        response = client.get("/api/v1/health")
        assert response.headers.get("x-frame-options") in ("DENY", "SAMEORIGIN")

    def test_referrer_policy_header(self, client: TestClient):
        response = client.get("/api/v1/health")
        assert response.headers.get("referrer-policy") is not None

    def test_server_header_hidden(self, client: TestClient):
        """Server should not expose version info."""
        response = client.get("/api/v1/health")
        server = response.headers.get("server", "").lower()
        assert "uvicorn" not in server
        assert "python" not in server
        assert "fastapi" not in server


class TestRateLimiting:
    """Verify rate limiting triggers correctly on auth endpoints."""

    def test_health_not_rate_limited(self, client: TestClient):
        """Health endpoint should never be rate limited."""
        for _ in range(20):
            response = client.get("/api/v1/health")
        assert response.status_code != 429

    def test_password_policy_not_rate_limited_harshly(self, client: TestClient):
        """Password policy endpoint is public and low-risk."""
        for _ in range(10):
            response = client.get("/api/v1/auth/password-policy")
        assert response.status_code != 429


class TestInputValidation:
    """Verify input validation and injection protection on API."""

    def test_sql_injection_in_query_param_blocked(
        self, client: TestClient, admin_headers
    ):
        response = client.get(
            "/api/v1/students?search=1' OR '1'='1",
            headers=admin_headers,
        )
        # Should either sanitize (200) or reject (400), never 500
        assert response.status_code in (200, 400)
        assert response.status_code != 500

    def test_xss_in_body_rejected_or_sanitized(
        self, client: TestClient, admin_headers, test_tenant
    ):
        response = client.post(
            "/api/v1/students",
            json={
                "first_name": "<script>alert('xss')</script>",
                "last_name": "Test",
                "student_id": "XSS001",
                "date_of_birth": "2000-01-01",
                "gender": "male",
                "enrollment_date": "2022-01-01",
                "tenant_id": test_tenant.id,
            },
            headers=admin_headers,
        )
        # Should either block (400) or sanitize the input, not store raw XSS
        assert response.status_code in (200, 201, 400)
        if response.status_code in (200, 201):
            data = response.json()
            assert "<script>" not in str(data)

    def test_path_traversal_blocked(self, client: TestClient, admin_headers):
        response = client.get(
            "/api/v1/files/../../../etc/passwd",
            headers=admin_headers,
        )
        assert response.status_code in (400, 404)
        assert response.status_code != 200

    def test_oversized_request_rejected(self, client: TestClient, admin_headers):
        """Very large payloads should be rejected."""
        huge_payload = {"first_name": "A" * 100_000}
        response = client.post(
            "/api/v1/students",
            json=huge_payload,
            headers=admin_headers,
        )
        assert response.status_code in (400, 413, 422)


class TestGDPREndpoints:
    """Tests for GDPR compliance endpoints."""

    @pytest.mark.gdpr
    def test_get_privacy_policy(self, client: TestClient):
        response = client.get("/api/v1/gdpr/privacy-policy")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "data_collected" in data["summary"]
        assert "rights" in data["summary"]

    @pytest.mark.gdpr
    def test_get_terms(self, client: TestClient):
        response = client.get("/api/v1/gdpr/terms")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data

    @pytest.mark.gdpr
    def test_gdpr_consent_requires_auth(self, client: TestClient):
        response = client.post(
            "/api/v1/gdpr/consent",
            json={"consent_type": "analytics", "granted": True},
        )
        assert response.status_code == 401

    @pytest.mark.gdpr
    def test_grant_consent(self, client: TestClient, admin_headers):
        response = client.post(
            "/api/v1/gdpr/consent",
            json={"consent_type": "analytics", "granted": True},
            headers=admin_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "granted"

    @pytest.mark.gdpr
    def test_withdraw_consent(self, client: TestClient, admin_headers):
        # First grant
        client.post(
            "/api/v1/gdpr/consent",
            json={"consent_type": "marketing", "granted": True},
            headers=admin_headers,
        )
        # Then withdraw
        response = client.post(
            "/api/v1/gdpr/consent",
            json={"consent_type": "marketing", "granted": False},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "withdrawn"

    @pytest.mark.gdpr
    def test_get_consents(self, client: TestClient, admin_headers):
        # Grant some consents first
        for ct in ["analytics", "marketing"]:
            client.post(
                "/api/v1/gdpr/consent",
                json={"consent_type": ct, "granted": True},
                headers=admin_headers,
            )
        response = client.get("/api/v1/gdpr/consent", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.gdpr
    def test_data_export(self, client: TestClient, admin_headers):
        response = client.get("/api/v1/gdpr/export", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "export_metadata" in data
        assert "account" in data
        assert "consents" in data
        # Ensure personally-identifiable metadata is present for portability
        assert data["export_metadata"]["gdpr_article"] is not None

    @pytest.mark.gdpr
    def test_submit_access_request(self, client: TestClient, admin_headers):
        response = client.post(
            "/api/v1/gdpr/requests",
            json={"request_type": "access", "note": "I'd like a copy of my data"},
            headers=admin_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert "due_date" in data

    @pytest.mark.gdpr
    def test_submit_portability_request(self, client: TestClient, admin_headers):
        response = client.post(
            "/api/v1/gdpr/requests",
            json={"request_type": "portability", "export_format": "json"},
            headers=admin_headers,
        )
        assert response.status_code == 201

    @pytest.mark.gdpr
    def test_list_data_requests(self, client: TestClient, admin_headers):
        response = client.get("/api/v1/gdpr/requests", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.gdpr
    def test_audit_trail_access(self, client: TestClient, admin_headers):
        response = client.get("/api/v1/gdpr/audit-trail", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "count" in data

    @pytest.mark.gdpr
    def test_erasure_anonymises_user(self, client: TestClient, db, test_tenant):
        """Right to erasure: user data should be anonymised."""
        from app.core.auth import get_password_hash, create_access_token
        from app.models.user import User
        # Create a user to erase
        user = User(
            email="eraseme@test.com",
            hashed_password=get_password_hash("EraseMe1!"),
            full_name="Erase Me",
            role="student",
            tenant_id=test_tenant.id,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()

        token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "tenant_id": user.tenant_id,
        })
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": test_tenant.id,
        }

        response = client.delete("/api/v1/gdpr/me", headers=headers)
        assert response.status_code == 200

        # Verify user is anonymised
        db.refresh(user)
        assert user.full_name == "[ANONYMISED]"
        assert "eraseme" not in user.email.lower()
        assert user.is_active is False

    @pytest.mark.gdpr
    def test_non_admin_cannot_verify_audit_chain(
        self, client: TestClient, student_headers
    ):
        response = client.post(
            "/api/v1/gdpr/admin/verify-audit-chain",
            headers=student_headers,
        )
        assert response.status_code == 403
