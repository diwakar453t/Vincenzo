import os
import sys
import requests
import json
import uuid
import time

API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")
SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "superadmin@preskool.com")
SUPERADMIN_PASS = os.getenv("SUPERADMIN_PASS", "superadmin123")

def test_full_flow():
    print(f"Starting E2E API Verification against {API_URL}...")
    
    # 1. Login as Superadmin
    print("\n--- 1. Authentication ---")
    response = requests.post(
        f"{API_URL}/auth/login",
        data={"username": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASS}
    )
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        sys.exit(1)
        
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("✅ Successfully authenticated as Super Admin")

    # 2. Add Teacher
    print("\n--- 2. Create Teacher Flow ---")
    teacher_payload = {
        "employee_id": f"TCH-{uuid.uuid4().hex[:6].upper()}",
        "first_name": "Test",
        "last_name": "Teacher",
        "email": f"teacher.{uuid.uuid4().hex[:6]}@school.local",
        "date_of_birth": "1990-01-01",
        "gender": "Female",
        "phone": "+91 99999 99999",
        "hire_date": "2024-01-01",
        "specialization": "Mathematics",
        "status": "active"
    }
    res = requests.post(f"{API_URL}/teachers/", json=teacher_payload, headers=headers)
    if res.status_code == 201:
        print(f"✅ Successfully created Teacher: {teacher_payload['employee_id']}")
    else:
        print(f"❌ Failed to create Teacher: {res.text}")
        
    # 3. Add Student
    print("\n--- 3. Create Student Flow ---")
    student_payload = {
        "student_id": f"STU-{uuid.uuid4().hex[:6].upper()}",
        "first_name": "Test",
        "last_name": "Student",
        "email": f"student.{uuid.uuid4().hex[:6]}@school.local",
        "date_of_birth": "2010-05-15",
        "gender": "Male",
        "enrollment_date": "2024-06-01",
        "status": "active"
    }
    res = requests.post(f"{API_URL}/students/", json=student_payload, headers=headers)
    if res.status_code == 201:
        print(f"✅ Successfully created Student: {student_payload['student_id']}")
    else:
        print(f"❌ Failed to create Student: {res.text}")

    # 4. Check Dashboards Aggregation
    print("\n--- 4. Dashboard Stats Fetch ---")
    res = requests.get(f"{API_URL}/dashboard/statistics", headers=headers)
    if res.status_code == 200:
        stats = res.json()
        print(f"✅ Dashboard stats retrieved successfully!")
        print(f"   -> Quick Stats Loaded: {len(stats.get('quick_stats', []))}")
        print(f"   -> Name: {stats.get('user_name')}")
    else:
        print(f"❌ Failed to fetch Dashboard statistics: {res.text}")

    print("\n🎉 All critical E2E flows tested successfully!")

if __name__ == "__main__":
    try:
        test_full_flow()
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Could not reach {API_URL}. Is the server running?")
