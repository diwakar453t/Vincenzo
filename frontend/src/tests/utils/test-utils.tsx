/**
 * Test Utilities — shared helpers for all tests.
 *
 * renderWithProviders: wraps component in Redux Store + Router + ThemeProvider
 * createTestStore: creates a Redux store with optional preloaded state
 * waitForLoadingToFinish: waits for async actions to complete
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { PreloadedState } from '@reduxjs/toolkit';
import { vi } from 'vitest';

// Import your actual reducers
import authReducer from '../../store/slices/authSlice';

// ── Store factory ──────────────────────────────────────────────────────
export function createTestStore(preloadedState?: {
    auth?: {
        user?: Record<string, unknown> | null;
        token?: string | null;
        isAuthenticated?: boolean;
        loading?: boolean;
    };
}) {
    return configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState,
    });
}

const theme = createTheme();

// ── renderWithProviders ────────────────────────────────────────────────
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    preloadedState?: Parameters<typeof createTestStore>[0];
    routerProps?: MemoryRouterProps;
}

export function renderWithProviders(
    ui: React.ReactElement,
    {
        preloadedState,
        routerProps = { initialEntries: ['/'] },
        ...renderOptions
    }: RenderWithProvidersOptions = {}
) {
    const store = createTestStore(preloadedState);

    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <Provider store={store}>
                <MemoryRouter {...routerProps}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        {children}
                    </ThemeProvider>
                </MemoryRouter>
            </Provider>
        );
    }

    return {
        store,
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    };
}

// ── Auth helpers ───────────────────────────────────────────────────────
export const authenticatedState = {
    auth: {
        user: {
            id: 1,
            email: 'admin@test-college.com',
            full_name: 'Test Admin',
            role: 'admin',
            is_active: true,
            is_verified: true,
            tenant_id: 'test-college',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token',
        isAuthenticated: true,
        loading: false,
    },
};

export const unauthenticatedState = {
    auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
    },
};

export const teacherState = {
    auth: {
        user: {
            id: 2,
            email: 'teacher@test.com',
            full_name: 'Test Teacher',
            role: 'teacher',
            is_active: true,
            is_verified: true,
            tenant_id: 'test-college',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'teacher-jwt-token',
        isAuthenticated: true,
        loading: false,
    },
};

// ── Storage helpers ────────────────────────────────────────────────────
export function setAuthTokens(accessToken = 'mock-access-token', refreshToken = 'mock-refresh-token') {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
}

export function clearAuthTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

// ── API mock helpers ───────────────────────────────────────────────────
export { vi };
