import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { cache, CacheTTL } from '../utils/cache';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request deduplication ─────────────────────────────────────────────────────
// Map of in-flight GET requests: url → Promise
// Prevents duplicate parallel requests for the same resource.
const pendingRequests = new Map<string, Promise<unknown>>();

// ── Request interceptor — attach token ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — caching + auto-logout on 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } },
          );

          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      store.dispatch(logout());
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

// ── Cached GET helper ─────────────────────────────────────────────────────────
/**
 * Performs a cached GET request.
 *
 * - Returns cached response within the TTL window.
 * - Deduplicates parallel in-flight requests for the same URL.
 * - Bypasses cache when the server responds with `Cache-Control: no-cache`.
 *
 * @param url     API path (e.g. '/students')
 * @param ttlMs   Cache TTL in ms (default: CacheTTL.MEDIUM = 60 s)
 * @param params  Query params object (appended to cache key)
 */
export async function cachedGet<T>(
  url: string,
  ttlMs: number = CacheTTL.MEDIUM,
  params?: Record<string, unknown>,
): Promise<T> {
  const cacheKey = params ? `${url}?${new URLSearchParams(params as Record<string, string>).toString()}` : url;

  // 1. Cache hit
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) return cached;

  // 2. Deduplicate in-flight requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Fire request
  const requestPromise = api
    .get<T>(url, { params })
    .then((res) => {
      // Respect server-side no-cache directive
      const cacheControl = res.headers['cache-control'] ?? '';
      if (!cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
        cache.set(cacheKey, res.data, ttlMs);
      }
      return res.data;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, requestPromise as Promise<unknown>);
  return requestPromise;
}

/**
 * Invalidate a specific cached GET URL (e.g. after a mutation).
 */
export function invalidateCache(url: string): void {
  cache.invalidatePrefix(url);
}

export default api;
