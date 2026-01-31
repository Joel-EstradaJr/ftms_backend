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
  async getAllAccountTypes() {
    return prisma.account_type.findMany({
      where: { is_deleted: false },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  /**
   * Get a single account type by ID.
   */
  async getById(id: number) {
    const record = await prisma.account_type.findFirst({
      where: { id, is_deleted: false },
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
}
