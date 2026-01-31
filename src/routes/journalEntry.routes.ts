import { Router } from 'express';
import { JournalEntryAutoController } from '../controllers/journalEntryAuto.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new JournalEntryAutoController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// SWAGGER DOCUMENTATION
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Journal Entries
 *   description: |
 *     🔐 **Admin Only** – Automated Journal Entry Management
 *     
 *     Create, read, update, delete, adjust, and reverse journal entries.
 *     
 *     **Business Rules:**
 *     - DRAFT entries: Can be edited, deleted, or posted
 *     - POSTED entries: Immutable, can only be adjusted or reversed
 *     - ADJUSTED entries: Immutable, linked to adjustment JE
 *     - REVERSED entries: Immutable, linked to reversal JE
 *     - All entries must be balanced (total_debit = total_credit)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     JournalEntryLineInput:
 *       type: object
 *       required:
 *         - account_code
 *         - debit
 *         - credit
 *       properties:
 *         account_code:
 *           type: string
 *           description: Chart of Account code
 *           example: "101-001"
 *         debit:
 *           type: number
 *           minimum: 0
 *           description: Debit amount (mutually exclusive with credit > 0)
 *           example: 1000.00
 *         credit:
 *           type: number
 *           minimum: 0
 *           description: Credit amount (mutually exclusive with debit > 0)
 *           example: 0
 *         description:
 *           type: string
 *           description: Optional line description
 *           example: "Cash payment for expense"
 *
 *     CreateAutoJournalEntryRequest:
 *       type: object
 *       required:
 *         - module
 *         - reference_id
 *         - description
 *         - date
 *         - entries
 *       properties:
 *         module:
 *           type: string
 *           description: Source module generating the entry (e.g., PAYROLL, EXPENSE, REVENUE)
 *           example: "EXPENSE"
 *         reference_id:
 *           type: string
 *           description: Reference ID from source module
 *           example: "EXP-2026-0001"
 *         description:
 *           type: string
 *           description: Journal entry description
 *           example: "Expense approval for operational costs"
 *         date:
 *           type: string
 *           format: date
 *           description: Journal entry date (YYYY-MM-DD)
 *           example: "2026-01-25"
 *         entries:
 *           type: array
 *           minItems: 1
 *           description: Journal entry lines (must be balanced - total debit = total credit)
 *           items:
 *             $ref: '#/components/schemas/JournalEntryLineInput'
 *
 *     CreateAdjustmentRequest:
 *       type: object
 *       required:
 *         - adjustment_of_id
 *         - module
 *         - reference_id
 *         - description
 *         - date
 *         - entries
 *       properties:
 *         adjustment_of_id:
 *           type: integer
 *           description: ID of the original POSTED journal entry to adjust
 *           example: 123
 *         module:
 *           type: string
 *           description: Source module
 *           example: "EXPENSE"
 *         reference_id:
 *           type: string
 *           description: Reference ID for adjustment
 *           example: "EXP-2026-0001-ADJ"
 *         description:
 *           type: string
 *           description: Reason for adjustment
 *           example: "Correcting expense amount"
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-01-25"
 *         entries:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/JournalEntryLineInput'
 *
 *     CreateReversalRequest:
 *       type: object
 *       required:
 *         - reversal_of_id
 *         - reason
 *       properties:
 *         reversal_of_id:
 *           type: integer
 *           description: ID of the original POSTED journal entry to reverse
 *           example: 123
 *         reason:
 *           type: string
 *           description: Reason for reversal
 *           example: "Duplicate entry correction"
 *         date:
 *           type: string
 *           format: date
 *           description: Optional reversal date (defaults to today)
 *           example: "2026-01-25"
 *
 *     UpdateDraftRequest:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *           description: Updated description
 *           example: "Updated expense description"
 *         date:
 *           type: string
 *           format: date
 *           description: Updated date (YYYY-MM-DD)
 *           example: "2026-01-26"
 *         entries:
 *           type: array
 *           description: Updated journal entry lines (replaces existing lines)
 *           items:
 *             $ref: '#/components/schemas/JournalEntryLineInput'
 *
 *     DeleteRequest:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           description: Reason for deletion
 *           example: "Created in error"
 *
 *     JournalEntryLine:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         account_id:
 *           type: integer
 *           example: 10
 *         account_code:
 *           type: string
 *           example: "101-001"
 *         account_name:
 *           type: string
 *           example: "Cash on Hand"
 *         normal_balance:
 *           type: string
 *           enum: [DEBIT, CREDIT]
 *           example: "DEBIT"
 *         debit:
 *           type: number
 *           example: 1000.00
 *         credit:
 *           type: number
 *           example: 0
 *         description:
 *           type: string
 *           example: "Cash payment"
 *         line_number:
 *           type: integer
 *           example: 1
 *
 *     JournalEntryResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: "JE-2026-0001"
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-01-25"
 *         reference:
 *           type: string
 *           example: "EXPENSE:EXP-2026-0001"
 *         description:
 *           type: string
 *           example: "Expense approval for operational costs"
 *         total_debit:
 *           type: number
 *           example: 1000.00
 *         total_credit:
 *           type: number
 *           example: 1000.00
 *         is_balanced:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           enum: [DRAFT, POSTED, ADJUSTED, REVERSED]
 *           example: "DRAFT"
 *         entry_type:
 *           type: string
 *           enum: [AUTO_GENERATED]
 *           example: "AUTO_GENERATED"
 *         approved_by:
 *           type: string
 *           nullable: true
 *           example: null
 *         approved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         reversal_of_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         reversal_of:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             code:
 *               type: string
 *         reversals:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               code:
 *                 type: string
 *         adjustment_of_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         adjustment_of:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: integer
 *             code:
 *               type: string
 *         adjustments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               code:
 *                 type: string
 *         lines:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/JournalEntryLine'
 *         created_by:
 *           type: string
 *           example: "user-123"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-01-25T10:00:00.000Z"
 *         updated_by:
 *           type: string
 *           nullable: true
 *           example: null
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         is_deleted:
 *           type: boolean
 *           example: false
 */

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/journal-entry/auto:
 *   post:
 *     summary: Create an auto-generated journal entry
 *     description: |
 *       Creates a new auto-generated journal entry with status DRAFT.
 *       Used by all modules (PAYROLL, EXPENSE, REVENUE, etc.) to create journal entries.
 *       
 *       **Validation Rules:**
 *       - All account codes must exist in chart_of_account
 *       - Journal entry must be balanced (total_debit = total_credit)
 *       - Each line must have either debit > 0 or credit > 0 (not both)
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAutoJournalEntryRequest'
 *           example:
 *             module: "EXPENSE"
 *             reference_id: "EXP-2026-0001"
 *             description: "Operational expense approval"
 *             date: "2026-01-25"
 *             entries:
 *               - account_code: "501-001"
 *                 debit: 1000.00
 *                 credit: 0
 *                 description: "Expense account"
 *               - account_code: "101-001"
 *                 debit: 0
 *                 credit: 1000.00
 *                 description: "Cash account"
 *     responses:
 *       201:
 *         description: Journal entry created successfully
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
 *                   example: "Auto-generated journal entry created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       400:
 *         description: Validation error (unbalanced entry, invalid account codes, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post('/auto', controller.createAuto);

/**
 * @swagger
 * /api/v1/admin/journal-entry/adjustment:
 *   post:
 *     summary: Create an adjustment journal entry
 *     description: |
 *       Creates a new adjustment journal entry linked to an existing POSTED entry.
 *       The original entry's status will be changed to ADJUSTED.
 *       
 *       **Rules:**
 *       - Original entry must have status POSTED
 *       - Adjustment entry starts as DRAFT
 *       - Adjustment entry is linked via adjustment_of_id
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdjustmentRequest'
 *           example:
 *             adjustment_of_id: 123
 *             module: "EXPENSE"
 *             reference_id: "EXP-2026-0001-ADJ"
 *             description: "Correcting expense amount"
 *             date: "2026-01-25"
 *             entries:
 *               - account_code: "501-001"
 *                 debit: 200.00
 *                 credit: 0
 *                 description: "Additional expense"
 *               - account_code: "101-001"
 *                 debit: 0
 *                 credit: 200.00
 *                 description: "Cash adjustment"
 *     responses:
 *       201:
 *         description: Adjustment journal entry created successfully
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
 *                   example: "Adjustment journal entry created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       400:
 *         description: Original entry not POSTED or validation error
 *       404:
 *         description: Original journal entry not found
 *       401:
 *         description: Unauthorized
 */
router.post('/adjustment', controller.createAdjustment);

/**
 * @swagger
 * /api/v1/admin/journal-entry/reversal:
 *   post:
 *     summary: Create a reversal journal entry
 *     description: |
 *       Creates a reversal journal entry that mirrors the original with swapped debits/credits.
 *       The original entry's status will be changed to REVERSED.
 *       
 *       **Rules:**
 *       - Original entry must have status POSTED
 *       - Original entry cannot already be reversed
 *       - Reversal automatically swaps debit and credit amounts from original
 *       - Reversal entry starts as DRAFT
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReversalRequest'
 *           example:
 *             reversal_of_id: 123
 *             reason: "Duplicate entry correction"
 *             date: "2026-01-25"
 *     responses:
 *       201:
 *         description: Reversal journal entry created successfully
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
 *                   example: "Reversal journal entry created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       400:
 *         description: Original entry not POSTED, already reversed, or validation error
 *       404:
 *         description: Original journal entry not found
 *       401:
 *         description: Unauthorized
 */
router.post('/reversal', controller.createReversal);

/**
 * @swagger
 * /api/v1/admin/journal-entry/{id}/post:
 *   post:
 *     summary: Post a draft journal entry
 *     description: |
 *       Changes the status of a DRAFT journal entry to POSTED.
 *       Once posted, the entry becomes immutable and can only be adjusted or reversed.
 *       
 *       **Rules:**
 *       - Only DRAFT entries can be posted
 *       - Sets approved_by and approved_at fields
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journal entry ID
 *     responses:
 *       200:
 *         description: Journal entry posted successfully
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
 *                   example: "Journal entry posted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       400:
 *         description: Entry is not DRAFT
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/post', controller.postEntry);

/**
 * @swagger
 * /api/v1/admin/journal-entry/{id}:
 *   get:
 *     summary: Get a journal entry by ID
 *     description: |
 *       Retrieves a journal entry with all related data including:
 *       - Journal entry lines with account details
 *       - Linked reversal/adjustment entries
 *       - Audit trail information
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journal entry ID
 *     responses:
 *       200:
 *         description: Journal entry details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update a draft journal entry
 *     description: |
 *       Updates a DRAFT journal entry. Only DRAFT entries can be edited.
 *       
 *       **Editable fields:**
 *       - description
 *       - date
 *       - entries (replaces all existing lines)
 *       
 *       **Rules:**
 *       - Only DRAFT entries can be updated
 *       - If entries are provided, they must be balanced
 *       - All account codes must be valid
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journal entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDraftRequest'
 *           example:
 *             description: "Updated expense description"
 *             date: "2026-01-26"
 *             entries:
 *               - account_code: "501-001"
 *                 debit: 1500.00
 *                 credit: 0
 *                 description: "Updated expense"
 *               - account_code: "101-001"
 *                 debit: 0
 *                 credit: 1500.00
 *                 description: "Updated cash"
 *     responses:
 *       200:
 *         description: Journal entry updated successfully
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
 *                   example: "Journal entry updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/JournalEntryResponse'
 *       400:
 *         description: Entry is not DRAFT or validation error
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Delete a draft journal entry (soft delete)
 *     description: |
 *       Soft deletes a DRAFT journal entry. Only DRAFT entries can be deleted.
 *       Sets is_deleted = true on both the entry and its lines.
 *       
 *       **Rules:**
 *       - Only DRAFT entries can be deleted
 *       - Requires a reason for deletion
 *       - Cascades soft delete to journal entry lines
 *     tags: [Admin | Journal Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Journal entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteRequest'
 *           example:
 *             reason: "Created in error"
 *     responses:
 *       200:
 *         description: Journal entry deleted successfully
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
 *                   example: "Journal entry JE-2026-0001 has been deleted"
 *       400:
 *         description: Entry is not DRAFT or missing reason
 *       404:
 *         description: Journal entry not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);

/**
 * @swagger
 * /api/v1/admin/journal-entry:
 *   get:
 *     summary: List journal entries with filters
 *     description: |
 *       Retrieves a paginated list of journal entries with optional filters.
 *       
 *       **Available filters:**
 *       - status: DRAFT, POSTED, ADJUSTED, REVERSED
 *       - dateFrom/dateTo: Date range filter
 *       - module: Filter by source module
 *       - reference: Search in reference field
 *       - code: Search by JE code
 *       - includeDeleted: Include soft-deleted entries
 *     tags: [Admin | Journal Entries]
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
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, POSTED, ADJUSTED, REVERSED]
 *         description: Filter by status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Source module (e.g., EXPENSE, PAYROLL)
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         description: Search in reference field
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Search by JE code
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted entries
 *     responses:
 *       200:
 *         description: Paginated list of journal entries
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
 *                     $ref: '#/components/schemas/JournalEntryResponse'
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
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized
 */
router.get('/', controller.list);

export default router;
