/**
 * ═══════════════════════════════════════════════════════════════════════
 * PreSkool ERP — Cloudflare Worker (Edge Functions)
 * Handles: caching, security headers, rate limiting, geo-routing,
 *          maintenance mode, and API response optimization
 * ═══════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
    ORIGIN: 'https://erp.preskool.com',
    API_PREFIX: '/api/',
    MAINTENANCE_MODE: false,
    RATE_LIMIT: { maxRequests: 100, windowMs: 60000 },
    ALLOWED_COUNTRIES: ['IN', 'US', 'GB', 'AE', 'SG'],
    CACHE_TTL: {
        static: 31536000,   // 1 year
        html: 300,          // 5 minutes
        api: 0,             // no cache
    },
};

// ── In-memory rate limiter (per isolate) ─────────────────────────────
const rateLimitMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > CONFIG.RATE_LIMIT.windowMs) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false;
    }

    entry.count++;
    if (entry.count > CONFIG.RATE_LIMIT.maxRequests) {
        return true; // Rate limited
    }
    return false;
}

// ── Security Headers ─────────────────────────────────────────────────
function addSecurityHeaders(response) {
    const headers = new Headers(response.headers);

    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    headers.set('Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.razorpay.com"
    );

    // Remove server info
    headers.delete('Server');
    headers.delete('X-Powered-By');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// ── Maintenance Page ─────────────────────────────────────────────────
function maintenanceResponse() {
    return new Response(
        `<!DOCTYPE html>
    <html><head><title>PreSkool ERP — Maintenance</title>
    <style>
      body { font-family: 'Inter', sans-serif; display: flex; align-items: center;
             justify-content: center; min-height: 100vh; margin: 0;
             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
      .card { text-align: center; padding: 3rem; background: rgba(255,255,255,0.1);
              border-radius: 1rem; backdrop-filter: blur(10px); max-width: 500px; }
      h1 { font-size: 2rem; margin-bottom: 1rem; }
      p { opacity: 0.9; line-height: 1.6; }
    </style></head>
    <body><div class="card">
      <h1>🔧 Scheduled Maintenance</h1>
      <p>PreSkool ERP is undergoing scheduled maintenance.<br>
      We'll be back shortly. Thank you for your patience!</p>
    </div></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '600' } }
    );
}

// ── Main Handler ─────────────────────────────────────────────────────
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const country = request.headers.get('CF-IPCountry') || 'XX';

        // 1. Maintenance mode
        if (CONFIG.MAINTENANCE_MODE && !url.pathname.startsWith('/api/v1/health')) {
            return maintenanceResponse();
        }

        // 2. Rate limiting
        if (checkRateLimit(ip)) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
            });
        }

        // 3. Health check (bypass everything)
        if (url.pathname === '/health' || url.pathname === '/api/v1/health') {
            return fetch(request);
        }

        // 4. API requests — pass through, no edge caching
        if (url.pathname.startsWith(CONFIG.API_PREFIX)) {
            const response = await fetch(request);
            return addSecurityHeaders(response);
        }

        // 5. Static assets — aggressive edge caching
        if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$/)) {
            const cacheKey = new Request(url.toString(), request);
            const cache = caches.default;

            // Check cache first
            let response = await cache.match(cacheKey);
            if (response) {
                return addSecurityHeaders(response);
            }

            // Fetch from origin
            response = await fetch(request);
            const cachedResponse = new Response(response.body, response);
            cachedResponse.headers.set('Cache-Control', `public, max-age=${CONFIG.CACHE_TTL.static}, immutable`);
            ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
            return addSecurityHeaders(cachedResponse);
        }

        // 6. HTML pages — short edge cache
        const response = await fetch(request);
        const modifiedResponse = new Response(response.body, response);
        modifiedResponse.headers.set('Cache-Control', `public, max-age=${CONFIG.CACHE_TTL.html}, s-maxage=${CONFIG.CACHE_TTL.html}`);
        return addSecurityHeaders(modifiedResponse);
    },
};
