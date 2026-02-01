// ============================================================================
// RENTAL REVENUE ROUTES
// Express router for Rental Revenue API endpoints
// All fields aligned with database schema (revenue + rental_local tables)
// ============================================================================

import { Router } from 'express';
import { rentalRevenueController } from '../../../controllers/rentalRevenue.controller';

const router = Router();

// ============================================================================
// ANALYTICS ENDPOINT (must be before /:id routes)
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/analytics:
 *   get:
 *     tags:
 *       - Rental Revenue
 *     summary: Get rental revenue analytics
 *     description: Retrieve analytics and summary data for rental revenues
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_rentals:
 *                       type: integer
 *                     total_revenue:
 *                       type: number
 *                     total_pending_balance:
 *                       type: number
 *                     by_status:
 *                       type: object
 *                     by_payment_method:
 *                       type: object
 */
router.get('/analytics', rentalRevenueController.getAnalytics);

// ============================================================================
// UNRECORDED RENTALS ENDPOINT
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/unrecorded:
 *   get:
 *     tags:
 *       - Rental Revenue
 *     summary: Get unrecorded rentals
 *     description: Get rentals that haven't been recorded as revenue yet
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unrecorded rentals retrieved successfully
 */
router.get('/unrecorded', rentalRevenueController.getUnrecordedRentals);

// ============================================================================
// LIST RENTAL REVENUES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue:
 *   get:
 *     tags:
 *       - Rental Revenue
 *     summary: List rental revenues
 *     description: |
 *       Retrieve paginated list of rental revenues with filtering and search.
 *       
 *       **Table Columns Returned:**
 *       - Revenue Code (code)
 *       - Assignment ID (assignment_id)
 *       - Total Amount (total_rental_amount)
 *       - Balance (balance_amount)
 *       - Payment Method (payment_method: CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT)
 *       - Rental Status (rental_status: approved, completed, cancelled)
 *       - Date Recorded (date_recorded)
 *       
 *       **Search:** Matches code, assignment_id, description, rental_package, rental_status, payment_method
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (matches multiple fields)
 *       - in: query
 *         name: date_recorded_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date recorded (from)
 *       - in: query
 *         name: date_recorded_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date recorded (to)
 *       - in: query
 *         name: rental_status
 *         schema:
 *           type: string
 *           enum: [approved, completed, cancelled]
 *         description: Filter by rental status
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         description: Filter by payment method
 *       - in: query
 *         name: amount_min
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: amount_max
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - in: query
 *         name: balance_min
 *         schema:
 *           type: number
 *         description: Minimum balance filter
 *       - in: query
 *         name: balance_max
 *         schema:
 *           type: number
 *         description: Maximum balance filter
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [code, date_recorded, total_rental_amount, balance_amount, created_at]
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Rental revenues retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RentalRevenueListItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', rentalRevenueController.listRentalRevenues);

// ============================================================================
// CREATE RENTAL REVENUE
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue:
 *   post:
 *     tags:
 *       - Rental Revenue
 *     summary: Create rental revenue
 *     description: Record new rental revenue from a rental assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignment_id
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 description: Rental assignment ID (from rental_local)
 *               date_recorded:
 *                 type: string
 *                 format: date
 *                 description: Date revenue is recorded
 *               description:
 *                 type: string
 *                 description: Revenue description/notes
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *                 default: CASH
 *               payment_reference:
 *                 type: string
 *                 description: Payment reference number
 *               down_payment_amount:
 *                 type: number
 *                 description: Override down payment amount (defaults to rental value)
 *     responses:
 *       201:
 *         description: Rental revenue created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Rental not found
 */
router.post('/', rentalRevenueController.createRentalRevenue);

// ============================================================================
// GET RENTAL REVENUE BY ID
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}:
 *   get:
 *     tags:
 *       - Rental Revenue
 *     summary: Get rental revenue by ID
 *     description: |
 *       Retrieve complete rental revenue details for View Modal.
 *       
 *       **Returns:**
 *       - All revenue fields (code, amount, date_recorded, description, payment_method, etc.)
 *       - All rental fields (assignment_id, total_rental_amount, down_payment_amount, balance_amount, etc.)
 *       - Bus information (plate number, body number)
 *       - Assigned employees
 *       - Receivable info (if exists)
 *       - Journal entry summary (if exists)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     responses:
 *       200:
 *         description: Rental revenue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RentalRevenueDetail'
 *       404:
 *         description: Rental revenue not found
 */
router.get('/:id', rentalRevenueController.getRentalRevenueById);

// ============================================================================
// UPDATE RENTAL REVENUE
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}:
 *   patch:
 *     tags:
 *       - Rental Revenue
 *     summary: Update rental revenue
 *     description: |
 *       Partially update rental revenue record (for Edit Modal).
 *       
 *       **Editable Fields:**
 *       - date_recorded, date_expected
 *       - description
 *       - payment_method (enum: CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT)
 *       - payment_reference
 *       - down_payment_amount, down_payment_date
 *       - remittance_status
 *       - pay_balance (triggers balance payment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date_recorded:
 *                 type: string
 *                 format: date
 *               date_expected:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *               payment_reference:
 *                 type: string
 *               down_payment_amount:
 *                 type: number
 *               down_payment_date:
 *                 type: string
 *                 format: date
 *               remittance_status:
 *                 type: string
 *                 enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, WRITTEN_OFF]
 *               pay_balance:
 *                 type: boolean
 *                 description: If true, records balance payment
 *               balance_payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *               balance_payment_reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rental revenue updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Rental revenue not found
 */
router.patch('/:id', rentalRevenueController.updateRentalRevenue);

// ============================================================================
// CANCEL RENTAL REVENUE
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}/cancel:
 *   post:
 *     tags:
 *       - Rental Revenue
 *     summary: Cancel rental revenue
 *     description: Cancel a rental revenue record (sets rental_status to 'cancelled')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellation_reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Rental revenue cancelled successfully
 *       404:
 *         description: Rental revenue not found
 */
router.post('/:id/cancel', rentalRevenueController.cancelRentalRevenue);

// ============================================================================
// PAY BALANCE
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}/pay-balance:
 *   post:
 *     tags:
 *       - Rental Revenue
 *     summary: Pay rental balance
 *     description: |
 *       Record balance payment for a rental.
 *       Sets balance_amount to 0, full_payment_date to today, and rental_status to 'completed'.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *                 default: CASH
 *               payment_reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Balance paid successfully
 *       400:
 *         description: No balance to pay or validation error
 *       404:
 *         description: Rental revenue not found
 */
router.post('/:id/pay-balance', rentalRevenueController.payBalance);

// ============================================================================
// SWAGGER COMPONENT SCHEMAS
// ============================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     RentalRevenueListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           description: Revenue code (e.g., REV-2026-0001)
 *         revenue_type_id:
 *           type: integer
 *         revenue_type_name:
 *           type: string
 *         amount:
 *           type: number
 *         date_recorded:
 *           type: string
 *           format: date-time
 *         description:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         remittance_status:
 *           type: string
 *         assignment_id:
 *           type: string
 *           description: Rental assignment ID
 *         rental_status:
 *           type: string
 *           enum: [approved, completed, cancelled]
 *         total_rental_amount:
 *           type: number
 *         down_payment_amount:
 *           type: number
 *         balance_amount:
 *           type: number
 *         down_payment_date:
 *           type: string
 *           format: date-time
 *         full_payment_date:
 *           type: string
 *           format: date-time
 *         cancelled_at:
 *           type: string
 *           format: date-time
 *         bus_plate_number:
 *           type: string
 *         bus_body_number:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     
 *     RentalRevenueDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/RentalRevenueListItem'
 *         - type: object
 *           properties:
 *             revenue_type_code:
 *               type: string
 *             date_expected:
 *               type: string
 *               format: date-time
 *             payment_reference:
 *               type: string
 *             journal_entry_id:
 *               type: integer
 *             rental_package:
 *               type: string
 *             cancellation_reason:
 *               type: string
 *             rental_start_date:
 *               type: string
 *               format: date-time
 *             rental_end_date:
 *               type: string
 *               format: date-time
 *             bus_type:
 *               type: string
 *             employees:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employee_id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   role:
 *                     type: string
 *             receivable:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 amount_due:
 *                   type: number
 *                 amount_paid:
 *                   type: number
 *                 balance:
 *                   type: number
 *             journal_entry:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 code:
 *                   type: string
 *                 status:
 *                   type: string
 *                 posted_at:
 *                   type: string
 *                   format: date-time
 *             created_by:
 *               type: string
 *             updated_by:
 *               type: string
 *             updated_at:
 *               type: string
 *               format: date-time
 */
// ============================================================================
// ARCHIVE / RESTORE / DELETE ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}/archive:
 *   patch:
 *     tags:
 *       - Rental Revenue
 *     summary: Archive a rental revenue record (soft delete)
 *     description: |
 *       Archives a rental revenue record by setting is_deleted=true.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     responses:
 *       200:
 *         description: Revenue archived successfully
 *       400:
 *         description: Revenue already archived
 *       404:
 *         description: Revenue not found
 */
router.patch('/:id/archive', rentalRevenueController.archiveRentalRevenue);

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}/restore:
 *   patch:
 *     tags:
 *       - Rental Revenue
 *     summary: Restore an archived rental revenue record
 *     description: |
 *       Restores an archived rental revenue record by setting is_deleted=false.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     responses:
 *       200:
 *         description: Revenue restored successfully
 *       400:
 *         description: Revenue is not archived
 *       404:
 *         description: Revenue not found
 */
router.patch('/:id/restore', rentalRevenueController.restoreRentalRevenue);

/**
 * @swagger
 * /api/v1/admin/rental-revenue/{id}/permanent:
 *   delete:
 *     tags:
 *       - Rental Revenue
 *     summary: Permanently delete an archived rental revenue record
 *     description: |
 *       Permanently deletes an archived rental revenue record.
 *       Only archived records can be permanently deleted.
 *       This action is irreversible.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue ID
 *     responses:
 *       200:
 *         description: Revenue permanently deleted
 *       400:
 *         description: Revenue is not archived
 *       404:
 *         description: Revenue not found
 */
router.delete('/:id/permanent', rentalRevenueController.hardDeleteRentalRevenue);
export default router;
