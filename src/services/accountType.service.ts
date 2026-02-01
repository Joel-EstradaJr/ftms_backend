// Business logic for Account Type management.
// Services encapsulate domain rules separate from HTTP layer (controllers).
import { prisma } from '../config/database';
import { AccountTypeCreateDTO } from '../types/accountType.types';
import { ValidationError } from '../utils/errors';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
import { logger } from '../config/logger';
import { Request } from 'express';

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
  async create(dto: AccountTypeCreateDTO, actorId?: string, req?: Request) {
    if (!dto.code || !dto.name) throw new ValidationError('code and name are required');
    // Existing active?
    const active = await prisma.account_type.findFirst({ where: { code: dto.code, is_deleted: false } });
    if (active) throw new ValidationError(`Account type code '${dto.code}' already exists (active).`);

    // Check soft-deleted for revival by code OR name
    const softDeleted = await prisma.account_type.findFirst({ where: { code: dto.code, is_deleted: true } });
    if (softDeleted) {
      const revived = await prisma.account_type.update({
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

      // Audit log for revival (treated as UNARCHIVE)
      await AuditLogClient.logUnarchive(
        AuditEntityTypes.ACCOUNT_TYPE,
        { id: revived.id, code: revived.code },
        { id: actorId || 'system' },
        { name: revived.name, description: revived.description },
        req
      );

      return revived;
    }

    const created = await prisma.account_type.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        created_by: actorId,
      },
    });

    // Audit log for creation
    await AuditLogClient.logCreate(
      AuditEntityTypes.ACCOUNT_TYPE,
      { id: created.id, code: created.code },
      created,
      { id: actorId || 'system' },
      req
    );

    return created;
  }

  /**
   * Update an account type by ID.
   */
  async update(id: number, dto: Partial<AccountTypeCreateDTO>, actorId?: string, req?: Request) {
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

    const updated = await prisma.account_type.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        updated_by: actorId,
      },
    });

    // Audit log for update
    await AuditLogClient.logUpdate(
      AuditEntityTypes.ACCOUNT_TYPE,
      { id: updated.id, code: updated.code },
      existing,
      updated,
      { id: actorId || 'system' },
      req
    );

    return updated;
  }

  /**
   * Archive an account type (soft delete).
   * Sets is_deleted = true and records archived_by and archived_at.
   */
  async archive(id: number, actorId?: string, req?: Request) {
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

    const archived = await prisma.account_type.update({
      where: { id },
      data: {
        is_deleted: true,
        archived_by: actorId,
        archived_at: new Date(),
      },
    });

    // Audit log for archive
    await AuditLogClient.logArchive(
      AuditEntityTypes.ACCOUNT_TYPE,
      { id: archived.id, code: archived.code },
      { id: actorId || 'system' },
      { name: archived.name },
      req
    );

    return archived;
  }

  /**
   * Restore an archived account type.
   * Sets is_deleted = false and updates archived_by/archived_at to track restore action.
   */
  async restore(id: number, actorId?: string, req?: Request) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');
    if (!existing.is_deleted) throw new ValidationError('Account type is not archived');

    const restored = await prisma.account_type.update({
      where: { id },
      data: {
        is_deleted: false,
        archived_by: actorId,
        archived_at: new Date(),
      },
    });

    // Audit log for unarchive
    await AuditLogClient.logUnarchive(
      AuditEntityTypes.ACCOUNT_TYPE,
      { id: restored.id, code: restored.code },
      { id: actorId || 'system' },
      { name: restored.name },
      req
    );

    return restored;
  }

  /**
   * Hard delete an account type.
   * Only allowed for archived records.
   */
  async delete(id: number, actorId?: string, req?: Request) {
    const existing = await prisma.account_type.findUnique({ where: { id } });
    if (!existing) throw new ValidationError('Account type not found');
    if (!existing.is_deleted) throw new ValidationError('Account type must be archived before deletion');

    // Audit log for delete (before hard delete)
    await AuditLogClient.logDelete(
      AuditEntityTypes.ACCOUNT_TYPE,
      { id: existing.id, code: existing.code },
      existing,
      { id: actorId || 'system' },
      'Hard delete of archived account type',
      req
    );

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
