/**
 * Other Revenue Routes (Admin)
 * Full CRUD access for other revenue management
 */

import { Router } from 'express';
import { OtherRevenueController } from '../../../controllers/otherRevenue.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/authorize';

const router = Router();
const controller = new OtherRevenueController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// ==========================================================================
// REVENUE TYPES
// ==========================================================================

/**
 * @route   GET /api/v1/admin/other-revenues/types
 * @desc    Get all available revenue types (excluding TRIP and RENTAL)
 * @access  Admin
 */
router.get('/types', controller.getRevenueTypes);

// ==========================================================================
// RECEIVABLES
// ==========================================================================

/**
 * @route   GET /api/v1/admin/other-revenues/receivables/:receivableId
 * @desc    Get receivable details with installment schedule
 * @access  Admin
 */
router.get('/receivables/:receivableId', controller.getReceivableDetails);

// ==========================================================================
// INSTALLMENT PAYMENTS
// ==========================================================================

/**
 * @route   POST /api/v1/admin/other-revenues/installments/:installmentId/payments
 * @desc    Record an installment payment with cascade overflow logic
 * @access  Admin
 * @body    { amount_paid, payment_date, payment_method?, payment_reference? }
 */
router.post('/installments/:installmentId/payments', controller.recordInstallmentPayment);

// ==========================================================================
// CRUD OPERATIONS
// ==========================================================================

/**
 * @route   GET /api/v1/admin/other-revenues
 * @desc    List other revenue records with filtering and pagination
 * @access  Admin
 * @query   page, limit, sortBy, order, search, dateFrom, dateTo, amountFrom, amountTo, status, revenue_type_id
 */
router.get('/', controller.list);

/**
 * @route   GET /api/v1/admin/other-revenues/:id
 * @desc    Get a single other revenue record by ID
 * @access  Admin
 */
router.get('/:id', controller.getById);

/**
 * @route   GET /api/v1/admin/other-revenues/:id/schedule
 * @desc    Get installment schedule for a revenue record
 * @access  Admin
 */
router.get('/:id/schedule', controller.getInstallmentSchedule);

/**
 * @route   POST /api/v1/admin/other-revenues
 * @desc    Create a new other revenue record
 * @access  Admin
 * @body    { revenue_type_id, amount, date_recorded, description?, payment_method?, payment_reference?,
 *            is_unearned_revenue?, debtor_ref?, debtor_name?, installment_plan?, due_date?, schedule_items? }
 */
router.post('/', controller.create);

/**
 * @route   PUT /api/v1/admin/other-revenues/:id
 * @desc    Update an other revenue record
 * @access  Admin
 * @body    { description?, payment_method?, payment_reference?, amount?, installment_plan?, schedule_items? }
 * @note    Amount and schedule can only be updated if no payments have been made
 */
router.put('/:id', controller.update);

/**
 * @route   DELETE /api/v1/admin/other-revenues/:id
 * @desc    Soft delete an other revenue record
 * @access  Admin
 * @body    { reason } - Required deletion reason for audit trail
 * @note    Cannot delete if payments have been made
 */
router.delete('/:id', controller.delete);

export default router;
