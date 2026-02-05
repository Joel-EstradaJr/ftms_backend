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
// Staff routes (feature parity with admin - same business logic)
import staffDashboardRoutes from './routes/staff/dashboard.routes';
import staffBusTripRevenueRoutes from './routes/staff/bus-trip-revenue';
import staffRentalRevenueRoutes from './routes/staff/rental-revenue';
import staffOtherRevenueRoutes from './routes/staff/otherRevenue.routes';
import staffOperationalExpenseRoutes from './routes/staff/operational-expenses';
import staffOtherExpenseRoutes from './routes/staff/other-expense';

import chartOfAccountsRoutes from './routes/admin/chart-of-accounts';
import adminPayrollPeriodsRoutes from './routes/admin/payroll-periods';
// Removed: adminJournalEntriesRoutes - replaced by universal /api/journal-entry routes
// Removed: operationalTripExpenseRoutes - legacy endpoint, replaced by unified expense module
import dashboardRoutes from './routes/admin/dashboard.routes';
import budgetAllocationRoutes from './routes/admin/budget-allocation';
import operationalExpenseRoutes from './routes/admin/operational-expenses';  // New unified operational expenses
import otherExpenseRoutes from './routes/admin/other-expense';  // Administrative/Other Expense module
import busTripRevenueRoutes from './routes/admin/bus-trip-revenue';
import rentalRevenueRoutes from './routes/admin/rental-revenue';
import otherRevenueRoutes from './routes/otherRevenue.routes';  // Other Revenue module
import attachmentRoutes from './routes/admin/attachments';  // Attachment module
import supplierRoutes from './routes/admin/suppliers';  // Supplier/Vendor module
import reportRoutes from './routes/admin/reports';  // Financial Reports module
// Removed: staffJournalEntryRoutes - replaced by universal /api/journal-entry routes

// Integration routes (for microservices)
import integrationRoutes from './routes/integration';

// Finance integration routes
// import financeRoutes from './routes/finance/index';   // brian repo
import financeRoutes from './routes/finance';

// Sync routes (for external data synchronization)
import syncRoutes from './routes/sync.routes';

// Webhook routes (for external system lifecycle events)
import webhookRoutes from './routes/webhook.routes';

// Journal Entry routes (automated JE system)
import journalEntryRoutes from './routes/journalEntry.routes';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy headers (required for Railway, Heroku, AWS ELB, etc.)
  // This allows req.protocol to correctly return 'https' when behind a reverse proxy
  // Railway sets X-Forwarded-Proto header which Express will use when this is enabled
  app.set('trust proxy', 1);

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
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/admin/budget-allocation', budgetAllocationRoutes);
  app.use('/api/v1/admin/payroll-periods', adminPayrollPeriodsRoutes);
  app.use('/api/v1/admin/journal-entry', journalEntryRoutes);  // Automated JE system under Admin namespace
  app.use('/api/v1/admin/bus-trip-revenue', busTripRevenueRoutes);  // Bus Trip Revenue module
  app.use('/api/v1/admin/rental-revenue', rentalRevenueRoutes);  // Rental Revenue module
  app.use('/api/v1/admin/other-revenue', otherRevenueRoutes);  // Other Revenue module
  app.use('/api/v1/admin/attachments', attachmentRoutes);  // Attachment module
  app.use('/api/v1/admin/operational-expenses', operationalExpenseRoutes);  // Operational Expense module
  app.use('/api/v1/admin/other-expense', otherExpenseRoutes);  // Administrative/Other Expense module
  app.use('/api/v1/admin/suppliers', supplierRoutes);  // Supplier/Vendor module
  app.use('/api/v1/reports', reportRoutes);  // Financial Reports module
  app.use('/api/v1/admin', chartOfAccountsRoutes);

  // Staff routes (Full feature parity with Admin - same business logic, same behavior)
  // Revenue modules
  app.use('/api/v1/staff/bus-trip-revenue', staffBusTripRevenueRoutes);  // Bus Trip Revenue module
  app.use('/api/v1/staff/rental-revenue', staffRentalRevenueRoutes);  // Rental Revenue module
  app.use('/api/v1/staff/other-revenue', staffOtherRevenueRoutes);  // Other Revenue module
  // Expense modules
  app.use('/api/v1/staff/operational-expenses', staffOperationalExpenseRoutes);  // Operational Expense module
  app.use('/api/v1/staff/other-expense', staffOtherExpenseRoutes);  // Administrative/Other Expense module
  // Dashboard
  app.use('/api/v1/staff/dashboard', staffDashboardRoutes);  // Dashboard module

  // Integration routes (machine-to-machine communication)
  app.use('/api/integration', integrationRoutes);

  // Finance integration routes (external system integration)
  // app.use('/api/finance', financeRoutes);  // brian repo
  app.use('/finance', financeRoutes);

  // Sync routes (external data synchronization)
  app.use('/api/sync', syncRoutes);

  // Webhook routes (external system lifecycle events)
  app.use('/api/webhooks', webhookRoutes);

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
