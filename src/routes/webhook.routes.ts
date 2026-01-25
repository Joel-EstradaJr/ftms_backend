/**
 * WEBHOOK ROUTES
 * 
 * Endpoints for receiving webhook events from external systems
 * to update is_active status of _local records.
 * 
 * All endpoints:
 * - POST /api/webhooks/employee        - Single employee update
 * - POST /api/webhooks/bus             - Single bus update
 * - POST /api/webhooks/rental          - Single rental update
 * - POST /api/webhooks/bus-trip        - Single bus trip update
 * - POST /api/webhooks/employees/batch - Batch employee update
 * - POST /api/webhooks/buses/batch     - Batch bus update
 */

import { Router } from 'express';
import {
  handleEmployeeWebhook,
  handleBusWebhook,
  handleRentalWebhook,
  handleBusTripWebhook,
  handleBatchEmployeeWebhook,
  handleBatchBusWebhook,
} from '../controllers/webhook.controller';

const router = Router();

// ============================================================================
// SINGLE RECORD WEBHOOKS
// ============================================================================

/**
 * @swagger
 * /api/webhooks/employee:
 *   post:
 *     summary: Receive employee lifecycle webhook from HR System
 *     description: |
 *       Updates the is_active status of an employee record.
 *       If the employee doesn't exist and full data is provided, creates a new record.
 *       Never modifies the is_deleted flag (internal lifecycle control).
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_number
 *               - is_active
 *             properties:
 *               employee_number:
 *                 type: string
 *                 description: The unique employee identifier from HR
 *                 example: "EMP-001"
 *               is_active:
 *                 type: boolean
 *                 description: Whether the employee is active in the external system
 *                 example: true
 *               first_name:
 *                 type: string
 *                 description: Optional - for creating new records
 *               middle_name:
 *                 type: string
 *                 nullable: true
 *               last_name:
 *                 type: string
 *                 description: Optional - for creating new records
 *               phone:
 *                 type: string
 *                 nullable: true
 *               position:
 *                 type: string
 *               barangay:
 *                 type: string
 *                 nullable: true
 *               zip_code:
 *                 type: string
 *                 nullable: true
 *               department_id:
 *                 type: integer
 *               department:
 *                 type: string
 *     responses:
 *       200:
 *         description: Employee record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       201:
 *         description: Employee record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       404:
 *         description: Employee not found and insufficient data to create
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 */
router.post('/employee', handleEmployeeWebhook);

/**
 * @swagger
 * /api/webhooks/bus:
 *   post:
 *     summary: Receive bus lifecycle webhook from Inventory System
 *     description: |
 *       Updates the is_active status of a bus record.
 *       If the bus doesn't exist and full data is provided, creates a new record.
 *       Never modifies the is_deleted flag (internal lifecycle control).
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bus_id
 *               - is_active
 *             properties:
 *               bus_id:
 *                 type: string
 *                 description: The unique bus identifier from Inventory
 *                 example: "1"
 *               is_active:
 *                 type: boolean
 *                 description: Whether the bus is active in the external system
 *                 example: true
 *               license_plate:
 *                 type: string
 *                 description: Optional - for creating new records
 *               body_number:
 *                 type: string
 *                 description: Optional - for creating new records
 *               type:
 *                 type: string
 *                 description: Bus type (AIRCONDITIONED, ORDINARY)
 *               capacity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bus record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       201:
 *         description: Bus record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       404:
 *         description: Bus not found and insufficient data to create
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 */
router.post('/bus', handleBusWebhook);

/**
 * @swagger
 * /api/webhooks/rental:
 *   post:
 *     summary: Receive rental lifecycle webhook from Operations System
 *     description: |
 *       Updates the is_active status of a rental record.
 *       Never modifies is_deleted, is_revenue_recorded, or is_expense_recorded flags.
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignment_id
 *               - is_active
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 description: The unique rental assignment identifier
 *                 example: "RENT-2024-001"
 *               is_active:
 *                 type: boolean
 *                 description: Whether the rental is active in the external system
 *                 example: true
 *               bus_id:
 *                 type: string
 *                 description: Optional bus ID update
 *               rental_status:
 *                 type: string
 *                 description: Optional status update
 *               rental_package:
 *                 type: string
 *                 description: Destination/package info
 *               rental_start_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               rental_end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               total_rental_amount:
 *                 type: number
 *                 description: Total rental amount
 *               down_payment_amount:
 *                 type: number
 *                 nullable: true
 *               balance_amount:
 *                 type: number
 *                 nullable: true
 *               down_payment_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               full_payment_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cancelled_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cancellation_reason:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Rental record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       404:
 *         description: Rental not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 */
router.post('/rental', handleRentalWebhook);

/**
 * @swagger
 * /api/webhooks/bus-trip:
 *   post:
 *     summary: Receive bus trip lifecycle webhook from Operations System
 *     description: |
 *       Updates the is_active status of a bus trip record.
 *       Never modifies is_deleted, is_revenue_recorded, or is_expense_recorded flags.
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignment_id
 *               - bus_trip_id
 *               - is_active
 *             properties:
 *               assignment_id:
 *                 type: string
 *                 description: The assignment identifier
 *                 example: "ASSIGN-001"
 *               bus_trip_id:
 *                 type: string
 *                 description: The bus trip identifier
 *                 example: "TRIP-001"
 *               is_active:
 *                 type: boolean
 *                 description: Whether the bus trip is active in the external system
 *                 example: true
 *               bus_id:
 *                 type: string
 *                 description: Optional bus ID update
 *                 example: "1"
 *               bus_route:
 *                 type: string
 *                 description: Optional route update
 *               date_assigned:
 *                 type: string
 *                 format: date-time
 *                 description: Date the trip was assigned
 *               trip_fuel_expense:
 *                 type: number
 *                 description: Fuel expense for this trip
 *               trip_revenue:
 *                 type: number
 *                 description: Revenue from this trip
 *               assignment_type:
 *                 type: string
 *                 description: BOUNDARY, PERCENTAGE, etc.
 *               assignment_value:
 *                 type: number
 *                 description: Value for the assignment type
 *               payment_method:
 *                 type: string
 *                 description: Company_Cash, Reimbursement, etc.
 *     responses:
 *       200:
 *         description: Bus trip record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       404:
 *         description: Bus trip not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookErrorResponse'
 */
router.post('/bus-trip', handleBusTripWebhook);

// ============================================================================
// BATCH WEBHOOKS
// ============================================================================

/**
 * @swagger
 * /api/webhooks/employees/batch:
 *   post:
 *     summary: Receive batch employee lifecycle webhook from HR System
 *     description: |
 *       Updates the is_active status of multiple employee records in one request.
 *       Returns detailed results for each record processed.
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - employee_number
 *                     - is_active
 *                   properties:
 *                     employee_number:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                 example:
 *                   - employee_number: "EMP-001"
 *                     is_active: true
 *                   - employee_number: "EMP-002"
 *                     is_active: false
 *     responses:
 *       200:
 *         description: Batch processed (some or all succeeded)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchWebhookResponse'
 *       400:
 *         description: All records failed or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchWebhookResponse'
 */
router.post('/employees/batch', handleBatchEmployeeWebhook);

/**
 * @swagger
 * /api/webhooks/buses/batch:
 *   post:
 *     summary: Receive batch bus lifecycle webhook from Inventory System
 *     description: |
 *       Updates the is_active status of multiple bus records in one request.
 *       Returns detailed results for each record processed.
 *     tags:
 *       - General | Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - bus_id
 *                     - is_active
 *                   properties:
 *                     bus_id:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *                 example:
 *                   - bus_id: "1"
 *                     is_active: true
 *                   - bus_id: "2"
 *                     is_active: false
 *     responses:
 *       200:
 *         description: Batch processed (some or all succeeded)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchWebhookResponse'
 *       400:
 *         description: All records failed or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchWebhookResponse'
 */
router.post('/buses/batch', handleBatchBusWebhook);

export default router;
