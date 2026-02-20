/**
 * Lightweight TTL-based cache utility.
 *
 * Supports two storage tiers:
 *  1. In-memory Map (always used — fast, cleared on page reload)
 *  2. localStorage (opt-in — survives page reload, good for reference data)
 *
 * Usage:
 *   cache.set('students-list', data, 60_000);   // 60 s TTL
 *   const hit = cache.get('students-list');      // null if expired/missing
 *   cache.invalidate('students-list');
 *   cache.clear();
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number; // ms since epoch
}

class Cache {
    private memStore = new Map<string, CacheEntry<unknown>>();

    // ─── Read ─────────────────────────────────────────────────────────────────

    get<T>(key: string, useLocalStorage = false): T | null {
        // 1. Check in-memory first
        const memEntry = this.memStore.get(key) as CacheEntry<T> | undefined;
        if (memEntry) {
            if (Date.now() < memEntry.expiresAt) {
                return memEntry.value;
            }
            this.memStore.delete(key);
        }

        // 2. Optionally check localStorage
        if (useLocalStorage) {
            try {
                const raw = localStorage.getItem(`__cache__${key}`);
                if (raw) {
                    const lsEntry: CacheEntry<T> = JSON.parse(raw);
                    if (Date.now() < lsEntry.expiresAt) {
                        // Warm in-memory cache
                        this.memStore.set(key, lsEntry);
                        return lsEntry.value;
                    }
                    localStorage.removeItem(`__cache__${key}`);
                }
            } catch {
                // localStorage unavailable or corrupted — ignore
            }
        }

        return null;
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    set<T>(key: string, value: T, ttlMs: number, persist = false): void {
        const entry: CacheEntry<T> = {
            value,
            expiresAt: Date.now() + ttlMs,
        };
        this.memStore.set(key, entry);

        if (persist) {
            try {
                localStorage.setItem(`__cache__${key}`, JSON.stringify(entry));
            } catch {
                // Quota exceeded or private mode — ignore
            }
        }
    }

    // ─── Invalidate ───────────────────────────────────────────────────────────

    invalidate(key: string): void {
        this.memStore.delete(key);
        try {
            localStorage.removeItem(`__cache__${key}`);
        } catch {
            // ignore
        }
    }

    /** Invalidate all keys that start with the given prefix */
    invalidatePrefix(prefix: string): void {
        for (const key of this.memStore.keys()) {
            if (key.startsWith(prefix)) {
                this.invalidate(key);
            }
        }
    }

    // ─── Clear all ────────────────────────────────────────────────────────────

    clear(): void {
        this.memStore.clear();
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith('__cache__')) keysToRemove.push(k);
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {
            // ignore
        }
    }
}

// Singleton — import this everywhere
export const cache = new Cache();

/** Default TTLs in milliseconds */
export const CacheTTL = {
    SHORT: 30_000,       // 30 seconds  — volatile data (attendance, live feed)
    MEDIUM: 60_000,      // 1 minute    — list pages (students, teachers)
    LONG: 5 * 60_000,    // 5 minutes   — reference data (classes, subjects, rooms)
    PERSIST: 30 * 60_000, // 30 minutes — settings, user profile (with localStorage)
} as const;
