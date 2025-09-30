// Simple in-memory server-side cache for API route memoization
// Not for secrets; resets on process restart or HMR.

type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<any>>();

function now() {
  return Date.now();
}

export function getDefaultTtlMs() {
  const seconds = Number(process.env.REFRESH_INTERVAL || '300');
  // Minimum 30s, default ~5 minutes
  const ttl = Math.max(30, seconds) * 1000;
  return ttl;
}

export function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setInCache<T>(key: string, value: T, ttlMs?: number) {
  const ttl = typeof ttlMs === 'number' ? ttlMs : getDefaultTtlMs();
  cache.set(key, { value, expiresAt: now() + ttl });
}

export async function getOrSet<T>(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T> {
  const hit = getFromCache<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  setInCache(key, value, ttlMs);
  return value;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}
