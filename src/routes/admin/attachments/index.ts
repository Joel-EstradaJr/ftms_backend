import { Router } from 'express';
import { AttachmentController } from '../../../controllers/attachment.controller';
import { authenticate } from '../../../middleware/auth';

const router = Router();
const controller = new AttachmentController();

// Apply authentication middleware
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Attachments
 *   description: File attachment management for expenses, payables, and other entities
 */

/**
 * POST /api/v1/admin/attachments
 * Create/register a new attachment
 */
router.post('/', controller.createAttachment);

/**
 * GET /api/v1/admin/attachments
 * List all attachments with optional filters
 */
router.get('/', controller.listAttachments);

/**
 * GET /api/v1/admin/attachments/:entity_type/:entity_id
 * Get all attachments for a specific entity
 */
router.get('/:entity_type/:entity_id', controller.getAttachmentsByEntity);

/**
 * GET /api/v1/admin/attachments/by-id/:id
 * Get a specific attachment by ID
 */
router.get('/by-id/:id', controller.getAttachmentById);

/**
 * PATCH /api/v1/admin/attachments/:id
 * Update attachment metadata
 */
router.patch('/:id', controller.updateAttachment);

/**
 * DELETE /api/v1/admin/attachments/:id
 * Soft delete an attachment
 */
router.delete('/:id', controller.deleteAttachment);

export default router;
