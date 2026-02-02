import { prisma } from '../config/database';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
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
      const createData: any = {
        ...data,
        amount: data.amount.toString(),
        date_recorded: new Date(data.dateRecorded || new Date()),
        created_by: userId,
      };

      // Remove any invalid fields
      delete createData.dateRecorded;

      const expense = await prisma.expense.create({
        data: createData,
        include: {
          expense_type: true,
        },
      });

      // Audit log - include full record for proper summary (same pattern as Revenue)
      await AuditLogClient.logCreate(
        AuditEntityTypes.EXPENSE,
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
        is_deleted: filters.isDeleted ?? false,
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
          orderBy: { date_recorded: 'desc' },
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
        include: {
          expense_type: true,
        },
      });

      if (!expense) {
        throw new NotFoundError(`Expense with ID ${id} not found`);
      }

      if (expense.is_deleted) {
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
        updateData.date_recorded = new Date(updates.dateRecorded);
      }

      const newExpense = await prisma.expense.update({
        where: { id },
        data: updateData,
        include: {
          expense_type: true,
        },
      });

      // Audit log - include both old and new record for proper change tracking
      await AuditLogClient.logUpdate(
        AuditEntityTypes.EXPENSE,
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
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          expense_type: true,
        },
      });

      if (!expense) {
        throw new NotFoundError(`Expense with ID ${id} not found`);
      }

      if (expense.is_deleted) {
        throw new NotFoundError(`Expense with ID ${id} has already been deleted`);
      }

      await prisma.expense.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      // Audit log - use logArchive for soft delete (same pattern as Revenue)
      await AuditLogClient.logArchive(
        AuditEntityTypes.EXPENSE,
        { id, code: expense.code },
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        {
          deletion_reason: reason,
          expense_type: expense.expense_type?.name || 'Unknown',
          amount: expense.amount?.toString(),
        },
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
      // Get full expense record with relations for proper audit summary
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          expense_type: true,
        },
      });

      if (!expense) {
        throw new NotFoundError(`Expense with ID ${id} not found`);
      }

      if (expense.is_deleted) {
        throw new NotFoundError(`Expense with ID ${id} has been deleted`);
      }

      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          approval_status: 'APPROVED',
          approved_by: userId,
          approved_at: new Date(),
          updated_by: userId,
          updated_at: new Date(),
        },
        include: {
          expense_type: true,
        },
      });

      // Audit log - use logApprove with full record (same pattern as Revenue)
      await AuditLogClient.logApprove(
        AuditEntityTypes.EXPENSE,
        { id, code: expense.code },
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        { ...expense, approval_status: expense.approval_status },  // Previous data
        { ...updatedExpense, approval_status: 'APPROVED' },  // New data
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
      // Get full expense record with relations for proper audit summary
      const expense = await prisma.expense.findUnique({
        where: { id },
        include: {
          expense_type: true,
        },
      });

      if (!expense) {
        throw new NotFoundError(`Expense with ID ${id} not found`);
      }

      if (expense.is_deleted) {
        throw new NotFoundError(`Expense with ID ${id} has been deleted`);
      }

      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          approval_status: 'REJECTED',
          rejection_remarks: reason,
          rejected_by: userId,
          rejected_at: new Date(),
          updated_by: userId,
          updated_at: new Date(),
        },
        include: {
          expense_type: true,
        },
      });

      // Audit log - use logReject with full record and reason (same pattern as Revenue)
      await AuditLogClient.logReject(
        AuditEntityTypes.EXPENSE,
        { id, code: expense.code },
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        { ...expense, approval_status: expense.approval_status },  // Previous data
        { ...updatedExpense, approval_status: 'REJECTED', rejection_remarks: reason },  // New data
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
        is_deleted: false,
      };

      if (filters.category) {
        where.expense_type_id = filters.category;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.date_recorded = {};
        if (filters.dateFrom) {
          where.date_recorded.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.date_recorded.lte = new Date(filters.dateTo);
        }
      }

      const [total, byExpenseType] = await Promise.all([
        prisma.expense.aggregate({
          where,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
        prisma.expense.groupBy({
          by: ['expense_type_id'],
          where,
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
        byExpenseType,
      };
    } catch (error) {
      logger.error('Error getting expense stats:', error);
      throw error;
    }
  }
}
