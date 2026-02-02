/**
 * ADMIN ENDPOINTS DOCUMENTATION
 * All endpoints require Admin role authentication
 */

/**
 * @swagger
 * /api/v1/admin/chart-of-accounts:
 *   get:
 *     summary: Get all chart of accounts
 *     description: Retrieves a list of all chart of accounts with optional filtering
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chart of accounts retrieved successfully
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
 *                       accountCode:
 *                         type: string
 *                       accountName:
 *                         type: string
 *                       accountType:
 *                         type: object
 *                       isArchived:
 *                         type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create a new chart of account
 *     description: Creates a new chart of account entry
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountCode
 *               - accountName
 *               - accountTypeId
 *             properties:
 *               accountCode:
 *                 type: string
 *                 example: '1000'
 *               accountName:
 *                 type: string
 *                 example: 'Cash in Bank'
 *               accountTypeId:
 *                 type: string
 *                 example: 'asset-type-id'
 *               description:
 *                 type: string
 *                 example: 'Cash deposits in bank accounts'
 *     responses:
 *       201:
 *         description: Chart of account created successfully
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
 * /api/v1/admin/chart-of-accounts/{id}:
 *   get:
 *     summary: Get chart of account by ID
 *     description: Retrieves a specific chart of account by its ID
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chart of account ID
 *     responses:
 *       200:
 *         description: Chart of account retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Update chart of account
 *     description: Updates an existing chart of account
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chart of account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountCode:
 *                 type: string
 *               accountName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chart of account updated successfully
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
 *     summary: Delete chart of account
 *     description: Permanently deletes a chart of account
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chart of account ID
 *     responses:
 *       200:
 *         description: Chart of account deleted successfully
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
 * /api/v1/admin/chart-of-accounts/{id}/archive:
 *   patch:
 *     summary: Archive chart of account
 *     description: Archives a chart of account (soft delete)
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chart of account ID
 *     responses:
 *       200:
 *         description: Chart of account archived successfully
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
 * /api/v1/admin/chart-of-accounts/{id}/restore:
 *   patch:
 *     summary: Restore archived chart of account
 *     description: Restores a previously archived chart of account
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chart of account ID
 *     responses:
 *       200:
 *         description: Chart of account restored successfully
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
 * /api/v1/admin/chart-of-accounts/suggest-code/{accountTypeId}:
 *   get:
 *     summary: Get suggested account code
 *     description: Suggests the next available account code for a given account type
 *     tags:
 *       - Admin | Chart of Accounts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account type ID
 *     responses:
 *       200:
 *         description: Suggested account code retrieved successfully
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
 *                     suggestedCode:
 *                       type: string
 *                       example: '1001'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/admin/account-types:
 *   get:
 *     summary: Get all account types
 *     description: Retrieves a list of all account types
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of account types retrieved successfully
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
 *                       name:
 *                         type: string
 *                         example: 'Asset'
 *                       code:
 *                         type: string
 *                         example: 'ASSET'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create a new account type
 *     description: Creates a new account type
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Asset'
 *               code:
 *                 type: string
 *                 example: 'ASSET'
 *     responses:
 *       201:
 *         description: Account type created successfully
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
 * /api/v1/admin/account-types/{id}:
 *   get:
 *     summary: Get account type by ID
 *     description: Retrieves a specific account type by its ID
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account type ID
 *     responses:
 *       200:
 *         description: Account type retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Update account type
 *     description: Updates an existing account type
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account type ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: '5'
 *               name:
 *                 type: string
 *                 example: 'Equity'
 *               description:
 *                 type: string
 *                 example: 'Equity account type'
 *     responses:
 *       200:
 *         description: Account type updated successfully
 *       400:
 *         description: Validation error or code/name conflict
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     summary: Hard delete account type
 *     description: |
 *       Permanently deletes an archived account type.
 *       Only archived (is_deleted=true) account types can be deleted.
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account type ID
 *     responses:
 *       200:
 *         description: Account type deleted permanently
 *       400:
 *         description: Account type is not archived
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/account-types/{id}/archive:
 *   patch:
 *     summary: Archive account type (soft delete)
 *     description: |
 *       Archives an account type by setting is_deleted=true.
 *       Cannot archive if there are active chart of accounts using this type.
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account type ID
 *     responses:
 *       200:
 *         description: Account type archived successfully
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
 *                 message:
 *                   type: string
 *                   example: 'Account type archived successfully'
 *       400:
 *         description: Account type already archived or has active chart of accounts
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/account-types/{id}/restore:
 *   patch:
 *     summary: Restore archived account type
 *     description: Restores an archived account type by setting is_deleted=false.
 *     tags:
 *       - Admin | Account Types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account type ID
 *     responses:
 *       200:
 *         description: Account type restored successfully
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
 *                 message:
 *                   type: string
 *                   example: 'Account type restored successfully'
 *       400:
 *         description: Account type is not archived
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/payroll-periods:
 *   get:
 *     summary: List all payroll periods
 *     description: Retrieves a list of all payroll periods with filters and search
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, processing, released]
 *         description: Filter by payroll period status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in period name or description
 *     responses:
 *       200:
 *         description: Payroll periods retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create a new payroll period
 *     description: Creates a new payroll period
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - periodName
 *               - startDate
 *               - endDate
 *             properties:
 *               periodName:
 *                 type: string
 *                 example: 'January 2026 - Period 1'
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-01-01'
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: '2026-01-15'
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payroll period created successfully
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
 * /api/v1/admin/payroll-periods/stats:
 *   get:
 *     summary: Get payroll statistics
 *     description: Retrieves statistical information about payroll periods
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payroll statistics retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /api/v1/admin/payroll-periods/{id}:
 *   get:
 *     summary: Get payroll period by ID
 *     description: Retrieves a specific payroll period with all employee details
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   patch:
 *     summary: Update payroll period
 *     description: Updates an existing payroll period
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               periodName:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payroll period updated successfully
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
 *     summary: Delete payroll period
 *     description: Soft deletes a payroll period
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period deleted successfully
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
 * /api/v1/admin/payroll-periods/{id}/process:
 *   post:
 *     summary: Process payroll period
 *     description: Fetches employees from HR system and creates payroll records
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll processed successfully
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
 * /api/v1/admin/payroll-periods/{id}/release:
 *   post:
 *     summary: Release payroll period
 *     description: Releases a payroll period making it final and immutable
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period released successfully
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
 * /api/v1/admin/payroll-periods/{id}/payrolls/{payrollId}/payslip:
 *   get:
 *     summary: Get payslip for employee
 *     description: Retrieves the payslip for a specific employee payroll
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payroll period ID
 *       - in: path
 *         name: payrollId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee payroll ID
 *     responses:
 *       200:
 *         description: Payslip retrieved successfully
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
 * /api/v1/admin/payroll-periods/{id}/archive:
 *   patch:
 *     summary: Archive payroll period (soft delete)
 *     description: |
 *       Archives a payroll period by setting is_deleted=true.
 *       Only RELEASED/APPROVED periods can be archived.
 *       DRAFT or PARTIAL periods should be deleted instead.
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period archived successfully
 *       400:
 *         description: Cannot archive draft/partial period or already archived
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/payroll-periods/{id}/restore:
 *   patch:
 *     summary: Restore archived payroll period
 *     description: Restores an archived payroll period by setting is_deleted=false.
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period restored successfully
 *       400:
 *         description: Payroll period is not archived
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/v1/admin/payroll-periods/{id}/permanent:
 *   delete:
 *     summary: Permanently delete archived payroll period
 *     description: |
 *       Permanently deletes an archived payroll period and all associated payrolls.
 *       Only archived (is_deleted=true) periods can be permanently deleted.
 *       This action is irreversible.
 *     tags:
 *       - Admin | Payroll Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payroll period ID
 *     responses:
 *       200:
 *         description: Payroll period permanently deleted
 *       400:
 *         description: Payroll period is not archived
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// ============================================================================
// JOURNAL ENTRIES - MIGRATED TO NEW ENDPOINTS
// ============================================================================
// The legacy Admin Journal Entry endpoints have been replaced by the
// new automated Journal Entry API at /api/v1/admin/journal-entry
// 
// New endpoints (with full Swagger docs in journalEntry.routes.ts):
//   GET    /api/v1/admin/journal-entry          - List all journal entries
//   GET    /api/v1/admin/journal-entry/:id      - Get journal entry by ID
//   PATCH  /api/v1/admin/journal-entry/:id      - Update draft journal entry
//   DELETE /api/v1/admin/journal-entry/:id      - Soft delete draft journal entry
//   POST   /api/v1/admin/journal-entry/auto     - Create auto-generated journal entry
//   POST   /api/v1/admin/journal-entry/adjustment - Create adjustment journal entry
//   POST   /api/v1/admin/journal-entry/reversal - Create reversal journal entry
//   POST   /api/v1/admin/journal-entry/:id/post - Post draft journal entry
// ============================================================================
