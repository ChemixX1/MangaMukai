interface PublicDataCacheOptions<T> {
  ttlMs: number;
  maxEntries: number;
  shouldCache?: (value: T) => boolean;
}

/** Bounded, short-lived cache for public GET data only; never use for account access. */
export function createPublicDataCache<T>({ ttlMs, maxEntries, shouldCache = () => true }: PublicDataCacheOptions<T>) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  const pending = new Map<string, Promise<T>>();

  const peek = (key: string): T | undefined => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    // Map insertion order gives a small LRU without another index.
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  };

  const load = (key: string, fetcher: () => Promise<T>): Promise<T> => {
    const cached = peek(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const existing = pending.get(key);
    if (existing) return existing;

    const request = Promise.resolve().then(fetcher).then(value => {
      if (shouldCache(value)) {
        const now = Date.now();
        for (const [entryKey, entry] of entries) {
          if (entry.expiresAt <= now) entries.delete(entryKey);
        }
        entries.set(key, { value, expiresAt: now + ttlMs });
        while (entries.size > Math.max(0, maxEntries)) {
          const oldest = entries.keys().next().value;
          if (oldest === undefined) break;
          entries.delete(oldest);
        }
      }
      return value;
    }).finally(() => { pending.delete(key); });
    pending.set(key, request);
    return request;
  };

  return { peek, load };
}
