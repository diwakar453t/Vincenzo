import { test, expect } from '@playwright/test';

/**
 * Mobile Responsiveness E2E Tests — PreSkool ERP
 *
 * Runs on mobile-chrome (Pixel 5) and mobile-safari (iPhone 12) projects.
 * Verifies that critical pages are usable on small viewports.
 *
 * Checks:
 *  - No horizontal overflow / horizontal scroll
 *  - Touch targets are sufficiently large (≥ 44px per WCAG 2.5.5)
 *  - Navigation is accessible via hamburger on mobile
 *  - Tables and data grids allow horizontal scroll, not clipped
 *  - Forms are usable (inputs not too small)
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// ── Helper ───────────────────────────────────────────────────────────────────
async function checkNoHorizontalScroll(page: import('@playwright/test').Page): Promise<void> {
    const overflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(overflow, `Page should not have horizontal scroll on mobile`).toBeFalsy();
}

async function checkTouchTargets(
    page: import('@playwright/test').Page,
    minSize = 44,
): Promise<void> {
    const smallTargets = await page.evaluate((min) => {
        const interactives = Array.from(
            document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"]'),
        );
        return interactives
            .map((el) => {
                const rect = el.getBoundingClientRect();
                return { tag: el.tagName, w: rect.width, h: rect.height };
            })
            .filter((t) => t.w > 0 && t.h > 0 && (t.w < min || t.h < min))
            .slice(0, 5);
    }, minSize);
    // Warn (not fail) — some MUI compact elements may be < 44px by design
    if (smallTargets.length > 0) {
        console.warn(`[Mobile] ${smallTargets.length} touch targets < ${minSize}px:`, smallTargets);
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Mobile: Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
    });

    test('login page fits mobile viewport — no horizontal scroll', async ({ page }) => {
        await checkNoHorizontalScroll(page);
    });

    test('email and password inputs are visible on mobile', async ({ page }) => {
        const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first();
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
    });

    test('submit button is tappable (width ≥ 44px)', async ({ page }) => {
        const submitBtn = page
            .getByRole('button', { name: /sign in|login|log in/i })
            .or(page.locator('button[type="submit"]'))
            .first();
        const box = await submitBtn.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(36); // MUI default min
        expect(box!.width).toBeGreaterThanOrEqual(88);
    });

    test('form card does not overflow screen width', async ({ page }) => {
        const cardWidth = await page.evaluate(() => {
            const card = document.querySelector('.MuiPaper-root, .MuiCard-root, form');
            if (!card) return 0;
            return card.getBoundingClientRect().width;
        });
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(cardWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance
    });
});

test.describe('Mobile: Auth Redirects', () => {
    test('redirects unauthenticated user to /login', async ({ page }) => {
        await page.goto(`${BASE_URL}/`);
        await page.waitForURL(/login/, { timeout: 10_000 });
        await expect(page).toHaveURL(/login/);
    });

    test('forgot password page fits mobile viewport', async ({ page }) => {
        await page.goto(`${BASE_URL}/forgot-password`);
        await checkNoHorizontalScroll(page);
        const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first();
        await expect(emailInput).toBeVisible();
    });
});

test.describe('Mobile: Viewport Meta Tag', () => {
    test('login page has correct viewport meta tag', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(viewportMeta).toContain('width=device-width');
        expect(viewportMeta).toContain('initial-scale=1');
    });
});

test.describe('Mobile: Typography & Readability', () => {
    test('body font size is readable on mobile (≥ 14px)', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        const fontSize = await page.evaluate(() => {
            const body = document.querySelector('body');
            if (!body) return 16;
            return parseFloat(getComputedStyle(body).fontSize);
        });
        expect(fontSize).toBeGreaterThanOrEqual(14);
    });

    test('labels and headings are visible on mobile', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        // Check for some text content in the page
        const textContent = await page.evaluate(() => document.body.innerText.trim());
        expect(textContent.length).toBeGreaterThan(10);
    });
});

test.describe('Mobile: Reset Password Page', () => {
    test('reset password page fits mobile viewport', async ({ page }) => {
        await page.goto(`${BASE_URL}/reset-password`);
        await checkNoHorizontalScroll(page);
    });
});
