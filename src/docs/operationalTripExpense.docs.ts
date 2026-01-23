/**
 * OPERATIONAL TRIP EXPENSE ENDPOINTS DOCUMENTATION
 * All endpoints require Admin role authentication
 */

/**
 * @swagger
 * /api/operational-trip-expenses:
 *   get:
 *     summary: List expenses with filters
 *     description: Retrieve paginated list of operational trip expenses with filters and search
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
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
 *         name: is_reimbursable
 *         schema:
 *           type: boolean
 *         description: Filter by reimbursable status
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [PENDING, APPROVED, REJECTED, COMPLETED]
 *         description: Filter by status(es)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search across expense_type.name, body_number, expense.code
 *       - in: query
 *         name: trip_type
 *         schema:
 *           type: string
 *           enum: [operational, rental, all]
 *         description: Filter by trip type
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [date_recorded, amount, status]
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of expenses retrieved successfully
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
 *                         $ref: '#/components/schemas/ExpenseListItem'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     summary:
 *                       $ref: '#/components/schemas/ExpenseSummary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create new expense
 *     description: Create a new operational trip expense with optional reimbursement
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseRequest'
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Expense created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     code:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     description: Retrieve single expense with full details including accounting and reimbursement info
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense retrieved successfully
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
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Update expense
 *     description: Update existing expense (PENDING status only)
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseRequest'
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     summary: Hard delete expense
 *     description: Permanently delete expense (PENDING status only, no journal entry)
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense permanently deleted
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/{id}/soft-delete:
 *   patch:
 *     summary: Soft delete expense
 *     description: Soft delete expense (set is_deleted = true)
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
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
 *                 description: Reason for deletion
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/{id}/approve:
 *   post:
 *     summary: Approve expense
 *     description: Approve expense and create journal entry
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
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
 *         description: Expense approved successfully
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
 *                     approved_by:
 *                       type: string
 *                     approved_at:
 *                       type: string
 *                       format: date-time
 *                     journal_entry_id:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/{id}/reject:
 *   post:
 *     summary: Reject expense
 *     description: Reject expense and cancel related records
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Expense rejected successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/export:
 *   get:
 *     summary: Export expenses
 *     description: Export expense data with summary statistics
 *     tags:
 *       - Admin | Operational Trip Expenses
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Export data retrieved successfully
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
 *                     summary:
 *                       $ref: '#/components/schemas/ExpenseSummary'
 *                     expenses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExpenseListItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/expense-types:
 *   get:
 *     summary: Get expense types
 *     description: Retrieve list of expense types for dropdown
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     description: Retrieve available payment methods
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
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
 *                         enum: [CASH, BANK_TRANSFER, ONLINE]
 *                       label:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/chart-of-accounts:
 *   get:
 *     summary: Get chart of accounts
 *     description: Retrieve chart of accounts for accounting code dropdown
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by account_code or account_name
 *       - in: query
 *         name: account_type_id
 *         schema:
 *           type: integer
 *         description: Filter by account type
 *     responses:
 *       200:
 *         description: List of accounts
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
 *                       id:
 *                         type: integer
 *                       account_code:
 *                         type: string
 *                       account_name:
 *                         type: string
 *                       account_type_id:
 *                         type: integer
 *                       account_type_name:
 *                         type: string
 *                       normal_balance:
 *                         type: string
 *                         enum: [DEBIT, CREDIT]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/operational-trips:
 *   get:
 *     summary: Get operational trips
 *     description: Retrieve operational trips for bus selector dropdown
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date_assigned
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by plate_number, body_number, route
 *     responses:
 *       200:
 *         description: List of operational trips
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
 *                       assignment_id:
 *                         type: string
 *                       bus_trip_id:
 *                         type: string
 *                       display_text:
 *                         type: string
 *                       date_assigned:
 *                         type: string
 *                         format: date-time
 *                       body_number:
 *                         type: string
 *                       bus_type:
 *                         type: string
 *                       bus_route:
 *                         type: string
 *                       plate_number:
 *                         type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/rental-trips:
 *   get:
 *     summary: Get rental trips
 *     description: Retrieve rental trips for trip selector dropdown
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by rental_start_date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by rental_end_date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by plate_number, body_number, destination
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by rental_status
 *     responses:
 *       200:
 *         description: List of rental trips
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
 *                       assignment_id:
 *                         type: string
 *                       display_text:
 *                         type: string
 *                       rental_start_date:
 *                         type: string
 *                         format: date-time
 *                       rental_end_date:
 *                         type: string
 *                         format: date-time
 *                       body_number:
 *                         type: string
 *                       bus_type:
 *                         type: string
 *                       rental_destination:
 *                         type: string
 *                       plate_number:
 *                         type: string
 *                       rental_status:
 *                         type: string
 *                       total_rental_amount:
 *                         type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/operational-trip-expenses/employees:
 *   get:
 *     summary: Get employees (proxy)
 *     description: Proxy to HR system to fetch employee data for reimbursements
 *     tags:
 *       - Admin | Expense Reference Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: employeeNumber
 *         schema:
 *           type: string
 *         description: Specific employee number
 *     responses:
 *       200:
 *         description: List of employees
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
 *                       employeeNumber:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       middleName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       position:
 *                         type: string
 *                       department:
 *                         type: string
 *                       formatted_names:
 *                         type: object
 *                         properties:
 *                           full:
 *                             type: string
 *                           formal:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *         date_recorded:
 *           type: string
 *           format: date-time
 *         expense_name:
 *           type: string
 *         expense_type_id:
 *           type: integer
 *         body_number:
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
 *           enum: [CASH, BANK_TRANSFER, ONLINE]
 *         trip_type:
 *           type: string
 *           enum: [operational, rental]
 *         operational_trip:
 *           type: object
 *           nullable: true
 *         rental_trip:
 *           type: object
 *           nullable: true
 *         created_by:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         approved_by:
 *           type: string
 *           nullable: true
 *         approved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     
 *     ExpenseDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *         expense_information:
 *           type: object
 *           properties:
 *             expense_code:
 *               type: string
 *             date_recorded:
 *               type: string
 *               format: date-time
 *             expense_name:
 *               type: string
 *             expense_type_id:
 *               type: integer
 *             amount:
 *               type: number
 *             payment_method:
 *               type: string
 *         trip_assignment_details:
 *           type: object
 *           nullable: true
 *         accounting_details:
 *           type: object
 *           nullable: true
 *         reimbursable_details:
 *           type: object
 *           nullable: true
 *         additional_information:
 *           type: object
 *           properties:
 *             remarks:
 *               type: string
 *         audit_trail:
 *           type: object
 *           properties:
 *             requested_by:
 *               type: string
 *             requested_on:
 *               type: string
 *               format: date-time
 *             approved_by:
 *               type: string
 *               nullable: true
 *             approved_on:
 *               type: string
 *               format: date-time
 *               nullable: true
 *         status:
 *           type: string
 *     
 *     CreateExpenseRequest:
 *       type: object
 *       required:
 *         - expense_information
 *         - is_reimbursable
 *       properties:
 *         expense_information:
 *           type: object
 *           required:
 *             - expense_type_id
 *             - date_recorded
 *             - amount
 *             - payment_method
 *           properties:
 *             expense_type_id:
 *               type: integer
 *             date_recorded:
 *               type: string
 *               format: date
 *             amount:
 *               type: number
 *             payment_method:
 *               type: string
 *               enum: [CASH, BANK_TRANSFER, ONLINE]
 *         trip_assignment:
 *           type: object
 *           properties:
 *             trip_type:
 *               type: string
 *               enum: [operational, rental]
 *             operational_trip_assignment_id:
 *               type: string
 *             operational_trip_bus_trip_id:
 *               type: string
 *             rental_trip_assignment_id:
 *               type: string
 *         accounting_details:
 *           type: object
 *           properties:
 *             account_id:
 *               type: integer
 *         is_reimbursable:
 *           type: boolean
 *         reimbursable_details:
 *           type: object
 *           properties:
 *             employee_number:
 *               type: string
 *             employee_name:
 *               type: string
 *             due_date:
 *               type: string
 *               format: date
 *         remarks:
 *           type: string
 *     
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total_pages:
 *           type: integer
 *     
 *     ExpenseSummary:
 *       type: object
 *       properties:
 *         pending_count:
 *           type: integer
 *         approved_count:
 *           type: integer
 *         total_approved_amount:
 *           type: number
 *         date_from:
 *           type: string
 *           format: date
 *         date_to:
 *           type: string
 *           format: date
 */
