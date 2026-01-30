// ============================================================================
// OPERATIONAL EXPENSE SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Operational Expense endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Operational Expenses
 *   description: Unified operational expense management for bus trips and rentals
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpenseListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           example: "EXP-000001"
 *         date_recorded:
 *           type: string
 *           format: date
 *         expense_name:
 *           type: string
 *         expense_type_id:
 *           type: integer
 *         expense_type_code:
 *           type: string
 *         amount:
 *           type: number
 *         is_reimbursable:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, COMPLETED]
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         trip_type:
 *           type: string
 *           enum: [operational, rental]
 *         body_number:
 *           type: string
 *         bus_route:
 *           type: string
 *
 *     ExpenseDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         date_recorded:
 *           type: string
 *           format: date
 *         expense_type_id:
 *           type: integer
 *         expense_type_name:
 *           type: string
 *         expense_type_code:
 *           type: string
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         payment_method:
 *           type: string
 *         trip_type:
 *           type: string
 *         bus_trip_assignment_id:
 *           type: string
 *         bus_trip_id:
 *           type: string
 *         rental_assignment_id:
 *           type: string
 *         bus_route:
 *           type: string
 *         date_assigned:
 *           type: string
 *         plate_number:
 *           type: string
 *         body_number:
 *           type: string
 *         bus_type:
 *           type: string
 *         is_reimbursable:
 *           type: boolean
 *         payable_id:
 *           type: integer
 *         employee_reference:
 *           type: string
 *         creditor_name:
 *           type: string
 *         journal_entry_id:
 *           type: integer
 *         journal_entry_code:
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
 *         deletion_remarks:
 *           type: string
 *
 *     CreateExpenseDTO:
 *       type: object
 *       required:
 *         - expense_type_id
 *         - amount
 *       properties:
 *         expense_type_id:
 *           type: integer
 *           description: ID of the expense type
 *         amount:
 *           type: number
 *           description: Expense amount
 *         date_recorded:
 *           type: string
 *           format: date
 *           description: Date expense was recorded
 *         description:
 *           type: string
 *           description: Description or remarks
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *         bus_trip_assignment_id:
 *           type: string
 *           description: Bus trip assignment ID (for operational trips)
 *         bus_trip_id:
 *           type: string
 *           description: Bus trip ID (paired with assignment_id)
 *         rental_assignment_id:
 *           type: string
 *           description: Rental assignment ID (for rental trips)
 *         is_reimbursable:
 *           type: boolean
 *           description: Whether expense is reimbursable to employee
 *         employee_number:
 *           type: string
 *           description: Employee number for reimbursement
 *         employee_name:
 *           type: string
 *           description: Employee name for reimbursement
 *         due_date:
 *           type: string
 *           format: date
 *           description: Due date for reimbursement
 *
 *     UpdateExpenseDTO:
 *       type: object
 *       properties:
 *         date_recorded:
 *           type: string
 *           format: date
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         payment_method:
 *           type: string
 *           enum: [CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT]
 *
 *     SyncResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             bus_trips:
 *               type: object
 *               properties:
 *                 processed:
 *                   type: integer
 *                   description: Number of trips checked
 *                 created:
 *                   type: integer
 *                   description: Number of expenses created
 *                 errors:
 *                   type: integer
 *                   description: Number of errors encountered
 *             rentals:
 *               type: object
 *               properties:
 *                 processed:
 *                   type: integer
 *                 created:
 *                   type: integer
 *                 errors:
 *                   type: integer
 *
 *     ExpenseType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *
 *     PaymentMethodItem:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *         label:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses:
 *   get:
 *     summary: List operational expenses
 *     description: Returns paginated list of operational expenses with filtering and search
 *     tags:
 *       - Admin | Operational Expenses
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
 *         description: Search by expense code, body number, or employee
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, COMPLETED]
 *       - in: query
 *         name: trip_type
 *         schema:
 *           type: string
 *           enum: [operational, rental, all]
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
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [date_recorded, amount, status]
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: List of expenses
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
 *                     $ref: '#/components/schemas/ExpenseListItem'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *
 *   post:
 *     summary: Create a new operational expense
 *     description: Creates a new expense record with optional trip association
 *     tags:
 *       - Admin | Operational Expenses
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseDTO'
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ExpenseDetail'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/{id}:
 *   get:
 *     summary: Get expense details
 *     description: Returns full details for a specific expense
 *     tags:
 *       - Admin | Operational Expenses
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
 *                   $ref: '#/components/schemas/ExpenseDetail'
 *       404:
 *         description: Expense not found
 *
 *   patch:
 *     summary: Update an expense
 *     description: Updates expense fields (only allowed for PENDING expenses)
 *     tags:
 *       - Admin | Operational Expenses
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
 *             $ref: '#/components/schemas/UpdateExpenseDTO'
 *     responses:
 *       200:
 *         description: Expense updated
 *       400:
 *         description: Cannot update non-pending expense
 *       404:
 *         description: Expense not found
 *
 *   delete:
 *     summary: Soft delete an expense
 *     description: Marks expense as deleted (only allowed for PENDING expenses)
 *     tags:
 *       - Admin | Operational Expenses
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
 *         description: Cannot delete non-pending expense
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/{id}/approve:
 *   post:
 *     summary: Approve an expense
 *     description: Changes expense status to APPROVED and creates a journal entry
 *     tags:
 *       - Admin | Operational Expenses
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
 *                 description: Optional approval remarks
 *     responses:
 *       200:
 *         description: Expense approved
 *       400:
 *         description: Cannot approve expense in current status
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/{id}/reject:
 *   post:
 *     summary: Reject an expense
 *     description: Changes expense status to REJECTED with optional reason
 *     tags:
 *       - Admin | Operational Expenses
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
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Expense rejected
 *       400:
 *         description: Cannot reject expense in current status
 *       404:
 *         description: Expense not found
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/sync:
 *   post:
 *     summary: Sync expenses from trip data
 *     description: |
 *       Auto-generates expense records from unprocessed bus trips and rentals.
 *       
 *       This endpoint scans `bus_trip_local` and `rental_local` tables for records
 *       where `is_expense_recorded = false` and creates corresponding expense records
 *       with journal entries.
 *       
 *       **Processing Logic:**
 *       - Finds trips with `is_expense_recorded = false`
 *       - Creates expense record with code `EXP-XXXXXX`
 *       - Creates journal entry (Debit: Expense COA, Credit: Cash/Payable)
 *       - Updates trip: `is_expense_recorded = true`
 *     tags:
 *       - Admin | Operational Expenses
 *     responses:
 *       200:
 *         description: Sync completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncResult'
 *             example:
 *               success: true
 *               message: "Expense sync completed"
 *               data:
 *                 bus_trips:
 *                   processed: 10
 *                   created: 8
 *                   errors: 0
 *                 rentals:
 *                   processed: 5
 *                   created: 0
 *                   errors: 0
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/expense-types:
 *   get:
 *     summary: Get expense types
 *     description: Returns list of expense types for dropdown selection
 *     tags:
 *       - Admin | Operational Expenses
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
 *                     $ref: '#/components/schemas/ExpenseType'
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     description: Returns list of available payment methods
 *     tags:
 *       - Admin | Operational Expenses
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
 *                     $ref: '#/components/schemas/PaymentMethodItem'
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/operational-trips:
 *   get:
 *     summary: Get operational trips
 *     description: Returns list of bus trips available for expense association
 *     tags:
 *       - Admin | Operational Expenses
 *     responses:
 *       200:
 *         description: List of operational trips
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/rental-trips:
 *   get:
 *     summary: Get rental trips
 *     description: Returns list of rental trips available for expense association
 *     tags:
 *       - Admin | Operational Expenses
 *     responses:
 *       200:
 *         description: List of rental trips
 */

/**
 * @swagger
 * /api/v1/admin/operational-expenses/employees:
 *   get:
 *     summary: Get employees for reimbursement
 *     description: Returns list of employees for reimbursement selection
 *     tags:
 *       - Admin | Operational Expenses
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or employee number
 *     responses:
 *       200:
 *         description: List of employees
 */

export { };
