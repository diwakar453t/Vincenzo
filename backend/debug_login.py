import sys

sys.path.append(".")
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("sqlite:///./debug_test.db")
TestSession = sessionmaker(bind=engine)


def override_get_db():
    db = TestSession()
    yield db
    db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
client.post(
    "/api/v1/auth/register",
    json={
        "email": "admin@test.com",
        "password": "AdminPass1!",
        "full_name": "A",
        "tenant_id": "test",
    },
    headers={"X-Tenant-ID": "test"},
)

resp = client.post(
    "/api/v1/auth/login",
    json={"email": "admin@test.com", "password": "AdminPass1!"},
    headers={"X-Tenant-ID": "test"},
)
print("STATUS:", resp.status_code)
print("BODY:", resp.text)
