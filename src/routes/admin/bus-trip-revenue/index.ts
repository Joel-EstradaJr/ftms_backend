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
 *     description: Get full details of a revenue record including bus details, employees, receivables, and installment schedules
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Revenue retrieved successfully
 *       404:
 *         description: Revenue not found
 */
router.get('/:id', busTripRevenueController.getRevenueById);

/**
 * @swagger
 * /api/v1/admin/bus-trip-revenue/{id}:
 *   put:
 *     tags:
 *       - Bus Trip Revenue
 *     summary: Update revenue record
 *     description: Update editable fields of a revenue record (date_recorded, amount, description)
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
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Revenue updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Revenue not found
 */
router.put('/:id', busTripRevenueController.updateRevenue);

export default router;
