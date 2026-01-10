import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';

// Routes
// Temporarily commented out routes with compilation errors
// import staffRevenueRoutes from './routes/staff/revenue.routes';
// import staffExpenseRoutes from './routes/staff/expense.routes';
// import staffPayrollRoutes from './routes/staff/payroll.routes';
// import staffReimbursementRoutes from './routes/staff/reimbursement.routes';
// import staffBudgetRoutes from './routes/staff/budget.routes';
// import staffJournalEntryRoutes from './routes/staff/journalEntry.routes';
// import staffAssetRoutes from './routes/staff/asset.routes';
// import staffReceivableRoutes from './routes/staff/receivable.routes';
// import staffPayableRoutes from './routes/staff/payable.routes';
// import staffLoanRoutes from './routes/staff/loan.routes';
import chartOfAccountsRoutes from './routes/admin/chart-of-accounts';
import adminPayrollPeriodsRoutes from './routes/admin/payroll-periods';
import adminJournalEntriesRoutes from './routes/admin/journal-entries';
import staffJournalEntryRoutes from './routes/staff/journalEntry.routes';

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
  app.use('/api/v1/admin', chartOfAccountsRoutes);
  app.use('/api/v1/admin/payroll-periods', adminPayrollPeriodsRoutes);
  app.use('/api/v1/admin/journal-entries', adminJournalEntriesRoutes);
  
  // Staff routes (Limited access - read + create for some modules)
  // Temporarily commented out routes with compilation errors
  // app.use('/api/v1/staff/revenues', staffRevenueRoutes);
  // app.use('/api/v1/staff/expenses', staffExpenseRoutes);
  // app.use('/api/v1/staff/payrolls', staffPayrollRoutes);
  // app.use('/api/v1/staff/reimbursements', staffReimbursementRoutes);
  // app.use('/api/v1/staff/budgets', staffBudgetRoutes);
  app.use('/api/v1/staff/journal-entries', staffJournalEntryRoutes);
  // app.use('/api/v1/staff/assets', staffAssetRoutes);
  // app.use('/api/v1/staff/receivables', staffReceivableRoutes);
  // app.use('/api/v1/staff/payables', staffPayableRoutes);
  // app.use('/api/v1/staff/loans', staffLoanRoutes);

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
