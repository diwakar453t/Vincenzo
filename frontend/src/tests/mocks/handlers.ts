/**
 * MSW (Mock Service Worker) API Handlers
 * Intercepts all API calls in tests — no real network requests.
 * 
 * Handlers mirror the PreSkool ERP API contract exactly:
 * POST /auth/login, GET /auth/profile, GET /students, etc.
 */
import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8000/api/v1';

// ── Test data fixtures ─────────────────────────────────────────────────
export const mockUser = {
    id: 1,
    email: 'admin@test-college.com',
    full_name: 'Test Admin',
    role: 'admin',
    is_active: true,
    is_verified: true,
    tenant_id: 'test-college',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

export const mockTeacher = {
    id: 2,
    email: 'teacher@test-college.com',
    full_name: 'Test Teacher',
    role: 'teacher',
    is_active: true,
    is_verified: true,
    tenant_id: 'test-college',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

export const mockStudents = [
    {
        id: 1, student_id: 'STU001', first_name: 'Alice', last_name: 'Smith',
        date_of_birth: '2000-05-15', gender: 'female', email: 'alice@test.com',
        phone: '+91-9876543210', enrollment_date: '2022-07-01',
        status: 'active', tenant_id: 'test-college',
    },
    {
        id: 2, student_id: 'STU002', first_name: 'Bob', last_name: 'Jones',
        date_of_birth: '2001-03-10', gender: 'male', email: 'bob@test.com',
        phone: '+91-9876543211', enrollment_date: '2022-07-01',
        status: 'active', tenant_id: 'test-college',
    },
];

export const mockTokens = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    refresh_token: 'refresh-token-mock-value',
    token_type: 'bearer',
    user: mockUser,
};

export const mockPasswordPolicy = {
    min_length: 8,
    max_length: 128,
    require_uppercase: true,
    require_lowercase: true,
    require_digit: true,
    require_special: true,
};

export const mockGDPRExport = {
    export_metadata: {
        generated_at: '2026-02-20T00:00:00Z',
        data_controller: 'PreSkool ERP',
        data_subject_id: 1,
        format_version: '1.0',
        gdpr_article: 'Article 20 — Right to Data Portability',
    },
    account: mockUser,
    consents: [],
    data_requests: [],
};

// ── HTTP Handlers ──────────────────────────────────────────────────────
export const handlers = [

    // ── Auth endpoints ────────────────────────────────────────────────
    http.post(`${BASE}/auth/login`, async ({ request }) => {
        const body = await request.json() as { email: string; password: string };
        if (body.email === 'admin@test-college.com' && body.password === 'AdminPass1!') {
            return HttpResponse.json(mockTokens, { status: 200 });
        }
        if (body.email === 'locked@test.com') {
            return HttpResponse.json(
                { detail: 'Account locked. Too many failed attempts. Try again in 15 minutes.' },
                { status: 401 }
            );
        }
        return HttpResponse.json(
            { detail: 'Invalid email or password' },
            { status: 401 }
        );
    }),

    http.post(`${BASE}/auth/register`, async ({ request }) => {
        const body = await request.json() as Record<string, string>;
        if (body.email === 'existing@test.com') {
            return HttpResponse.json({ detail: 'Email already registered' }, { status: 409 });
        }
        if (!body.password || body.password.length < 8) {
            return HttpResponse.json(
                { detail: { policy_errors: ['Password must be at least 8 characters'] } },
                { status: 400 }
            );
        }
        return HttpResponse.json({ ...mockTokens, user: { ...mockUser, email: body.email } }, { status: 201 });
    }),

    http.get(`${BASE}/auth/profile`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (!auth || !auth.startsWith('Bearer ')) {
            return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
        }
        return HttpResponse.json(mockUser);
    }),

    http.post(`${BASE}/auth/refresh`, async ({ request }) => {
        const body = await request.json() as { refresh_token: string };
        if (body.refresh_token === 'refresh-token-mock-value') {
            return HttpResponse.json({ access_token: 'new-access-token', token_type: 'bearer' });
        }
        return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 });
    }),

    http.put(`${BASE}/auth/change-password`, async ({ request }) => {
        const body = await request.json() as { current_password: string; new_password: string };
        if (body.current_password === 'wrong') {
            return HttpResponse.json({ detail: 'Current password incorrect' }, { status: 400 });
        }
        if (!body.new_password || body.new_password.length < 8) {
            return HttpResponse.json(
                { detail: { policy_errors: ['Password too weak'] } },
                { status: 400 }
            );
        }
        return HttpResponse.json({ message: 'Password changed successfully' });
    }),

    http.get(`${BASE}/auth/password-policy`, () => {
        return HttpResponse.json(mockPasswordPolicy);
    }),

    http.post(`${BASE}/auth/validate-password`, async ({ request }) => {
        const body = await request.json() as { password: string };
        const isStrong = body.password.length >= 8;
        return HttpResponse.json({
            valid: isStrong,
            strength: isStrong ? 'strong' : 'weak',
            errors: isStrong ? [] : ['Password too short'],
        });
    }),

    // ── Student endpoints ───────────────────────────────────────────────
    http.get(`${BASE}/students`, () => {
        return HttpResponse.json({
            items: mockStudents,
            total: 2,
            page: 1,
            page_size: 20,
        });
    }),

    http.get(`${BASE}/students/:id`, ({ params }) => {
        const student = mockStudents.find(s => s.id === Number(params.id));
        if (!student) return HttpResponse.json({ detail: 'Student not found' }, { status: 404 });
        return HttpResponse.json(student);
    }),

    http.post(`${BASE}/students`, async ({ request }) => {
        const body = await request.json() as Record<string, string>;
        return HttpResponse.json({ id: 99, ...body }, { status: 201 });
    }),

    http.put(`${BASE}/students/:id`, async ({ params, request }) => {
        const body = await request.json() as Record<string, string>;
        const student = mockStudents.find(s => s.id === Number(params.id));
        if (!student) return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        return HttpResponse.json({ ...student, ...body });
    }),

    http.delete(`${BASE}/students/:id`, ({ params }) => {
        const student = mockStudents.find(s => s.id === Number(params.id));
        if (!student) return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        return HttpResponse.json({ message: 'Student deleted' });
    }),

    // ── Health endpoint ────────────────────────────────────────────────
    http.get(`${BASE}/health`, () => {
        return HttpResponse.json({ status: 'healthy', version: '1.0.0' });
    }),

    // ── GDPR endpoints ─────────────────────────────────────────────────
    http.get(`${BASE}/gdpr/privacy-policy`, () => {
        return HttpResponse.json({
            version: '1.0',
            summary: { data_collected: [], rights: [], legal_bases: [], retention: {} },
        });
    }),

    http.get(`${BASE}/gdpr/export`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (!auth) return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        return HttpResponse.json(mockGDPRExport);
    }),

    http.post(`${BASE}/gdpr/consent`, async ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (!auth) return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        const body = await request.json() as { consent_type: string; granted: boolean };
        return HttpResponse.json({
            status: body.granted ? 'granted' : 'withdrawn',
            consent_type: body.consent_type,
        });
    }),

    http.get(`${BASE}/gdpr/consent`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        if (!auth) return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
        return HttpResponse.json([]);
    }),

    // ── Dashboard ──────────────────────────────────────────────────────
    http.get(`${BASE}/dashboard/stats`, () => {
        return HttpResponse.json({
            total_students: 450,
            total_teachers: 32,
            active_classes: 18,
            pending_fees: 12500,
        });
    }),
];
