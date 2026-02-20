import { useState, useEffect, useCallback, useRef } from 'react';
import { cache, CacheTTL } from '../utils/cache';

interface CachedQueryResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    /** Force a fresh fetch, bypassing the cache */
    refresh: () => void;
}

/**
 * useCachedQuery — stale-while-revalidate data fetching hook.
 *
 * 1. Returns cached data immediately (if available and not expired).
 * 2. Silently re-fetches in the background to keep data fresh.
 * 3. `refresh()` forces a fresh network call and updates the cache.
 *
 * @param cacheKey  Unique cache key (e.g. 'students-list', `student-${id}`)
 * @param fetchFn   Async function that returns the data
 * @param ttlMs     Cache TTL in milliseconds (default: CacheTTL.MEDIUM = 60 s)
 * @param persist   Whether to persist to localStorage across page reloads
 *
 * @example
 *   const { data, loading, error, refresh } = useCachedQuery(
 *     'students-list',
 *     () => api.get('/students').then(r => r.data),
 *     CacheTTL.MEDIUM,
 *   );
 */
export function useCachedQuery<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = CacheTTL.MEDIUM,
    persist = false,
): CachedQueryResult<T> {
    const cached = cache.get<T>(cacheKey, persist);

    const [data, setData] = useState<T | null>(cached);
    const [loading, setLoading] = useState<boolean>(cached === null);
    const [error, setError] = useState<Error | null>(null);
    const refreshCountRef = useRef(0);

    const execute = useCallback(
        async (forceRefresh: boolean) => {
            if (!forceRefresh) {
                const hit = cache.get<T>(cacheKey, persist);
                if (hit !== null) {
                    setData(hit);
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);
            setError(null);
            try {
                const result = await fetchFn();
                cache.set(cacheKey, result, ttlMs, persist);
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cacheKey, ttlMs, persist],
    );

    // Initial fetch (or when cacheKey changes)
    useEffect(() => {
        execute(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey]);

    const refresh = useCallback(() => {
        refreshCountRef.current += 1;
        execute(true);
    }, [execute]);

    return { data, loading, error, refresh };
}
