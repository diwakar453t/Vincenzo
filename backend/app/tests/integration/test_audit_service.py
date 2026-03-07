import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

@pytest.mark.integration
async def test_audit_health(async_client: AsyncClient):
    """Minimal audit integration test."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
