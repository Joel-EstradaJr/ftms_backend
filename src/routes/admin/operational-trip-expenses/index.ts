// ============================================================================
// OPERATIONAL TRIP EXPENSE ROUTES
// Admin routes for operational trip expense management
// ============================================================================

import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/authorize';
import { OperationalTripExpenseController } from '../../../controllers/operationalTripExpense.controller';

const router = Router();
const controller = new OperationalTripExpenseController();

// Apply authentication and admin authorization middleware
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// REFERENCE DATA ENDPOINTS (Static/Dropdown data)
// These are placed BEFORE dynamic :id routes to avoid conflicts
// ============================================================================

// GET /api/operational-trip-expenses/export - Export expenses with summary
router.get('/export', controller.exportExpenses);

// GET /api/operational-trip-expenses/expense-types - Get expense types for dropdown
router.get('/expense-types', controller.getExpenseTypes);

// GET /api/operational-trip-expenses/payment-methods - Get payment methods for dropdown
router.get('/payment-methods', controller.getPaymentMethods);

// GET /api/operational-trip-expenses/chart-of-accounts - Get COA for dropdown
router.get('/chart-of-accounts', controller.getChartOfAccounts);

// GET /api/operational-trip-expenses/operational-trips - Get operational trips for dropdown
router.get('/operational-trips', controller.getOperationalTrips);

// GET /api/operational-trip-expenses/rental-trips - Get rental trips for dropdown
router.get('/rental-trips', controller.getRentalTrips);

// GET /api/operational-trip-expenses/employees - Proxy to HR employees API
router.get('/employees', controller.getEmployees);

// ============================================================================
// CRUD ENDPOINTS
// ============================================================================

// GET /api/operational-trip-expenses - List expenses with filters and pagination
router.get('/', controller.listExpenses);

// POST /api/operational-trip-expenses - Create new expense
router.post('/', controller.createExpense);

// GET /api/operational-trip-expenses/:id - Get single expense by ID
router.get('/:id', controller.getExpenseById);

// PATCH /api/operational-trip-expenses/:id - Update expense
router.patch('/:id', controller.updateExpense);

// PATCH /api/operational-trip-expenses/:id/soft-delete - Soft delete expense
router.patch('/:id/soft-delete', controller.softDeleteExpense);

// DELETE /api/operational-trip-expenses/:id - Hard delete expense (permanent)
router.delete('/:id', controller.hardDeleteExpense);

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

// POST /api/operational-trip-expenses/:id/approve - Approve expense
router.post('/:id/approve', controller.approveExpense);

// POST /api/operational-trip-expenses/:id/reject - Reject expense
router.post('/:id/reject', controller.rejectExpense);

export default router;
