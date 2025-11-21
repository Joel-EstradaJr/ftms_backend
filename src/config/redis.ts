import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let redisErrorLogged = false;

export const redis = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    // Stop retrying after 3 attempts
    if (times > 3) {
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't auto-connect, let server.ts handle it
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
  redisErrorLogged = false; // Reset error flag on successful connection
});

redis.on('error', (err) => {
  // Only log the first error to avoid spam
  if (!redisErrorLogged) {
    logger.error('❌ Redis connection error:', {
      code: (err as any).code,
      message: err.message,
    });
    redisErrorLogged = true;
  }
});

redis.on('close', () => {
  if (!redisErrorLogged) {
    logger.warn('⚠️ Redis connection closed');
  }
});

export default redis;
