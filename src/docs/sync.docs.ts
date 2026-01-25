/**
 * DATA SYNC ENDPOINTS DOCUMENTATION
 * 
 * Swagger/OpenAPI documentation for external data synchronization endpoints.
 * These endpoints handle syncing data from external systems (HR, Inventory, Operations)
 * to local database tables.
 */

/**
 * @swagger
 * /api/sync/status:
 *   get:
 *     summary: Get sync status of local data tables
 *     description: |
 *       Returns current record counts and last sync timestamps for all local data tables.
 *       Use this endpoint to monitor the state of synchronized data from external systems.
 *       
 *       **Tables monitored:**
 *       - `employee_local` - Employee data from HR system
 *       - `bus_local` - Bus data from Inventory system
 *       - `rental_local` - Rental assignments from Operations system
 *       - `rental_employee_local` - Rental-employee junction records
 *       - `bus_trip_local` - Bus trip data from Operations system
 *       - `bus_trip_employee_local` - Bus trip-employee junction records
 *     tags:
 *       - General | Data Sync
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     tables:
 *                       type: object
 *                       properties:
 *                         employee_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 45
 *                               description: Number of active (non-deleted) employee records
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 3
 *                               description: Number of soft-deleted employee records
 *                             lastSyncedAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               example: '2026-01-25T10:30:00.000Z'
 *                               description: Timestamp of last synchronization
 *                         bus_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 14
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 0
 *                             lastSyncedAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               example: '2026-01-25T10:30:00.000Z'
 *                         rental_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 3
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 0
 *                             lastSyncedAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               example: '2026-01-25T10:30:00.000Z'
 *                         rental_employee_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 6
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 0
 *                         bus_trip_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 5
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 0
 *                             lastSyncedAt:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                               example: '2026-01-25T10:30:00.000Z'
 *                         bus_trip_employee_local:
 *                           type: object
 *                           properties:
 *                             activeRecords:
 *                               type: integer
 *                               example: 10
 *                             softDeletedRecords:
 *                               type: integer
 *                               example: 0
 *             example:
 *               status: success
 *               data:
 *                 tables:
 *                   employee_local:
 *                     activeRecords: 45
 *                     softDeletedRecords: 3
 *                     lastSyncedAt: '2026-01-25T10:30:00.000Z'
 *                   bus_local:
 *                     activeRecords: 14
 *                     softDeletedRecords: 0
 *                     lastSyncedAt: '2026-01-25T10:30:00.000Z'
 *                   rental_local:
 *                     activeRecords: 3
 *                     softDeletedRecords: 0
 *                     lastSyncedAt: '2026-01-25T10:30:00.000Z'
 *                   rental_employee_local:
 *                     activeRecords: 6
 *                     softDeletedRecords: 0
 *                   bus_trip_local:
 *                     activeRecords: 5
 *                     softDeletedRecords: 0
 *                     lastSyncedAt: '2026-01-25T10:30:00.000Z'
 *                   bus_trip_employee_local:
 *                     activeRecords: 10
 *                     softDeletedRecords: 0
 *       500:
 *         description: Failed to get sync status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Failed to get sync status
 *                 error:
 *                   type: string
 *                   example: Database connection error
 */

/**
 * @swagger
 * /api/sync/external:
 *   post:
 *     summary: Trigger external data synchronization
 *     description: |
 *       Manually triggers a **hard reload** of all external data from external systems.
 *       This is the same sync that runs automatically on server startup.
 *       
 *       **Sync Order (respects FK dependencies):**
 *       1. Employees from HR system (`employee_local`)
 *       2. Buses from Inventory system (`bus_local`)
 *       3. Rentals from Operations system (`rental_local` + `rental_employee_local`)
 *       4. Bus Trips from Operations system (`bus_trip_local` + `bus_trip_employee_local`)
 *       
 *       **Behavior:**
 *       - **Upsert**: Records are inserted if new, updated if existing
 *       - **Soft Delete**: Records missing from external payload get `is_deleted = true`
 *       - **Preserve Flags**: Financial flags (`is_revenue_recorded`, `is_expense_recorded`) are never overwritten
 *       - **Retry Logic**: Failed API calls are retried once with exponential backoff
 *       
 *       **External API Endpoints (from environment variables):**
 *       - HR Employees: `${HR_API_BASE_URL}${HR_EMPLOYEES_ENDPOINT}`
 *       - Buses: `${INV_API_BASE_URL}${INV_BUS_ENDPOINT}`
 *       - Rentals: `${OP_API_BASE_URL}${OP_RENTAL_TRIPS_ENDPOINT}`
 *       - Bus Trips: `${OP_API_BASE_URL}${OP_BUS_TRIPS_ENDPOINT}`
 *     tags:
 *       - General | Data Sync
 *     responses:
 *       200:
 *         description: Synchronization completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncSuccessResponse'
 *             example:
 *               status: success
 *               message: External data synchronized successfully
 *               data:
 *                 success: true
 *                 startTime: '2026-01-25T10:30:00.000Z'
 *                 endTime: '2026-01-25T10:30:05.123Z'
 *                 totalDurationMs: 5123
 *                 tables:
 *                   employee_local:
 *                     success: true
 *                     inserted: 5
 *                     updated: 40
 *                     softDeleted: 2
 *                     errors: []
 *                   bus_local:
 *                     success: true
 *                     inserted: 0
 *                     updated: 14
 *                     softDeleted: 0
 *                     errors: []
 *                   rental_local:
 *                     success: true
 *                     inserted: 1
 *                     updated: 2
 *                     softDeleted: 0
 *                     errors: []
 *                   rental_employee_local:
 *                     success: true
 *                     inserted: 2
 *                     updated: 4
 *                     softDeleted: 0
 *                     errors: []
 *                   bus_trip_local:
 *                     success: true
 *                     inserted: 0
 *                     updated: 5
 *                     softDeleted: 0
 *                     errors: []
 *                   bus_trip_employee_local:
 *                     success: true
 *                     inserted: 0
 *                     updated: 10
 *                     softDeleted: 0
 *                     errors: []
 *       207:
 *         description: Synchronization completed with some errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncPartialSuccessResponse'
 *             example:
 *               status: partial_success
 *               message: External data sync completed with some errors
 *               data:
 *                 success: false
 *                 startTime: '2026-01-25T10:30:00.000Z'
 *                 endTime: '2026-01-25T10:30:03.456Z'
 *                 totalDurationMs: 3456
 *                 tables:
 *                   employee_local:
 *                     success: true
 *                     inserted: 5
 *                     updated: 40
 *                     softDeleted: 0
 *                     errors: []
 *                   bus_local:
 *                     success: false
 *                     inserted: 0
 *                     updated: 0
 *                     softDeleted: 0
 *                     errors:
 *                       - 'Failed to fetch bus data'
 *                   rental_local:
 *                     success: true
 *                     inserted: 1
 *                     updated: 2
 *                     softDeleted: 0
 *                     errors: []
 *                   rental_employee_local:
 *                     success: true
 *                     inserted: 2
 *                     updated: 4
 *                     softDeleted: 0
 *                     errors: []
 *                   bus_trip_local:
 *                     success: true
 *                     inserted: 0
 *                     updated: 5
 *                     softDeleted: 0
 *                     errors: []
 *                   bus_trip_employee_local:
 *                     success: true
 *                     inserted: 0
 *                     updated: 10
 *                     softDeleted: 0
 *                     errors: []
 *       500:
 *         description: Synchronization failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Failed to synchronize external data
 *                 error:
 *                   type: string
 *                   example: Database transaction failed
 */

// This file is imported by swagger configuration to generate API documentation
export {};
