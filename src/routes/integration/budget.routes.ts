// ============================================================================
// BUDGET INTEGRATION ROUTES - Endpoints for Budget microservice
// ============================================================================

import { Router } from 'express';
import {
  reserveBudgetFunds,
  getDepartmentBudget,
} from '../../controllers/integration/budget.controller';
import {
  validateServiceApiKey,
  requireWritePermission,
} from '../../middleware/serviceApiKey.middleware';

const router = Router();

/**
 * POST /api/integration/budgets/reserve
 * Reserve budget funds (requires write permission)
 */
router.post(
  '/reserve',
  validateServiceApiKey,
  requireWritePermission,
  reserveBudgetFunds
);

/**
 * GET /api/integration/budgets/department/:department
 * Get department budget information (read-only)
 */
router.get(
  '/department/:department',
  validateServiceApiKey,
  getDepartmentBudget
);

export default router;
