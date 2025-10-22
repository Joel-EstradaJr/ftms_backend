import { Router } from 'express';
import { ExpenseController } from '../../controllers/expense.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new ExpenseController();

// Apply authentication and staff authorization middleware
router.use(authenticate);
router.use(authorize('staff'));

/**
 * Staff Expense Routes - Limited Access
 * 
 * Permissions:
 * - View expenses (list, detail)
 * - Add new expenses (small amounts, large amounts require admin approval)
 * 
 * Restrictions:
 * - Cannot edit expenses
 * - Cannot delete expenses
 * - Cannot approve/reject expenses
 * - Cannot view expense statistics
 * - Cannot export expense data
 */

// List expenses (staff can view their department's expenses)
router.get('/', controller.listExpenses);

// Create new expense (large amounts will require admin approval)
router.post('/', controller.createExpense);

// Get expense by ID (staff can view expense details)
router.get('/:id', controller.getExpenseById);

// Note: No PUT, DELETE, approve, reject, stats, or export routes for staff

export default router;
