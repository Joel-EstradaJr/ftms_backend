// ============================================================================
// OTHER REVENUE SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Other Revenue endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Other Revenue
 *   description: 🔐 Admin – Manage other revenue records (miscellaneous revenue excluding bus trips and rentals)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OtherRevenueListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           example: "REV-000001"
 *         date_recorded:
 *           type: string
 *           format: date
 *         revenueType:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             code:
 *               type: string
 *             name:
 *               type: string
 *         department:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             department_name:
 *               type: string
 *         description:
 *           type: string
 *         remarks:
 *           type: string
 *         amount:
 *           type: number
 *         approval_status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         accounting_status:
 *           type: string
 *           enum: [DRAFT, POSTED, ADJUSTED, REVERSED]
 *           nullable: true
 *         payment_status:
 *           type: string
 *           enum: [PENDING, PARTIALLY_PAID, COMPLETED, CANCELLED, WRITTEN_OFF]
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET]
 *         isUnearnedRevenue:
 *           type: boolean
 *           description: True if this revenue has an associated receivable with installments
 *         receivable:
 *           type: object
 *           nullable: true
 *           description: Present if isUnearnedRevenue is true
 *           properties:
 *             id:
 *               type: integer
 *             status:
 *               type: string
 *             frequency:
 *               type: string
 *             numberOfPayments:
 *               type: integer
 *             scheduleStartDate:
 *               type: string
 *               format: date
 *             scheduleItems:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InstallmentScheduleItem'
 *
 *     InstallmentScheduleItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         installmentNumber:
 *           type: integer
 *         dueDate:
 *           type: string
 *           format: date
 *         amountDue:
 *           type: number
 *         amountPaid:
 *           type: number
 *         balance:
 *           type: number
 *         status:
 *           type: string
 *           enum: [PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED]
 *
 *     OtherRevenueCreateInput:
 *       type: object
 *       required:
 *         - revenue_type_id
 *         - amount
 *         - date_recorded
 *         - description
 *         - payment_method
 *         - created_by
 *       properties:
 *         revenue_type_id:
 *           type: integer
 *           description: Revenue type ID (must be >= 4 for other revenue)
 *         amount:
 *           type: number
 *           minimum: 0.01
 *         date_recorded:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET]
 *         payment_reference:
 *           type: string
 *         department_id:
 *           type: integer
 *         remarks:
 *           type: string
 *         isUnearnedRevenue:
 *           type: boolean
 *           default: false
 *           description: Set to true to create a receivable with installment schedule
 *         scheduleFrequency:
 *           type: string
 *           enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUALLY, CUSTOM]
 *           description: Required if isUnearnedRevenue is true
 *         scheduleStartDate:
 *           type: string
 *           format: date
 *           description: Start date for installment schedule
 *         numberOfPayments:
 *           type: integer
 *           minimum: 1
 *           description: Number of installments to create
 *         created_by:
 *           type: string
 *
 *     OtherRevenueUpdateInput:
 *       type: object
 *       required:
 *         - updated_by
 *       properties:
 *         revenue_type_id:
 *           type: integer
 *         amount:
 *           type: number
 *         date_recorded:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET]
 *         payment_reference:
 *           type: string
 *         department_id:
 *           type: integer
 *         remarks:
 *           type: string
 *         isUnearnedRevenue:
 *           type: boolean
 *           description: |
 *             Set to convert between normal revenue and receivable (installment-based).
 *             - true: Convert to receivable (requires scheduleFrequency, numberOfPayments)
 *             - false: Convert to normal revenue (HARD DELETES all installment schedules)
 *             Note: Conversion only allowed while approval_status = PENDING
 *         scheduleFrequency:
 *           type: string
 *           enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUALLY, CUSTOM]
 *           description: Required when converting to receivable (isUnearnedRevenue=true)
 *         scheduleStartDate:
 *           type: string
 *           format: date
 *         numberOfPayments:
 *           type: integer
 *           minimum: 1
 *           description: Required when converting to receivable (isUnearnedRevenue=true)
 *         updated_by:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/other-revenue:
 *   get:
 *     summary: List other revenue records
 *     tags: [Admin | Other Revenue]
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: revenueTypeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, PARTIALLY_PAID, COMPLETED]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, date_recorded, amount]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of other revenue records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OtherRevenueListItem'
 *                     pagination:
 *                       type: object
 *                     analytics:
 *                       type: object
 *
 *   post:
 *     summary: Create a new other revenue record
 *     tags: [Admin | Other Revenue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtherRevenueCreateInput'
 *     responses:
 *       201:
 *         description: Revenue record created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}:
 *   get:
 *     summary: Get other revenue record by ID
 *     tags: [Admin | Other Revenue]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Revenue record details
 *       404:
 *         description: Record not found
 *
 *   patch:
 *     summary: Update an other revenue record
 *     description: |
 *       Update an existing other revenue record. Only allowed when approval_status = PENDING.
 *       
 *       **Unearned Revenue Conversion:**
 *       - To convert normal revenue → receivable: set `isUnearnedRevenue=true` with schedule fields
 *       - To convert receivable → normal: set `isUnearnedRevenue=false` (HARD DELETES all installments)
 *       
 *       Conversion is blocked once the record is APPROVED or REJECTED.
 *     tags: [Admin | Other Revenue]
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
 *             $ref: '#/components/schemas/OtherRevenueUpdateInput'
 *           examples:
 *             updateBasicFields:
 *               summary: Update basic fields
 *               value:
 *                 amount: 15000
 *                 description: "Updated description"
 *                 updated_by: "admin"
 *             convertToReceivable:
 *               summary: Convert normal revenue to receivable
 *               value:
 *                 isUnearnedRevenue: true
 *                 scheduleFrequency: "MONTHLY"
 *                 scheduleStartDate: "2026-03-01"
 *                 numberOfPayments: 6
 *                 updated_by: "admin"
 *             convertToNormal:
 *               summary: Convert receivable to normal revenue (deletes installments)
 *               value:
 *                 isUnearnedRevenue: false
 *                 updated_by: "admin"
 *     responses:
 *       200:
 *         description: Revenue record updated successfully
 *       400:
 *         description: Validation error or record not editable
 *       404:
 *         description: Record not found
 *
 *   delete:
 *     summary: Soft delete an other revenue record
 *     tags: [Admin | Other Revenue]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Record deleted successfully
 *       400:
 *         description: Cannot delete record
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}/approve:
 *   patch:
 *     summary: Approve an other revenue record
 *     description: |
 *       Approve a PENDING other revenue record. This will:
 *       - Change approval_status to APPROVED
 *       - Create a DRAFT journal entry
 *       - Set accounting_status to DRAFT
 *     tags: [Admin | Other Revenue]
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
 *             required:
 *               - approved_by
 *             properties:
 *               approved_by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record approved successfully
 *       400:
 *         description: Record is not PENDING
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}/reject:
 *   patch:
 *     summary: Reject an other revenue record
 *     description: |
 *       Reject a PENDING other revenue record. This will:
 *       - Change approval_status to REJECTED
 *       - No journal entry is created
 *       - Record cannot be edited after rejection
 *     tags: [Admin | Other Revenue]
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
 *             required:
 *               - rejected_by
 *             properties:
 *               rejected_by:
 *                 type: string
 *               remarks:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Record rejected successfully
 *       400:
 *         description: Record is not PENDING
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/v1/admin/other-revenue/{id}/payment:
 *   post:
 *     summary: Record a payment for installment-based revenue
 *     description: |
 *       Record a payment against an installment schedule item.
 *       Only applicable for receivable (unearned) revenue with installments.
 *     tags: [Admin | Other Revenue]
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
 *             required:
 *               - scheduleItemId
 *               - amountPaid
 *               - paymentDate
 *               - paymentMethod
 *               - recordedBy
 *             properties:
 *               scheduleItemId:
 *                 type: integer
 *                 description: ID of the installment schedule item
 *               amountPaid:
 *                 type: number
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET]
 *               recordedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid payment or no receivable
 *       404:
 *         description: Record not found
 */

export {};
