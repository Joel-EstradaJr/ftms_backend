import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { LoanType, ApprovalStatus } from '@prisma/client';

export class LoanService {
  /**
   * Create a new loan request
   */
  async createLoan(data: any, userId: string, userInfo?: any, req?: any) {
    try {
      // Calculate total payable if interest rate is provided
      let totalPayable = parseFloat(data.principalAmount.toString());
      if (data.interestRate && data.interestRate > 0) {
        const interest = (parseFloat(data.principalAmount.toString()) * parseFloat(data.interestRate.toString())) / 100;
        totalPayable = parseFloat(data.principalAmount.toString()) + interest;
      }

      const loan = await prisma.loan.create({
        data: {
          loanType: data.loanType as LoanType,
          entityId: data.entityId,
          entityName: data.entityName,
          principalAmount: data.principalAmount.toString(),
          interestRate: data.interestRate?.toString(),
          totalPayable: totalPayable.toString(),
          remainingBalance: totalPayable.toString(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          installmentFrequency: data.installmentFrequency,
          installmentAmount: data.installmentAmount?.toString(),
          status: ApprovalStatus.PENDING,
          remarks: data.remarks,
          // Trip deficit fields
          tripDeficitRefNo: data.tripDeficitRefNo,
          driverShare: data.driverShare?.toString(),
          conductorShare: data.conductorShare?.toString(),
          driverId: data.driverId,
          conductorId: data.conductorId,
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Loan Management',
        { id: loan.id, code: `LOAN-${loan.id}` },
        loan,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Loan created: LOAN-${loan.id} for ${loan.loanType}`);
      return loan;
    } catch (error) {
      logger.error('Error creating loan:', error);
      throw error;
    }
  }

  /**
   * List loans with filtering and pagination
   */
  async listLoans(filters: any, page = 1, limit = 10) {
    try {
      const where: any = { isDeleted: false };

      if (filters.loanType) where.loanType = filters.loanType;
      if (filters.status) where.status = filters.status;
      if (filters.entityId) where.entityId = parseInt(filters.entityId);
      if (filters.tripDeficitRefNo) where.tripDeficitRefNo = filters.tripDeficitRefNo;

      const skip = (page - 1) * limit;
      const [loans, total] = await Promise.all([
        prisma.loan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            repayments: {
              where: { isDeleted: false },
              orderBy: { installmentNumber: 'asc' },
            },
          },
        }),
        prisma.loan.count({ where }),
      ]);

      return {
        data: loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing loans:', error);
      throw error;
    }
  }

  /**
   * Get a loan by ID with repayments
   */
  async getLoanById(id: number) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        repayments: {
          where: { isDeleted: false },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!loan || loan.isDeleted) {
      throw new NotFoundError(`Loan ${id} not found`);
    }

    return loan;
  }

  /**
   * Update a loan (only if PENDING)
   */
  async updateLoan(id: number, updates: any, userId: string, userInfo?: any, req?: any) {
    try {
      const oldLoan = await this.getLoanById(id);

      if (oldLoan.status !== ApprovalStatus.PENDING) {
        throw new ValidationError('Only pending loans can be updated');
      }

      const updateData: any = { ...updates, updatedBy: userId };

      // Convert decimal fields
      if (updates.principalAmount) updateData.principalAmount = updates.principalAmount.toString();
      if (updates.interestRate) updateData.interestRate = updates.interestRate.toString();
      if (updates.totalPayable) updateData.totalPayable = updates.totalPayable.toString();
      if (updates.remainingBalance) updateData.remainingBalance = updates.remainingBalance.toString();
      if (updates.installmentAmount) updateData.installmentAmount = updates.installmentAmount.toString();
      if (updates.driverShare) updateData.driverShare = updates.driverShare.toString();
      if (updates.conductorShare) updateData.conductorShare = updates.conductorShare.toString();
      if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);

      const newLoan = await prisma.loan.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Loan Management',
        { id, code: `LOAN-${id}` },
        oldLoan,
        newLoan,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Loan updated: LOAN-${id}`);
      return newLoan;
    } catch (error) {
      logger.error('Error updating loan:', error);
      throw error;
    }
  }

  /**
   * Delete a loan (only if PENDING)
   */
  async deleteLoan(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const loan = await this.getLoanById(id);

      if (loan.status !== ApprovalStatus.PENDING) {
        throw new ValidationError('Only pending loans can be deleted');
      }

      await prisma.loan.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Loan Management',
        { id, code: `LOAN-${id}` },
        loan,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Loan deleted: LOAN-${id}`);
    } catch (error) {
      logger.error('Error deleting loan:', error);
      throw error;
    }
  }

  /**
   * Approve a loan
   */
  async approveLoan(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      const loan = await this.getLoanById(id);

      if (loan.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Loan is already ${loan.status}`);
      }

      const updated = await prisma.loan.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      await AuditLogClient.logApproval(
        'Loan Management',
        { id, code: `LOAN-${id}` },
        'APPROVE',
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        undefined,
        req
      );

      logger.info(`Loan approved: LOAN-${id}`);
      return updated;
    } catch (error) {
      logger.error('Error approving loan:', error);
      throw error;
    }
  }

  /**
   * Reject a loan
   */
  async rejectLoan(id: number, reason: string, userId: string, userInfo?: any, req?: any) {
    try {
      const loan = await this.getLoanById(id);

      if (loan.status !== ApprovalStatus.PENDING) {
        throw new ValidationError(`Loan is already ${loan.status}`);
      }

      const updated = await prisma.loan.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          remarks: reason,
        },
      });

      await AuditLogClient.logApproval(
        'Loan Management',
        { id, code: `LOAN-${id}` },
        'REJECT',
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Loan rejected: LOAN-${id}`);
      return updated;
    } catch (error) {
      logger.error('Error rejecting loan:', error);
      throw error;
    }
  }

  /**
   * Record a repayment for a loan
   */
  async recordRepayment(loanId: number, data: any, userId: string, userInfo?: any, req?: any) {
    try {
      const loan = await this.getLoanById(loanId);

      if (loan.status !== ApprovalStatus.APPROVED) {
        throw new ValidationError('Only approved loans can have repayments');
      }

      const amountPaid = parseFloat(data.amountPaid.toString());
      const currentBalance = parseFloat(loan.remainingBalance.toString());

      if (amountPaid > currentBalance) {
        throw new ValidationError('Payment amount exceeds remaining balance');
      }

      // Create repayment record
      const repayment = await prisma.loanRepayment.create({
        data: {
          loanId,
          installmentNumber: data.installmentNumber,
          amountDue: data.amountDue.toString(),
          amountPaid: amountPaid.toString(),
          dueDate: new Date(data.dueDate),
          paidDate: new Date(),
          status: 'PAID',
          paymentMethod: data.paymentMethod,
          remarks: data.remarks,
          createdBy: userId,
        },
      });

      // Update loan balance
      const newBalance = currentBalance - amountPaid;
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          remainingBalance: newBalance.toString(),
          updatedBy: userId,
        },
      });

      await AuditLogClient.log({
        moduleName: 'Loan Management',
        action: 'REPAYMENT_RECORDED',
        recordId: loanId.toString(),
        recordCode: `LOAN-${loanId}`,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: { repaymentId: repayment.id, amountPaid, newBalance },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Repayment recorded for loan: LOAN-${loanId}, amount: ${amountPaid}`);
      return repayment;
    } catch (error) {
      logger.error('Error recording repayment:', error);
      throw error;
    }
  }

  /**
   * Get repayment schedule for a loan
   */
  async getRepaymentSchedule(loanId: number) {
    try {
      const loan = await this.getLoanById(loanId);

      const repayments = await prisma.loanRepayment.findMany({
        where: {
          loanId,
          isDeleted: false,
        },
        orderBy: { installmentNumber: 'asc' },
      });

      return {
        loanId,
        loanType: loan.loanType,
        totalPayable: loan.totalPayable,
        remainingBalance: loan.remainingBalance,
        repayments,
        summary: {
          totalRepayments: repayments.length,
          paidRepayments: repayments.filter((r) => r.status === 'PAID').length,
          pendingRepayments: repayments.filter((r) => r.status === 'PENDING').length,
        },
      };
    } catch (error) {
      logger.error('Error getting repayment schedule:', error);
      throw error;
    }
  }

  /**
   * Get loan statistics
   */
  async getLoanStats(filters?: any) {
    try {
      const where: any = { isDeleted: false };
      if (filters?.loanType) where.loanType = filters.loanType;

      const [total, pending, approved, rejected] = await Promise.all([
        prisma.loan.count({ where }),
        prisma.loan.count({ where: { ...where, status: ApprovalStatus.PENDING } }),
        prisma.loan.count({ where: { ...where, status: ApprovalStatus.APPROVED } }),
        prisma.loan.count({ where: { ...where, status: ApprovalStatus.REJECTED } }),
      ]);

      const totalPrincipal = await prisma.loan.aggregate({
        where,
        _sum: { principalAmount: true },
      });

      const totalOutstanding = await prisma.loan.aggregate({
        where: { ...where, status: ApprovalStatus.APPROVED },
        _sum: { remainingBalance: true },
      });

      return {
        total,
        byStatus: { pending, approved, rejected },
        amounts: {
          totalPrincipal: totalPrincipal._sum.principalAmount || 0,
          totalOutstanding: totalOutstanding._sum.remainingBalance || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting loan stats:', error);
      throw error;
    }
  }
}
