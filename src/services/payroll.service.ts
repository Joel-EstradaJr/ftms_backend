import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { ApprovalStatus } from '@prisma/client';

export interface CreatePayrollDTO {
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  netPay: number;
  disbursementDate?: string;
}

export interface UpdatePayrollDTO {
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
  netPay?: number;
  disbursementDate?: string;
  status?: ApprovalStatus;
}

export interface PayrollFilters {
  employeeId?: number;
  status?: ApprovalStatus;
  periodStart?: string;
  periodEnd?: string;
  isDisbursed?: boolean;
  isFinalized?: boolean;
  isDeleted?: boolean;
}

export class PayrollService {
  /**
   * Create new payroll record
   */
  async createPayroll(data: CreatePayrollDTO, userId: string, userInfo?: any, req?: any) {
    try {
      const payroll = await prisma.payroll.create({
        data: {
          employeeId: data.employeeId,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          baseSalary: data.baseSalary.toString(),
          allowances: data.allowances?.toString(),
          deductions: data.deductions?.toString(),
          netPay: data.netPay.toString(),
          disbursementDate: data.disbursementDate ? new Date(data.disbursementDate) : null,
          status: ApprovalStatus.PENDING,
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Payroll Management',
        { id: payroll.id, code: `PAYROLL-${payroll.employeeId}` },
        payroll,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        req
      );

      logger.info(`Payroll created for employee ${payroll.employeeId} by user ${userId}`);
      return payroll;
    } catch (error) {
      logger.error('Error creating payroll:', error);
      throw error;
    }
  }

  /**
   * List payroll records with filters
   */
  async listPayrolls(filters: PayrollFilters, page: number = 1, limit: number = 10) {
    try {
      const where: any = {
        isDeleted: filters.isDeleted ?? false,
      };

      if (filters.employeeId) {
        where.employeeId = filters.employeeId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.isDisbursed !== undefined) {
        where.isDisbursed = filters.isDisbursed;
      }

      if (filters.isFinalized !== undefined) {
        where.isFinalized = filters.isFinalized;
      }

      if (filters.periodStart || filters.periodEnd) {
        where.periodStart = {};
        if (filters.periodStart) {
          where.periodStart.gte = new Date(filters.periodStart);
        }
        if (filters.periodEnd) {
          where.periodStart.lte = new Date(filters.periodEnd);
        }
      }

      const skip = (page - 1) * limit;

      const [payrolls, total] = await Promise.all([
        prisma.payroll.findMany({
          where,
          skip,
          take: limit,
          orderBy: { periodStart: 'desc' },
        }),
        prisma.payroll.count({ where }),
      ]);

      return {
        data: payrolls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing payrolls:', error);
      throw error;
    }
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(id: number) {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll with ID ${id} not found`);
      }

      if (payroll.isDeleted) {
        throw new NotFoundError(`Payroll with ID ${id} has been deleted`);
      }

      return payroll;
    } catch (error) {
      logger.error(`Error fetching payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update payroll record
   */
  async updatePayroll(
    id: number,
    updates: UpdatePayrollDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    try {
      const oldPayroll = await this.getPayrollById(id);

      // Cannot update if finalized
      if (oldPayroll.isFinalized) {
        throw new ValidationError('Cannot update finalized payroll');
      }

      const updateData: any = {
        ...updates,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      if (updates.baseSalary !== undefined) {
        updateData.baseSalary = updates.baseSalary.toString();
      }
      if (updates.allowances !== undefined) {
        updateData.allowances = updates.allowances.toString();
      }
      if (updates.deductions !== undefined) {
        updateData.deductions = updates.deductions.toString();
      }
      if (updates.netPay !== undefined) {
        updateData.netPay = updates.netPay.toString();
      }
      if (updates.disbursementDate) {
        updateData.disbursementDate = new Date(updates.disbursementDate);
      }

      const newPayroll = await prisma.payroll.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Payroll Management',
        { id, code: `PAYROLL-${newPayroll.employeeId}` },
        oldPayroll,
        newPayroll,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        req
      );

      logger.info(`Payroll ${id} updated by user ${userId}`);
      return newPayroll;
    } catch (error) {
      logger.error(`Error updating payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete payroll (soft delete)
   */
  async deletePayroll(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const payroll = await this.getPayrollById(id);

      // Cannot delete if finalized or disbursed
      if (payroll.isFinalized) {
        throw new ValidationError('Cannot delete finalized payroll');
      }
      if (payroll.isDisbursed) {
        throw new ValidationError('Cannot delete disbursed payroll');
      }

      await prisma.payroll.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Payroll Management',
        { id, code: `PAYROLL-${payroll.employeeId}` },
        payroll,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        req
      );

      logger.info(`Payroll ${id} deleted by user ${userId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error deleting payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Approve payroll
   */
  async approvePayroll(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const payroll = await this.getPayrollById(id);

      if (payroll.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Payroll is already ${payroll.status}`);
      }

      const updatedPayroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      await AuditLogClient.logApproval(
        'Payroll Management',
        { id, code: `PAYROLL-${payroll.employeeId}` },
        'APPROVE',
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        undefined,
        req
      );

      logger.info(`Payroll ${id} approved by user ${userId}`);
      return updatedPayroll;
    } catch (error) {
      logger.error(`Error approving payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reject payroll
   */
  async rejectPayroll(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const payroll = await this.getPayrollById(id);

      if (payroll.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Payroll is already ${payroll.status}`);
      }

      const updatedPayroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
        },
      });

      await AuditLogClient.logApproval(
        'Payroll Management',
        { id, code: `PAYROLL-${payroll.employeeId}` },
        'REJECT',
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        req
      );

      logger.info(`Payroll ${id} rejected by user ${userId}`);
      return updatedPayroll;
    } catch (error) {
      logger.error(`Error rejecting payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Disburse payroll to employee
   */
  async disbursePayroll(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const payroll = await this.getPayrollById(id);

      if (payroll.status !== ApprovalStatus.APPROVED) {
        throw new ValidationError('Payroll must be approved before disbursement');
      }

      if (payroll.isDisbursed) {
        throw new ValidationError('Payroll already disbursed');
      }

      const updatedPayroll = await prisma.payroll.update({
        where: { id },
        data: {
          isDisbursed: true,
          disbursedBy: userId,
          disbursementDate: new Date(),
        },
      });

      await AuditLogClient.log({
        moduleName: 'Payroll Management',
        action: 'DISBURSE',
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        recordId: id.toString(),
        recordCode: `PAYROLL-${payroll.employeeId}`,
        newValues: updatedPayroll,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payroll ${id} disbursed by user ${userId}`);
      return updatedPayroll;
    } catch (error) {
      logger.error(`Error disbursing payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Finalize payroll (lock for editing)
   */
  async finalizePayroll(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const payroll = await this.getPayrollById(id);

      if (payroll.isFinalized) {
        throw new ValidationError('Payroll already finalized');
      }

      if (!payroll.isDisbursed) {
        throw new ValidationError('Payroll must be disbursed before finalization');
      }

      const updatedPayroll = await prisma.payroll.update({
        where: { id },
        data: {
          isFinalized: true,
          finalizedBy: userId,
          finalizedAt: new Date(),
        },
      });

      await AuditLogClient.log({
        moduleName: 'Payroll Management',
        action: 'FINALIZE',
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        recordId: id.toString(),
        recordCode: `PAYROLL-${payroll.employeeId}`,
        newValues: updatedPayroll,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payroll ${id} finalized by user ${userId}`);
      return updatedPayroll;
    } catch (error) {
      logger.error(`Error finalizing payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get payroll statistics
   */
  async getPayrollStats(filters: PayrollFilters) {
    try {
      const where: any = {
        isDeleted: false,
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.periodStart || filters.periodEnd) {
        where.periodStart = {};
        if (filters.periodStart) {
          where.periodStart.gte = new Date(filters.periodStart);
        }
        if (filters.periodEnd) {
          where.periodStart.lte = new Date(filters.periodEnd);
        }
      }

      const [total, byStatus] = await Promise.all([
        prisma.payroll.aggregate({
          where,
          _sum: {
            netPay: true,
          },
          _count: true,
        }),
        prisma.payroll.groupBy({
          by: ['status'],
          where,
          _sum: {
            netPay: true,
          },
          _count: true,
        }),
      ]);

      return {
        total: {
          netPay: total._sum.netPay || 0,
          count: total._count,
        },
        byStatus,
      };
    } catch (error) {
      logger.error('Error getting payroll stats:', error);
      throw error;
    }
  }
}
