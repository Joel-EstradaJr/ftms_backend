import { Response, NextFunction } from 'express';
import { AttachmentService, CreateAttachmentDTO, UpdateAttachmentDTO } from '../services/attachment.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class AttachmentController {
  private service = new AttachmentService();

  /**
   * Create new attachment
   * POST /api/v1/admin/attachments
   * 
   * @swagger
   * /api/v1/admin/attachments:
   *   post:
   *     summary: Upload/register a new attachment
   *     tags: [Attachments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - entity_type
   *               - entity_id
   *               - file_name
   *               - file_type
   *               - file_url
   *             properties:
   *               entity_type:
   *                 type: string
   *                 enum: [expense, payable, revenue, receivable, journal_entry, payroll]
   *                 description: Type of entity this attachment belongs to
   *               entity_id:
   *                 type: string
   *                 description: ID of the entity (expense ID, payable ID, etc.)
   *               file_name:
   *                 type: string
   *                 description: Original file name
   *               file_type:
   *                 type: string
   *                 description: MIME type (e.g., image/jpeg, application/pdf)
   *               file_url:
   *                 type: string
   *                 description: URL/path to the stored file
   *               file_size:
   *                 type: integer
   *                 description: File size in bytes (optional)
   *               description:
   *                 type: string
   *                 description: Optional description of the attachment
   *     responses:
   *       201:
   *         description: Attachment created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entity_type, entity_id, file_name, file_type, file_url, file_size, description } = req.body;

      // Validation
      if (!entity_type || !entity_id || !file_name || !file_type || !file_url) {
        throw new ValidationError('Missing required fields: entity_type, entity_id, file_name, file_type, file_url');
      }

      const data: CreateAttachmentDTO = {
        entity_type,
        entity_id: String(entity_id),
        file_name,
        file_type,
        file_url,
        file_size: file_size ? parseInt(file_size) : undefined,
        description,
        uploaded_by: req.user?.sub,
      };

      const attachment = await this.service.createAttachment(data, req.user?.sub);

      res.status(201).json({
        success: true,
        message: 'Attachment created successfully',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attachments by entity
   * GET /api/v1/admin/attachments/:entity_type/:entity_id
   * 
   * @swagger
   * /api/v1/admin/attachments/{entity_type}/{entity_id}:
   *   get:
   *     summary: Get all attachments for a specific entity
   *     tags: [Attachments]
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
   *         description: List of attachments
   *       401:
   *         description: Unauthorized
   */
  getAttachmentsByEntity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entity_type, entity_id } = req.params;

      if (!entity_type || !entity_id) {
        throw new ValidationError('Missing required parameters: entity_type, entity_id');
      }

      const attachments = await this.service.getAttachmentsByEntity(entity_type, entity_id);

      res.json({
        success: true,
        data: attachments,
        count: attachments.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attachment by ID
   * GET /api/v1/admin/attachments/:id
   * 
   * @swagger
   * /api/v1/admin/attachments/{id}:
   *   get:
   *     summary: Get a specific attachment by ID
   *     tags: [Attachments]
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
   *       404:
   *         description: Attachment not found
   *       401:
   *         description: Unauthorized
   */
  getAttachmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid attachment ID');
      }

      const attachment = await this.service.getAttachmentById(id);

      res.json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update attachment metadata
   * PATCH /api/v1/admin/attachments/:id
   * 
   * @swagger
   * /api/v1/admin/attachments/{id}:
   *   patch:
   *     summary: Update attachment metadata (file_name, description)
   *     tags: [Attachments]
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
   *             type: object
   *             properties:
   *               file_name:
   *                 type: string
   *                 description: New file name
   *               description:
   *                 type: string
   *                 description: New description
   *     responses:
   *       200:
   *         description: Attachment updated successfully
   *       404:
   *         description: Attachment not found
   *       401:
   *         description: Unauthorized
   */
  updateAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { file_name, description } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid attachment ID');
      }

      const data: UpdateAttachmentDTO = {};
      if (file_name !== undefined) data.file_name = file_name;
      if (description !== undefined) data.description = description;

      const attachment = await this.service.updateAttachment(id, data, req.user?.sub);

      res.json({
        success: true,
        message: 'Attachment updated successfully',
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete attachment (soft delete)
   * DELETE /api/v1/admin/attachments/:id
   * 
   * @swagger
   * /api/v1/admin/attachments/{id}:
   *   delete:
   *     summary: Soft delete an attachment
   *     tags: [Attachments]
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
   *       404:
   *         description: Attachment not found
   *       401:
   *         description: Unauthorized
   */
  deleteAttachment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid attachment ID');
      }

      await this.service.deleteAttachment(id, req.user?.sub);

      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List all attachments with filters
   * GET /api/v1/admin/attachments
   * 
   * @swagger
   * /api/v1/admin/attachments:
   *   get:
   *     summary: List all attachments with optional filters
   *     tags: [Attachments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: entity_type
   *         schema:
   *           type: string
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
   *         description: Filter by file type (partial match)
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
   *           default: 20
   *         description: Items per page
   *     responses:
   *       200:
   *         description: Paginated list of attachments
   *       401:
   *         description: Unauthorized
   */
  listAttachments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entity_type, entity_id, file_type, page, limit } = req.query;

      const filters = {
        entity_type: entity_type as string,
        entity_id: entity_id as string,
        file_type: file_type as string,
      };

      const result = await this.service.listAttachments(
        filters,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };
}
