import { Router } from 'express';
import { ExpenseController } from '../../controllers/expense.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new ExpenseController();

// Apply authentication and admin authorization middleware
router.use(authenticate);
router.use(authorize('admin'));

/**
 * Admin Expense Routes - Full CRUD Access
 * 
 * Permissions:
 * - View all expenses (list, detail)
 * - Add new expenses
 * - Edit existing expenses
 * - Delete expenses (soft delete)
 * - Approve/Reject expenses (for large amounts)
 * - View expense statistics
 * - Export expense data
 */

// Get expense statistics
router.get('/stats', controller.getExpenseStats);

// List expenses with filters
router.get('/', controller.listExpenses);

// Create new expense
router.post('/', controller.createExpense);

// Get expense by ID
router.get('/:id', controller.getExpenseById);

// Update expense
router.put('/:id', controller.updateExpense);

// Delete expense (soft delete)
router.delete('/:id', controller.deleteExpense);

// Approve expense
router.post('/:id/approve', controller.approveExpense);

// Reject expense
router.post('/:id/reject', controller.rejectExpense);

// TODO: Export endpoint
// router.get('/export', controller.exportExpenses);

export default router;
