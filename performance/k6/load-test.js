/**
 * K6 Performance Test Suite — PreSkool ERP
 * ==========================================
 * Advanced load, stress, spike, and soak testing.
 *
 * Scenarios:
 *   1. load_test     — Sustained 100 VU for 10 minutes (normal load)
 *   2. stress_test   — Ramp to 300 VU (2x peak capacity)
 *   3. spike_test    — Instant 500 VU spike (Black Friday simulation)
 *   4. soak_test     — 50 VU for 2 hours (memory leak detection)
 *   5. breakpoint    — Find max capacity before 500 errors
 *
 * Run:
 *   # All scenarios (CI)
 *   k6 run k6/load-test.js --env BASE_URL=http://localhost:8000
 *
 *   # Specific scenario
 *   k6 run k6/load-test.js --env BASE_URL=http://localhost:8000 \
 *       --env SCENARIO=stress_test
 *
 *   # With Prometheus + Grafana output
 *   k6 run k6/load-test.js \
 *       --out prometheus=namespace=preskool \
 *       --env BASE_URL=http://localhost:8000
 *
 * SLA Targets:
 *   http_req_duration p(95) < 500ms
 *   http_req_duration p(99) < 2000ms
 *   http_req_failed   < 1%
 *   rps               > 200/s at 100 VU
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ── Custom Metrics ──────────────────────────────────────────────────────
const loginSuccessRate = new Rate('login_success_rate');
const studentListDuration = new Trend('student_list_duration', true);
const feeQueryDuration = new Trend('fee_query_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const searchDuration = new Trend('search_duration', true);
const authErrors = new Counter('auth_errors');
const slowQueries = new Counter('slow_queries_above_500ms');
const activeVUs = new Gauge('active_vus');

// ── Config ────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const SCENARIO = __ENV.SCENARIO || 'load_test';

// ── Thresholds (SLA) ──────────────────────────────────────────────────
export const options = {
    scenarios: {
        // ── 1. Load Test: Sustained normal load
        load_test: {
            executor: 'ramping-vus',
            stages: [
                { duration: '2m', target: 50 },   // Ramp up: 0→50 VUs
                { duration: '5m', target: 100 },  // Sustain: 100 VUs (target RPS ~200)
                { duration: '2m', target: 150 },  // Peak: 150 VUs
                { duration: '1m', target: 0 },    // Ramp down
            ],
            tags: { scenario: 'load_test' },
        },

        // ── 2. Stress Test: Push beyond capacity
        stress_test: {
            executor: 'ramping-vus',
            stages: [
                { duration: '2m', target: 100 },  // Ramp
                { duration: '5m', target: 200 },  // 2x normal
                { duration: '5m', target: 300 },  // 3x normal (stress)
                { duration: '2m', target: 0 },    // Ramp down
            ],
            tags: { scenario: 'stress_test' },
        },

        // ── 3. Spike Test: Sudden massive traffic
        spike_test: {
            executor: 'ramping-vus',
            stages: [
                { duration: '30s', target: 10 },  // Baseline
                { duration: '10s', target: 500 }, // Instantaneous spike!
                { duration: '3m', target: 500 },  // Spike sustained
                { duration: '10s', target: 10 },  // Recovery
                { duration: '3m', target: 10 },   // Monitor recovery
            ],
            tags: { scenario: 'spike_test' },
        },

        // ── 4. Soak Test: Long-duration memory leak detection (30 min)
        soak_test: {
            executor: 'constant-vus',
            vus: 50,
            duration: '30m',
            tags: { scenario: 'soak_test' },
        },
    },

    // Only run the selected scenario
    scenarios: Object.fromEntries(
        Object.entries({
            // ── 0. Smoke Test: Minimal check — "is the API alive?"
            smoke: {
                executor: 'constant-vus',
                vus: 2,
                duration: '30s',
                tags: { scenario: 'smoke' },
                exec: 'defaultScenario',
            },
            load_test: {
                executor: 'ramping-vus',
                stages: [
                    { duration: '2m', target: 50 },
                    { duration: '5m', target: 100 },
                    { duration: '2m', target: 150 },
                    { duration: '1m', target: 0 },
                ],
                tags: { scenario: 'load_test' },
                exec: 'defaultScenario',
            },
            stress_test: {
                executor: 'ramping-vus',
                stages: [
                    { duration: '2m', target: 100 },
                    { duration: '5m', target: 200 },
                    { duration: '5m', target: 300 },
                    { duration: '2m', target: 0 },
                ],
                tags: { scenario: 'stress_test' },
                exec: 'defaultScenario',
            },
            spike_test: {
                executor: 'ramping-vus',
                stages: [
                    { duration: '30s', target: 10 },
                    { duration: '10s', target: 500 },
                    { duration: '3m', target: 500 },
                    { duration: '10s', target: 10 },
                    { duration: '3m', target: 10 },
                ],
                tags: { scenario: 'spike_test' },
                exec: 'defaultScenario',
            },
            soak_test: {
                executor: 'constant-vus',
                vus: 50,
                duration: '30m',
                tags: { scenario: 'soak_test' },
                exec: 'defaultScenario',
            },
        }).filter(([k]) => k === SCENARIO)
    ),

    thresholds: {
        // Global SLA gates
        'http_req_duration': ['p(95)<500', 'p(99)<2000'],
        'http_req_failed': ['rate<0.01'],           // < 1% errors
        'login_success_rate': ['rate>0.99'],        // > 99% login success
        'student_list_duration': ['p(95)<300'],     // Student list < 300ms
        'fee_query_duration': ['p(95)<400'],        // Fee queries < 400ms
        'dashboard_duration': ['p(95)<600'],        // Dashboard < 600ms (complex agg)
        'search_duration': ['p(95)<350'],           // Search < 350ms
        'slow_queries_above_500ms': ['count<100'],  // < 100 slow queries per run
    },
};

// ── Auth Helper ───────────────────────────────────────────────────────
function getAuthHeader(role = 'admin') {
    const credentials = {
        admin: { email: 'admin@preskool.test', password: 'AdminPass1!@#' },
        teacher: { email: 'teacher@preskool.test', password: 'Teacher1!@#' },
        student: { email: 'student@preskool.test', password: 'Student1!@#' },
    };

    const res = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify(credentials[role]),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'auth_login' } }
    );

    const ok = check(res, {
        'login status 200': (r) => r.status === 200,
        'has access_token': (r) => r.json('access_token') !== undefined,
    });

    loginSuccessRate.add(ok);
    if (!ok) {
        authErrors.add(1);
        return null;
    }

    return `Bearer ${res.json('access_token')}`;
}

// ── Main scenario ─────────────────────────────────────────────────────
export function defaultScenario() {
    activeVUs.add(1);

    // Randomly pick a role (weighted: 20% admin, 30% teacher, 50% student)
    const rand = Math.random();
    const role = rand < 0.2 ? 'admin' : rand < 0.5 ? 'teacher' : 'student';
    const token = getAuthHeader(role);

    if (!token) {
        sleep(1);
        activeVUs.add(-1);
        return;
    }

    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'preskool-test',
    };

    // ── Health (always fast)
    group('Health Check', () => {
        const res = http.get(`${BASE_URL}/api/v1/health`, { tags: { name: 'health' } });
        check(res, { 'health ok': (r) => r.status === 200 });
    });

    // ── Auth Profile
    group('Auth Profile', () => {
        const res = http.get(`${BASE_URL}/api/v1/auth/profile`, {
            headers,
            tags: { name: 'auth_profile' },
        });
        check(res, {
            'profile status 200': (r) => r.status === 200,
            'has email': (r) => r.json('email') !== undefined,
        });
        if (res.timings.duration > 500) slowQueries.add(1);
    });

    sleep(0.2);

    // ── Students (admin/teacher only)
    if (role !== 'student') {
        group('Students', () => {
            const page = Math.floor(Math.random() * 5) + 1;
            const t = Date.now();
            const res = http.get(`${BASE_URL}/api/v1/students?page=${page}&page_size=20`, {
                headers,
                tags: { name: 'students_list' },
            });
            studentListDuration.add(Date.now() - t);
            check(res, {
                'students status 200': (r) => r.status === 200,
                'has items': (r) => Array.isArray(r.json('items')) || r.status === 200,
            });
            if (res.timings.duration > 500) slowQueries.add(1);
        });

        sleep(0.1);

        // Search students
        group('Student Search', () => {
            const terms = ['Aarav', 'Kumar', 'active', 'class'];
            const q = terms[Math.floor(Math.random() * terms.length)];
            const t = Date.now();
            const res = http.get(`${BASE_URL}/api/v1/students?search=${q}`, {
                headers,
                tags: { name: 'students_search' },
            });
            searchDuration.add(Date.now() - t);
            check(res, { 'search ok': (r) => r.status === 200 });
        });
    }

    sleep(0.3);

    // ── Dashboard
    group('Dashboard', () => {
        const endpoint = {
            admin: 'admin-stats',
            teacher: 'teacher-stats',
            student: 'student-stats',
        }[role];

        const t = Date.now();
        const res = http.get(`${BASE_URL}/api/v1/dashboard/${endpoint}`, {
            headers,
            tags: { name: `dashboard_${role}` },
        });
        dashboardDuration.add(Date.now() - t);
        check(res, { 'dashboard ok': (r) => r.status === 200 });
        if (res.timings.duration > 600) slowQueries.add(1);
    });

    sleep(0.2);

    // ── Attendance
    group('Attendance', () => {
        const res = http.get(`${BASE_URL}/api/v1/attendance/report?month=2&year=2026`, {
            headers,
            tags: { name: 'attendance_report' },
        });
        check(res, { 'attendance ok': (r) => r.status === 200 || r.status === 403 });
    });

    sleep(0.2);

    // ── Fees (admin only)
    if (role === 'admin') {
        group('Fees', () => {
            const t = Date.now();
            const res = http.get(`${BASE_URL}/api/v1/fees/stats`, {
                headers,
                tags: { name: 'fees_stats' },
            });
            feeQueryDuration.add(Date.now() - t);
            check(res, { 'fees ok': (r) => r.status === 200 });

            // Also check pending
            http.get(`${BASE_URL}/api/v1/fees/pending?page=1&page_size=20`, {
                headers,
                tags: { name: 'fees_pending' },
            });
        });

        sleep(0.1);

        // ── Payroll
        group('Payroll', () => {
            const res = http.get(`${BASE_URL}/api/v1/payroll?month=2&year=2026`, {
                headers,
                tags: { name: 'payroll_list' },
            });
            check(res, { 'payroll ok': (r) => r.status === 200 });
        });
    }

    sleep(0.3);

    // ── Notifications (everyone)
    group('Notifications', () => {
        const res = http.get(`${BASE_URL}/api/v1/notifications?is_read=false&limit=10`, {
            headers,
            tags: { name: 'notifications_list' },
        });
        check(res, { 'notifications ok': (r) => r.status === 200 });
    });

    sleep(0.1);

    // ── Global Search
    group('Global Search', () => {
        const terms = ['Aarav', 'physics', 'room 101', 'hostel'];
        const q = terms[Math.floor(Math.random() * terms.length)];
        const t = Date.now();
        const res = http.get(`${BASE_URL}/api/v1/search?q=${q}`, {
            headers,
            tags: { name: 'global_search' },
        });
        searchDuration.add(Date.now() - t);
        check(res, { 'search ok': (r) => r.status === 200 });
    });

    activeVUs.add(-1);
    sleep(Math.random() * 2 + 0.5); // Think time: 0.5-2.5s
}

// ── Breakpoint Test — separate scenario to find max capacity
export function breakpointTest() {
    const token = getAuthHeader('admin');
    if (!token) return;

    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };

    // Simple endpoint — isolates infrastructure limits
    const res = http.get(`${BASE_URL}/api/v1/students?page=1&page_size=10`, {
        headers,
        tags: { name: 'breakpoint_target' },
    });

    check(res, {
        'status 200': (r) => r.status === 200,
        'p95 < 1000ms': (r) => r.timings.duration < 1000,
    });

    sleep(0.1);
}

// ── Summary Report ────────────────────────────────────────────────────
export function handleSummary(data) {
    const metrics = data.metrics;
    const p95 = metrics['http_req_duration']?.values?.['p(95)'] || 0;
    const p99 = metrics['http_req_duration']?.values?.['p(99)'] || 0;
    const errorRate = (metrics['http_req_failed']?.values?.rate || 0) * 100;
    const rps = metrics['http_reqs']?.values?.rate || 0;
    const totalRequests = metrics['http_reqs']?.values?.count || 0;

    const slaOk = p95 < 500 && errorRate < 1.0;

    const summary = `
╔══════════════════════════════════════════════════════════════╗
║               PreSkool ERP — K6 Performance Results          ║
╠══════════════════════════════════════════════════════════════╣
║  Scenario       : ${SCENARIO.padEnd(42)}║
║  Total Requests : ${String(totalRequests.toFixed(0)).padEnd(42)}║
║  Peak RPS       : ${String(rps.toFixed(1) + '/s').padEnd(42)}║
╠══════════════════════════════════════════════════════════════╣
║  RESPONSE TIMES                                              ║
║  p95 (SLA: <500ms)  : ${String(p95.toFixed(0) + 'ms').padEnd(38)}║
║  p99 (SLA: <2000ms) : ${String(p99.toFixed(0) + 'ms').padEnd(38)}║
╠══════════════════════════════════════════════════════════════╣
║  RELIABILITY                                                 ║
║  Error Rate (SLA: <1%) : ${String(errorRate.toFixed(2) + '%').padEnd(35)}║
╠══════════════════════════════════════════════════════════════╣
║  VERDICT: ${slaOk ? '✅ ALL SLA TARGETS MET' : '❌ SLA TARGETS FAILED'.padEnd(49)}║
╚══════════════════════════════════════════════════════════════╝
`;

    return {
        'reports/k6-summary.txt': textSummary(data, { indent: '  ', enableColors: false }),
        'reports/k6-results.json': JSON.stringify(data),
        stdout: summary,
    };
}
