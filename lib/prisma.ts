import { PrismaClient } from '@prisma/client'
// Optionally start cache scheduler on server only when explicitly enabled
async function maybeStartScheduler() {
  // skip on client and during build
  if (typeof window !== 'undefined') return;
  if (process.env.ENABLE_CACHE_SCHEDULER !== 'true') return;
  if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') return;
  try {
    const mod = await import('@/lib/cache/scheduler');
    if (typeof mod.ensureCacheScheduler === 'function') {
      await mod.ensureCacheScheduler();
    }
  } catch (e) {
    console.error('[cache] failed to start scheduler', e);
  }
}
// Fire-and-forget; don’t block prisma init
void maybeStartScheduler();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}