import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

export class JournalEntryService {
  /**
   * Create a new journal entry
   */
  async createJournalEntry(data: any, userId: string, userInfo?: any, req?: any) {
    try {
      const entry = await prisma.journal_entry.create({
        data: {
          code: data.code || data.referenceNo,
          reference: data.reference || data.referenceNo,
          date: new Date(data.entryDate || data.date),
          description: data.description,
          total_debit: data.debitAmount?.toString() || '0',
          total_credit: data.creditAmount?.toString() || '0',
          created_by: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Journal Entry',
        { id: entry.id, code: entry.code },
        entry,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Journal entry created: ${entry.code}`);
      return entry;
    } catch (error) {
      logger.error('Error creating journal entry:', error);
      throw error;
    }
  }

  /**
   * List journal entries with filtering and pagination
   */
  async listJournalEntries(filters: any, page = 1, limit = 10) {
    try {
      const where: any = { is_deleted: false };

      // Date range filtering
      if (filters.dateFrom || filters.dateTo) {
        where.entryDate = {};
        if (filters.dateFrom) where.entryDate.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.entryDate.lte = new Date(filters.dateTo);
      }

      // Account filtering
      if (filters.accountCode) where.accountCode = { contains: filters.accountCode };
      if (filters.linkedEntityType) where.linkedEntityType = filters.linkedEntityType;

      const skip = (page - 1) * limit;
      const [entries, total] = await Promise.all([
        prisma.journal_entry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
        }),
        prisma.journal_entry.count({ where }),
      ]);

      return {
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing journal entries:', error);
      throw error;
    }
  }

  /**
   * Get a journal entry by ID
   */
  async getJournalEntryById(id: number) {
    const entry = await prisma.journal_entry.findUnique({ where: { id } });
    if (!entry || entry.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }
    return entry;
  }

  /**
   * Update a journal entry
   */
  async updateJournalEntry(id: number, updates: any, userId: string, userInfo?: any, req?: any) {
    try {
      const oldEntry = await this.getJournalEntryById(id);

      const updateData: any = { ...updates, updatedBy: userId };
      if (updates.debitAmount) updateData.debitAmount = updates.debitAmount.toString();
      if (updates.creditAmount) updateData.creditAmount = updates.creditAmount.toString();
      if (updates.entryDate) updateData.entryDate = new Date(updates.entryDate);

      const updatedEntry = await prisma.journal_entry.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Journal Entry',
        { id, code: updatedEntry.code },
        oldEntry,
        updatedEntry,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Journal entry updated: ${updatedEntry.code}`);
      return updatedEntry;
    } catch (error) {
      logger.error('Error updating journal entry:', error);
      throw error;
    }
  }

  /**
   * Soft delete a journal entry
   */
  async deleteJournalEntry(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const entry = await this.getJournalEntryById(id);

      await prisma.journal_entry.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Journal Entry',
        { id, code: entry.code },
        entry,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Journal entry deleted: ${entry.code}`);
    } catch (error) {
      logger.error('Error deleting journal entry:', error);
      throw error;
    }
  }
}
