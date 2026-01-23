/**
 * GENERAL & INTEGRATION ENDPOINTS DOCUMENTATION
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the application, including uptime and environment information. If API documentation is enabled, it also includes links to the documentation.
 *     tags:
 *       - General | Health & Info
 *     responses:
 *       200:
 *         description: System is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                   description: Health status of the application
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2026-01-11T10:30:00.000Z'
 *                   description: Current timestamp in ISO format
 *                 uptime:
 *                   type: number
 *                   example: 3600.5
 *                   description: Application uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 *                   description: Current environment (development, production, etc.)
 *                 documentation:
 *                   type: object
 *                   description: API documentation links (only present if ENABLE_API_DOCS=true)
 *                   properties:
 *                     swagger_ui:
 *                       type: string
 *                       example: /docs
 *                       description: Path to Swagger UI
 *                     openapi_spec:
 *                       type: string
 *                       example: /api-docs.json
 *                       description: Path to OpenAPI JSON specification
 *             examples:
 *               withDocs:
 *                 summary: Health response with documentation links
 *                 value:
 *                   status: ok
 *                   timestamp: '2026-01-11T10:30:00.000Z'
 *                   uptime: 3600.5
 *                   environment: development
 *                   documentation:
 *                     swagger_ui: /docs
 *                     openapi_spec: /api-docs.json
 *               withoutDocs:
 *                 summary: Health response without documentation
 *                 value:
 *                   status: ok
 *                   timestamp: '2026-01-11T10:30:00.000Z'
 *                   uptime: 3600.5
 *                   environment: production
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information endpoint
 *     description: Returns basic information about the API, including name, version, and available endpoints
 *     tags:
 *       - General | Health & Info
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: FTMS Backend API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 description:
 *                   type: string
 *                   example: Financial Transaction Management System - Pure Backend
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: /health
 *                     api:
 *                       type: string
 *                       example: /api/v1
 *                 documentation:
 *                   type: string
 *                   example: /docs
 *                   description: Path to API documentation (only present if enabled)
 */

/**
 * @swagger
 * /finance/v2/payroll-integration:
 *   get:
 *     summary: Get payroll data for Finance system integration
 *     description: |
 *       Returns employee payroll data formatted for external Finance system integration.
 *       This endpoint provides comprehensive payroll information including employee details,
 *       gross pay, deductions, net pay, tax withholdings, and benefits for a specified
 *       payroll period.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT Bearer token.
 *       
 *       **Use Cases**:
 *       - Finance system synchronization
 *       - Payroll reporting and analytics
 *       - Compliance and audit requirements
 *       - External accounting system integration
 *       
 *       **Data Format**:
 *       - All monetary values are in decimal format with 2 decimal places
 *       - Dates are in YYYY-MM-DD format
 *       - Employee numbers follow the format EMP-YYYY-XXX
 *     tags:
 *       - Admin | Integration – Finance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: payroll_period_start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: '2026-01-01'
 *         description: |
 *           Start date of the payroll period in YYYY-MM-DD format.
 *           Must be a valid date and cannot be in the future.
 *       - in: query
 *         name: payroll_period_end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: '2026-01-15'
 *         description: |
 *           End date of the payroll period in YYYY-MM-DD format.
 *           Must be a valid date, after the start date, and cannot be in the future.
 *       - in: query
 *         name: employee_number
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^EMP-\d{4}-\d{3}$'
 *           example: 'EMP-2024-001'
 *         description: |
 *           Optional filter to retrieve payroll data for a specific employee.
 *           Must follow the format EMP-YYYY-XXX where YYYY is the year and XXX is a 3-digit number.
 *           If omitted, returns data for all employees in the specified period.
 *     responses:
 *       200:
 *         description: Payroll data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayrollIntegrationData'
 *             examples:
 *               singleEmployee:
 *                 summary: Payroll data for a single employee
 *                 value:
 *                   success: true
 *                   data:
 *                     payroll_period:
 *                       start_date: '2026-01-01'
 *                       end_date: '2026-01-15'
 *                     employees:
 *                       - employee_number: 'EMP-2024-001'
 *                         employee_name: 'John Doe'
 *                         department: 'Engineering'
 *                         gross_pay: 75000.00
 *                         deductions: 15000.00
 *                         net_pay: 60000.00
 *                         tax_withheld: 10000.00
 *                         benefits: 5000.00
 *                     summary:
 *                       total_employees: 1
 *                       total_gross_pay: 75000.00
 *                       total_deductions: 15000.00
 *                       total_net_pay: 60000.00
 *                   metadata:
 *                     generated_at: '2026-01-11T10:30:00Z'
 *                     generated_by: 'FTMS System'
 *               multipleEmployees:
 *                 summary: Payroll data for multiple employees
 *                 value:
 *                   success: true
 *                   data:
 *                     payroll_period:
 *                       start_date: '2026-01-01'
 *                       end_date: '2026-01-15'
 *                     employees:
 *                       - employee_number: 'EMP-2024-001'
 *                         employee_name: 'John Doe'
 *                         department: 'Engineering'
 *                         gross_pay: 75000.00
 *                         deductions: 15000.00
 *                         net_pay: 60000.00
 *                         tax_withheld: 10000.00
 *                         benefits: 5000.00
 *                       - employee_number: 'EMP-2024-002'
 *                         employee_name: 'Jane Smith'
 *                         department: 'Finance'
 *                         gross_pay: 80000.00
 *                         deductions: 16000.00
 *                         net_pay: 64000.00
 *                         tax_withheld: 11000.00
 *                         benefits: 5000.00
 *                       - employee_number: 'EMP-2024-003'
 *                         employee_name: 'Bob Johnson'
 *                         department: 'Operations'
 *                         gross_pay: 70000.00
 *                         deductions: 14000.00
 *                         net_pay: 56000.00
 *                         tax_withheld: 9000.00
 *                         benefits: 5000.00
 *                     summary:
 *                       total_employees: 3
 *                       total_gross_pay: 225000.00
 *                       total_deductions: 45000.00
 *                       total_net_pay: 180000.00
 *                   metadata:
 *                     generated_at: '2026-01-11T10:30:00Z'
 *                     generated_by: 'FTMS System'
 *       400:
 *         description: Bad request - Invalid date format or date range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               invalidDateFormat:
 *                 summary: Invalid date format
 *                 value:
 *                   success: false
 *                   message: 'Validation failed'
 *                   errors:
 *                     - field: 'payroll_period_start'
 *                       message: 'Invalid date format. Expected YYYY-MM-DD'
 *               invalidDateRange:
 *                 summary: Invalid date range
 *                 value:
 *                   success: false
 *                   message: 'Validation failed'
 *                   errors:
 *                     - field: 'payroll_period_end'
 *                       message: 'End date must be after start date'
 *               missingParameters:
 *                 summary: Missing required parameters
 *                 value:
 *                   success: false
 *                   message: 'Validation failed'
 *                   errors:
 *                     - field: 'payroll_period_start'
 *                       message: 'This field is required'
 *                     - field: 'payroll_period_end'
 *                       message: 'This field is required'
 *               invalidEmployeeNumber:
 *                 summary: Invalid employee number format
 *                 value:
 *                   success: false
 *                   message: 'Validation failed'
 *                   errors:
 *                     - field: 'employee_number'
 *                       message: 'Invalid employee number format. Expected EMP-YYYY-XXX'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No payroll data found for the specified period
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'No payroll data found for the specified period'
 *             example:
 *               success: false
 *               message: 'No payroll data found for the period 2026-01-01 to 2026-01-15'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
