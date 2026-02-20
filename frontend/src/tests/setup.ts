/**
 * Global test setup for Vitest + React Testing Library
 * Runs before every test file.
 */
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

// ── MSW Server ─────────────────────────────────────────────────────────
// Start mock service worker before all tests
beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers after each test (don't keep per-test overrides)
afterEach(() => {
    server.resetHandlers();
    cleanup();
});

// Stop server after all tests
afterAll(() => {
    server.close();
});

// ── localStorage mock ─────────────────────────────────────────────────
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── matchMedia mock (MUI components use it) ───────────────────────────
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// ── ResizeObserver mock (MUI charts/tables use it) ────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// ── IntersectionObserver mock ─────────────────────────────────────────
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// ── Clean up mocks between tests ─────────────────────────────────────
afterEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
});
