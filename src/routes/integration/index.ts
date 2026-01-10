// ============================================================================
// INTEGRATION ROUTES - Main router for all integration endpoints
// ============================================================================

import { Router } from 'express';
import budgetRoutes from './budget.routes';
import payrollRoutes from './payroll.routes';

const router = Router();

// Budget microservice integration routes
router.use('/budgets', budgetRoutes);

// Payroll microservice integration routes
router.use('/', payrollRoutes);

// Health check for integration endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ftms-integration',
    timestamp: new Date().toISOString(),
  });
});

export default router;
