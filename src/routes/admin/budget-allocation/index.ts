// ============================================================================
// BUDGET ALLOCATION ROUTES - Admin endpoints for budget management
// ============================================================================

import { Router } from 'express';
import {
    getDepartmentBudgets,
    allocateBudget,
    deductBudget,
    getAllocationHistory,
} from '../../../controllers/budgetAllocation.controller';

const router = Router();

/**
 * GET /api/v1/admin/budget-allocation
 * Get all department budgets for a specific period
 * Query params: period (YYYY-MM format)
 */
router.get('/', getDepartmentBudgets);

/**
 * POST /api/v1/admin/budget-allocation/allocate
 * Allocate budget to a department
 * Body: { department_id, amount, period, notes? }
 */
router.post('/allocate', allocateBudget);

/**
 * POST /api/v1/admin/budget-allocation/deduct
 * Deduct budget from a department
 * Body: { department_id, amount, period, notes? }
 */
router.post('/deduct', deductBudget);

/**
 * GET /api/v1/admin/budget-allocation/:departmentId/history
 * Get allocation history for a department
 * Query params: type?, dateFrom?, dateTo?, page?, limit?
 */
router.get('/:departmentId/history', getAllocationHistory);

export default router;
