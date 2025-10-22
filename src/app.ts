import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

// Routes
import adminRevenueRoutes from './routes/admin/revenue.routes';
import staffRevenueRoutes from './routes/staff/revenue.routes';
import adminExpenseRoutes from './routes/admin/expense.routes';
import staffExpenseRoutes from './routes/staff/expense.routes';
import adminPayrollRoutes from './routes/admin/payroll.routes';
import staffPayrollRoutes from './routes/staff/payroll.routes';
import adminReimbursementRoutes from './routes/admin/reimbursement.routes';
import staffReimbursementRoutes from './routes/staff/reimbursement.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // HTTP request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // API info endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'FTMS Backend API',
      version: '1.0.0',
      description: 'Financial Transaction Management System - Pure Backend',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    });
  });

  // ===========================
  // API Routes
  // ===========================
  
  // Admin routes (Full CRUD + additional actions)
  app.use('/api/v1/admin/revenues', adminRevenueRoutes);
  app.use('/api/v1/admin/expenses', adminExpenseRoutes);
  app.use('/api/v1/admin/payrolls', adminPayrollRoutes);
  app.use('/api/v1/admin/reimbursements', adminReimbursementRoutes);
  
  // Staff routes (Limited to view + create only)
  app.use('/api/v1/staff/revenues', staffRevenueRoutes);
  app.use('/api/v1/staff/expenses', staffExpenseRoutes);
  app.use('/api/v1/staff/payrolls', staffPayrollRoutes);
  app.use('/api/v1/staff/reimbursements', staffReimbursementRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};
