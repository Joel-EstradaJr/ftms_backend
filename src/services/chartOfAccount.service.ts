// Domain service for Chart of Accounts creation and code generation logic.
// Contains business rules separate from controllers to keep HTTP handling thin.
import { prisma } from '../../lib/prisma';
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
    const where: any = {};
    
    // Filter by archived status
    if (!includeArchived) {
      where.is_deleted = false;
    }

    // Filter by account type
    if (accountTypeId) {
      where.account_type_id = accountTypeId;
    }

    // Search filter (account_code or account_name)
    if (search && search.trim()) {
      where.OR = [
        { account_code: { contains: search.trim(), mode: 'insensitive' } },
        { account_name: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Execute query with join to account_type
    const [records, total] = await Promise.all([
      prisma.chart_of_account.findMany({
        where,
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
      prisma.chart_of_account.count({ where }),
    ]);

    // Map to DTO format
    const data: ChartOfAccountListItemDTO[] = records.map(record => ({
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
}
