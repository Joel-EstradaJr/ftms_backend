import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { initPayrollScheduledJobs } from './jobs/payrollScheduledJobs';
import { syncExternalData } from '../lib/sync';
import { busTripRevenueService } from './services/busTripRevenue.service';

const app = createApp();

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Initialize scheduled jobs
    initPayrollScheduledJobs();

    // Sync external data on startup
    logger.info('🔄 Starting external data synchronization...');
    try {
      const syncResult = await syncExternalData();
      if (syncResult.success) {
        logger.info('✅ External data synchronized successfully');
      } else {
        logger.warn('⚠️ External data sync completed with some errors - check logs for details');
      }

      // Automatically process unsynced bus trips to create revenue records
      logger.info('🔄 Processing unsynced bus trips for revenue creation...');
      try {
        const revenueResult = await busTripRevenueService.processUnsyncedTrips('system');
        logger.info(`✅ Revenue processing complete: ${revenueResult.processed} processed, ${revenueResult.failed} failed`);
      } catch (revenueError) {
        logger.error('❌ Revenue processing failed:', revenueError);
        // Don't block server startup on revenue processing failure
      }
    } catch (syncError) {
      logger.error('❌ External data sync failed:', syncError);
      // Don't block server startup on sync failure
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info('🚀 FTMS Backend Server started successfully');
      logger.info(`📍 Port: ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
      logger.info(`📚 API documentation: http://localhost:${config.port}/docs`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await prisma.$disconnect();
          logger.info('Database disconnected');
        } catch (err) {
          logger.error('Error disconnecting database:', err);
        }

        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
