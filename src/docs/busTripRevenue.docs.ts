// ============================================================================
// BUS TRIP REVENUE SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Bus Trip Revenue endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Bus Trip Revenue
 *   description: Bus Trip Revenue management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RevenueListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           example: "REV-2026-0001"
 *         body_number:
 *           type: string
 *         date_assigned:
 *           type: string
 *           format: date-time
 *         trip_revenue:
 *           type: number
 *         assignment_type:
 *           type: string
 *           enum: [BOUNDARY, PERCENTAGE]
 *         remittance_status:
 *           type: string
 *           enum: [PENDING, PAID, PARTIALLY_PAID, OVERDUE, WRITTEN_OFF]
 *         date_recorded:
 *           type: string
 *           format: date-time
 *         expected_remittance:
 *           type: number
 *         shortage:
 *           type: number
 *         has_receivables:
 *           type: boolean
 *
 *     RevenueDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         assignment_id:
 *           type: string
 *         bus_trip_id:
 *           type: string
 *         remittance_status:
 *           type: string
 *         bus_details:
 *           type: object
 *           properties:
 *             date_assigned:
 *               type: string
 *             body_number:
 *               type: string
 *             license_plate:
 *               type: string
 *             bus_type:
 *               type: string
 *             route:
 *               type: string
 *             assignment_type:
 *               type: string
 *             assignment_value:
 *               type: number
 *             payment_method:
 *               type: string
 *             trip_revenue:
 *               type: number
 *             trip_fuel_expense:
 *               type: number
 *             company_share_amount:
 *               type: number
 *         employees:
 *           type: object
 *           properties:
 *             driver:
 *               type: object
 *               properties:
 *                 employee_number:
 *                   type: string
 *                 name:
 *                   type: string
 *             conductor:
 *               type: object
 *               properties:
 *                 employee_number:
 *                   type: string
 *                 name:
 *                   type: string
 *         remittance:
 *           type: object
 *           properties:
 *             date_recorded:
 *               type: string
 *             date_expected:
 *               type: string
 *             expected_remittance:
 *               type: number
 *             amount_remitted:
 *               type: number
 *             shortage:
 *               type: number
 *             description:
 *               type: string
 *         shortage_details:
 *           type: object
 *           properties:
 *             driver_share:
 *               type: number
 *             conductor_share:
 *               type: number
 *             receivable_due_date:
 *               type: string
 *             driver_receivable:
 *               $ref: '#/components/schemas/ReceivableWithSchedules'
 *             conductor_receivable:
 *               $ref: '#/components/schemas/ReceivableWithSchedules'
 *         journal_entry:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             code:
 *               type: string
 *             status:
 *               type: string
 *
 *     ReceivableWithSchedules:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         debtor_name:
 *           type: string
 *         employee_number:
 *           type: string
 *         total_amount:
 *           type: number
 *         paid_amount:
 *           type: number
 *         balance:
 *           type: number
 *         status:
 *           type: string
 *         due_date:
 *           type: string
 *         installment_schedules:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InstallmentSchedule'
 *
 *     InstallmentSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         installment_number:
 *           type: integer
 *         due_date:
 *           type: string
 *         amount_due:
 *           type: number
 *         amount_paid:
 *           type: number
 *         balance:
 *           type: number
 *         status:
 *           type: string
 *           enum: [PENDING, PARTIALLY_PAID, PAID]
 *
 *     CreateRevenueDTO:
 *       type: object
 *       required:
 *         - assignment_id
 *         - bus_trip_id
 *       properties:
 *         assignment_id:
 *           type: string
 *           description: Assignment ID from bus_trip_local
 *         bus_trip_id:
 *           type: string
 *           description: Bus Trip ID from bus_trip_local (composite key with assignment_id)
 *         date_recorded:
 *           type: string
 *           format: date
 *           description: Date when revenue was recorded (defaults to now)
 *         description:
 *           type: string
 *           description: Optional remarks
 *
 *     UpdateRevenueDTO:
 *       type: object
 *       properties:
 *         date_recorded:
 *           type: string
 *           format: date
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *
 *     RecordPaymentDTO:
 *       type: object
 *       required:
 *         - installment_id
 *         - amount_paid
 *         - payment_method
 *       properties:
 *         installment_id:
 *           type: integer
 *         amount_paid:
 *           type: number
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET]
 *         payment_date:
 *           type: string
 *           format: date
 *         payment_reference:
 *           type: string
 *
 *     SystemConfig:
 *       type: object
 *       properties:
 *         minimum_wage:
 *           type: number
 *           example: 600
 *         duration_to_receivable_hours:
 *           type: integer
 *           example: 72
 *         receivable_due_date_days:
 *           type: integer
 *           example: 30
 *         driver_share_percentage:
 *           type: number
 *           example: 50
 *         conductor_share_percentage:
 *           type: number
 *           example: 50
 *         default_frequency:
 *           type: string
 *           enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *           example: WEEKLY
 *         default_number_of_payments:
 *           type: integer
 *           example: 3
 *
 *     UnsyncedTrip:
 *       type: object
 *       properties:
 *         assignment_id:
 *           type: string
 *         bus_trip_id:
 *           type: string
 *         body_number:
 *           type: string
 *         date_assigned:
 *           type: string
 *         route:
 *           type: string
 *         assignment_type:
 *           type: string
 *         assignment_value:
 *           type: number
 *         trip_revenue:
 *           type: number
 *         trip_fuel_expense:
 *           type: number
 *         expected_remittance:
 *           type: number
 *         shortage:
 *           type: number
 *         driver:
 *           type: object
 *           properties:
 *             employee_number:
 *               type: string
 *             name:
 *               type: string
 *         conductor:
 *           type: object
 *           properties:
 *             employee_number:
 *               type: string
 *             name:
 *               type: string
 *
 *     ProcessUnsyncedResult:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         processed:
 *           type: integer
 *         failed:
 *           type: integer
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               assignment_id:
 *                 type: string
 *               bus_trip_id:
 *                 type: string
 *               success:
 *                 type: boolean
 *               revenue_id:
 *                 type: integer
 *               revenue_code:
 *                 type: string
 *               error:
 *                 type: string
 */

export { };
