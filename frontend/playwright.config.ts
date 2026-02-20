import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E + Visual Regression Configuration
 * 
 * Test suites:
 *   - E2E tests: src/tests/e2e/**\/*.e2e.ts
 *   - Visual regression: src/tests/visual/**\/*.visual.ts
 */
export default defineConfig({
    testDir: './src/tests',
    testMatch: ['**/*.e2e.ts', '**/*.visual.ts'],

    // Fail fast on CI; keep running locally
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    // Reporters
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
        ['junit', { outputFile: 'playwright-results.xml' }],
    ],

    use: {
        // Base URL for all tests — override with PLAYWRIGHT_BASE_URL env var
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

        // Collect traces on failure and retry
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Default viewport
        viewport: { width: 1280, height: 720 },

        // Navigation timeout
        actionTimeout: 10_000,
        navigationTimeout: 30_000,
    },

    // Visual regression settings
    expect: {
        // Tolerance for pixel differences in visual regression
        toHaveScreenshot: {
            maxDiffPixels: 150,
            threshold: 0.2,
        },
        toMatchSnapshot: {
            maxDiffPixelRatio: 0.02,
        },
    },

    projects: [
        // ── Desktop browsers ────────────────────────────────────────────
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },

        // ── Mobile viewports ────────────────────────────────────────────
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 12'] },
        },

        // ── Visual regression (Chromium only for consistency) ───────────
        {
            name: 'visual-regression',
            testMatch: '**/*.visual.ts',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1440, height: 900 },
            },
        },
    ],

    // Start Vite dev server before running tests
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'ignore',
    },
});
