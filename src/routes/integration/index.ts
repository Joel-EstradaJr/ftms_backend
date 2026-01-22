// ============================================================================
// INTEGRATION ROUTES - Main router for all integration endpoints
// ============================================================================

import { Router } from 'express';
import budgetRoutes from './budget.routes';
import payrollRoutes from './payroll.routes';
import approvalRoutes from './approval.routes';
import operationsRoutes from './operations.routes';
import purchaseRequestRoutes from './purchaseRequest.routes';

const router = Router();

// Budget microservice integration routes
router.use('/budgets', budgetRoutes);

// Payroll microservice integration routes
router.use('/', payrollRoutes);

// Approval routes (Cash Advance from EMS)
router.use('/approval', approvalRoutes);

// Health check for integration endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ftms-integration',
    timestamp: new Date().toISOString(),
  });
});

export default router;

