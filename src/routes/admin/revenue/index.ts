/**
 * Revenue Routes (Admin) - Frontend-compatible aliases
 * 
 * These routes provide aliases for the frontend which expects:
 * - GET /api/admin/revenue/types
 * - GET /api/admin/revenue/other
 * - POST /api/admin/revenue/other
 * - GET /api/admin/revenue/other/:id
 * - PATCH /api/admin/revenue/other/:id
 * - DELETE /api/admin/revenue/other/:id
 * - POST /api/admin/revenue/installment-payment
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
 * @route   GET /api/admin/revenue/types
 * @desc    Get all available revenue types (excluding TRIP and RENTAL)
 * @access  Admin
 */
router.get('/types', controller.getRevenueTypes);

// ==========================================================================
// INSTALLMENT PAYMENTS (Top-level for frontend compatibility)
// ==========================================================================

/**
 * @route   POST /api/admin/revenue/installment-payment
 * @desc    Record an installment payment with cascade overflow logic
 * @access  Admin
 * @body    { installment_id, amount_paid, payment_date, payment_method?, payment_reference? }
 */
router.post('/installment-payment', controller.recordInstallmentPaymentByBody);

// ==========================================================================
// OTHER REVENUE CRUD - Nested under /other
// ==========================================================================

/**
 * @route   GET /api/admin/revenue/other
 * @desc    List other revenue records with filtering and pagination
 * @access  Admin
 * @query   page, limit, sortBy, order, search, dateFrom, dateTo, amountFrom, amountTo, status, revenue_type_id
 */
router.get('/other', controller.list);

/**
 * @route   GET /api/admin/revenue/other/:id
 * @desc    Get a single other revenue record by ID
 * @access  Admin
 */
router.get('/other/:id', controller.getById);

/**
 * @route   GET /api/admin/revenue/other/:id/schedule
 * @desc    Get installment schedule for a revenue record
 * @access  Admin
 */
router.get('/other/:id/schedule', controller.getInstallmentSchedule);

/**
 * @route   POST /api/admin/revenue/other
 * @desc    Create a new other revenue record
 * @access  Admin
 */
router.post('/other', controller.create);

/**
 * @route   PUT /api/admin/revenue/other/:id
 * @desc    Update an other revenue record (full update)
 * @access  Admin
 */
router.put('/other/:id', controller.update);

/**
 * @route   PATCH /api/admin/revenue/other/:id
 * @desc    Update an other revenue record (partial update)
 * @access  Admin
 */
router.patch('/other/:id', controller.update);

/**
 * @route   DELETE /api/admin/revenue/other/:id
 * @desc    Soft delete an other revenue record
 * @access  Admin
 */
router.delete('/other/:id', controller.delete);

// ==========================================================================
// RECEIVABLES (Nested under /other for frontend compatibility)
// ==========================================================================

/**
 * @route   GET /api/admin/revenue/other/receivables/:receivableId
 * @desc    Get receivable details with installment schedule
 * @access  Admin
 */
router.get('/other/receivables/:receivableId', controller.getReceivableDetails);

export default router;
