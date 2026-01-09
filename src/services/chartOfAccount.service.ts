// Domain service for Chart of Accounts creation and code generation logic.
// Contains business rules separate from controllers to keep HTTP handling thin.
import { prisma } from '../config/database';
import { 
  ChartOfAccountCreateDTO, 
  ChartOfAccountQueryDTO,
  ChartOfAccountListResponseDTO,
  ChartOfAccountListItemDTO 
} from '../types/chartOfAccount.types';
import { ValidationError } from '../utils/errors';

interface GenerateResult { code: string; suffix: number; }

export class ChartOfAccountService {
  /**
   * Generates next account_code for an account_type using 3-digit suffix auto-incrementing by 5.
   * Starts at 000 -> e.g., type code '4' produces '4000' initially.
   */
  private async generateAccountCode(accountTypeId: number, accountTypeCode: string, customSuffix?: number): Promise<GenerateResult> {
    if (customSuffix != null) {
      if (customSuffix < 0 || customSuffix > 999) throw new ValidationError('custom_suffix must be between 0 and 999');
      const padded = customSuffix.toString().padStart(3, '0');
      const candidate = `${accountTypeCode}${padded}`;
      const exists = await prisma.chart_of_account.findFirst({ where: { account_code: candidate, is_deleted: false } });
      if (exists) throw new ValidationError(`Account code override '${candidate}' already exists.`);
      return { code: candidate, suffix: customSuffix };
    }

    // Find latest non-deleted account code for this type
    const latest = await prisma.chart_of_account.findFirst({
      where: { account_type_id: accountTypeId, is_deleted: false },
      orderBy: { account_code: 'desc' },
    });

    let nextSuffix = 0;
    if (latest) {
      const latestSuffix = parseInt(latest.account_code.slice(accountTypeCode.length), 10);
      nextSuffix = latestSuffix + 5; // Increment by 5 (Requirement #2)
    }
    if (nextSuffix > 999) throw new ValidationError('Account code suffix overflow for this account type.');
    const padded = nextSuffix.toString().padStart(3, '0');
    const candidate = `${accountTypeCode}${padded}`;
    // Double-check uniqueness ignoring soft-deleted (Requirement #5)
    const exists = await prisma.chart_of_account.findFirst({ where: { account_code: candidate, is_deleted: false } });
    if (exists) throw new ValidationError(`Generated account code conflict '${candidate}'. Retry or specify custom_suffix.`);
    return { code: candidate, suffix: nextSuffix };
  }

  /**
   * Create a Chart of Account entry applying code generation logic.
   */
  async create(dto: ChartOfAccountCreateDTO, actorId?: string) {
    if (!dto.account_name) throw new ValidationError('account_name is required');
    if (!dto.normal_balance) throw new ValidationError('normal_balance is required');
    if (!dto.account_type_id && !dto.account_type_code) throw new ValidationError('Provide account_type_id or account_type_code');

    // Resolve account type
    let accountType = null as any;
    if (dto.account_type_id) {
      accountType = await prisma.account_type.findFirst({ where: { id: dto.account_type_id, is_deleted: false } });
    } else if (dto.account_type_code) {
      accountType = await prisma.account_type.findFirst({ where: { code: dto.account_type_code, is_deleted: false } });
    }
    if (!accountType) throw new ValidationError('Account type not found or deleted');

    // Enforce uniqueness of (account_type_id, account_name) ignoring soft-deleted
    const nameConflict = await prisma.chart_of_account.findFirst({
      where: { account_type_id: accountType.id, account_name: dto.account_name, is_deleted: false },
    });
    if (nameConflict) throw new ValidationError('Account name already exists for this account type');

    const { code } = await this.generateAccountCode(accountType.id, accountType.code, dto.custom_suffix);

    return prisma.chart_of_account.create({
      data: {
        account_code: code,
        account_name: dto.account_name,
        account_type_id: accountType.id,
        normal_balance: dto.normal_balance,
        description: dto.description,
        created_by: actorId,
      },
    });
  }

  /**
   * Retrieve all Chart of Accounts with filtering, search, and pagination.
   * Joins with account_type to include account type name.
   * By default, excludes archived (soft-deleted) records.
   */
  async getAllChartOfAccounts(query: ChartOfAccountQueryDTO): Promise<ChartOfAccountListResponseDTO> {
    const {
      includeArchived = false,
      accountTypeId,
      search,
      page = 1,
      limit = 50,
    } = query;

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Cap at 100 per page
    const skip = (validPage - 1) * validLimit;

    // Build where clause
    const where: any = {
      AND: []
    };
    
    // Filter by archived status
    if (!includeArchived) {
      where.AND.push({ is_deleted: false });
    }

    // Filter by account type
    if (accountTypeId) {
      where.AND.push({ account_type_id: accountTypeId });
    }

    // Search filter (account_code, account_name, description, and account_type.name)
    if (search && search.trim()) {
      const searchConditions = [
        { account_code: { contains: search.trim(), mode: 'insensitive' } },
        { account_name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { account_type: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
      
      where.AND.push({ OR: searchConditions });
      
      // Add normal_balance search if the search term matches DEBIT or CREDIT
      const searchUpper = search.trim().toUpperCase();
      if (searchUpper === 'DEBIT' || searchUpper.includes('DEB')) {
        where.AND.push({ normal_balance: 'DEBIT' });
      }
      if (searchUpper === 'CREDIT' || searchUpper.includes('CRED')) {
        where.AND.push({ normal_balance: 'CREDIT' });
      }
      
      // Add status search if the search term matches Active or Archived
      if (searchUpper.includes('ACTIVE') || searchUpper.includes('ACT')) {
        where.AND.push({ is_deleted: false });
      }
      if (searchUpper.includes('ARCHIVE') || searchUpper.includes('ARCH') || searchUpper.includes('INACTIVE')) {
        where.AND.push({ is_deleted: true });
      }
    }

    // Clean up empty AND array
    const finalWhere = where.AND.length > 0 ? where : {};

    // Execute query with join to account_type
    const [records, total] = await Promise.all([
      prisma.chart_of_account.findMany({
        where: finalWhere,
        include: {
          account_type: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { account_code: 'asc' },
        ],
        skip,
        take: validLimit,
      }),
      prisma.chart_of_account.count({ where: finalWhere }),
    ]);

    // Map to DTO format
    const data: ChartOfAccountListItemDTO[] = records.map((record: any) => ({
      id: record.id,
      account_code: record.account_code,
      account_name: record.account_name,
      account_type_name: record.account_type.name,
      normal_balance: record.normal_balance,
      description: record.description,
      status: record.is_deleted ? 'Archived' : 'Active',
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));

    return {
      data,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    };
  }

  /**
   * Get a single Chart of Account by ID with additional details.
   * Includes linked journal entry lines count.
   */
  async getById(id: number) {
    const record = await prisma.chart_of_account.findUnique({
      where: { id },
      include: {
        account_type: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            journal_lines: true,
          },
        },
      },
    });

    if (!record) {
      throw new ValidationError('Chart of account not found');
    }

    return {
      id: record.id,
      account_code: record.account_code,
      account_name: record.account_name,
      account_type_name: record.account_type.name,
      account_type_id: record.account_type_id,
      normal_balance: record.normal_balance,
      description: record.description,
      status: record.is_deleted ? 'Archived' : 'Active',
      linked_entries_count: record._count.journal_lines,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_by: record.updated_by,
      updated_at: record.updated_at,
      archived_by: record.archived_by,
      archived_at: record.archived_at,
    };
  }

  /**
   * Update a Chart of Account by ID.
   * Validates uniqueness constraints and account code format.
   */
  async update(id: number, updates: Partial<ChartOfAccountCreateDTO> & { account_code?: string }, actorId?: string) {
    // Fetch existing record
    const existing = await prisma.chart_of_account.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Chart of account not found');
    }

    // Prepare update data
    const updateData: any = {
      updated_by: actorId,
    };

    // Handle account_type_id change
    let accountType = null as any;
    if (updates.account_type_id && updates.account_type_id !== existing.account_type_id) {
      accountType = await prisma.account_type.findFirst({ 
        where: { id: updates.account_type_id, is_deleted: false } 
      });
      if (!accountType) {
        throw new ValidationError('Account type not found or deleted');
      }
      updateData.account_type_id = updates.account_type_id;
    } else {
      // Keep existing account type
      accountType = await prisma.account_type.findFirst({ 
        where: { id: existing.account_type_id, is_deleted: false } 
      });
    }

    // Handle account_code update (only last 3 digits editable)
    if (updates.account_code && updates.account_code !== existing.account_code) {
      const accountTypeCode = accountType.code;
      
      // Validate format: must start with account type code
      if (!updates.account_code.startsWith(accountTypeCode)) {
        throw new ValidationError(`Account code must start with '${accountTypeCode}'`);
      }

      // Extract and validate suffix (last 3 digits)
      const suffix = updates.account_code.slice(accountTypeCode.length);
      if (!/^\d{3}$/.test(suffix)) {
        throw new ValidationError('Account code suffix must be exactly 3 digits');
      }

      // Check uniqueness within the same account type
      const codeConflict = await prisma.chart_of_account.findFirst({
        where: {
          account_code: updates.account_code,
          account_type_id: updateData.account_type_id || existing.account_type_id,
          is_deleted: false,
          NOT: { id },
        },
      });
      if (codeConflict) {
        throw new ValidationError('Account code already exists for this account type');
      }

      updateData.account_code = updates.account_code;
    }

    // Handle account_name update
    if (updates.account_name && updates.account_name !== existing.account_name) {
      // Check uniqueness within the account type (current or new)
      const nameConflict = await prisma.chart_of_account.findFirst({
        where: {
          account_name: updates.account_name,
          account_type_id: updateData.account_type_id || existing.account_type_id,
          is_deleted: false,
          NOT: { id },
        },
      });
      if (nameConflict) {
        throw new ValidationError('Account name already exists for this account type');
      }

      updateData.account_name = updates.account_name;
    }

    // Handle other fields
    if (updates.normal_balance !== undefined) {
      updateData.normal_balance = updates.normal_balance;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    return prisma.chart_of_account.update({
      where: { id },
      data: updateData,
      include: {
        account_type: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Archive a Chart of Account (soft delete).
   * Sets is_deleted = true and records archived_by and archived_at.
   */
  async archive(id: number, actorId?: string) {
    const existing = await prisma.chart_of_account.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Chart of account not found');
    }
    if (existing.is_deleted) {
      throw new ValidationError('Chart of account is already archived');
    }

    return prisma.chart_of_account.update({
      where: { id },
      data: {
        is_deleted: true,
        archived_by: actorId,
        archived_at: new Date(),
      },
    });
  }

  /**
   * Restore an archived Chart of Account.
   * Sets is_deleted = false and clears archived_by and archived_at.
   */
  async restore(id: number) {
    const existing = await prisma.chart_of_account.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Chart of account not found');
    }
    if (!existing.is_deleted) {
      throw new ValidationError('Chart of account is not archived');
    }

    return prisma.chart_of_account.update({
      where: { id },
      data: {
        is_deleted: false,
        archived_by: null,
        archived_at: null,
      },
    });
  }

  /**
   * Hard delete a Chart of Account.
   * Only allowed for archived records.
   * Records deleted_by and deleted_at before deletion.
   */
  async delete(id: number, actorId?: string) {
    const existing = await prisma.chart_of_account.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Chart of account not found');
    }
    if (!existing.is_deleted) {
      throw new ValidationError('Chart of account must be archived before deletion');
    }

    // Record deletion audit before hard delete
    await prisma.chart_of_account.update({
      where: { id },
      data: {
        deleted_by: actorId,
        deleted_at: new Date(),
      },
    });

    // Perform hard delete
    return prisma.chart_of_account.delete({
      where: { id },
    });
  }

  /**
   * Get the next suggested account code for a given account type.
   * Used by frontend to pre-fill the account code field.
   */
  async getSuggestedAccountCode(accountTypeId: number): Promise<string> {
    const accountType = await prisma.account_type.findFirst({
      where: { id: accountTypeId, is_deleted: false },
    });
    if (!accountType) {
      throw new ValidationError('Account type not found or deleted');
    }

    const { code } = await this.generateAccountCode(accountType.id, accountType.code);
    return code;
  }
}
