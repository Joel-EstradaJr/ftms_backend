import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { config } from './env';

// Build PrismaClient log options. Do NOT enable query events by default
// to avoid noisy SQL prints in the terminal. Enable only when
// PRISMA_LOG_QUERIES=true in the environment.
const enableQueryLogs = process.env.PRISMA_LOG_QUERIES === 'true';

const prisma = new PrismaClient({
  log: [
    // Always listen for errors and warnings
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
    // Conditionally enable query events
    ...(enableQueryLogs ? [{ emit: 'event', level: 'query' }] : []),
  ],
});

// Log database queries only when explicitly enabled
if (enableQueryLogs) {
  prisma.$on('query' as never, (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma warning:', e);
});

export { prisma };
