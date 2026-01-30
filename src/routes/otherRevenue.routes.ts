/**
 * OTHER REVENUE ROUTES
 * 
 * Routes for other revenue CRUD operations.
 * Base URL: /api/v1/admin/other-revenue
 */

import { Router } from 'express';
import * as otherRevenueController from '../controllers/otherRevenue.controller';
import { prisma } from '../config/database';

const router = Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/other-revenue:
 *   get:
 *     summary: List other revenue records
 *     description: |
 *       Retrieves a paginated list of other revenue records (non-bus trip, non-rental).
 *       Supports filtering by date range, revenue type, status, and search.
 *     tags:
 *       - Admin | Other Revenue
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
 *         description: Records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by code or description
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: revenueTypeId
 *         schema:
 *           type: integer
 *         description: Filter by revenue type ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE]
 *         description: Filter by remittance status
 *     responses:
 *       200:
 *         description: List of other revenue records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Revenue record ID
 *                       code:
 *                         type: string
 *                         description: Revenue code
 *                       date_recorded:
 *                         type: string
 *                         format: date
 *                         description: Date the revenue was recorded
 *                       revenueType:
 *                         type: object
 *                         description: The revenue type/source for this record
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: Revenue type ID
 *                           code:
 *                             type: string
 *                             description: Revenue type code
 *                           name:
 *                             type: string
 *                             description: Revenue type name (e.g., "Asset Sale", "Interest Income")
 *                       description:
 *                         type: string
 *                         description: Revenue description
 *                       amount:
 *                         type: number
 *                         description: Revenue amount
 *                       remittance_status:
 *                         type: string
 *                         enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE]
 *                       payment_method:
 *                         type: string
 *                       isUnearnedRevenue:
 *                         type: boolean
 *                       receivable:
 *                         type: object
 *                         nullable: true
 *                         description: Receivable data for unearned revenue
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 analytics:
 *                   type: object
 *                   description: Revenue analytics summary
 *       500:
 *         description: Server error
 */
router.get('/', otherRevenueController.list);

/**
 * @swagger
 * /api/v1/admin/other-revenue/types:
 *   get:
 *     summary: Get other revenue types
 *     description: Returns list of other revenue types for dropdown population (IDs 4+)
 *     tags:
 *       - Admin | Other Revenue
 *     responses:
 *       200:
 *         description: List of revenue types
 *       500:
 *         description: Server error
 */
router.get('/types', otherRevenueController.getTypes);

// ============================================================================
// SUPPORTING ENDPOINTS (Must be defined BEFORE /:id routes)
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/other-revenue/departments:
 *   get:
 *     summary: Get all departments
 *     description: |
 *       Returns a list of active departments from department_local for dropdown population.
 *       Data is sourced from the HR system and synced to department_local.
 *       This is a read-only reference endpoint - no revenue_id required.
 *     tags:
 *       - Admin | Other Revenue
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Department ID
 *                       department_name:
 *                         type: string
 *                         description: Department name
 *       500:
 *         description: Server error
 */
router.get('/departments', async (req, res) => {
    try {
        const departments = await prisma.department_local.findMany({
            where: {
                is_active: true,
                is_deleted: false
            },
            select: {
                id: true,
                department_name: true
            },
            orderBy: {
                department_name: 'asc'
            }
        });

        res.status(200).json({
            status: 'success',
            data: departments
        });
    } catch (error) {
        console.error('[OTHER_REVENUE] Get departments error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch departments'
        });
    }
});

/**
 * @swagger
 * /api/v1/admin/other-revenue/schedule-frequencies:
 *   get:
 *     summary: Get schedule frequency options
 *     description: |
 *       Returns the available schedule frequency options based on the receivable_frequency enum.
 *       Use these values for the Schedule Frequency dropdown when creating unearned revenue.
 *       This is a read-only reference endpoint - no revenue_id required.
 *     tags:
 *       - Admin | Other Revenue
 *     responses:
 *       200:
 *         description: List of schedule frequency options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                         description: Enum value
 *                       label:
 *                         type: string
 *                         description: Display label
 *                   example:
 *                     - value: "DAILY"
 *                       label: "Daily"
 *                     - value: "WEEKLY"
 *                       label: "Weekly"
 *                     - value: "BIWEEKLY"
 *                       label: "Bi-Weekly"
 *                     - value: "MONTHLY"
 *                       label: "Monthly"
 *       500:
 *         description: Server error
 */
router.get('/schedule-frequencies', (req, res) => {
    // Return the receivable_frequency enum values from schema
    const frequencies = [
        { value: 'DAILY', label: 'Daily' },
        { value: 'WEEKLY', label: 'Weekly' },
        { value: 'BIWEEKLY', label: 'Bi-Weekly' },
        { value: 'MONTHLY', label: 'Monthly' }
    ];

    res.status(200).json({
        status: 'success',
        data: frequencies
    });
});

/**
 * @swagger
 * /api/v1/admin/other-revenue/payment:
 *   post:
 *     summary: Record a payment for other revenue installment
 *     description: |
 *       Records a payment for an other revenue installment schedule.
 *       Supports cascade payments that can apply to multiple installments.
 *       Updates installment balance, status, and parent receivable status.
 *     tags:
 *       - Admin | Other Revenue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - revenueId
 *               - scheduleItemId
 *               - amountPaid
 *               - paymentDate
 *               - paymentMethod
 *             properties:
 *               revenueId:
 *                 type: integer
 *                 description: The revenue record ID
 *                 example: 1
 *               scheduleItemId:
 *                 type: string
 *                 description: The installment schedule item ID
 *                 example: "5"
 *               scheduleItemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of schedule item IDs for cascade payments
 *               amountPaid:
 *                 type: number
 *                 description: Amount to pay
 *                 example: 15000.00
 *               paymentDate:
 *                 type: string
 *                 format: date
 *                 description: Payment date (YYYY-MM-DD)
 *                 example: "2026-01-30"
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET]
 *                 description: Payment method used
 *                 example: "BANK_TRANSFER"
 *               recordedBy:
 *                 type: string
 *                 description: User recording the payment
 *                 example: "admin"
 *               cascadeBreakdown:
 *                 type: array
 *                 description: Breakdown for cascade payments across multiple installments
 *                 items:
 *                   type: object
 *                   properties:
 *                     installmentNumber:
 *                       type: integer
 *                     scheduleItemId:
 *                       type: string
 *                     amountApplied:
 *                       type: number
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Payment recorded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                     receivableStatus:
 *                       type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Revenue or installment not found
 *       500:
 *         description: Server error
 */
router.post('/payment', otherRevenueController.recordPaymentHandler);

// ============================================================================
// DYNAMIC ID ROUTES (Must be defined AFTER static routes)
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}:
 *   get:
 *     summary: Get other revenue by ID
 *     description: Retrieves a single other revenue record with full details
 *     tags:
 *       - Admin | Other Revenue
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue record ID
 *     responses:
 *       200:
 *         description: Revenue record details
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.get('/:id', otherRevenueController.getById);

/**
 * @swagger
 * /api/v1/admin/other-revenue:
 *   post:
 *     summary: Create other revenue record
 *     description: |
 *       Creates a new other revenue record.
 *       For unearned revenue, also creates receivable and installment schedule.
 *       
 *       **Required Fields:**
 *       - revenue_type_id: ID of the revenue type (must be >= 4, i.e., not bus trip or rental revenue)
 *       - amount: Revenue amount (must be > 0)
 *       - date_recorded: Date the revenue was recorded
 *       - description: Revenue description
 *       - payment_method: Payment method used
 *       
 *       **Conditional Fields (when isUnearnedRevenue is true):**
 *       - scheduleFrequency: Installment frequency (WEEKLY, MONTHLY, QUARTERLY)
 *       - scheduleStartDate: When the first installment is due
 *       - numberOfPayments: Total number of installments
 *     tags:
 *       - Admin | Other Revenue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - revenue_type_id
 *               - amount
 *               - date_recorded
 *               - description
 *               - payment_method
 *             properties:
 *               revenue_type_id:
 *                 type: integer
 *                 description: Revenue type ID (must be >= 4 for other revenue types)
 *                 example: 4
 *               amount:
 *                 type: number
 *                 description: Revenue amount (must be greater than 0)
 *                 example: 50000.00
 *               date_recorded:
 *                 type: string
 *                 format: date
 *                 description: Date recorded (YYYY-MM-DD)
 *                 example: "2026-01-29"
 *               description:
 *                 type: string
 *                 description: Revenue description
 *                 example: "Sale of old computer equipment"
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *                 description: Payment method (matches schema payment_method enum)
 *                 example: "BANK_TRANSFER"
 *               payment_reference:
 *                 type: string
 *                 description: Optional payment reference number
 *                 example: "REF-2026-001"
 *               department_id:
 *                 type: integer
 *                 description: Optional department ID (references department_local)
 *                 example: 22
 *               remarks:
 *                 type: string
 *                 description: Additional remarks or notes
 *                 example: "Approved by finance manager"
 *               isUnearnedRevenue:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is unearned revenue with installment schedule
 *               scheduleFrequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *                 description: Required if isUnearnedRevenue is true. Must match receivable_frequency enum.
 *               scheduleStartDate:
 *                 type: string
 *                 format: date
 *                 description: Required if isUnearnedRevenue is true. Start date for installments.
 *                 example: "2026-02-01"
 *               numberOfPayments:
 *                 type: integer
 *                 description: Required if isUnearnedRevenue is true. Number of installment payments.
 *                 example: 3
 *               created_by:
 *                 type: string
 *                 description: User who created the record
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: Revenue record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Other revenue record created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     revenue_type:
 *                       type: object
 *                     amount:
 *                       type: number
 *                     receivable:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/', otherRevenueController.create);

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}:
 *   patch:
 *     summary: Update other revenue record
 *     description: |
 *       Updates an existing other revenue record.
 *       **IMPORTANT:** Only records with PENDING status can be edited.
 *       Records with PAID, PARTIALLY_PAID, CANCELLED, or any other status cannot be modified.
 *     tags:
 *       - Admin | Other Revenue
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               revenue_type_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               date_recorded:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               payment_method:
 *                 type: string
 *               payment_reference:
 *                 type: string
 *               department_id:
 *                 type: integer
 *                 description: Optional department ID (references department_local)
 *               remarks:
 *                 type: string
 *               updated_by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Revenue record updated
 *       400:
 *         description: |
 *           Validation error or cannot edit. Common errors:
 *           - "Only records with PENDING status can be edited"
 *           - "Invalid revenue type"
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', otherRevenueController.update);

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}:
 *   delete:
 *     summary: Soft delete other revenue record
 *     description: |
 *       Performs a soft delete on an other revenue record (sets is_deleted=true).
 *       **IMPORTANT:** Only records with PENDING status can be deleted.
 *       Records with PAID, PARTIALLY_PAID, CANCELLED, or any other status cannot be deleted.
 *       This also soft deletes any associated receivable and installment schedule items.
 *     tags:
 *       - Admin | Other Revenue
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Revenue record ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleted_by:
 *                 type: string
 *                 description: User who is deleting the record
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Revenue record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Revenue record deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *       400:
 *         description: |
 *           Cannot delete. Common errors:
 *           - "Only records with PENDING status can be deleted"
 *       404:
 *         description: Record not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', otherRevenueController.deleteHandler);

export default router;
