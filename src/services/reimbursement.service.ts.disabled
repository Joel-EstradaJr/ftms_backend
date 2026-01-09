import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { ApprovalStatus } from '@prisma/client';

export interface CreateReimbursementDTO {
  employeeId: number;
  amount: number;
  purpose: string;
  receiptUrl?: string;
}

export interface UpdateReimbursementDTO {
  amount?: number;
  purpose?: string;
  receiptUrl?: string;
}

export interface ReimbursementFilters {
  employeeId?: number;
  status?: ApprovalStatus;
  isDeleted?: boolean;
}

export class ReimbursementService {
  async createReimbursement(data: CreateReimbursementDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const reimbursement = await prisma.reimbursement.create({
        data: {
          employeeId: data.employeeId,
          amount: data.amount.toString(),
          purpose: data.purpose,
          receiptUrl: data.receiptUrl,
          status: ApprovalStatus.PENDING,
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Reimbursement Management',
        { id: reimbursement.id, code: `REIMB-${reimbursement.id}` },
        reimbursement,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'staff' },
        req
      );

      logger.info(`Reimbursement created: ${reimbursement.id} by user ${userId}`);
      return reimbursement;
    } catch (error) {
      logger.error('Error creating reimbursement:', error);
      throw error;
    }
  }

  async listReimbursements(filters: ReimbursementFilters, page: number = 1, limit: number = 10) {
    try {
      const where: any = { isDeleted: filters.isDeleted ?? false };

      if (filters.employeeId) where.employeeId = filters.employeeId;
      if (filters.status) where.status = filters.status;

      const skip = (page - 1) * limit;

      const [reimbursements, total] = await Promise.all([
        prisma.reimbursement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.reimbursement.count({ where }),
      ]);

      return {
        data: reimbursements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error listing reimbursements:', error);
      throw error;
    }
  }

  async getReimbursementById(id: number) {
    try {
      const reimbursement = await prisma.reimbursement.findUnique({ where: { id } });

      if (!reimbursement) {
        throw new NotFoundError(`Reimbursement with ID ${id} not found`);
      }

      if (reimbursement.isDeleted) {
        throw new NotFoundError(`Reimbursement with ID ${id} has been deleted`);
      }

      return reimbursement;
    } catch (error) {
      logger.error(`Error fetching reimbursement ${id}:`, error);
      throw error;
    }
  }

  async updateReimbursement(id: number, updates: UpdateReimbursementDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const oldReimbursement = await this.getReimbursementById(id);

      if (oldReimbursement.status !== ApprovalStatus.PENDING) {
        throw new ValidationError('Can only update pending reimbursements');
      }

      const updateData: any = { ...updates, updatedBy: userId, updatedAt: new Date() };

      if (updates.amount !== undefined) updateData.amount = updates.amount.toString();

      const newReimbursement = await prisma.reimbursement.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Reimbursement Management',
        { id, code: `REIMB-${id}` },
        oldReimbursement,
        newReimbursement,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'staff' },
        req
      );

      logger.info(`Reimbursement ${id} updated by user ${userId}`);
      return newReimbursement;
    } catch (error) {
      logger.error(`Error updating reimbursement ${id}:`, error);
      throw error;
    }
  }

  async deleteReimbursement(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const reimbursement = await this.getReimbursementById(id);

      if (reimbursement.status !== ApprovalStatus.PENDING) {
        throw new ValidationError('Can only delete pending reimbursements');
      }

      await prisma.reimbursement.update({
        where: { id },
        data: { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      });

      await AuditLogClient.logDelete(
        'Reimbursement Management',
        { id, code: `REIMB-${id}` },
        reimbursement,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'staff' },
        reason,
        req
      );

      logger.info(`Reimbursement ${id} deleted by user ${userId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error deleting reimbursement ${id}:`, error);
      throw error;
    }
  }

  async approveReimbursement(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const reimbursement = await this.getReimbursementById(id);

      if (reimbursement.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Reimbursement is already ${reimbursement.status}`);
      }

      const updatedReimbursement = await prisma.reimbursement.update({
        where: { id },
        data: { status: ApprovalStatus.APPROVED, approvedBy: userId, approvedAt: new Date() },
      });

      await AuditLogClient.logApproval(
        'Reimbursement Management',
        { id, code: `REIMB-${id}` },
        'APPROVE',
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        undefined,
        req
      );

      logger.info(`Reimbursement ${id} approved by user ${userId}`);
      return updatedReimbursement;
    } catch (error) {
      logger.error(`Error approving reimbursement ${id}:`, error);
      throw error;
    }
  }

  async rejectReimbursement(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const reimbursement = await this.getReimbursementById(id);

      if (reimbursement.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Reimbursement is already ${reimbursement.status}`);
      }

      const updatedReimbursement = await prisma.reimbursement.update({
        where: { id },
        data: { status: ApprovalStatus.REJECTED, rejectedBy: userId, rejectedAt: new Date() },
      });

      await AuditLogClient.logApproval(
        'Reimbursement Management',
        { id, code: `REIMB-${id}` },
        'REJECT',
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        reason,
        req
      );

      logger.info(`Reimbursement ${id} rejected by user ${userId}`);
      return updatedReimbursement;
    } catch (error) {
      logger.error(`Error rejecting reimbursement ${id}:`, error);
      throw error;
    }
  }

  async getReimbursementStats(filters: ReimbursementFilters) {
    try {
      const where: any = { isDeleted: false };
      if (filters.status) where.status = filters.status;
      if (filters.employeeId) where.employeeId = filters.employeeId;

      const [total, byStatus] = await Promise.all([
        prisma.reimbursement.aggregate({ where, _sum: { amount: true }, _count: true }),
        prisma.reimbursement.groupBy({ by: ['status'], where, _sum: { amount: true }, _count: true }),
      ]);

      return {
        total: { amount: total._sum.amount || 0, count: total._count },
        byStatus,
      };
    } catch (error) {
      logger.error('Error getting reimbursement stats:', error);
      throw error;
    }
  }
}
