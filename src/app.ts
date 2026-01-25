import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger, addDocsInfoToHealth, validateSwaggerSpec } from './middleware/swagger.middleware';

// Routes
// Temporarily commented out routes with compilation errors
// import staffRevenueRoutes from './routes/staff/revenue.routes';
import staffExpenseRoutes from './routes/staff/expense.routes';
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
import operationalTripExpenseRoutes from './routes/admin/operational-trip-expenses';
import staffJournalEntryRoutes from './routes/staff/journalEntry.routes';

// Integration routes (for microservices)
import integrationRoutes from './routes/integration';

// Finance integration routes
import financeRoutes from './routes/finance';

// Sync routes (for external data synchronization)
import syncRoutes from './routes/sync.routes';

export const createApp = (): Application => {
  const app = express();

  // Validate Swagger specification on startup (if enabled)
  if (config.enableApiDocs) {
    validateSwaggerSpec();
  }

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.nodeEnv === 'development' ? true : config.corsOrigins,
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

  // Setup Swagger/OpenAPI documentation (if enabled)
  setupSwagger(app);

  // Health check
  app.get('/health', addDocsInfoToHealth, (req, res) => {
    const response: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    };

    // Add API documentation links if enabled
    if (res.locals.docsInfo?.enabled) {
      response.documentation = {
        swagger_ui: res.locals.docsInfo.path,
        openapi_spec: res.locals.docsInfo.openApiSpec,
      };
    }

    res.json(response);
  });

  // API info endpoint
  app.get('/', (req, res) => {
    const response: any = {
      name: 'FTMS Backend API',
      version: '1.0.0',
      description: 'Financial Transaction Management System - Pure Backend',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    };

    // Add documentation link if enabled
    if (config.enableApiDocs) {
      response.documentation = config.apiDocsPath;
    }

    res.json(response);
  });

  // ===========================
  // API Routes
  // ===========================

  // Admin routes (Full CRUD + additional actions)
  app.use('/api/v1/admin', chartOfAccountsRoutes);
  app.use('/api/v1/admin/payroll-periods', adminPayrollPeriodsRoutes);
  app.use('/api/v1/admin/journal-entries', adminJournalEntriesRoutes);

  // Operational Trip Expense routes (dedicated module)
  app.use('/api/operational-trip-expenses', operationalTripExpenseRoutes);

  // Staff routes (Limited access - read + create for some modules)
  // Temporarily commented out routes with compilation errors
  // app.use('/api/v1/staff/revenues', staffRevenueRoutes);
  app.use('/api/v1/staff/expenses', staffExpenseRoutes);
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

  // Finance integration routes (external system integration)
  app.use('/finance', financeRoutes);

  // Sync routes (external data synchronization)
  app.use('/api/sync', syncRoutes);

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
