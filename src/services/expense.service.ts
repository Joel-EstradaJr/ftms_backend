import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export interface CreateExpenseDTO {
  code: string;
  category: string;
  subcategory?: string;
  amount: number;
  dateRecorded: string;
  remarks?: string;
  linkedPurchaseId?: number;
  department?: string;
  receiptUrl?: string;
}

export interface UpdateExpenseDTO {
  category?: string;
  subcategory?: string;
  amount?: number;
  dateRecorded?: string;
  remarks?: string;
  linkedPurchaseId?: number;
  department?: string;
  receiptUrl?: string;
}

export interface ExpenseFilters {
  category?: string;
  subcategory?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  isDeleted?: boolean;
}

export class ExpenseService {
  /**
   * Create a new expense record
   */
  async createExpense(data: CreateExpenseDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const expense = await prisma.expense.create({
        data: {
          ...data,
          amount: data.amount.toString(),
          dateRecorded: new Date(data.dateRecorded),
          createdBy: userId,
          createdAt: new Date(),
        },
      });

      // Audit log
      await AuditLogClient.logCreate(
        'Expense Management',
        { id: expense.id, code: expense.code },
        expense,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'staff',
        },
        req
      );

      logger.info(`Expense created: ${expense.code} by user ${userId}`);
      return expense;
    } catch (error) {
      logger.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * List expenses with filters and pagination
   */
  async listExpenses(filters: ExpenseFilters, page: number = 1, limit: number = 10) {
    try {
      const where: any = {
        isDeleted: filters.isDeleted ?? false,
      };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.subcategory) {
        where.subcategory = filters.subcategory;
      }

      if (filters.department) {
        where.department = filters.department;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.dateRecorded = {};
        if (filters.dateFrom) {
          where.dateRecorded.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.dateRecorded.lte = new Date(filters.dateTo);
        }
      }

      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dateRecorded: 'desc' },
        }),
        prisma.expense.count({ where }),
      ]);

      return {
        data: expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing expenses:', error);
      throw error;
    }
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: number) {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new NotFoundError(`Expense with ID ${id} not found`);
      }

      if (expense.isDeleted) {
        throw new NotFoundError(`Expense with ID ${id} has been deleted`);
      }

      return expense;
    } catch (error) {
      logger.error(`Error fetching expense ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update expense record
   */
  async updateExpense(
    id: number,
    updates: UpdateExpenseDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    try {
      const oldExpense = await this.getExpenseById(id);

      const updateData: any = {
        ...updates,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      if (updates.amount !== undefined) {
        updateData.amount = updates.amount.toString();
      }

      if (updates.dateRecorded) {
        updateData.dateRecorded = new Date(updates.dateRecorded);
      }

      const newExpense = await prisma.expense.update({
        where: { id },
        data: updateData,
      });

      // Audit log
      await AuditLogClient.logUpdate(
        'Expense Management',
        { id, code: newExpense.code },
        oldExpense,
        newExpense,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        req
      );

      logger.info(`Expense updated: ${newExpense.code} by user ${userId}`);
      return newExpense;
    } catch (error) {
      logger.error(`Error updating expense ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete expense
   */
  async deleteExpense(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const expense = await this.getExpenseById(id);

      await prisma.expense.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      // Audit log
      await AuditLogClient.logDelete(
        'Expense Management',
        { id, code: expense.code },
        expense,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        req
      );

      logger.info(`Expense deleted: ${expense.code} by user ${userId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error deleting expense ${id}:`, error);
      throw error;
    }
  }

  /**
   * Approve expense (for large expenses requiring approval)
   */
  async approveExpense(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const expense = await this.getExpenseById(id);

      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // Audit log
      await AuditLogClient.logApproval(
        'Expense Management',
        { id, code: expense.code },
        'APPROVE',
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        undefined,
        req
      );

      logger.info(`Expense approved: ${expense.code} by user ${userId}`);
      return updatedExpense;
    } catch (error) {
      logger.error(`Error approving expense ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reject expense
   */
  async rejectExpense(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const expense = await this.getExpenseById(id);

      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          rejectedBy: userId,
          rejectedAt: new Date(),
          remarks: reason,
        },
      });

      // Audit log
      await AuditLogClient.logApproval(
        'Expense Management',
        { id, code: expense.code },
        'REJECT',
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        req
      );

      logger.info(`Expense rejected: ${expense.code} by user ${userId}`);
      return updatedExpense;
    } catch (error) {
      logger.error(`Error rejecting expense ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(filters: ExpenseFilters) {
    try {
      const where: any = {
        isDeleted: false,
      };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.dateRecorded = {};
        if (filters.dateFrom) {
          where.dateRecorded.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.dateRecorded.lte = new Date(filters.dateTo);
        }
      }

      const [total, byCategory, byDepartment] = await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
        prisma.expense.groupBy({
          by: ['category'],
          where,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
        prisma.expense.groupBy({
          by: ['department'],
          where: { ...where, department: { not: null } },
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ]);

      return {
        total: {
          amount: total._sum.amount || 0,
          count: total._count,
        },
        byCategory,
        byDepartment,
      };
    } catch (error) {
      logger.error('Error getting expense stats:', error);
      throw error;
    }
  }
}
