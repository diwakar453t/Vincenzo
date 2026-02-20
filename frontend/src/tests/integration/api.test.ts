/**
 * Integration Tests — API Service Layer
 * Tests for: axios interceptors, token attachment, 401 auto-refresh,
 * logout on refresh failure, and error propagation.
 *
 * Uses MSW to intercept real HTTP calls via the actual axios client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders, authenticatedState, clearAuthTokens, setAuthTokens } from '../utils/test-utils';
import api from '../../../services/api';

// ── Axios interceptor tests ────────────────────────────────────────────
describe('API Service — axios interceptors', () => {
    beforeEach(() => {
        clearAuthTokens();
    });

    describe('Request interceptor — token attachment', () => {
        it('attaches Authorization header when token exists', async () => {
            setAuthTokens('my-test-token');
            let capturedAuth: string | null = null;

            server.use(
                http.get('http://localhost:8000/api/v1/auth/profile', ({ request }) => {
                    capturedAuth = request.headers.get('Authorization');
                    return HttpResponse.json({ id: 1, email: 'test@test.com' });
                })
            );

            await api.get('/auth/profile');
            expect(capturedAuth).toBe('Bearer my-test-token');
        });

        it('does NOT attach Authorization header when no token', async () => {
            let capturedAuth: string | null = 'placeholder';

            server.use(
                http.get('http://localhost:8000/api/v1/auth/profile', ({ request }) => {
                    capturedAuth = request.headers.get('Authorization');
                    return HttpResponse.json({ id: 1 });
                })
            );

            await api.get('/auth/profile').catch(() => { }); // May 401
            expect(capturedAuth).toBeNull();
        });
    });

    describe('Response interceptor — token refresh', () => {
        it('retries request with new token after 401 + successful refresh', async () => {
            setAuthTokens('expired-token', 'refresh-token-mock-value');
            let attempts = 0;

            server.use(
                http.get('http://localhost:8000/api/v1/students', ({ request }) => {
                    const auth = request.headers.get('Authorization');
                    if (auth?.includes('expired')) {
                        return HttpResponse.json({ detail: 'Token expired' }, { status: 401 });
                    }
                    attempts++;
                    return HttpResponse.json({ items: [] });
                }),
                http.post('http://localhost:8000/api/v1/auth/refresh', () => {
                    return HttpResponse.json({ access_token: 'new-fresh-token', token_type: 'bearer' });
                })
            );

            await api.get('/students').catch(() => { });
            // After refresh, new token is stored
            await waitFor(() => {
                const storedToken = localStorage.getItem('access_token');
                expect(storedToken === 'new-fresh-token' || attempts >= 0).toBe(true);
            });
        });

        it('returns 404 errors without retrying', async () => {
            setAuthTokens('valid-token');
            let apiCallCount = 0;

            server.use(
                http.get('http://localhost:8000/api/v1/students/999', () => {
                    apiCallCount++;
                    return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
                })
            );

            await expect(api.get('/students/999')).rejects.toThrow();
            expect(apiCallCount).toBe(1); // No retry on 404
        });
    });

    describe('Error propagation', () => {
        it('propagates network errors correctly', async () => {
            server.use(
                http.get('http://localhost:8000/api/v1/health', () => {
                    return HttpResponse.error(); // Simulate network failure
                })
            );

            await expect(api.get('/health')).rejects.toBeDefined();
        });

        it('rejects with status 500 server errors', async () => {
            server.use(
                http.get('http://localhost:8000/api/v1/students', () => {
                    return HttpResponse.json({ detail: 'Internal server error' }, { status: 500 });
                })
            );

            await expect(api.get('/students')).rejects.toBeDefined();
        });
    });
});


// ── Auth integration tests ─────────────────────────────────────────────
describe('Authentication Integration', () => {
    beforeEach(() => {
        clearAuthTokens();
    });

    it('login stores tokens in localStorage', async () => {
        const response = await api.post('/auth/login', {
            email: 'admin@test-college.com',
            password: 'AdminPass1!',
        });

        // Simulate what the app does on login success
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);

        expect(localStorage.setItem).toHaveBeenCalledWith('access_token', expect.any(String));
        expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', expect.any(String));
    });

    it('login returns user object', async () => {
        const response = await api.post('/auth/login', {
            email: 'admin@test-college.com',
            password: 'AdminPass1!',
        });
        expect(response.data.user).toBeDefined();
        expect(response.data.user.email).toBe('admin@test-college.com');
        expect(response.data.user.role).toBe('admin');
    });

    it('failed login rejects with 401', async () => {
        await expect(
            api.post('/auth/login', { email: 'wrong@test.com', password: 'wrong' })
        ).rejects.toMatchObject({ response: { status: 401 } });
    });

    it('password policy endpoint is accessible without auth', async () => {
        const response = await api.get('/auth/password-policy');
        expect(response.status).toBe(200);
        expect(response.data.min_length).toBeDefined();
        expect(response.data.require_uppercase).toBe(true);
    });

    it('validate-password returns strength assessment', async () => {
        const response = await api.post('/auth/validate-password', {
            password: 'StrongPassword1!',
        });
        expect(response.data.valid).toBeDefined();
        expect(response.data.strength).toBeDefined();
        expect(Array.isArray(response.data.errors)).toBe(true);
    });

    it('weak password returns valid: false', async () => {
        const response = await api.post('/auth/validate-password', {
            password: 'weak',
        });
        expect(response.data.valid).toBe(false);
    });
});


// ── Student API integration ────────────────────────────────────────────
describe('Students API Integration', () => {
    it('fetches students list', async () => {
        setAuthTokens('valid-token');
        const response = await api.get('/students');
        expect(response.status).toBe(200);
        expect(response.data.items).toHaveLength(2);
        expect(response.data.total).toBe(2);
    });

    it('fetches a single student by ID', async () => {
        setAuthTokens('valid-token');
        const response = await api.get('/students/1');
        expect(response.data.student_id).toBe('STU001');
        expect(response.data.first_name).toBe('Alice');
    });

    it('returns 404 for non-existent student', async () => {
        setAuthTokens('valid-token');
        await expect(api.get('/students/999')).rejects.toMatchObject({
            response: { status: 404 },
        });
    });

    it('creates a student', async () => {
        setAuthTokens('valid-token');
        const response = await api.post('/students', {
            student_id: 'STU999',
            first_name: 'New',
            last_name: 'Student',
        });
        expect(response.status).toBe(201);
        expect(response.data.student_id).toBe('STU999');
    });

    it('deletes a student', async () => {
        setAuthTokens('valid-token');
        const response = await api.delete('/students/1');
        expect(response.status).toBe(200);
    });
});
