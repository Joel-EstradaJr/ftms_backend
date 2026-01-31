/**
 * FINANCE ENDPOINTS DOCUMENTATION
 * Finance integration endpoints for budget requests, purchase requests, and payroll
 * Base path: /finance
 */

// ============================================================================
// FINANCE PING ENDPOINT
// ============================================================================

/**
 * @swagger
 * /finance/ping:
 *   get:
 *     summary: Health check for finance router
 *     description: Simple ping endpoint to verify the finance router is working
 *     tags:
 *       - Finance | Payroll Integration
 *     responses:
 *       200:
 *         description: Finance router is working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Finance router is working'
 */

// ============================================================================
// PAYROLL INTEGRATION ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /finance/v2/payroll-integration:
 *   get:
 *     summary: Get payroll integration data
 *     description: Retrieves payroll data for external finance system integration
 *     tags:
 *       - Finance | Payroll Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll integration data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Payroll integration data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// ============================================================================
// BUDGET REQUEST ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /finance/budget-requests:
 *   get:
 *     summary: List all budget requests
 *     description: Retrieves a paginated list of budget requests with optional filtering
 *     tags:
 *       - Finance | Budget Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, ADJUSTED, CLOSED]
 *         description: Filter by status
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: string
 *         description: Filter by department ID
 *       - in: query
 *         name: request_type
 *         schema:
 *           type: string
 *           enum: [REGULAR, PROJECT_BASED, URGENT, EMERGENCY]
 *         description: Filter by request type
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
 *         description: List of budget requests retrieved successfully
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
 *                     $ref: '#/components/schemas/BudgetRequest'
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/budget-requests/{id}:
 *   get:
 *     summary: Get a single budget request
 *     description: Retrieves detailed information about a specific budget request
 *     tags:
 *       - Finance | Budget Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget request ID
 *     responses:
 *       200:
 *         description: Budget request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BudgetRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/budget-requests/{id}/approve:
 *   post:
 *     summary: Approve a budget request
 *     description: Approves a budget request and optionally auto-allocates budget to the department
 *     tags:
 *       - Finance | Budget Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved_amount:
 *                 type: number
 *                 description: Approved amount (defaults to requested amount if not specified)
 *                 example: 50000
 *               remarks:
 *                 type: string
 *                 description: Approval remarks
 *                 example: 'Approved as requested'
 *     responses:
 *       200:
 *         description: Budget request approved successfully
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
 *                   example: 'Budget request approved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/BudgetRequest'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/budget-requests/{id}/reject:
 *   post:
 *     summary: Reject a budget request
 *     description: Rejects a budget request with a mandatory rejection reason
 *     tags:
 *       - Finance | Budget Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Budget request ID
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
 *                 example: 'Insufficient budget justification'
 *     responses:
 *       200:
 *         description: Budget request rejected successfully
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
 *                   example: 'Budget request rejected successfully'
 *                 data:
 *                   $ref: '#/components/schemas/BudgetRequest'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

// ============================================================================
// PURCHASE REQUEST ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /finance/purchase-requests:
 *   get:
 *     summary: Get finance purchase requests
 *     description: Retrieves purchase requests that require finance approval
 *     tags:
 *       - Finance | Purchase Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
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
 *         description: Purchase requests retrieved successfully
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
 *                     $ref: '#/components/schemas/PurchaseRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/purchase-requests/{id}:
 *   get:
 *     summary: Get single purchase request
 *     description: Retrieves detailed information about a specific purchase request
 *     tags:
 *       - Finance | Purchase Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase request ID
 *     responses:
 *       200:
 *         description: Purchase request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PurchaseRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Update purchase request
 *     description: Updates purchase request status or remarks
 *     tags:
 *       - Finance | Purchase Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: New status
 *               remarks:
 *                 type: string
 *                 description: Remarks or notes
 *     responses:
 *       200:
 *         description: Purchase request updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/purchase-requests/items/bulk:
 *   patch:
 *     summary: Bulk update purchase request items
 *     description: Updates multiple purchase request items at once
 *     tags:
 *       - Finance | Purchase Requests
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     approved_quantity:
 *                       type: number
 *                     approved_unit_cost:
 *                       type: number
 *     responses:
 *       200:
 *         description: Items updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /finance/purchase-requests/items/{id}:
 *   patch:
 *     summary: Update single purchase request item
 *     description: Updates a single purchase request item
 *     tags:
 *       - Finance | Purchase Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approved_quantity:
 *                 type: number
 *               approved_unit_cost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

export {};
