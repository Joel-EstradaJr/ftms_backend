/**
 * DASHBOARD ENDPOINTS DOCUMENTATION
 * Dashboard endpoints for financial analytics and reporting
 * Base path: /api/v1/dashboard
 */

// ============================================================================
// DASHBOARD SUMMARY ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary
 *     description: |
 *       Retrieves a comprehensive summary of financial data including revenue, expenses, and profit.
 *       Supports various date filtering options for flexible reporting.
 *     tags:
 *       - Admin | Dashboard
 *     parameters:
 *       - in: query
 *         name: dateFilter
 *         schema:
 *           type: string
 *           enum: [today, this_week, this_month, this_quarter, this_year, custom]
 *         description: Predefined date range filter
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
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
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 1500000
 *                         byCategory:
 *                           type: object
 *                           additionalProperties:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                               count:
 *                                 type: integer
 *                     expense:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 800000
 *                         byCategory:
 *                           type: object
 *                           additionalProperties:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               amount:
 *                                 type: number
 *                               count:
 *                                 type: integer
 *                     profit:
 *                       type: number
 *                       example: 700000
 *                     periodLabel:
 *                       type: string
 *                       example: 'January 2026'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/dashboard/forecast-data:
 *   get:
 *     summary: Get forecast data for predictive analytics
 *     description: |
 *       Retrieves historical revenue and expense aggregates for trend analysis and forecasting.
 *       Returns monthly aggregates for the specified number of months.
 *     tags:
 *       - Admin | Dashboard
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of months of historical data to retrieve
 *     responses:
 *       200:
 *         description: Forecast data retrieved successfully
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
 *                     revenueAggregates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             example: 'January'
 *                           year:
 *                             type: integer
 *                             example: 2026
 *                           monthNum:
 *                             type: integer
 *                             example: 1
 *                           totalAmount:
 *                             type: number
 *                             example: 1500000
 *                           count:
 *                             type: integer
 *                             example: 150
 *                           avgAmount:
 *                             type: number
 *                             example: 10000
 *                           byCategory:
 *                             type: object
 *                     expenseAggregates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           year:
 *                             type: integer
 *                           monthNum:
 *                             type: integer
 *                           totalAmount:
 *                             type: number
 *                           count:
 *                             type: integer
 *                           avgAmount:
 *                             type: number
 *                     revenueTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                     expenseTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

export {};
