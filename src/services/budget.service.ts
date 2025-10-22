import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { ApprovalStatus } from '@prisma/client';

export interface CreateBudgetDTO {
  department: string;
  fiscalYear: number;
  fiscalPeriod: string;
  allocatedAmount: number;
  periodStart: string;
  periodEnd: string;
}

export interface UpdateBudgetDTO {
  allocatedAmount?: number;
  usedAmount?: number;
  reservedAmount?: number;
  remainingAmount?: number;
}

export interface BudgetFilters {
  department?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  status?: ApprovalStatus;
  isDeleted?: boolean;
}

export class BudgetService {
  async createBudget(data: CreateBudgetDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const remainingAmount = data.allocatedAmount;
      
      const budget = await prisma.budget.create({
        data: {
          department: data.department,
          fiscalYear: data.fiscalYear,
          fiscalPeriod: data.fiscalPeriod,
          allocatedAmount: data.allocatedAmount.toString(),
          usedAmount: '0',
          reservedAmount: '0',
          remainingAmount: remainingAmount.toString(),
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          status: ApprovalStatus.PENDING,
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Budget Management',
        { id: budget.id, code: `BUDGET-${budget.department}-${budget.fiscalPeriod}` },
        budget,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        req
      );

      logger.info(`Budget created: ${budget.id} by user ${userId}`);
      return budget;
    } catch (error) {
      logger.error('Error creating budget:', error);
      throw error;
    }
  }

  async listBudgets(filters: BudgetFilters, page: number = 1, limit: number = 10) {
    try {
      const where: any = { isDeleted: filters.isDeleted ?? false };

      if (filters.department) where.department = filters.department;
      if (filters.fiscalYear) where.fiscalYear = filters.fiscalYear;
      if (filters.fiscalPeriod) where.fiscalPeriod = filters.fiscalPeriod;
      if (filters.status) where.status = filters.status;

      const skip = (page - 1) * limit;

      const [budgets, total] = await Promise.all([
        prisma.budget.findMany({
          where,
          skip,
          take: limit,
          orderBy: { periodStart: 'desc' },
        }),
        prisma.budget.count({ where }),
      ]);

      return {
        data: budgets,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error listing budgets:', error);
      throw error;
    }
  }

  async getBudgetById(id: number) {
    try {
      const budget = await prisma.budget.findUnique({ where: { id } });

      if (!budget) {
        throw new NotFoundError(`Budget with ID ${id} not found`);
      }

      if (budget.isDeleted) {
        throw new NotFoundError(`Budget with ID ${id} has been deleted`);
      }

      return budget;
    } catch (error) {
      logger.error(`Error fetching budget ${id}:`, error);
      throw error;
    }
  }

  async updateBudget(id: number, updates: UpdateBudgetDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const oldBudget = await this.getBudgetById(id);

      const updateData: any = { ...updates, updatedBy: userId, updatedAt: new Date() };

      if (updates.allocatedAmount !== undefined) updateData.allocatedAmount = updates.allocatedAmount.toString();
      if (updates.usedAmount !== undefined) updateData.usedAmount = updates.usedAmount.toString();
      if (updates.reservedAmount !== undefined) updateData.reservedAmount = updates.reservedAmount.toString();
      if (updates.remainingAmount !== undefined) updateData.remainingAmount = updates.remainingAmount.toString();

      const newBudget = await prisma.budget.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Budget Management',
        { id, code: `BUDGET-${oldBudget.department}-${oldBudget.fiscalPeriod}` },
        oldBudget,
        newBudget,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        req
      );

      logger.info(`Budget ${id} updated by user ${userId}`);
      return newBudget;
    } catch (error) {
      logger.error(`Error updating budget ${id}:`, error);
      throw error;
    }
  }

  async deleteBudget(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const budget = await this.getBudgetById(id);

      await prisma.budget.update({
        where: { id },
        data: { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      });

      await AuditLogClient.logDelete(
        'Budget Management',
        { id, code: `BUDGET-${budget.department}-${budget.fiscalPeriod}` },
        budget,
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        reason,
        req
      );

      logger.info(`Budget ${id} deleted by user ${userId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error deleting budget ${id}:`, error);
      throw error;
    }
  }

  async approveBudget(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const budget = await this.getBudgetById(id);

      if (budget.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Budget is already ${budget.status}`);
      }

      const updatedBudget = await prisma.budget.update({
        where: { id },
        data: { status: ApprovalStatus.APPROVED, approvedBy: userId, approvedAt: new Date() },
      });

      await AuditLogClient.logApproval(
        'Budget Management',
        { id, code: `BUDGET-${budget.department}-${budget.fiscalPeriod}` },
        'APPROVE',
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        undefined,
        req
      );

      logger.info(`Budget ${id} approved by user ${userId}`);
      return updatedBudget;
    } catch (error) {
      logger.error(`Error approving budget ${id}:`, error);
      throw error;
    }
  }

  async rejectBudget(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const budget = await this.getBudgetById(id);

      if (budget.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Budget is already ${budget.status}`);
      }

      const updatedBudget = await prisma.budget.update({
        where: { id },
        data: { status: ApprovalStatus.REJECTED, rejectedBy: userId, rejectedAt: new Date() },
      });

      await AuditLogClient.logApproval(
        'Budget Management',
        { id, code: `BUDGET-${budget.department}-${budget.fiscalPeriod}` },
        'REJECT',
        { id: userId, name: userInfo?.username || userId, role: userInfo?.role || 'admin' },
        reason,
        req
      );

      logger.info(`Budget ${id} rejected by user ${userId}`);
      return updatedBudget;
    } catch (error) {
      logger.error(`Error rejecting budget ${id}:`, error);
      throw error;
    }
  }
}
