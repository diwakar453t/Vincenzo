/**
 * Unit Tests — Redux Auth Slice
 * Tests for: loginSuccess, logout, setUser, setLoading reducers.
 * No network, no render — pure reducer logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
    loginSuccess,
    logout,
    setUser,
    setLoading,
} from '../../store/slices/authSlice';

function makeStore() {
    return configureStore({ reducer: { auth: authReducer } });
}

const testUser = {
    id: 1,
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
    is_verified: true,
    tenant_id: 'college-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
};

describe('authSlice', () => {
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
        store = makeStore();
        localStorage.clear();
    });

    // ── Initial state ────────────────────────────────────────────────────
    describe('initial state', () => {
        it('starts unauthenticated when no token in localStorage', () => {
            // localStorage mock returns null by default (set in setup.ts)
            const state = store.getState().auth;
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.loading).toBe(false);
        });
    });

    // ── loginSuccess ─────────────────────────────────────────────────────
    describe('loginSuccess', () => {
        it('sets user and token', () => {
            store.dispatch(loginSuccess({ user: testUser, token: 'jwt-abc' }));
            const state = store.getState().auth;
            expect(state.user).toEqual(testUser);
            expect(state.token).toBe('jwt-abc');
            expect(state.isAuthenticated).toBe(true);
        });

        it('marks isAuthenticated true', () => {
            store.dispatch(loginSuccess({ user: testUser, token: 'jwt-abc' }));
            expect(store.getState().auth.isAuthenticated).toBe(true);
        });

        it('replaces existing user on re-login', () => {
            store.dispatch(loginSuccess({ user: testUser, token: 'token-1' }));
            const newUser = { ...testUser, email: 'new@test.com', id: 2 };
            store.dispatch(loginSuccess({ user: newUser, token: 'token-2' }));
            expect(store.getState().auth.user?.email).toBe('new@test.com');
            expect(store.getState().auth.token).toBe('token-2');
        });
    });

    // ── logout ───────────────────────────────────────────────────────────
    describe('logout', () => {
        beforeEach(() => {
            store.dispatch(loginSuccess({ user: testUser, token: 'jwt-abc' }));
        });

        it('clears user, token, and isAuthenticated', () => {
            store.dispatch(logout());
            const state = store.getState().auth;
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('removes tokens from localStorage', () => {
            localStorage.setItem('access_token', 'jwt-abc');
            localStorage.setItem('refresh_token', 'refresh-xyz');
            store.dispatch(logout());
            expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
            expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        });
    });

    // ── setUser ──────────────────────────────────────────────────────────
    describe('setUser', () => {
        it('updates user without changing auth status', () => {
            store.dispatch(loginSuccess({ user: testUser, token: 'jwt' }));
            const updatedUser = { ...testUser, full_name: 'Updated Name' };
            store.dispatch(setUser(updatedUser));
            expect(store.getState().auth.user?.full_name).toBe('Updated Name');
            expect(store.getState().auth.isAuthenticated).toBe(true);
        });
    });

    // ── setLoading ───────────────────────────────────────────────────────
    describe('setLoading', () => {
        it('sets loading to true', () => {
            store.dispatch(setLoading(true));
            expect(store.getState().auth.loading).toBe(true);
        });

        it('sets loading to false', () => {
            store.dispatch(setLoading(true));
            store.dispatch(setLoading(false));
            expect(store.getState().auth.loading).toBe(false);
        });
    });
});
