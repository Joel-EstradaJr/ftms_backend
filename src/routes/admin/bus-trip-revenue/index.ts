// ============================================================================
// BUS TRIP REVENUE ROUTES
// Express router for Bus Trip Revenue API endpoints
// ============================================================================

import { Router } from 'express';
import { busTripRevenueController } from '../../../controllers/busTripRevenue.controller';

const router = Router();

// ============================================================================
// CONFIGURATION ENDPOINTS (must be before /:id routes)
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/config:
 *   get:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Get system configuration
 *     description: Retrieve current system configuration for revenue processing
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 */
router.get('/config', busTripRevenueController.getConfig);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/config:
 *   put:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Update system configuration
 *     description: Update system configuration for revenue processing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minimum_wage:
 *                 type: number
 *               duration_to_receivable_hours:
 *                 type: integer
 *               receivable_due_date_days:
 *                 type: integer
 *               driver_share_percentage:
 *                 type: number
 *               conductor_share_percentage:
 *                 type: number
 *               default_frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *               default_number_of_payments:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/config', busTripRevenueController.updateConfig);

// ============================================================================
// UNSYNCED TRIPS ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/unsynced:
 *   get:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: List unsynced trips
 *     description: Get bus trips that haven't been processed for revenue recording
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: assignment_type
 *         schema:
 *           type: string
 *           enum: [BOUNDARY, PERCENTAGE]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Unsynced trips retrieved successfully
 */
router.get('/unsynced', busTripRevenueController.listUnsyncedTrips);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/process-unsynced:
 *   post:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Process all unsynced trips
 *     description: Batch process all unsynced trips to create revenue records
 *     responses:
 *       200:
 *         description: All trips processed successfully
 *       207:
 *         description: Partial success - some trips failed
 */
router.post('/process-unsynced', busTripRevenueController.processUnsyncedTrips);

// ============================================================================
// RECEIVABLE PAYMENT ENDPOINT
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/receivable-payment:
 *   post:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Record receivable payment
 *     description: Record an installment payment for a receivable
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - installment_id
 *               - amount_paid
 *               - payment_method
 *             properties:
 *               installment_id:
 *                 type: integer
 *               amount_paid:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET]
 *               payment_date:
 *                 type: string
 *                 format: date
 *               payment_reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Validation error
 */
router.post('/receivable-payment', busTripRevenueController.recordReceivablePayment);

// ============================================================================
// MAIN CRUD ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue:
 *   get:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: List bus trip revenues
 *     description: Get paginated list of bus trip revenue records with filters
 *     parameters:
 *       - in: query
 *         name: date_assigned_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_assigned_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_recorded_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_recorded_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: assignment_type
 *         schema:
 *           type: string
 *           enum: [BOUNDARY, PERCENTAGE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, PARTIALLY_PAID, OVERDUE, WRITTEN_OFF]
 *       - in: query
 *         name: trip_revenue_min
 *         schema:
 *           type: number
 *       - in: query
 *         name: trip_revenue_max
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [date_assigned, date_recorded, trip_revenue, amount]
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
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
 *     responses:
 *       200:
 *         description: Revenues retrieved successfully
 */
router.get('/', busTripRevenueController.listRevenues);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue:
 *   post:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Record trip revenue
 *     description: Create a new revenue record for a bus trip. Creates receivables and journal entries automatically.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignment_id
 *               - bus_trip_id
 *             properties:
 *               assignment_id:
 *                 type: string
 *               bus_trip_id:
 *                 type: string
 *               date_recorded:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Revenue recorded successfully
 *       400:
 *         description: Validation error or trip already recorded
 *       404:
 *         description: Bus trip not found
 */
router.post('/', busTripRevenueController.createRevenue);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/{id}:
 *   get:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Get revenue details
 *     description: |
 *       Get full details of a revenue record including:
 *       - Bus details (body_number, license_plate, route, assignment_type, etc.)
 *       - Employee details (driver and conductor with employee_number and name)
 *       - Remittance details (date_recorded, date_expected, expected_remittance, amount_remitted, shortage)
 *       - Shortage details (if PARTIALLY_PAID): driver/conductor shares, receivables with frequency, number_of_payments, and installment schedules
 *       - Journal entry reference
 *       - Audit information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Revenue retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     assignment_id:
 *                       type: string
 *                     bus_trip_id:
 *                       type: string
 *                     remittance_status:
 *                       type: string
 *                       enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, WRITTEN_OFF]
 *                     bus_details:
 *                       type: object
 *                       properties:
 *                         date_assigned:
 *                           type: string
 *                           format: date-time
 *                         body_number:
 *                           type: string
 *                         license_plate:
 *                           type: string
 *                         bus_type:
 *                           type: string
 *                         route:
 *                           type: string
 *                         assignment_type:
 *                           type: string
 *                           enum: [BOUNDARY, PERCENTAGE]
 *                         assignment_value:
 *                           type: number
 *                         payment_method:
 *                           type: string
 *                         trip_revenue:
 *                           type: number
 *                         trip_fuel_expense:
 *                           type: number
 *                         company_share_amount:
 *                           type: number
 *                     employees:
 *                       type: object
 *                       properties:
 *                         driver:
 *                           type: object
 *                           properties:
 *                             employee_number:
 *                               type: string
 *                             name:
 *                               type: string
 *                         conductor:
 *                           type: object
 *                           properties:
 *                             employee_number:
 *                               type: string
 *                             name:
 *                               type: string
 *                     remittance:
 *                       type: object
 *                       properties:
 *                         date_recorded:
 *                           type: string
 *                           format: date-time
 *                         date_expected:
 *                           type: string
 *                           format: date-time
 *                         expected_remittance:
 *                           type: number
 *                         amount_remitted:
 *                           type: number
 *                         shortage:
 *                           type: number
 *                         description:
 *                           type: string
 *                     shortage_details:
 *                       type: object
 *                       description: Only present if remittance_status is PARTIALLY_PAID
 *                       properties:
 *                         driver_share:
 *                           type: number
 *                         conductor_share:
 *                           type: number
 *                         receivable_due_date:
 *                           type: string
 *                           format: date-time
 *                         driver_receivable:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             code:
 *                               type: string
 *                             debtor_name:
 *                               type: string
 *                             employee_number:
 *                               type: string
 *                             total_amount:
 *                               type: number
 *                             paid_amount:
 *                               type: number
 *                             balance:
 *                               type: number
 *                             status:
 *                               type: string
 *                             due_date:
 *                               type: string
 *                               format: date-time
 *                             frequency:
 *                               type: string
 *                               enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *                               description: Installment frequency
 *                             number_of_payments:
 *                               type: integer
 *                               description: Number of installment payments
 *                             installment_schedules:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   installment_number:
 *                                     type: integer
 *                                   due_date:
 *                                     type: string
 *                                     format: date-time
 *                                   amount_due:
 *                                     type: number
 *                                   amount_paid:
 *                                     type: number
 *                                   balance:
 *                                     type: number
 *                                   status:
 *                                     type: string
 *                         conductor_receivable:
 *                           type: object
 *                           description: Same structure as driver_receivable
 *                     journal_entry:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         code:
 *                           type: string
 *                         status:
 *                           type: string
 *                     created_by:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_by:
 *                       type: string
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Revenue not found
 */
router.get('/:id', busTripRevenueController.getRevenueById);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/{id}:
 *   patch:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Partially update revenue record
 *     description: |
 *       Partially update a revenue record with full Edit Modal support.
 *       Only provided fields will be updated.
 *       
 *       **Revenue Fields:**
 *       - date_recorded: Date the remittance was recorded
 *       - amount: Amount remitted
 *       - description: Remarks/notes
 *       - date_expected: Expected remittance date (due date)
 *       
 *       **Status Management:**
 *       - remittance_status: Override status (PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, WRITTEN_OFF)
 *       - delete_receivables: Set to true to delete existing receivables and revert to PAID status
 *       
 *       **Receivable Data (when shortage exists):**
 *       - driverReceivable: Driver receivable data with frequency, number_of_payments, and installments
 *       - conductorReceivable: Conductor receivable data with same structure
 *       
 *       **Note:** This is a partial update (PATCH). Only send the fields you want to change.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                 description: Date the remittance was recorded
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Amount remitted
 *               description:
 *                 type: string
 *                 description: Remarks or notes
 *               date_expected:
 *                 type: string
 *                 format: date
 *                 description: Expected remittance date (due date)
 *               remittance_status:
 *                 type: string
 *                 enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, WRITTEN_OFF]
 *                 description: Override the remittance status
 *               delete_receivables:
 *                 type: boolean
 *                 description: Set to true to delete existing receivables and revert to PAID status
 *               driverReceivable:
 *                 type: object
 *                 description: Driver receivable data
 *                 properties:
 *                   debtor_name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   total_amount:
 *                     type: number
 *                   due_date:
 *                     type: string
 *                     format: date
 *                   employee_number:
 *                     type: string
 *                   frequency:
 *                     type: string
 *                     enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *                     description: Installment frequency
 *                   number_of_payments:
 *                     type: integer
 *                     minimum: 1
 *                     description: Number of installment payments
 *                   installments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         installment_number:
 *                           type: integer
 *                         due_date:
 *                           type: string
 *                           format: date
 *                         amount_due:
 *                           type: number
 *                         amount_paid:
 *                           type: number
 *                         balance:
 *                           type: number
 *                         status:
 *                           type: string
 *               conductorReceivable:
 *                 type: object
 *                 description: Conductor receivable data (same structure as driverReceivable)
 *                 properties:
 *                   debtor_name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   total_amount:
 *                     type: number
 *                   due_date:
 *                     type: string
 *                     format: date
 *                   employee_number:
 *                     type: string
 *                   frequency:
 *                     type: string
 *                     enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *                   number_of_payments:
 *                     type: integer
 *                     minimum: 1
 *                   installments:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         installment_number:
 *                           type: integer
 *                         due_date:
 *                           type: string
 *                           format: date
 *                         amount_due:
 *                           type: number
 *                         amount_paid:
 *                           type: number
 *                         balance:
 *                           type: number
 *                         status:
 *                           type: string
 *     responses:
 *       200:
 *         description: Revenue updated successfully
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
 *                   $ref: '#/components/schemas/RevenueDetailResponse'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Revenue not found
 */
router.patch('/:id', busTripRevenueController.updateRevenue);

export default router;
