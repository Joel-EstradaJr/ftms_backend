/**
 * BUDGET ALLOCATION ENDPOINTS DOCUMENTATION
 * Budget allocation management endpoints
 * Base path: /api/v1/admin/budget-allocation
 */

// ============================================================================
// BUDGET ALLOCATION ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/budget-allocation:
 *   get:
 *     summary: Get all department budgets
 *     description: |
 *       Retrieves budget information for all departments for a specific period.
 *       Returns allocated, used, and remaining budget for each department.
 *     tags:
 *       - Admin | Budget Allocation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}$'
 *         description: Budget period in YYYY-MM format
 *         example: '2026-01'
 *     responses:
 *       200:
 *         description: Department budgets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       department_id:
 *                         type: string
 *                         example: 'DEPT-001'
 *                       department_name:
 *                         type: string
 *                         example: 'Finance Department'
 *                       allocated_budget:
 *                         type: number
 *                         example: 500000
 *                       used_budget:
 *                         type: number
 *                         example: 150000
 *                       remaining_budget:
 *                         type: number
 *                         example: 350000
 *                       last_update_date:
 *                         type: string
 *                         format: date-time
 *                       budget_period:
 *                         type: string
 *                         example: '2026-01'
 *                       status:
 *                         type: string
 *                         enum: [Active, Exceeded]
 *                 period:
 *                   type: string
 *                   example: '2026-01'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/admin/budget-allocation/allocate:
 *   post:
 *     summary: Allocate budget to a department
 *     description: |
 *       Adds budget allocation to a department for a specific period.
 *       Creates a new allocation record and updates the department's total allocated budget.
 *     tags:
 *       - Admin | Budget Allocation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department_id
 *               - amount
 *               - period
 *             properties:
 *               department_id:
 *                 type: string
 *                 description: Department ID to allocate budget to
 *                 example: 'DEPT-001'
 *               amount:
 *                 type: number
 *                 description: Amount to allocate
 *                 example: 50000
 *               period:
 *                 type: string
 *                 description: Budget period in YYYY-MM format
 *                 example: '2026-01'
 *               notes:
 *                 type: string
 *                 description: Optional notes for the allocation
 *                 example: 'Q1 budget allocation'
 *     responses:
 *       200:
 *         description: Budget allocated successfully
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
 *                   example: 'Budget allocated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     allocation_id:
 *                       type: integer
 *                       example: 1
 *                     new_allocated_budget:
 *                       type: number
 *                       example: 550000
 *                     new_remaining_budget:
 *                       type: number
 *                       example: 400000
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/admin/budget-allocation/deduct:
 *   post:
 *     summary: Deduct budget from a department
 *     description: |
 *       Deducts budget from a department for a specific period.
 *       Creates a deduction record and updates the department's remaining budget.
 *     tags:
 *       - Admin | Budget Allocation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - department_id
 *               - amount
 *               - period
 *             properties:
 *               department_id:
 *                 type: string
 *                 description: Department ID to deduct budget from
 *                 example: 'DEPT-001'
 *               amount:
 *                 type: number
 *                 description: Amount to deduct
 *                 example: 10000
 *               period:
 *                 type: string
 *                 description: Budget period in YYYY-MM format
 *                 example: '2026-01'
 *               notes:
 *                 type: string
 *                 description: Optional notes for the deduction
 *                 example: 'Expense reimbursement'
 *     responses:
 *       200:
 *         description: Budget deducted successfully
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
 *                   example: 'Budget deducted successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     deduction_id:
 *                       type: integer
 *                       example: 1
 *                     new_allocated_budget:
 *                       type: number
 *                       example: 500000
 *                     new_remaining_budget:
 *                       type: number
 *                       example: 340000
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/admin/budget-allocation/{departmentId}/history:
 *   get:
 *     summary: Get allocation history for a department
 *     description: |
 *       Retrieves the budget allocation and deduction history for a specific department.
 *       Supports filtering by type, date range, and pagination.
 *     tags:
 *       - Admin | Budget Allocation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Allocation, Deduction]
 *         description: Filter by transaction type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Allocation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       allocation_id:
 *                         type: string
 *                         example: 'ALLOC-001'
 *                       department_id:
 *                         type: string
 *                         example: 'DEPT-001'
 *                       type:
 *                         type: string
 *                         enum: [Allocation, Deduction]
 *                       amount:
 *                         type: number
 *                         example: 50000
 *                       date:
 *                         type: string
 *                         format: date
 *                       allocated_by:
 *                         type: string
 *                         example: 'admin@example.com'
 *                       notes:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

export {};
