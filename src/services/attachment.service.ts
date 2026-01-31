import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

export interface CreateAttachmentDTO {
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  description?: string;
  uploaded_by?: string;
}

export interface UpdateAttachmentDTO {
  file_name?: string;
  description?: string;
}

export interface AttachmentFilters {
  entity_type?: string;
  entity_id?: string;
  file_type?: string;
  is_deleted?: boolean;
}

export class AttachmentService {
  /**
   * Create a new attachment record
   */
  async createAttachment(data: CreateAttachmentDTO, userId?: string) {
    try {
      // Validate required fields
      if (!data.entity_type || !data.entity_id || !data.file_name || !data.file_type || !data.file_url) {
        throw new ValidationError('Missing required fields: entity_type, entity_id, file_name, file_type, file_url');
      }

      // Validate entity type is one of the allowed types
      const allowedEntityTypes = ['expense', 'payable', 'revenue', 'receivable', 'journal_entry', 'payroll'];
      if (!allowedEntityTypes.includes(data.entity_type)) {
        throw new ValidationError(`Invalid entity_type. Allowed types: ${allowedEntityTypes.join(', ')}`);
      }

      const attachment = await prisma.attachment.create({
        data: {
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          file_name: data.file_name,
          file_type: data.file_type,
          file_url: data.file_url,
          file_size: data.file_size,
          description: data.description,
          uploaded_by: data.uploaded_by || userId,
        },
      });

      logger.info(`Attachment created: ${attachment.id} for ${data.entity_type}/${data.entity_id} by user ${userId || 'system'}`);
      return attachment;
    } catch (error) {
      logger.error('Error creating attachment:', error);
      throw error;
    }
  }

  /**
   * Get attachments by entity type and entity id
   */
  async getAttachmentsByEntity(entity_type: string, entity_id: string) {
    try {
      const attachments = await prisma.attachment.findMany({
        where: {
          entity_type,
          entity_id,
          is_deleted: false,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return attachments;
    } catch (error) {
      logger.error('Error fetching attachments:', error);
      throw error;
    }
  }

  /**
   * Get attachment by ID
   */
  async getAttachmentById(id: number) {
    try {
      const attachment = await prisma.attachment.findFirst({
        where: {
          id,
          is_deleted: false,
        },
      });

      if (!attachment) {
        throw new NotFoundError(`Attachment with ID ${id} not found`);
      }

      return attachment;
    } catch (error) {
      logger.error('Error fetching attachment:', error);
      throw error;
    }
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(id: number, data: UpdateAttachmentDTO, userId?: string) {
    try {
      // Check if attachment exists
      const existing = await this.getAttachmentById(id);

      const attachment = await prisma.attachment.update({
        where: { id },
        data: {
          file_name: data.file_name ?? existing.file_name,
          description: data.description ?? existing.description,
          updated_at: new Date(),
        },
      });

      logger.info(`Attachment updated: ${id} by user ${userId || 'system'}`);
      return attachment;
    } catch (error) {
      logger.error('Error updating attachment:', error);
      throw error;
    }
  }

  /**
   * Soft delete an attachment
   */
  async deleteAttachment(id: number, userId?: string) {
    try {
      // Check if attachment exists
      await this.getAttachmentById(id);

      const attachment = await prisma.attachment.update({
        where: { id },
        data: {
          is_deleted: true,
          updated_at: new Date(),
        },
      });

      logger.info(`Attachment soft-deleted: ${id} by user ${userId || 'system'}`);
      return attachment;
    } catch (error) {
      logger.error('Error deleting attachment:', error);
      throw error;
    }
  }

  /**
   * List all attachments with filters and pagination
   */
  async listAttachments(filters: AttachmentFilters, page: number = 1, limit: number = 20) {
    try {
      const where: any = {
        is_deleted: filters.is_deleted ?? false,
      };

      if (filters.entity_type) {
        where.entity_type = filters.entity_type;
      }

      if (filters.entity_id) {
        where.entity_id = filters.entity_id;
      }

      if (filters.file_type) {
        where.file_type = {
          contains: filters.file_type,
          mode: 'insensitive',
        };
      }

      const skip = (page - 1) * limit;

      const [attachments, total] = await Promise.all([
        prisma.attachment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.attachment.count({ where }),
      ]);

      return {
        data: attachments,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing attachments:', error);
      throw error;
    }
  }
}
