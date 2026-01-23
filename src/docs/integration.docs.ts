/**
 * INTEGRATION ENDPOINTS DOCUMENTATION
 * External system synchronization endpoints - requires Admin role authentication
 */

/**
 * @swagger
 * /api/integration/hr/sync-employees:
 *   post:
 *     summary: Manually sync employees with provided payload
 *     description: Sync employee data to the database using a manually provided payload from HR system
 *     tags:
 *       - Admin | Integration – HR
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employees:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     employeeNumber:
 *                       type: string
 *                       example: EMP-2024-NKFN57
 *                     firstName:
 *                       type: string
 *                       example: Juan
 *                     middleName:
 *                       type: string
 *                       example: Reyes
 *                     lastName:
 *                       type: string
 *                       example: Dela Cruz
 *                     phone:
 *                       type: string
 *                       example: "09171234567"
 *                     position:
 *                       type: string
 *                       example: HR Officer
 *                     barangay:
 *                       type: string
 *                       example: Barangay Uno
 *                     zipCode:
 *                       type: string
 *                       example: "1100"
 *                     departmentId:
 *                       type: integer
 *                       example: 1
 *                     department:
 *                       type: string
 *                       example: Human Resource
 *     responses:
 *       200:
 *         description: Employees synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Employees synced successfully
 *                 synced:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Sync failed
 */

/**
 * @swagger
 * /api/integration/hr/fetch-and-sync:
 *   post:
 *     summary: Auto-fetch from HR API and sync to database
 *     description: Automatically fetch employee data from external HR API and sync to database
 *     tags:
 *       - Admin | Integration – HR
 *     responses:
 *       200:
 *         description: Employees fetched and synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Employees synced successfully
 *                 synced:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Fetch and sync failed
 */

/**
 * @swagger
 * /api/integration/hr/employees/by-department/{departmentId}:
 *   get:
 *     summary: Get employees by department ID
 *     description: Retrieve all employees belonging to a specific department
 *     tags:
 *       - Admin | Integration – HR
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 department_id:
 *                   type: integer
 *                   example: 1
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/hr/employees/by-position:
 *   get:
 *     summary: Get employees by position name
 *     description: Retrieve all employees with a specific position
 *     tags:
 *       - Admin | Integration – HR
 *     parameters:
 *       - in: query
 *         name: position
 *         required: true
 *         schema:
 *           type: string
 *         description: Position name
 *         example: Driver
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 position:
 *                   type: string
 *                   example: Driver
 *                 count:
 *                   type: integer
 *                   example: 15
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Position parameter missing
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll:
 *   get:
 *     summary: Get payroll data with filters
 *     description: Retrieve payroll data for employees with optional filtering
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     parameters:
 *       - in: query
 *         name: payroll_period_start
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by period start date (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: payroll_period_end
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by period end date (YYYY-MM-DD)
 *         example: "2024-12-31"
 *       - in: query
 *         name: employee_number
 *         schema:
 *           type: string
 *         description: Filter by specific employee
 *         example: EMP-2023-FIN-001
 *       - in: query
 *         name: grouped
 *         schema:
 *           type: boolean
 *         description: Return data grouped by period
 *         example: false
 *     responses:
 *       200:
 *         description: Payroll data retrieved successfully
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll/periods:
 *   get:
 *     summary: Get available semi-monthly payroll periods
 *     description: Returns available semi-monthly payroll periods (1st-15th and 16th-end)
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Target year (default current year)
 *         example: 2024
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Target month 0-11 (default current month)
 *         example: 0
 *     responses:
 *       200:
 *         description: Periods retrieved successfully
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll/fetch-and-sync:
 *   post:
 *     summary: Fetch payroll data from HR API and sync to database
 *     description: Automatically fetch payroll data from external HR API for specified period
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - period_start
 *               - period_end
 *             properties:
 *               period_start:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *                 description: Period start date (YYYY-MM-DD)
 *               period_end:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *                 description: Period end date (YYYY-MM-DD)
 *               employee_number:
 *                 type: string
 *                 example: EMP-2023-FIN-001
 *                 description: Optional employee filter
 *     responses:
 *       200:
 *         description: Payroll synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payroll sync completed
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 synced:
 *                   type: integer
 *                   example: 1
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Sync failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll/sync-period/{id}:
 *   post:
 *     summary: Recalculate totals for existing payroll period
 *     description: Recalculate gross pay, deductions, and net pay for an existing payroll period
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll period ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Period synced successfully
 *       400:
 *         description: Invalid period ID
 *       500:
 *         description: Sync failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll/by-period:
 *   get:
 *     summary: Get payroll data for a specific period
 *     description: Retrieve detailed payroll data for a specific period range
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     parameters:
 *       - in: query
 *         name: period_start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Period start date (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: period_end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Period end date (YYYY-MM-DD)
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Payroll data retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Payroll period not found
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/hr_payroll/by-employee/{employeeNumber}:
 *   get:
 *     summary: Get payroll history for specific employee
 *     description: Retrieve payroll history for a specific employee with optional date filtering
 *     tags:
 *       - Admin | Integration – HR Payroll
 *     parameters:
 *       - in: path
 *         name: employeeNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee number
 *         example: EMP-2023-FIN-001
 *       - in: query
 *         name: period_start
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter start date (YYYY-MM-DD)
 *       - in: query
 *         name: period_end
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Employee payroll history retrieved successfully
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/operations/sync-trips:
 *   post:
 *     summary: Manually sync bus trips with provided payload
 *     description: Sync operational bus trip data using a manually provided payload
 *     tags:
 *       - Admin | Integration – Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trips:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bus trips synced successfully
 *       500:
 *         description: Sync failed
 */

/**
 * @swagger
 * /api/integration/operations/fetch-and-sync-bus-trips:
 *   post:
 *     summary: Auto-fetch bus trips from Operations API and sync
 *     description: Automatically fetch operational bus trip data from external API
 *     tags:
 *       - Admin | Integration – Operations
 *     responses:
 *       200:
 *         description: Bus trips fetched and synced successfully
 *       500:
 *         description: Fetch and sync failed
 */

/**
 * @swagger
 * /api/integration/operations/unrecorded-trips:
 *   get:
 *     summary: Get unrecorded bus trips
 *     description: Retrieve bus trips that haven't been recorded for revenue or expense
 *     tags:
 *       - Admin | Integration – Operations
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [revenue, expense, all]
 *         description: Filter by unrecorded type
 *         example: all
 *     responses:
 *       200:
 *         description: Unrecorded trips retrieved successfully
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/operations/sync-rental-trips:
 *   post:
 *     summary: Manually sync rental trips with provided payload
 *     description: Sync rental trip data using a manually provided payload
 *     tags:
 *       - Admin | Integration – Operations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trips:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Rental trips synced successfully
 *       500:
 *         description: Sync failed
 */

/**
 * @swagger
 * /api/integration/operations/fetch-and-sync-rental-trips:
 *   post:
 *     summary: Auto-fetch rental trips from Operations API and sync
 *     description: Automatically fetch rental trip data from external API
 *     tags:
 *       - Admin | Integration – Operations
 *     responses:
 *       200:
 *         description: Rental trips fetched and synced successfully
 *       500:
 *         description: Fetch and sync failed
 */

/**
 * @swagger
 * /api/integration/operations/unrecorded-rental-trips:
 *   get:
 *     summary: Get unrecorded rental trips
 *     description: Retrieve rental trips that haven't been recorded for revenue or expense
 *     tags:
 *       - Admin | Integration – Operations
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [revenue, expense, all]
 *         description: Filter by unrecorded type
 *         example: all
 *     responses:
 *       200:
 *         description: Unrecorded rental trips retrieved successfully
 *       500:
 *         description: Query failed
 */

/**
 * @swagger
 * /api/integration/operations/rental-trips/by-status:
 *   get:
 *     summary: Get rental trips by status
 *     description: Filter rental trips by their approval/completion status
 *     tags:
 *       - Admin | Integration – Operations
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [approved, completed]
 *         description: Rental status filter
 *         example: approved
 *     responses:
 *       200:
 *         description: Rental trips retrieved successfully
 *       400:
 *         description: Status parameter missing
 *       500:
 *         description: Query failed
 */
