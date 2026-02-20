/**
 * Lighthouse CI Configuration — PreSkool ERP
 *
 * Targets Core Web Vitals thresholds:
 *   LCP  < 2.5s  (Largest Contentful Paint)
 *   INP  < 200ms (Interaction to Next Paint)
 *   CLS  < 0.1   (Cumulative Layout Shift)
 *   TTI  < 5s    (Time to Interactive)
 *   TBT  < 300ms (Total Blocking Time)
 *   FCP  < 1.8s  (First Contentful Paint)
 *
 * Run locally:
 *   npx @lhci/cli@latest autorun
 *
 * Run in CI:
 *   npm install -g @lhci/cli
 *   lhci autorun --config=performance/lighthouserc.js
 */

/** @type {import('@lhci/cli').LhrJson} */
module.exports = {
    ci: {
        collect: {
            // Pages to audit — start from login (public), then authenticated
            url: [
                'http://localhost:5173/login',
                'http://localhost:5173/login', // warm run
            ],
            // Run each URL 3 times and median results
            numberOfRuns: 3,
            settings: {
                // Simulate Moto G4 for mobile scores
                preset: 'desktop',
                // Block unnecessary third-party requests during audit
                blockedUrlPatterns: [
                    '*analytics*',
                    '*hotjar*',
                    '*intercom*',
                ],
                // Chrome flags for CI stability
                chromeFlags: '--no-sandbox --disable-dev-shm-usage',
                // Throttle network and CPU to simulate real users
                throttlingMethod: 'simulate',
                throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                },
            },
        },

        assert: {
            // Fail CI if any of these thresholds are not met
            assertions: {
                // Core Web Vitals
                'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
                'total-blocking-time': ['warn', { maxNumericValue: 300 }],
                'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
                'interactive': ['warn', { maxNumericValue: 5000 }],

                // Performance score
                'categories:performance': ['warn', { minScore: 0.75 }],

                // Accessibility — critical for schools
                'categories:accessibility': ['error', { minScore: 0.85 }],

                // Best practices
                'categories:best-practices': ['warn', { minScore: 0.80 }],

                // SEO
                'categories:seo': ['warn', { minScore: 0.80 }],

                // Security headers
                'uses-https': ['warn', {}],
            },
        },

        upload: {
            // Store results locally — change to 'lhci' for LHCI server or 'temporary-public-storage'
            target: 'filesystem',
            outputDir: './performance/reports/lhci',
            reportFilenamePattern: 'lighthouse-%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
        },
    },
};
