/**
 * Visual Regression Tests — Playwright Screenshot Testing
 * 
 * Captures screenshots and compares against stored baselines.
 * Run first time: npx playwright test --update-snapshots
 * Regular runs: npx playwright test --project=visual-regression
 */
import { test, expect } from '@playwright/test';

// ── Login Page Snapshots ──────────────────────────────────────────────
test.describe('Visual Regression — Login Page', () => {
    test('login page - full page screenshot', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login-page.png', {
            fullPage: true,
            animations: 'disabled', // Disable animations for stable screenshots
        });
    });

    test('login page - with validation errors', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(500); // Wait for validation to appear
        await expect(page).toHaveScreenshot('login-errors.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('login page - form filled', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel(/email/i).fill('test@example.com');
        await page.getByLabel(/password/i).fill('Password123!');
        await expect(page).toHaveScreenshot('login-filled.png', {
            fullPage: false,
            animations: 'disabled',
        });
    });
});

// ── Responsive snapshots ───────────────────────────────────────────────
test.describe('Visual Regression — Responsive', () => {
    test('login page - tablet viewport (768px)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login-tablet.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('login page - mobile viewport (375px)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login-mobile.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('login page - desktop (1920px)', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveScreenshot('login-desktop.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

// ── Dashboard snapshots ────────────────────────────────────────────────
test.describe('Visual Regression — Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Inject auth token
        await page.goto('/login');
        await page.evaluate(() => {
            localStorage.setItem('access_token', 'mock-token-for-visual');
        });
    });

    test('dashboard page visual', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        // Mask dynamic content (dates, live counters)
        await expect(page).toHaveScreenshot('dashboard.png', {
            fullPage: true,
            animations: 'disabled',
            mask: [
                page.locator('[data-testid="live-time"]'),
                page.locator('[data-testid="notification-badge"]'),
            ],
        });
    });
});

// ── Component snapshots ────────────────────────────────────────────────
test.describe('Visual Regression — Components', () => {
    test('login button states', async ({ page }) => {
        await page.goto('/login');

        // Capture normal state
        const button = page.getByRole('button', { name: /sign in/i });
        await expect(button).toHaveScreenshot('button-normal.png');

        // Hover state
        await button.hover();
        await expect(button).toHaveScreenshot('button-hover.png');
    });

    test('input field states', async ({ page }) => {
        await page.goto('/login');

        // Normal state
        const emailField = page.getByLabel(/email/i);
        await expect(emailField).toHaveScreenshot('input-normal.png');

        // Focused state
        await emailField.focus();
        await expect(emailField).toHaveScreenshot('input-focused.png');

        // Filled state
        await emailField.fill('test@example.com');
        await expect(emailField).toHaveScreenshot('input-filled.png');
    });
});
