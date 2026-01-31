import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface JournalEntryLineInput {
  account_code: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateAutoJournalEntryInput {
  module: string;           // Source module (e.g., "PAYROLL", "EXPENSE", "REVENUE")
  reference_id: string;     // Reference ID from source module
  description: string;
  date: string;             // YYYY-MM-DD
  entries: JournalEntryLineInput[];
}

export interface CreateAdjustmentInput extends CreateAutoJournalEntryInput {
  adjustment_of_id: number; // Original JE ID to adjust
}

export interface CreateReversalInput {
  reversal_of_id: number;   // Original JE ID to reverse
  reason: string;           // Reason for reversal
  date?: string;            // Optional reversal date (defaults to today)
}

export interface UpdateDraftJournalEntryInput {
  description?: string;
  date?: string;            // YYYY-MM-DD
  entries?: JournalEntryLineInput[];
}

export interface JournalEntryFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  module?: string;
  reference?: string;
  code?: string;
  includeDeleted?: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class JournalEntryAutoService {
  
  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  /**
   * Generate a unique journal entry code
   * Format: JE-YYYY-XXXX (e.g., JE-2026-0001)
   */
  private async generateJournalEntryCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;
    
    const lastJE = await prisma.journal_entry.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    let nextNumber = 1;
    if (lastJE?.code) {
      const parts = lastJE.code.split('-');
      const lastNumber = parseInt(parts[2], 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Validate that all account codes exist in chart_of_account
   * Returns a map of account_code -> account_id
   */
  private async validateAndMapAccounts(entries: JournalEntryLineInput[]): Promise<Map<string, number>> {
    const accountCodes = [...new Set(entries.map(e => e.account_code))];
    
    const accounts = await prisma.chart_of_account.findMany({
      where: {
        account_code: { in: accountCodes },
        is_deleted: false,
      },
      select: { id: true, account_code: true },
    });

    const accountMap = new Map<string, number>();
    accounts.forEach(acc => accountMap.set(acc.account_code, acc.id));

    // Check for missing accounts
    const missingAccounts = accountCodes.filter(code => !accountMap.has(code));
    if (missingAccounts.length > 0) {
      throw new ValidationError(
        `Invalid account codes: ${missingAccounts.join(', ')}. These accounts do not exist or are inactive.`
      );
    }

    return accountMap;
  }

  /**
   * Calculate totals and validate balance
   */
  private validateAndCalculateTotals(entries: JournalEntryLineInput[]): { totalDebit: Prisma.Decimal; totalCredit: Prisma.Decimal } {
    if (!entries || entries.length === 0) {
      throw new ValidationError('At least one journal entry line is required');
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    entries.forEach((entry, index) => {
      if (entry.debit < 0 || entry.credit < 0) {
        throw new ValidationError(`Line ${index + 1}: Debit and credit amounts must be non-negative`);
      }
      if (entry.debit === 0 && entry.credit === 0) {
        throw new ValidationError(`Line ${index + 1}: Either debit or credit must be greater than zero`);
      }
      if (entry.debit > 0 && entry.credit > 0) {
        throw new ValidationError(`Line ${index + 1}: A line cannot have both debit and credit amounts`);
      }

      totalDebit = totalDebit.add(new Prisma.Decimal(entry.debit));
      totalCredit = totalCredit.add(new Prisma.Decimal(entry.credit));
    });

    // Validate balanced entry
    if (!totalDebit.equals(totalCredit)) {
      throw new ValidationError(
        `Journal entry is not balanced. Total Debit: ${totalDebit.toString()}, Total Credit: ${totalCredit.toString()}`
      );
    }

    return { totalDebit, totalCredit };
  }

  // --------------------------------------------------------------------------
  // CREATE AUTO-GENERATED JOURNAL ENTRY
  // --------------------------------------------------------------------------

  /**
   * Create an auto-generated journal entry
   * Used by all modules to create JEs automatically
   */
  async createAutoJournalEntry(
    input: CreateAutoJournalEntryInput,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Creating auto-generated JE for module: ${input.module}`);

    // Validate entries and calculate totals
    const { totalDebit, totalCredit } = this.validateAndCalculateTotals(input.entries);

    // Validate and map account codes to IDs
    const accountMap = await this.validateAndMapAccounts(input.entries);

    // Generate unique code
    const code = await this.generateJournalEntryCode();

    // Create journal entry with lines in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Create the journal entry
      const je = await tx.journal_entry.create({
        data: {
          code,
          date: new Date(input.date),
          reference: `${input.module}:${input.reference_id}`,
          description: input.description,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'DRAFT',
          entry_type: 'AUTO_GENERATED',
          created_by: userId,
        },
      });

      // Create journal entry lines
      const linesData = input.entries.map((entry, index) => ({
        journal_entry_id: je.id,
        account_id: accountMap.get(entry.account_code)!,
        debit: new Prisma.Decimal(entry.debit),
        credit: new Prisma.Decimal(entry.credit),
        description: entry.description || null,
        line_number: index + 1,
        created_by: userId,
      }));

      await tx.journal_entry_line.createMany({ data: linesData });

      // Fetch the complete entry with lines
      return tx.journal_entry.findUnique({
        where: { id: je.id },
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  account_code: true,
                  account_name: true,
                  normal_balance: true,
                },
              },
            },
            orderBy: { line_number: 'asc' },
          },
        },
      });
    });

    // Audit log
    await AuditLogClient.logCreate(
      'Journal Entry',
      { id: journalEntry!.id, code: journalEntry!.code },
      journalEntry,
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      req
    );

    logger.info(`[JournalEntryAutoService] Created JE: ${code}`);
    return this.transformJournalEntry(journalEntry!);
  }

  // --------------------------------------------------------------------------
  // CREATE ADJUSTMENT JOURNAL ENTRY
  // --------------------------------------------------------------------------

  /**
   * Create an adjustment journal entry linked to an existing POSTED JE
   */
  async createAdjustmentJournalEntry(
    input: CreateAdjustmentInput,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Creating adjustment JE for original ID: ${input.adjustment_of_id}`);

    // Validate original JE exists and is POSTED
    const originalJE = await prisma.journal_entry.findUnique({
      where: { id: input.adjustment_of_id },
      select: { id: true, code: true, status: true, is_deleted: true },
    });

    if (!originalJE || originalJE.is_deleted) {
      throw new NotFoundError(`Original journal entry ${input.adjustment_of_id} not found`);
    }

    if (originalJE.status !== 'POSTED') {
      throw new BadRequestError(
        `Cannot adjust journal entry with status ${originalJE.status}. Only POSTED entries can be adjusted.`
      );
    }

    // Validate entries and calculate totals
    const { totalDebit, totalCredit } = this.validateAndCalculateTotals(input.entries);

    // Validate and map account codes to IDs
    const accountMap = await this.validateAndMapAccounts(input.entries);

    // Generate unique code
    const code = await this.generateJournalEntryCode();

    // Create adjustment JE with lines in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Create the adjustment journal entry
      const je = await tx.journal_entry.create({
        data: {
          code,
          date: new Date(input.date),
          reference: `${input.module}:${input.reference_id}`,
          description: `Adjustment of ${originalJE.code}: ${input.description}`,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'DRAFT',
          entry_type: 'AUTO_GENERATED',
          adjustment_of_id: input.adjustment_of_id,
          created_by: userId,
        },
      });

      // Create journal entry lines
      const linesData = input.entries.map((entry, index) => ({
        journal_entry_id: je.id,
        account_id: accountMap.get(entry.account_code)!,
        debit: new Prisma.Decimal(entry.debit),
        credit: new Prisma.Decimal(entry.credit),
        description: entry.description || null,
        line_number: index + 1,
        created_by: userId,
      }));

      await tx.journal_entry_line.createMany({ data: linesData });

      // Update original JE status to ADJUSTED
      await tx.journal_entry.update({
        where: { id: input.adjustment_of_id },
        data: {
          status: 'ADJUSTED',
          updated_by: userId,
        },
      });

      // Fetch the complete entry with lines
      return tx.journal_entry.findUnique({
        where: { id: je.id },
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  account_code: true,
                  account_name: true,
                  normal_balance: true,
                },
              },
            },
            orderBy: { line_number: 'asc' },
          },
          adjustment_of: {
            select: { id: true, code: true },
          },
        },
      });
    });

    // Audit log
    await AuditLogClient.logCreate(
      'Journal Entry (Adjustment)',
      { id: journalEntry!.id, code: journalEntry!.code },
      { ...journalEntry, adjustment_of_code: originalJE.code },
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      req
    );

    logger.info(`[JournalEntryAutoService] Created adjustment JE: ${code} for original: ${originalJE.code}`);
    return this.transformJournalEntry(journalEntry!);
  }

  // --------------------------------------------------------------------------
  // CREATE REVERSAL JOURNAL ENTRY
  // --------------------------------------------------------------------------

  /**
   * Create a reversal journal entry that mirrors the original with swapped debits/credits
   */
  async createReversalJournalEntry(
    input: CreateReversalInput,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Creating reversal JE for original ID: ${input.reversal_of_id}`);

    // Validate original JE exists and is POSTED
    const originalJE = await prisma.journal_entry.findUnique({
      where: { id: input.reversal_of_id },
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, account_code: true },
            },
          },
          orderBy: { line_number: 'asc' },
        },
      },
    });

    if (!originalJE || originalJE.is_deleted) {
      throw new NotFoundError(`Original journal entry ${input.reversal_of_id} not found`);
    }

    if (originalJE.status !== 'POSTED') {
      throw new BadRequestError(
        `Cannot reverse journal entry with status ${originalJE.status}. Only POSTED entries can be reversed.`
      );
    }

    // Check if already reversed
    const existingReversal = await prisma.journal_entry.findFirst({
      where: {
        reversal_of_id: input.reversal_of_id,
        is_deleted: false,
      },
    });

    if (existingReversal) {
      throw new BadRequestError(
        `Journal entry ${originalJE.code} has already been reversed by ${existingReversal.code}`
      );
    }

    // Generate unique code
    const code = await this.generateJournalEntryCode();
    const reversalDate = input.date ? new Date(input.date) : new Date();

    // Create reversal JE with swapped lines in a transaction
    const journalEntry = await prisma.$transaction(async (tx) => {
      // Create the reversal journal entry
      const je = await tx.journal_entry.create({
        data: {
          code,
          date: reversalDate,
          reference: `REVERSAL:${originalJE.code}`,
          description: `Reversal of ${originalJE.code}: ${input.reason}`,
          total_debit: originalJE.total_credit, // Swapped
          total_credit: originalJE.total_debit, // Swapped
          status: 'DRAFT',
          entry_type: 'AUTO_GENERATED',
          reversal_of_id: input.reversal_of_id,
          created_by: userId,
        },
      });

      // Create reversed journal entry lines (swap debit and credit)
      const linesData = originalJE.lines.map((line, index) => ({
        journal_entry_id: je.id,
        account_id: line.account_id,
        debit: line.credit,  // Swapped
        credit: line.debit,  // Swapped
        description: `Reversal: ${line.description || ''}`,
        line_number: index + 1,
        created_by: userId,
      }));

      await tx.journal_entry_line.createMany({ data: linesData });

      // Update original JE status to REVERSED
      await tx.journal_entry.update({
        where: { id: input.reversal_of_id },
        data: {
          status: 'REVERSED',
          updated_by: userId,
        },
      });

      // Fetch the complete entry with lines
      return tx.journal_entry.findUnique({
        where: { id: je.id },
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  account_code: true,
                  account_name: true,
                  normal_balance: true,
                },
              },
            },
            orderBy: { line_number: 'asc' },
          },
          reversal_of: {
            select: { id: true, code: true },
          },
        },
      });
    });

    // Audit log
    await AuditLogClient.logCreate(
      'Journal Entry (Reversal)',
      { id: journalEntry!.id, code: journalEntry!.code },
      { ...journalEntry, reversal_of_code: originalJE.code },
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      req
    );

    logger.info(`[JournalEntryAutoService] Created reversal JE: ${code} for original: ${originalJE.code}`);
    return this.transformJournalEntry(journalEntry!);
  }

  // --------------------------------------------------------------------------
  // UPDATE DRAFT JOURNAL ENTRY
  // --------------------------------------------------------------------------

  /**
   * Update a DRAFT journal entry
   * Only DRAFT entries can be edited
   */
  async updateDraftJournalEntry(
    id: number,
    input: UpdateDraftJournalEntryInput,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Updating draft JE ID: ${id}`);

    // Fetch existing entry
    const existingJE = await prisma.journal_entry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existingJE || existingJE.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }

    if (existingJE.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot edit journal entry with status ${existingJE.status}. Only DRAFT entries can be edited.`
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_by: userId,
    };

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.date !== undefined) {
      updateData.date = new Date(input.date);
    }

    // Handle entries update
    if (input.entries && input.entries.length > 0) {
      // Validate entries and calculate totals
      const { totalDebit, totalCredit } = this.validateAndCalculateTotals(input.entries);

      // Validate and map account codes to IDs
      const accountMap = await this.validateAndMapAccounts(input.entries);

      updateData.total_debit = totalDebit;
      updateData.total_credit = totalCredit;

      // Update in transaction
      const journalEntry = await prisma.$transaction(async (tx) => {
        // Delete existing lines
        await tx.journal_entry_line.deleteMany({
          where: { journal_entry_id: id },
        });

        // Create new lines
        const linesData = input.entries!.map((entry, index) => ({
          journal_entry_id: id,
          account_id: accountMap.get(entry.account_code)!,
          debit: new Prisma.Decimal(entry.debit),
          credit: new Prisma.Decimal(entry.credit),
          description: entry.description || null,
          line_number: index + 1,
          created_by: userId,
        }));

        await tx.journal_entry_line.createMany({ data: linesData });

        // Update the journal entry
        return tx.journal_entry.update({
          where: { id },
          data: updateData,
          include: {
            lines: {
              include: {
                account: {
                  select: {
                    id: true,
                    account_code: true,
                    account_name: true,
                    normal_balance: true,
                  },
                },
              },
              orderBy: { line_number: 'asc' },
            },
          },
        });
      });

      // Audit log
      await AuditLogClient.logUpdate(
        'Journal Entry',
        { id, code: journalEntry.code },
        existingJE,
        journalEntry,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`[JournalEntryAutoService] Updated draft JE: ${journalEntry.code}`);
      return this.transformJournalEntry(journalEntry);
    } else {
      // Simple update without entries change
      const journalEntry = await prisma.journal_entry.update({
        where: { id },
        data: updateData,
        include: {
          lines: {
            include: {
              account: {
                select: {
                  id: true,
                  account_code: true,
                  account_name: true,
                  normal_balance: true,
                },
              },
            },
            orderBy: { line_number: 'asc' },
          },
        },
      });

      // Audit log
      await AuditLogClient.logUpdate(
        'Journal Entry',
        { id, code: journalEntry.code },
        existingJE,
        journalEntry,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`[JournalEntryAutoService] Updated draft JE: ${journalEntry.code}`);
      return this.transformJournalEntry(journalEntry);
    }
  }

  // --------------------------------------------------------------------------
  // POST JOURNAL ENTRY
  // --------------------------------------------------------------------------

  /**
   * Post a DRAFT journal entry (change status to POSTED)
   */
  async postJournalEntry(
    id: number,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Posting JE ID: ${id}`);

    const existingJE = await prisma.journal_entry.findUnique({
      where: { id },
    });

    if (!existingJE || existingJE.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }

    if (existingJE.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot post journal entry with status ${existingJE.status}. Only DRAFT entries can be posted.`
      );
    }

    const journalEntry = await prisma.journal_entry.update({
      where: { id },
      data: {
        status: 'POSTED',
        approved_by: userId,
        approved_at: new Date(),
        updated_by: userId,
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                account_code: true,
                account_name: true,
                normal_balance: true,
              },
            },
          },
          orderBy: { line_number: 'asc' },
        },
      },
    });

    // Audit log
    await AuditLogClient.logUpdate(
      'Journal Entry',
      { id, code: journalEntry.code },
      { status: 'DRAFT' },
      { status: 'POSTED', approved_by: userId, approved_at: new Date() },
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      req
    );

    logger.info(`[JournalEntryAutoService] Posted JE: ${journalEntry.code}`);
    return this.transformJournalEntry(journalEntry);
  }

  // --------------------------------------------------------------------------
  // DELETE JOURNAL ENTRY (SOFT DELETE)
  // --------------------------------------------------------------------------

  /**
   * Soft delete a DRAFT journal entry
   * Only DRAFT entries can be deleted
   */
  async deleteJournalEntry(
    id: number,
    reason: string,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    logger.info(`[JournalEntryAutoService] Deleting JE ID: ${id}`);

    const existingJE = await prisma.journal_entry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existingJE || existingJE.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }

    if (existingJE.status !== 'DRAFT') {
      throw new BadRequestError(
        `Cannot delete journal entry with status ${existingJE.status}. Only DRAFT entries can be deleted.`
      );
    }

    // Soft delete in transaction (JE and lines)
    await prisma.$transaction(async (tx) => {
      // Soft delete lines
      await tx.journal_entry_line.updateMany({
        where: { journal_entry_id: id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      // Soft delete journal entry
      await tx.journal_entry.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });
    });

    // Audit log
    await AuditLogClient.logDelete(
      'Journal Entry',
      { id, code: existingJE.code },
      existingJE,
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      reason,
      req
    );

    logger.info(`[JournalEntryAutoService] Deleted JE: ${existingJE.code}`);
    return { success: true, message: `Journal entry ${existingJE.code} has been deleted` };
  }

  // --------------------------------------------------------------------------
  // GET JOURNAL ENTRY BY ID
  // --------------------------------------------------------------------------

  /**
   * Get a journal entry by ID with full details
   */
  async getJournalEntryById(id: number) {
    const entry = await prisma.journal_entry.findUnique({
      where: { id },
      include: {
        lines: {
          where: { is_deleted: false },
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
          orderBy: { line_number: 'asc' },
        },
        reversal_of: {
          select: { id: true, code: true, status: true },
        },
        reversals: {
          where: { is_deleted: false },
          select: { id: true, code: true, status: true },
        },
        adjustment_of: {
          select: { id: true, code: true, status: true },
        },
        adjustments: {
          where: { is_deleted: false },
          select: { id: true, code: true, status: true },
        },
      },
    });

    if (!entry || entry.is_deleted) {
      throw new NotFoundError(`Journal entry ${id} not found`);
    }

    return this.transformJournalEntry(entry);
  }

  // --------------------------------------------------------------------------
  // LIST JOURNAL ENTRIES
  // --------------------------------------------------------------------------

  /**
   * List journal entries with filtering and pagination
   */
  async listJournalEntries(
    filters: JournalEntryFilters,
    page = 1,
    limit = 10
  ) {
    const where: any = {};

    // Exclude deleted unless specifically requested
    if (!filters.includeDeleted) {
      where.is_deleted = false;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    // Module filter (searches in reference field - format: MODULE:REFERENCE_ID)
    if (filters.module) {
      where.reference = { startsWith: `${filters.module}:` };
    }

    // Reference search
    if (filters.reference) {
      where.reference = { contains: filters.reference, mode: 'insensitive' };
    }

    // Code search
    if (filters.code) {
      where.code = { contains: filters.code, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.journal_entry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { code: 'desc' }],
        include: {
          lines: {
            where: { is_deleted: false },
            include: {
              account: {
                select: {
                  id: true,
                  account_code: true,
                  account_name: true,
                  normal_balance: true,
                },
              },
            },
            orderBy: { line_number: 'asc' },
          },
          reversal_of: {
            select: { id: true, code: true },
          },
          adjustment_of: {
            select: { id: true, code: true },
          },
        },
      }),
      prisma.journal_entry.count({ where }),
    ]);

    return {
      data: entries.map(entry => this.transformJournalEntry(entry)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --------------------------------------------------------------------------
  // TRANSFORM HELPER
  // --------------------------------------------------------------------------

  /**
   * Transform journal entry for API response
   */
  private transformJournalEntry(entry: any) {
    const totalDebit = parseFloat(entry.total_debit?.toString() || '0');
    const totalCredit = parseFloat(entry.total_credit?.toString() || '0');

    return {
      id: entry.id,
      code: entry.code,
      date: entry.date?.toISOString?.()?.split('T')[0] || entry.date,
      reference: entry.reference,
      description: entry.description,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      status: entry.status,
      entry_type: entry.entry_type,

      // Approval info
      approved_by: entry.approved_by,
      approved_at: entry.approved_at?.toISOString?.() || entry.approved_at,

      // Linked entries
      reversal_of_id: entry.reversal_of_id,
      reversal_of: entry.reversal_of || null,
      reversals: entry.reversals || [],
      adjustment_of_id: entry.adjustment_of_id,
      adjustment_of: entry.adjustment_of || null,
      adjustments: entry.adjustments || [],

      // Lines
      lines: entry.lines?.map((line: any) => ({
        id: line.id,
        account_id: line.account_id,
        account_code: line.account?.account_code,
        account_name: line.account?.account_name,
        normal_balance: line.account?.normal_balance,
        debit: parseFloat(line.debit?.toString() || '0'),
        credit: parseFloat(line.credit?.toString() || '0'),
        description: line.description,
        line_number: line.line_number,
      })) || [],

      // Audit trail
      created_by: entry.created_by,
      created_at: entry.created_at?.toISOString?.() || entry.created_at,
      updated_by: entry.updated_by,
      updated_at: entry.updated_at?.toISOString?.() || entry.updated_at,
      is_deleted: entry.is_deleted,
    };
  }
}
