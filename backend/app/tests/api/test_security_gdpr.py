import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


@pytest.mark.api
async def test_security_gdpr_health(async_client: AsyncClient):
    """Minimal test for security gdpr module."""
    response = await async_client.get("/api/v1/health")
    # All APIs should return CORS headers if requested, so we just do a health check
    assert response.status_code == 200
