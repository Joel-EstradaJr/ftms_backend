/**
 * STAFF ENDPOINTS DOCUMENTATION
 * All endpoints require Staff role authentication
 */

/**
 * @swagger
 * /api/v1/staff/journal-entries:
 *   get:
 *     summary: List all journal entries (Staff - Read only)
 *     description: Retrieves a list of all journal entries. Staff users have read-only access.
 *     tags:
 *       - Staff | Journal Entries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Journal entries retrieved successfully
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
 *                       id:
 *                         type: string
 *                       description:
 *                         type: string
 *                       referenceNumber:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       entries:
 *                         type: array
 *                         items:
 *                           type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/staff/journal-entries/{id}:
 *   get:
 *     summary: Get journal entry by ID (Staff - Read only)
 *     description: Retrieves a specific journal entry by its ID. Staff users have read-only access.
 *     tags:
 *       - Staff | Journal Entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Journal entry ID
 *         example: 'je_123456'
 *     responses:
 *       200:
 *         description: Journal entry retrieved successfully
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
 *                   properties:
 *                     id:
 *                       type: string
 *                     description:
 *                       type: string
 *                       example: 'Payment for office supplies'
 *                     referenceNumber:
 *                       type: string
 *                       example: 'JE-2026-001'
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: '2026-01-11'
 *                     entries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           accountId:
 *                             type: string
 *                           accountName:
 *                             type: string
 *                           debit:
 *                             type: number
 *                             example: 5000.00
 *                           credit:
 *                             type: number
 *                             example: 0.00
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
