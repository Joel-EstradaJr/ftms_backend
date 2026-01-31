// ============================================================================
// ATTACHMENT SWAGGER DOCUMENTATION
// OpenAPI/Swagger schema definitions for Attachment endpoints
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Admin | Attachments
 *   description: File attachment management for expenses, payables, revenues, and other entities
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Attachment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique attachment ID
 *         entity_type:
 *           type: string
 *           enum: [expense, payable, revenue, receivable, journal_entry, payroll]
 *           description: Type of entity this attachment belongs to
 *         entity_id:
 *           type: string
 *           description: ID of the related entity
 *         file_name:
 *           type: string
 *           description: Original file name
 *         file_type:
 *           type: string
 *           description: MIME type (e.g., image/jpeg, application/pdf)
 *         file_url:
 *           type: string
 *           description: URL or path to the stored file
 *         file_size:
 *           type: integer
 *           nullable: true
 *           description: File size in bytes
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional description of the attachment
 *         uploaded_by:
 *           type: string
 *           nullable: true
 *           description: User who uploaded the attachment
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when attachment was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when attachment was last updated
 *         is_deleted:
 *           type: boolean
 *           description: Soft delete flag
 *
 *     CreateAttachmentRequest:
 *       type: object
 *       required:
 *         - entity_type
 *         - entity_id
 *         - file_name
 *         - file_type
 *         - file_url
 *       properties:
 *         entity_type:
 *           type: string
 *           enum: [expense, payable, revenue, receivable, journal_entry, payroll]
 *           description: Type of entity this attachment belongs to
 *         entity_id:
 *           type: string
 *           description: ID of the entity (expense ID, payable ID, etc.)
 *         file_name:
 *           type: string
 *           description: Original file name
 *         file_type:
 *           type: string
 *           description: MIME type (e.g., image/jpeg, application/pdf)
 *         file_url:
 *           type: string
 *           description: URL/path to the stored file
 *         file_size:
 *           type: integer
 *           description: File size in bytes (optional)
 *         description:
 *           type: string
 *           description: Optional description of the attachment
 *
 *     UpdateAttachmentRequest:
 *       type: object
 *       properties:
 *         file_name:
 *           type: string
 *           description: New file name
 *         description:
 *           type: string
 *           description: New description
 *
 *     AttachmentListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             total_pages:
 *               type: integer
 *
 *     AttachmentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Attachment'
 */

/**
 * @swagger
 * /api/v1/admin/attachments:
 *   post:
 *     summary: Create a new attachment record
 *     description: Register a new file attachment for an entity (expense, payable, etc.). The actual file upload should be handled separately; this endpoint registers the metadata.
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAttachmentRequest'
 *           example:
 *             entity_type: "expense"
 *             entity_id: "123"
 *             file_name: "receipt.pdf"
 *             file_type: "application/pdf"
 *             file_url: "/uploads/receipts/receipt-123.pdf"
 *             file_size: 102400
 *             description: "Fuel receipt for trip expense"
 *     responses:
 *       201:
 *         description: Attachment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttachmentResponse'
 *       400:
 *         description: Validation error - missing required fields or invalid entity_type
 *       401:
 *         description: Unauthorized - authentication required
 *
 *   get:
 *     summary: List all attachments with optional filters
 *     description: Retrieve paginated list of attachments. Can filter by entity_type, entity_id, or file_type.
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *           enum: [expense, payable, revenue, receivable, journal_entry, payroll]
 *         description: Filter by entity type
 *       - in: query
 *         name: entity_id
 *         schema:
 *           type: string
 *         description: Filter by entity ID
 *       - in: query
 *         name: file_type
 *         schema:
 *           type: string
 *         description: Filter by file type (partial match, e.g., "image" or "pdf")
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
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of attachments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttachmentListResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/admin/attachments/{entity_type}/{entity_id}:
 *   get:
 *     summary: Get all attachments for a specific entity
 *     description: Retrieve all attachments associated with a specific entity (e.g., all attachments for expense ID 123)
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [expense, payable, revenue, receivable, journal_entry, payroll]
 *         description: Type of entity
 *       - in: path
 *         name: entity_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity
 *     responses:
 *       200:
 *         description: List of attachments for the entity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attachment'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/admin/attachments/by-id/{id}:
 *   get:
 *     summary: Get a specific attachment by ID
 *     description: Retrieve detailed information about a single attachment
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Attachment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttachmentResponse'
 *       404:
 *         description: Attachment not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/admin/attachments/{id}:
 *   patch:
 *     summary: Update attachment metadata
 *     description: Update the file_name and/or description of an existing attachment
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAttachmentRequest'
 *           example:
 *             file_name: "updated-receipt.pdf"
 *             description: "Updated description for the attachment"
 *     responses:
 *       200:
 *         description: Attachment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttachmentResponse'
 *       404:
 *         description: Attachment not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Soft delete an attachment
 *     description: Mark an attachment as deleted (soft delete). The record remains in the database but is_deleted is set to true.
 *     tags: [Admin | Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Attachment not found
 *       401:
 *         description: Unauthorized
 */

// Export empty object to make this a module
export {};
