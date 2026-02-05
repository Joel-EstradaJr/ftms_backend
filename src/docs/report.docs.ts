/**
 * Report API Documentation
 * 
 * OpenAPI/Swagger documentation for financial report endpoints.
 * All endpoints return data directly consumable by the frontend report pages.
 */

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Financial report endpoints for Journal Entry, Income Statement, and Financial Position reports
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     JournalEntryLine:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           description: Display date (only on first line of transaction)
 *           example: "Jan 15"
 *         scenario:
 *           type: string
 *           description: Derived from revenue_type.name or expense_type.name
 *           example: "Bus Trip Revenue - Boundary"
 *         accountCode:
 *           type: string
 *           description: Chart of Account code
 *           example: "1000"
 *         accountName:
 *           type: string
 *           description: Chart of Account name
 *           example: "Cash on Hand"
 *         debit:
 *           type: number
 *           nullable: true
 *           description: Debit amount (null if credit entry)
 *           example: 7000.00
 *         credit:
 *           type: number
 *           nullable: true
 *           description: Credit amount (null if debit entry)
 *           example: null
 *
 *     JournalTransaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Journal entry code
 *           example: "JE-2026-0001"
 *         lines:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/JournalEntryLine'
 *         remarks:
 *           type: string
 *           description: Journal entry description/remarks
 *           example: "Boundary trip completed successfully"
 *
 *     JournalEntryReportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             transactions:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JournalTransaction'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *             summary:
 *               type: object
 *               properties:
 *                 totalDebit:
 *                   type: number
 *                   example: 120000.00
 *                 totalCredit:
 *                   type: number
 *                   example: 120000.00
 *                 transactionCount:
 *                   type: integer
 *                   example: 18
 *
 *     IncomeStatementLine:
 *       type: object
 *       properties:
 *         accountName:
 *           type: string
 *           example: "Trip Revenue - Boundary"
 *         amount:
 *           type: number
 *           example: 10000.00
 *
 *     IncomeStatementSection:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "TOTAL REVENUE"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/IncomeStatementLine'
 *         subtotal:
 *           type: number
 *           example: 10200.00
 *         isNegative:
 *           type: boolean
 *           description: Whether this section represents deductions
 *           example: false
 *
 *     IncomeStatementResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             companyName:
 *               type: string
 *               description: From system_configuration.company_name
 *               example: "Company Name"
 *             reportTitle:
 *               type: string
 *               example: "Income Statement"
 *             periodEnding:
 *               type: string
 *               example: "For the Year Ended December 31, 2026"
 *             revenue:
 *               $ref: '#/components/schemas/IncomeStatementSection'
 *             costOfService:
 *               $ref: '#/components/schemas/IncomeStatementSection'
 *             grossProfit:
 *               type: number
 *               example: 9400.00
 *             operatingExpenses:
 *               $ref: '#/components/schemas/IncomeStatementSection'
 *             netOperatingIncome:
 *               type: number
 *               example: 8200.00
 *             otherIncome:
 *               $ref: '#/components/schemas/IncomeStatementSection'
 *             netIncomeBeforeTax:
 *               type: number
 *               example: 8300.00
 *             incomeTaxProvision:
 *               type: number
 *               example: 1660.00
 *             netIncome:
 *               type: number
 *               example: 6640.00
 *
 *     FinancialPositionLine:
 *       type: object
 *       properties:
 *         accountName:
 *           type: string
 *           example: "Cash on Hand"
 *         amount:
 *           type: number
 *           example: 100.00
 *
 *     FinancialPositionSection:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Current Assets"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FinancialPositionLine'
 *         subtotal:
 *           type: number
 *           example: 500.00
 *
 *     FinancialPositionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             companyName:
 *               type: string
 *               description: From system_configuration.company_name
 *               example: "Company Name"
 *             reportTitle:
 *               type: string
 *               example: "Statement of Financial Position"
 *             asOfDate:
 *               type: string
 *               example: "As of December 31, 2026"
 *             currentAssets:
 *               $ref: '#/components/schemas/FinancialPositionSection'
 *             nonCurrentAssets:
 *               $ref: '#/components/schemas/FinancialPositionSection'
 *             totalAssets:
 *               type: number
 *               example: 500.00
 *             currentLiabilities:
 *               $ref: '#/components/schemas/FinancialPositionSection'
 *             longTermLiabilities:
 *               $ref: '#/components/schemas/FinancialPositionSection'
 *             totalLiabilities:
 *               type: number
 *               example: 150.00
 *
 *     SystemConfigurationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             companyName:
 *               type: string
 *               example: "Company Name"
 *             configCode:
 *               type: string
 *               example: "DEFAULT"
 *             minimumWage:
 *               type: number
 *               example: 600.00
 *             driverSharePercentage:
 *               type: number
 *               example: 50.00
 *             conductorSharePercentage:
 *               type: number
 *               example: 50.00
 *
 *     ScenarioOptionsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Bus Trip Revenue - Boundary", "Bus Trip Revenue - Percentage", "Rental Revenue", "Operational", "Personnel"]
 */

/**
 * @swagger
 * /api/v1/reports/journal-entry:
 *   get:
 *     summary: Get Journal Entry Report
 *     description: |
 *       Returns journal entries grouped as transactions with lines.
 *       Scenario field is derived from revenue_type.name or expense_type.name.
 *       Only POSTED and ADJUSTED entries are included.
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (ISO format)
 *         example: "2026-01-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (ISO format)
 *         example: "2026-12-31"
 *       - in: query
 *         name: scenario
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by scenario names (from revenue_type.name or expense_type.name)
 *         example: ["Bus Trip Revenue - Boundary"]
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [asset, liability, revenue, expense, cash, receivable]
 *         style: form
 *         explode: true
 *         description: Filter by account type
 *       - in: query
 *         name: amountMin
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: amountMax
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, POSTED, ADJUSTED, REVERSED, REJECTED]
 *         description: Journal entry status filter (default includes POSTED and ADJUSTED)
 *     responses:
 *       200:
 *         description: Journal Entry Report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalEntryReportResponse'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/reports/income-statement:
 *   get:
 *     summary: Get Income Statement Report
 *     description: |
 *       Returns Income Statement with revenue, cost of service, operating expenses,
 *       and other income sections. All totals are computed server-side.
 *       Company name is fetched from system_configuration.company_name.
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the reporting period
 *         example: "2026-01-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the reporting period
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Income Statement Report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IncomeStatementResponse'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/reports/financial-position:
 *   get:
 *     summary: Get Financial Position (Balance Sheet) Report
 *     description: |
 *       Returns Statement of Financial Position with current/non-current assets
 *       and current/long-term liabilities. All totals are computed server-side.
 *       NOTE: Equity section is excluded per requirements.
 *       Company name is fetched from system_configuration.company_name.
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: asOfDate
 *         schema:
 *           type: string
 *           format: date
 *         description: As-of date for the report (defaults to today)
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Financial Position Report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FinancialPositionResponse'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/reports/configuration:
 *   get:
 *     summary: Get System Configuration for report headers
 *     description: |
 *       Returns system configuration data including company name for report headers.
 *       Maps to system_configuration table.
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: System configuration data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemConfigurationResponse'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/reports/scenarios:
 *   get:
 *     summary: Get available scenario options for filtering
 *     description: |
 *       Returns list of unique scenario names derived from revenue_type.name
 *       and expense_type.name. Used for filter dropdowns in the Journal Entry report.
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: List of scenario options
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScenarioOptionsResponse'
 *       500:
 *         description: Server error
 */

export {};
