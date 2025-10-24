// ============================================================================
// INTEGRATION ROUTES - Main router for all integration endpoints
// ============================================================================

import { Router } from 'express';
import budgetRoutes from './budget.routes';

const router = Router();

// Budget microservice integration routes
router.use('/budgets', budgetRoutes);

// Health check for integration endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'ftms-integration',
    timestamp: new Date().toISOString(),
  });
});

export default router;
