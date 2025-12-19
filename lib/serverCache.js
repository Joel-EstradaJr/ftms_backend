"use strict";
// Simple in-memory server-side cache for API route memoization
// Not for secrets; resets on process restart or HMR.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultTtlMs = getDefaultTtlMs;
exports.getFromCache = getFromCache;
exports.setInCache = setInCache;
exports.getOrSet = getOrSet;
exports.clearCache = clearCache;
const cache = new Map();
function now() {
    return Date.now();
}
function getDefaultTtlMs() {
    const seconds = Number(process.env.REFRESH_INTERVAL || '300');
    // Minimum 30s, default ~5 minutes
    const ttl = Math.max(30, seconds) * 1000;
    return ttl;
}
function getFromCache(key) {
    const entry = cache.get(key);
    if (!entry)
        return undefined;
    if (entry.expiresAt <= now()) {
        cache.delete(key);
        return undefined;
    }
    return entry.value;
}
function setInCache(key, value, ttlMs) {
    const ttl = typeof ttlMs === 'number' ? ttlMs : getDefaultTtlMs();
    cache.set(key, { value, expiresAt: now() + ttl });
}
async function getOrSet(key, loader, ttlMs) {
    const hit = getFromCache(key);
    if (hit !== undefined)
        return hit;
    const value = await loader();
    setInCache(key, value, ttlMs);
    return value;
}
function clearCache(prefix) {
    if (!prefix) {
        cache.clear();
        return;
    }
    for (const k of cache.keys()) {
        if (k.startsWith(prefix))
            cache.delete(k);
    }
}
//# sourceMappingURL=serverCache.js.map