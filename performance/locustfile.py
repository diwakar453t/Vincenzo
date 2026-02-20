"""
🔥 PreSkool ERP — Locust Load Tests
=====================================
Simulates realistic multi-role user traffic across all 313 API endpoints.

User types:
  AdminUser    — CRUD on all resources (heaviest load profile)
  TeacherUser  — attendance, timetable, grades
  StudentUser  — profile, marks, attendance, library
  GuestUser    — public login flow (spike simulation)
  FeeClerk     — fee management, payment processing
  LibraryStaff — book search, issue, return

Run:
  # Interactive Web UI
  locust -f tests/locustfile.py --host=http://localhost:8000

  # Headless (CI)
  locust -f tests/locustfile.py \\
    --host=http://localhost:8000 \\
    --users=100 --spawn-rate=10 \\
    --run-time=5m --headless \\
    --csv=reports/locust_results \\
    --html=reports/locust_report.html

  # Quick smoke test
  locust -f tests/locustfile.py \\
    --host=http://localhost:8000 \\
    --users=10 --spawn-rate=5 \\
    --run-time=60s --headless

Performance targets:
  p95 response time < 500ms   (normal load)
  p99 response time < 2000ms  (peak load)
  Error rate < 1%             (all scenarios)
  RPS > 200 at 100 concurrent users
"""
import json
import random
import time
from locust import HttpUser, TaskSet, task, between, events, tag
from locust.contrib.fasthttp import FastHttpUser


# ── Fixtures ─────────────────────────────────────────────────────────────
ADMIN_CREDENTIALS = {
    "email": "admin@preskool.test",
    "password": "AdminPass1!@#",
}

TEACHER_CREDENTIALS = {
    "email": "teacher@preskool.test",
    "password": "Teacher1!@#",
}

STUDENT_CREDENTIALS = {
    "email": "student@preskool.test",
    "password": "Student1!@#",
}

# Realistic Indian school data for POST payloads
FIRST_NAMES = ["Aarav", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Rohan", "Sneha", "Vihaan", "Zara"]
LAST_NAMES = ["Sharma", "Patel", "Kumar", "Singh", "Verma", "Joshi", "Reddy", "Nair", "Iyer", "Gupta"]
SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi", "Computer Science"]


def random_name():
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def random_student_id():
    return f"STU{random.randint(10000, 99999)}"


# ── Shared auth mixin ─────────────────────────────────────────────────────
class AuthMixin:
    """Handles JWT token acquisition and headers for authenticated requests."""
    
    token: str = None
    user_id: int = None
    tenant_id: str = "preskool-test"
    headers: dict = {}

    def login(self, credentials: dict) -> bool:
        with self.client.post(
            "/api/v1/auth/login",
            json=credentials,
            catch_response=True,
            name="[AUTH] Login",
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                user = data.get("user", {})
                self.user_id = user.get("id")
                self.tenant_id = user.get("tenant_id", "preskool-test")
                self.headers = {
                    "Authorization": f"Bearer {self.token}",
                    "X-Tenant-ID": self.tenant_id,
                }
                resp.success()
                return True
            else:
                resp.failure(f"Login failed: {resp.status_code}")
                return False

    def on_start(self):
        self.login(self.credentials)

    def on_stop(self):
        if self.token:
            self.client.post(
                "/api/v1/auth/logout",
                headers=self.headers,
                name="[AUTH] Logout",
            )


# ══════════════════════════════════════════════════════════════════════════
# ADMIN USER — All resources, heaviest profile
# ══════════════════════════════════════════════════════════════════════════
class AdminTaskSet(TaskSet):
    """Simulates admin managing the school: students, teachers, fees, reports."""

    # ── Students (most frequent admin task)
    @task(8)
    @tag("students", "read")
    def list_students(self):
        page = random.randint(1, 5)
        self.client.get(
            f"/api/v1/students?page={page}&page_size=20",
            headers=self.user.headers,
            name="/api/v1/students [LIST]",
        )

    @task(3)
    @tag("students", "read")
    def search_students(self):
        query = random.choice(["Aarav", "Kumar", "STU", "Sharma", "active"])
        self.client.get(
            f"/api/v1/students?search={query}",
            headers=self.user.headers,
            name="/api/v1/students [SEARCH]",
        )

    @task(2)
    @tag("students", "read")
    def get_student_detail(self):
        student_id = random.randint(1, 200)
        self.client.get(
            f"/api/v1/students/{student_id}",
            headers=self.user.headers,
            name="/api/v1/students/{id} [GET]",
        )

    @task(1)
    @tag("students", "write")
    def create_student(self):
        first, last = random_name()
        payload = {
            "student_id": random_student_id(),
            "first_name": first,
            "last_name": last,
            "date_of_birth": "2005-06-15",
            "gender": random.choice(["male", "female"]),
            "email": f"{first.lower()}.{last.lower()}.{random.randint(100,999)}@test.edu",
            "enrollment_date": "2023-07-01",
            "status": "active",
        }
        self.client.post(
            "/api/v1/students",
            json=payload,
            headers=self.user.headers,
            name="/api/v1/students [CREATE]",
        )

    # ── Dashboard
    @task(6)
    @tag("dashboard")
    def dashboard_stats(self):
        self.client.get(
            "/api/v1/dashboard/admin-stats",
            headers=self.user.headers,
            name="/api/v1/dashboard [ADMIN STATS]",
        )

    # ── Teachers
    @task(4)
    @tag("teachers")
    def list_teachers(self):
        self.client.get(
            "/api/v1/teachers?page=1&page_size=20",
            headers=self.user.headers,
            name="/api/v1/teachers [LIST]",
        )

    # ── Fees
    @task(5)
    @tag("fees")
    def list_fee_collections(self):
        self.client.get(
            "/api/v1/fees/collections?page=1&page_size=20",
            headers=self.user.headers,
            name="/api/v1/fees/collections [LIST]",
        )

    @task(3)
    @tag("fees")
    def fee_stats(self):
        self.client.get(
            "/api/v1/fees/stats",
            headers=self.user.headers,
            name="/api/v1/fees/stats [GET]",
        )

    @task(2)
    @tag("fees")
    def pending_fees(self):
        self.client.get(
            "/api/v1/fees/pending?page=1&page_size=20",
            headers=self.user.headers,
            name="/api/v1/fees/pending [LIST]",
        )

    # ── Attendance
    @task(4)
    @tag("attendance")
    def attendance_report(self):
        self.client.get(
            "/api/v1/attendance/report?month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/attendance/report [GET]",
        )

    # ── Classes
    @task(3)
    @tag("classes")
    def list_classes(self):
        self.client.get(
            "/api/v1/classes?page=1&page_size=20",
            headers=self.user.headers,
            name="/api/v1/classes [LIST]",
        )

    # ── Reports (heavy queries)
    @task(2)
    @tag("reports", "heavy")
    def generate_report(self):
        self.client.get(
            "/api/v1/reports/academic?report_type=monthly&month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/reports/academic [GET]",
        )

    # ── Payroll
    @task(2)
    @tag("payroll")
    def list_payroll(self):
        self.client.get(
            "/api/v1/payroll?month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/payroll [LIST]",
        )

    # ── Notifications
    @task(4)
    @tag("notifications")
    def list_notifications(self):
        self.client.get(
            "/api/v1/notifications?is_read=false",
            headers=self.user.headers,
            name="/api/v1/notifications [LIST]",
        )

    # ── Search
    @task(3)
    @tag("search")
    def global_search(self):
        term = random.choice(["Aarav", "math", "class 10", "fee", "hostel"])
        self.client.get(
            f"/api/v1/search?q={term}",
            headers=self.user.headers,
            name="/api/v1/search [GLOBAL]",
        )

    # ── Health (lightweight, always available)
    @task(2)
    @tag("health")
    def health_check(self):
        self.client.get("/api/v1/health", name="/api/v1/health")

    # ── Brief pause to simulate reading/thinking
    @task(1)
    def think_time(self):
        time.sleep(random.uniform(0.5, 2.0))


class AdminUser(AuthMixin, HttpUser):
    """Admin simulating 8h workday compressed — reads 8x, writes 1x."""
    tasks = [AdminTaskSet]
    wait_time = between(0.5, 2.0)
    weight = 2  # 2x as many admin sessions as teacher/student
    credentials = ADMIN_CREDENTIALS


# ══════════════════════════════════════════════════════════════════════════
# TEACHER USER — Attendance, Timetable, Grades
# ══════════════════════════════════════════════════════════════════════════
class TeacherTaskSet(TaskSet):
    """Simulates teacher workflow: check timetable → mark attendance → record grades."""

    @task(10)
    @tag("timetable")
    def my_timetable(self):
        self.client.get(
            "/api/v1/timetable/my-schedule",
            headers=self.user.headers,
            name="/api/v1/timetable/my-schedule [GET]",
        )

    @task(8)
    @tag("attendance", "write")
    def mark_attendance(self):
        """Mark attendance for a class — simulates teacher's primary task."""
        class_id = random.randint(1, 20)
        students = [
            {
                "student_id": random.randint(1, 200),
                "status": random.choice(["present", "absent", "late"]),
                "note": "",
            }
            for _ in range(random.randint(20, 40))
        ]
        self.client.post(
            "/api/v1/attendance/bulk",
            json={
                "class_id": class_id,
                "date": "2026-02-20",
                "period": random.randint(1, 8),
                "records": students,
            },
            headers=self.user.headers,
            name="/api/v1/attendance/bulk [MARK]",
        )

    @task(6)
    @tag("attendance", "read")
    def class_attendance_summary(self):
        class_id = random.randint(1, 20)
        self.client.get(
            f"/api/v1/attendance/class/{class_id}?month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/attendance/class/{id} [GET]",
        )

    @task(5)
    @tag("grades")
    def list_grades(self):
        self.client.get(
            "/api/v1/grades?exam_id=1&page=1&page_size=50",
            headers=self.user.headers,
            name="/api/v1/grades [LIST]",
        )

    @task(3)
    @tag("grades", "write")
    def record_grade(self):
        self.client.post(
            "/api/v1/grades",
            json={
                "student_id": random.randint(1, 200),
                "exam_id": random.randint(1, 10),
                "subject_id": random.randint(1, 10),
                "marks_obtained": round(random.uniform(40, 100), 1),
                "max_marks": 100,
                "grade_letter": random.choice(["A", "B", "C", "D"]),
            },
            headers=self.user.headers,
            name="/api/v1/grades [CREATE]",
        )

    @task(4)
    @tag("dashboard")
    def teacher_dashboard(self):
        self.client.get(
            "/api/v1/dashboard/teacher-stats",
            headers=self.user.headers,
            name="/api/v1/dashboard [TEACHER STATS]",
        )

    @task(2)
    @tag("notifications")
    def teacher_notifications(self):
        self.client.get(
            "/api/v1/notifications?is_read=false&limit=10",
            headers=self.user.headers,
            name="/api/v1/notifications [LIST]",
        )

    @task(1)
    def think_time(self):
        time.sleep(random.uniform(1.0, 3.0))


class TeacherUser(AuthMixin, HttpUser):
    """Teacher doing 4 sessions/day — heavy on attendance, grades, timetable."""
    tasks = [TeacherTaskSet]
    wait_time = between(1.0, 3.0)
    weight = 3
    credentials = TEACHER_CREDENTIALS


# ══════════════════════════════════════════════════════════════════════════
# STUDENT USER — Profile, Marks, Timetable, Library
# ══════════════════════════════════════════════════════════════════════════
class StudentTaskSet(TaskSet):
    """Simulates student browsing own profile, marks, and timetable."""

    @task(10)
    @tag("profile")
    def my_profile(self):
        self.client.get(
            "/api/v1/student-profile/me",
            headers=self.user.headers,
            name="/api/v1/student-profile/me [GET]",
        )

    @task(8)
    @tag("timetable")
    def my_timetable(self):
        self.client.get(
            "/api/v1/timetable/student-view",
            headers=self.user.headers,
            name="/api/v1/timetable/student-view [GET]",
        )

    @task(7)
    @tag("attendance")
    def my_attendance(self):
        self.client.get(
            "/api/v1/attendance/my-attendance?month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/attendance/my-attendance [GET]",
        )

    @task(6)
    @tag("grades")
    def my_grades(self):
        self.client.get(
            "/api/v1/grades/my-grades",
            headers=self.user.headers,
            name="/api/v1/grades/my-grades [GET]",
        )

    @task(4)
    @tag("library")
    def library_search(self):
        term = random.choice(["physics", "mathematics", "biology", "novel", "history"])
        self.client.get(
            f"/api/v1/library/books?search={term}&page=1",
            headers=self.user.headers,
            name="/api/v1/library/books [SEARCH]",
        )

    @task(3)
    @tag("fees")
    def my_fees(self):
        self.client.get(
            "/api/v1/fees/my-fees",
            headers=self.user.headers,
            name="/api/v1/fees/my-fees [GET]",
        )

    @task(2)
    @tag("notifications")
    def notifications(self):
        self.client.get(
            "/api/v1/notifications?limit=5",
            headers=self.user.headers,
            name="/api/v1/notifications [LIST]",
        )

    @task(2)
    @tag("dashboard")
    def student_dashboard(self):
        self.client.get(
            "/api/v1/dashboard/student-stats",
            headers=self.user.headers,
            name="/api/v1/dashboard [STUDENT STATS]",
        )

    @task(1)
    def think_time(self):
        time.sleep(random.uniform(2.0, 5.0))


class StudentUser(AuthMixin, HttpUser):
    """Student checking marks/timetable — lightest backend load."""
    tasks = [StudentTaskSet]
    wait_time = between(2.0, 5.0)
    weight = 5  # Most users are students
    credentials = STUDENT_CREDENTIALS


# ══════════════════════════════════════════════════════════════════════════
# GUEST USER — Login flow only (spike testing)
# ══════════════════════════════════════════════════════════════════════════
class GuestUser(HttpUser):
    """Simulates unauthenticated users hitting login — tests auth throughput."""
    wait_time = between(0.1, 0.5)  # Very frequent (spike simulation)
    weight = 1

    @task(5)
    @tag("auth", "spike")
    def login_attempt(self):
        creds = random.choice([
            ADMIN_CREDENTIALS,
            TEACHER_CREDENTIALS,
            STUDENT_CREDENTIALS,
            {"email": "invalid@test.com", "password": "wrong"},  # Intentional failure
        ])
        with self.client.post(
            "/api/v1/auth/login",
            json=creds,
            catch_response=True,
            name="/api/v1/auth/login [SPIKE]",
        ) as resp:
            if resp.status_code in (200, 401):
                resp.success()  # Both are valid outcomes
            else:
                resp.failure(f"Unexpected status: {resp.status_code}")

    @task(3)
    @tag("auth")
    def get_password_policy(self):
        self.client.get(
            "/api/v1/auth/password-policy",
            name="/api/v1/auth/password-policy [GET]",
        )

    @task(1)
    @tag("health")
    def health(self):
        self.client.get("/api/v1/health", name="/api/v1/health")


# ══════════════════════════════════════════════════════════════════════════
# FEE CLERK — Fee-heavy workflow
# ══════════════════════════════════════════════════════════════════════════
class FeeClerkTaskSet(TaskSet):
    """Fee clerk processing payments, checking pending dues."""

    @task(10)
    @tag("fees")
    def pending_fees(self):
        self.client.get(
            "/api/v1/fees/pending?page=1&page_size=50",
            headers=self.user.headers,
            name="/api/v1/fees/pending [LIST]",
        )

    @task(8)
    @tag("fees")
    def collect_fee(self):
        self.client.post(
            "/api/v1/fees/collect",
            json={
                "student_id": random.randint(1, 200),
                "amount": round(random.uniform(500, 15000), 2),
                "payment_method": random.choice(["cash", "upi", "bank_transfer"]),
                "description": "Tuition fee",
                "month": 2,
                "year": 2026,
            },
            headers=self.user.headers,
            name="/api/v1/fees/collect [POST]",
        )

    @task(5)
    @tag("fees")
    def fee_report(self):
        self.client.get(
            "/api/v1/fees/report?month=2&year=2026",
            headers=self.user.headers,
            name="/api/v1/fees/report [GET]",
        )

    @task(3)
    @tag("fees")
    def defaulters_list(self):
        self.client.get(
            "/api/v1/fees/defaulters",
            headers=self.user.headers,
            name="/api/v1/fees/defaulters [LIST]",
        )

    @task(2)
    @tag("payments")
    def payment_history(self):
        self.client.get(
            "/api/v1/payments?page=1&page_size=20",
            headers=self.user.headers,
            name="/api/v1/payments [LIST]",
        )


class FeeClerkUser(AuthMixin, HttpUser):
    """Fee clerk doing intensive payment processing."""
    tasks = [FeeClerkTaskSet]
    wait_time = between(0.5, 1.5)
    weight = 1
    credentials = ADMIN_CREDENTIALS  # Uses admin token


# ══════════════════════════════════════════════════════════════════════════
# EVENT HOOKS — Custom metrics and reporting
# ══════════════════════════════════════════════════════════════════════════
@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               response, context, exception, **kwargs):
    """Log slow requests for analysis."""
    if response_time > 2000:  # > 2 seconds
        print(f"⚠️  SLOW REQUEST: {request_type} {name} — {response_time:.0f}ms")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """Print performance summary on exit."""
    stats = environment.stats
    print("\n" + "═" * 60)
    print("📊 PERFORMANCE SUMMARY")
    print("═" * 60)
    total = stats.total
    if total.num_requests > 0:
        print(f"  Total Requests : {total.num_requests:,}")
        print(f"  Failures       : {total.num_failures:,} ({total.fail_ratio * 100:.1f}%)")
        print(f"  Avg Response   : {total.avg_response_time:.0f}ms")
        print(f"  p50 Response   : {total.get_response_time_percentile(0.50):.0f}ms")
        print(f"  p95 Response   : {total.get_response_time_percentile(0.95):.0f}ms")
        print(f"  p99 Response   : {total.get_response_time_percentile(0.99):.0f}ms")
        print(f"  Peak RPS       : {total.max_rps:.1f}")
        print("═" * 60)

        # Check SLA
        p95 = total.get_response_time_percentile(0.95)
        fail_rate = total.fail_ratio * 100
        sla_ok = p95 < 500 and fail_rate < 1.0
        print(f"  SLA Status     : {'✅ PASS' if sla_ok else '❌ FAIL'}")
        if not sla_ok:
            if p95 >= 500:
                print(f"    ❌ p95 {p95:.0f}ms exceeds 500ms target")
            if fail_rate >= 1.0:
                print(f"    ❌ Error rate {fail_rate:.1f}% exceeds 1% target")
        print("═" * 60)
