// Business logic for Account Type management.
// Services encapsulate domain rules separate from HTTP layer (controllers).
import { prisma } from '../config/database';
import { AccountTypeCreateDTO } from '../types/accountType.types';
import { ValidationError } from '../utils/errors';

export class AccountTypeService {
  /**
   * Get all active account types.
   * Used for populating dropdowns and form selectors.
   */
  async getAllAccountTypes(includeArchived = false) {
    const where = includeArchived ? {} : { is_deleted: false };
    return prisma.account_type.findMany({
      where,
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        is_deleted: true,
        archived_at: true,
        archived_by: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /**
   * Get a single account type by ID.
   */
  async getById(id: number) {
    const record = await prisma.account_type.findFirst({
      where: { id },
    });
    if (!record) throw new ValidationError('Account type not found');
    return record;
  }

  /**
   * Create or revive an account type.
   * Soft-deleted records are treated as available (Requirement #5).
   */
  async create(dto: AccountTypeCreateDTO, actorId?: string) {
    if (!dto.code || !dto.name) throw new ValidationError('code and name are required');
    // Existing active?
    const active = await prisma.account_type.findFirst({ where: { code: dto.code, is_deleted: false } });
    if (active) throw new ValidationError(`Account type code '${dto.code}' already exists (active).`);

    // Check soft-deleted for revival by code OR name
    const softDeleted = await prisma.account_type.findFirst({ where: { code: dto.code, is_deleted: true } });
    if (softDeleted) {
      return prisma.account_type.update({
        where: { id: softDeleted.id },
        data: {
          name: dto.name,
          description: dto.description,
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          archived_at: null,
          archived_by: null,
          updated_by: actorId,
        },
      });
    }

    return prisma.account_type.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        created_by: actorId,
      },
    });
  }

  /**
   * Update an account type by ID.
   */
  async update(id: number, dto: Partial<AccountTypeCreateDTO>, actorId?: string) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');

    // Check for code conflicts if code is being updated
    if (dto.code && dto.code !== existing.code) {
      const conflict = await prisma.account_type.findFirst({
        where: { code: dto.code, is_deleted: false, NOT: { id } },
      });
      if (conflict) throw new ValidationError(`Account type code '${dto.code}' already exists`);
    }

    // Check for name conflicts if name is being updated
    if (dto.name && dto.name !== existing.name) {
      const conflict = await prisma.account_type.findFirst({
        where: { name: dto.name, is_deleted: false, NOT: { id } },
      });
      if (conflict) throw new ValidationError(`Account type name '${dto.name}' already exists`);
    }

    return prisma.account_type.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        updated_by: actorId,
      },
    });
  }

  /**
   * Archive an account type (soft delete).
   * Sets is_deleted = true and records archived_by and archived_at.
   */
  async archive(id: number, actorId?: string) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');
    if (existing.is_deleted) throw new ValidationError('Account type is already archived');

    // Check if any active chart of accounts reference this type
    const activeAccounts = await prisma.chart_of_account.count({
      where: { account_type_id: id, is_deleted: false },
    });
    if (activeAccounts > 0) {
      throw new ValidationError(`Cannot archive account type with ${activeAccounts} active chart of accounts. Archive or delete them first.`);
    }

    return prisma.account_type.update({
      where: { id },
      data: {
        is_deleted: true,
        archived_by: actorId,
        archived_at: new Date(),
      },
    });
  }

  /**
   * Restore an archived account type.
   * Sets is_deleted = false and updates archived_by/archived_at to track restore action.
   */
  async restore(id: number, actorId?: string) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');
    if (!existing.is_deleted) throw new ValidationError('Account type is not archived');

    return prisma.account_type.update({
      where: { id },
      data: {
        is_deleted: false,
        archived_by: actorId,
        archived_at: new Date(),
      },
    });
  }

  /**
   * Hard delete an account type.
   * Only allowed for archived records.
   */
  async delete(id: number, actorId?: string) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');
    if (!existing.is_deleted) throw new ValidationError('Account type must be archived before deletion');

    // Record deletion audit before hard delete
    await prisma.account_type.update({
      where: { id },
      data: {
        deleted_by: actorId,
        deleted_at: new Date(),
      },
    });

    return prisma.account_type.delete({ where: { id } });
  }
}
