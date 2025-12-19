"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCacheScheduler = ensureCacheScheduler;
const refresh_1 = __importDefault(require("../cache/refresh"));
const prisma_1 = require("../prisma");
// Use globals to persist across HMR and multiple imports
const g = globalThis;
let started = g.__FTMS_CACHE_SCHEDULER_STARTED__ || false;
let intervalHandle = g.__FTMS_CACHE_SCHEDULER_INTERVAL__ || null;
// REFRESH_INTERVAL is seconds (integer). Example: 60 => 1 minute; 10 => 10 seconds
function parseIntervalSeconds(input, fallbackSeconds) {
    if (!input)
        return fallbackSeconds;
    const s = input.trim();
    const num = Number(s);
    if (!Number.isFinite(num))
        return fallbackSeconds;
    // Enforce minimum 10 seconds
    return Math.max(10, Math.floor(num));
}
function isBuildTime() {
    // Heuristics to detect Next build/pre-render phases
    if (process.env.npm_lifecycle_event === 'build')
        return true;
    if (process.env.NEXT_PHASE === 'phase-production-build')
        return true;
    // During build, NEXT_RUNTIME is typically undefined
    if (!process.env.NEXT_RUNTIME)
        return true;
    return false;
}
function shouldStart() {
    // Only when explicitly enabled
    if (process.env.ENABLE_CACHE_SCHEDULER !== 'true')
        return false;
    // Skip during build/pre-render
    if (isBuildTime())
        return false;
    return true;
}
async function startScheduler() {
    if (started)
        return;
    if (!shouldStart())
        return;
    // Cross-process guard: try to acquire an advisory lock so only one scheduler runs per DB
    try {
        const rows = await prisma_1.prisma.$queryRaw `SELECT pg_try_advisory_lock(953180, 271828) AS locked`;
        const locked = Array.isArray(rows) ? Boolean(rows[0]?.locked) : false;
        if (!locked) {
            console.log('[cache] scheduler not started (another process holds lock)');
            return;
        }
    }
    catch (e) {
        console.error('[cache] failed to acquire advisory lock; not starting scheduler', e);
        return;
    }
    started = true;
    g.__FTMS_CACHE_SCHEDULER_STARTED__ = true;
    // Kick once at startup only if caches appear empty, to avoid refreshes on UI reloads
    (async () => {
        try {
            const [bt, emp, pr] = await Promise.all([
                prisma_1.prisma.busTripCache.count(),
                prisma_1.prisma.employeeCache.count(),
                prisma_1.prisma.payrollCache.count(),
            ]);
            const isEmpty = (bt + emp + pr) === 0;
            if (isEmpty) {
                await (0, refresh_1.default)();
            }
        }
        catch (e) {
            console.error('[cache] initial refresh check failed', e);
        }
    })();
    // Interval (default 5 minutes). REFRESH_INTERVAL is in seconds.
    const seconds = parseIntervalSeconds(process.env.REFRESH_INTERVAL, 5 * 60);
    const intervalMs = seconds * 1000;
    intervalHandle = setInterval(() => {
        (0, refresh_1.default)().catch((e) => console.error("[cache] interval refresh failed", e));
    }, intervalMs);
    g.__FTMS_CACHE_SCHEDULER_INTERVAL__ = intervalHandle;
    console.log(`[cache] scheduler started (${seconds}s)`);
}
// Explicit initializer exported; no auto-start on import
async function ensureCacheScheduler() {
    await startScheduler();
}
//# sourceMappingURL=scheduler.js.map