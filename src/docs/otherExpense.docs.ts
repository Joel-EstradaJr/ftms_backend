// ============================================================================
// ADMINISTRATIVE (OTHER) EXPENSE SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Administrative Expense endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Administrative Expenses
 *   description: 🔐 Admin – Manage administrative/other expense records
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminExpenseListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           example: "ADM-000001"
 *         expense_type_id:
 *           type: integer
 *         expense_type_name:
 *           type: string
 *         expense_type_code:
 *           type: string
 *         date_recorded:
 *           type: string
 *           format: date
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         vendor:
 *           type: string
 *         invoice_number:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, COMPLETED]
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         payable_id:
 *           type: integer
 *         paymentStatus:
 *           type: string
 *         balance:
 *           type: number
 *         journal_entry_id:
 *           type: integer
 *         created_by:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         approved_by:
 *           type: string
 *
 *     AdminExpenseDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         expense_type_id:
 *           type: integer
 *         expense_type_name:
 *           type: string
 *         expense_type_code:
 *           type: string
 *         date_recorded:
 *           type: string
 *           format: date
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         vendor:
 *           type: string
 *         invoice_number:
 *           type: string
 *         status:
 *           type: string
 *         payment_method:
 *           type: string
 *         payment_reference:
 *           type: string
 *         payable_id:
 *           type: integer
 *         paymentStatus:
 *           type: string
 *         balance:
 *           type: number
 *         frequency:
 *           type: string
 *         scheduleItems:
 *           type: array
 *           items:
 *             type: object
 *         journal_entry_id:
 *           type: integer
 *         journal_entry_code:
 *           type: string
 *         journal_entry_status:
 *           type: string
 *         created_by:
 *           type: string
 *         created_at:
 *           type: string
 *         updated_by:
 *           type: string
 *         updated_at:
 *           type: string
 *         approved_by:
 *           type: string
 *         approved_at:
 *           type: string
 *         rejected_by:
 *           type: string
 *         rejected_at:
 *           type: string
 *         approval_remarks:
 *           type: string
 *         rejection_remarks:
 *           type: string
 *
 *     CreateAdminExpenseDTO:
 *       type: object
 *       required:
 *         - expense_type_id
 *         - amount
 *       properties:
 *         expense_type_id:
 *           type: integer
 *           description: ID of the expense type (EXPT-003 to EXPT-012)
 *         amount:
 *           type: number
 *           description: Expense amount
 *         date_recorded:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *         vendor:
 *           type: string
 *           description: Vendor/creditor name
 *         invoice_number:
 *           type: string
 *           description: Invoice reference number
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         payment_reference:
 *           type: string
 *         enable_schedule:
 *           type: boolean
 *           description: Enable payment schedule
 *         frequency:
 *           type: string
 *           enum: [DAILY, WEEKLY, BIWEEKLY, MONTHLY]
 *         number_of_payments:
 *           type: integer
 *         schedule_start_date:
 *           type: string
 *           format: date
 *
 *     UpdateAdminExpenseDTO:
 *       type: object
 *       properties:
 *         expense_type_id:
 *           type: integer
 *         date_recorded:
 *           type: string
 *           format: date
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         vendor:
 *           type: string
 *         invoice_number:
 *           type: string
 *         payment_method:
 *           type: string
 *         payment_reference:
 *           type: string
 *
 *     AdminExpenseType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           example: "EXPT-004"
 *         name:
 *           type: string
 *           example: "Office Supplies"
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/other-expense:
 *   get:
 *     summary: List administrative expenses
 *     description: |
 *       Returns paginated list of administrative/other expenses with filtering and search.
 *       Search/filter only works on visible table columns: Date, Code, Vendor, Invoice #, Amount, Status.
 *     tags:
 *       - Admin | Administrative Expenses
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
 *         description: Search by expense code, vendor, or invoice number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated)
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
 *         name: amount_min
 *         schema:
 *           type: number
 *       - in: query
 *         name: amount_max
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [date_recorded, code, vendor, amount, status]
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of administrative expenses
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
 *                     expenses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdminExpenseListItem'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         pending_count:
 *                           type: integer
 *                         approved_count:
 *                           type: integer
 *                         total_amount:
 *                           type: number
 *
 *   post:
 *     summary: Create administrative expense
 *     description: Creates a new administrative/other expense with auto-generated code (ADM-XXXXXX)
 *     tags:
 *       - Admin | Administrative Expenses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminExpenseDTO'
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/{id}:
 *   get:
 *     summary: Get expense by ID
 *     description: Returns full details for a specific administrative expense
 *     tags:
 *       - Admin | Administrative Expenses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Expense details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminExpenseDetail'
 *       404:
 *         description: Expense not found
 *
 *   put:
 *     summary: Update expense
 *     description: Updates expense fields (only allowed for PENDING expenses)
 *     tags:
 *       - Admin | Administrative Expenses
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
 *             $ref: '#/components/schemas/UpdateAdminExpenseDTO'
 *     responses:
 *       200:
 *         description: Expense updated
 *       400:
 *         description: Cannot update non-PENDING expense
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/{id}/soft-delete:
 *   patch:
 *     summary: Delete expense
 *     description: Soft deletes an administrative expense (only allowed for PENDING expenses)
 *     tags:
 *       - Admin | Administrative Expenses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deletion
 *     responses:
 *       200:
 *         description: Expense deleted
 *       400:
 *         description: Cannot delete non-PENDING expense
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/{id}/approve:
 *   post:
 *     summary: Approve expense
 *     description: |
 *       Approves expense and auto-generates journal entry.
 *       - Debit: Expense account (based on expense_type → COA mapping)
 *       - Credit: Cash/Bank/Payable (based on payment_method)
 *     tags:
 *       - Admin | Administrative Expenses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 description: Approval remarks
 *     responses:
 *       200:
 *         description: Expense approved and journal entry created
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
 *                     status:
 *                       type: string
 *                     journal_entry:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         code:
 *                           type: string
 *                         status:
 *                           type: string
 *       400:
 *         description: Cannot approve non-PENDING expense or missing COA
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/{id}/reject:
 *   post:
 *     summary: Reject expense
 *     description: Rejects an administrative expense with reason
 *     tags:
 *       - Admin | Administrative Expenses
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Rejection reason
 *     responses:
 *       200:
 *         description: Expense rejected
 *       400:
 *         description: Cannot reject non-PENDING expense or missing reason
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/expense-types:
 *   get:
 *     summary: Get expense types
 *     description: Returns list of administrative expense types (EXPT-003 to EXPT-012)
 *     tags:
 *       - Admin | Administrative Expenses
 *     responses:
 *       200:
 *         description: List of expense types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminExpenseType'
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     description: Returns list of available payment methods
 *     tags:
 *       - Admin | Administrative Expenses
 *     responses:
 *       200:
 *         description: List of payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 */

/**
 * @swagger
 * /api/v1/admin/other-expense/payment:
 *   post:
 *     summary: Record installment payment
 *     description: |
 *       Record a payment for an expense installment schedule.
 *       Supports single and cascade payments across multiple installments.
 *       Updates installment status, payable balance, and payment tracking.
 *     tags:
 *       - Admin | Administrative Expenses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expenseId
 *               - amountPaid
 *             properties:
 *               expenseId:
 *                 type: integer
 *                 description: ID of the expense record
 *               scheduleItemId:
 *                 type: integer
 *                 description: ID of specific installment to pay
 *               amountPaid:
 *                 type: number
 *                 description: Payment amount
 *                 example: 5000.00
 *               paymentDate:
 *                 type: string
 *                 format: date
 *                 description: Payment date (defaults to now)
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER, E_WALLET]
 *               cascadeBreakdown:
 *                 type: array
 *                 description: For cascade payments across multiple installments
 *                 items:
 *                   type: object
 *                   properties:
 *                     scheduleItemId:
 *                       type: integer
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
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payableStatus:
 *                       type: string
 *                       enum: [PENDING, PARTIALLY_PAID, PAID]
 *                     totalPaid:
 *                       type: number
 *                     totalDue:
 *                       type: number
 *                     balance:
 *                       type: number
 *       400:
 *         description: Invalid request or expense without payment schedule
 *       404:
 *         description: Expense not found
 */

export { };
