import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


@pytest.mark.integration
async def test_auth_login_fail(async_client: AsyncClient):
    """Minimal auth integration test using httpx AsyncClient as requested."""
    response = await async_client.post(
        "/api/v1/auth/login", json={"email": "nonexistent@test.com", "password": "fake"}
    )
    # Expecting 401 or 400 for bad login
    assert response.status_code in (401, 400, 422)
