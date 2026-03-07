import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


@pytest.mark.api
async def test_students_api_health(async_client: AsyncClient):
    """Minimal test to ensure api client works."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    assert "status" in response.json()
