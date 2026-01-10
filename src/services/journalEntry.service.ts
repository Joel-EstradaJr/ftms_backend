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
        where.date = {};
        if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
      }

      // Status filtering
      if (filters.status) {
        where.status = filters.status;
      }

      // Entry type filtering
      if (filters.entry_type) {
        where.entry_type = filters.entry_type;
      }

      // Code search
      if (filters.code) {
        where.code = { contains: filters.code, mode: 'insensitive' };
      }

      // Reference search
      if (filters.reference) {
        where.reference = { contains: filters.reference, mode: 'insensitive' };
      }

      // Description search
      if (filters.description) {
        where.description = { contains: filters.description, mode: 'insensitive' };
      }

      // Include archived/deleted if specified
      if (filters.includeArchived === 'true' || filters.includeArchived === true) {
        delete where.is_deleted;
      }

      const skip = (page - 1) * limit;
      const [entries, total] = await Promise.all([
        prisma.journal_entry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            lines: {
              include: {
                account: {
                  select: {
                    id: true,
                    account_code: true,
                    account_name: true,
                    account_type_id: true,
                    normal_balance: true,
                  },
                },
              },
            },
          },
        }),
        prisma.journal_entry.count({ where }),
      ]);

      // Transform data for frontend
      const transformedEntries = entries.map(entry => ({
        journal_entry_id: entry.id.toString(),
        code: entry.code,
        date: entry.date.toISOString().split('T')[0],
        posting_date: entry.approved_at ? entry.approved_at.toISOString().split('T')[0] : undefined,
        reference: entry.reference,
        description: entry.description,
        total_debit: parseFloat(entry.total_debit.toString()),
        total_credit: parseFloat(entry.total_credit.toString()),
        status: entry.status,
        entry_type: entry.entry_type,
        is_balanced: Math.abs(parseFloat(entry.total_debit.toString()) - parseFloat(entry.total_credit.toString())) < 0.01,
        is_deleted: entry.is_deleted,
        created_at: entry.created_at,
        created_by: entry.created_by,
        updated_at: entry.updated_at,
        approved_by: entry.approved_by,
        approved_at: entry.approved_at,
        journal_lines: entry.lines.map(line => ({
          line_id: line.id.toString(),
          journal_entry_id: entry.id.toString(),
          account_id: line.account.id.toString(),
          account_code: line.account.account_code,
          account_name: line.account.account_name,
          account: {
            account_id: line.account.id.toString(),
            account_code: line.account.account_code,
            account_name: line.account.account_name,
            account_type: line.account.account_type_id,
            normal_balance: line.account.normal_balance,
            is_active: !line.account.is_deleted,
          },
          line_number: line.line_number,
          description: line.description,
          debit: parseFloat(line.debit.toString()),
          credit: parseFloat(line.credit.toString()),
          debit_amount: parseFloat(line.debit.toString()),
          credit_amount: parseFloat(line.credit.toString()),
        })),
      }));

      return {
        data: transformedEntries,
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
   * Get a journal entry by ID with full details for View Modal
   */
  async getJournalEntryById(id: number) {
    const entry = await prisma.journal_entry.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                account_code: true,
                account_name: true,
                account_type_id: true,
                normal_balance: true,
                is_deleted: true,
              },
            },
          },
          orderBy: {
            line_number: 'asc',
          },
        },
        reversal_of: {
          select: {
            id: true,
            code: true,
          },
        },
        reversals: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!entry || entry.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }

    // Transform to match frontend expectations
    return {
      journal_entry_id: entry.id.toString(),
      journal_number: entry.code,
      code: entry.code,
      status: entry.status,
      entry_type: entry.entry_type,
      transaction_date: entry.date.toISOString().split('T')[0],
      posting_date: entry.approved_at ? entry.approved_at.toISOString().split('T')[0] : undefined,
      reference_number: entry.reference,
      description: entry.description,
      source_module: entry.entry_type === 'AUTO_GENERATED' ? 'Auto Generated' : 'Manual Entry',
      source_id: entry.reference,
      created_by: entry.created_by,
      created_at: entry.created_at.toISOString(),
      posted_by: entry.approved_by,
      posted_at: entry.approved_at ? entry.approved_at.toISOString() : undefined,
      updated_at: entry.updated_at ? entry.updated_at.toISOString() : undefined,
      updated_by: entry.updated_by,
      reversed_by_id: entry.reversal_of_id,
      attachments: [], // Add attachments support if needed
      journal_lines: entry.lines.map(line => ({
        line_id: line.id.toString(),
        account_id: line.account.id.toString(),
        account_code: line.account.account_code,
        account_name: line.account.account_name,
        line_description: line.description,
        description: line.description,
        debit_amount: parseFloat(line.debit.toString()),
        credit_amount: parseFloat(line.credit.toString()),
        debit: parseFloat(line.debit.toString()),
        credit: parseFloat(line.credit.toString()),
        line_number: line.line_number,
        account: {
          account_id: line.account.id.toString(),
          account_code: line.account.account_code,
          account_name: line.account.account_name,
          account_type: line.account.account_type_id as any,
          normal_balance: line.account.normal_balance,
          is_active: !line.account.is_deleted,
        },
      })),
      total_debit: parseFloat(entry.total_debit.toString()),
      total_credit: parseFloat(entry.total_credit.toString()),
      is_balanced: Math.abs(parseFloat(entry.total_debit.toString()) - parseFloat(entry.total_credit.toString())) < 0.01,
    };
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
