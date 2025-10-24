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
import adminBudgetRoutes from './routes/admin/budget.routes';
import staffBudgetRoutes from './routes/staff/budget.routes';
import adminJournalEntryRoutes from './routes/admin/journalEntry.routes';
import staffJournalEntryRoutes from './routes/staff/journalEntry.routes';
import adminAssetRoutes from './routes/admin/asset.routes';
import staffAssetRoutes from './routes/staff/asset.routes';
import adminReceivableRoutes from './routes/admin/receivable.routes';
import staffReceivableRoutes from './routes/staff/receivable.routes';
import adminPayableRoutes from './routes/admin/payable.routes';
import staffPayableRoutes from './routes/staff/payable.routes';
import adminLoanRoutes from './routes/admin/loan.routes';
import staffLoanRoutes from './routes/staff/loan.routes';

// Integration routes (for microservices)
import integrationRoutes from './routes/integration';

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
  app.use('/api/v1/admin/budgets', adminBudgetRoutes);
  app.use('/api/v1/admin/journal-entries', adminJournalEntryRoutes);
  app.use('/api/v1/admin/assets', adminAssetRoutes);
  app.use('/api/v1/admin/receivables', adminReceivableRoutes);
  app.use('/api/v1/admin/payables', adminPayableRoutes);
  app.use('/api/v1/admin/loans', adminLoanRoutes);
  
  // Staff routes (Limited access - read + create for some modules)
  app.use('/api/v1/staff/revenues', staffRevenueRoutes);
  app.use('/api/v1/staff/expenses', staffExpenseRoutes);
  app.use('/api/v1/staff/payrolls', staffPayrollRoutes);
  app.use('/api/v1/staff/reimbursements', staffReimbursementRoutes);
  app.use('/api/v1/staff/budgets', staffBudgetRoutes);
  app.use('/api/v1/staff/journal-entries', staffJournalEntryRoutes);
  app.use('/api/v1/staff/assets', staffAssetRoutes);
  app.use('/api/v1/staff/receivables', staffReceivableRoutes);
  app.use('/api/v1/staff/payables', staffPayableRoutes);
  app.use('/api/v1/staff/loans', staffLoanRoutes);

  // Integration routes (machine-to-machine communication)
  app.use('/api/integration', integrationRoutes);

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
