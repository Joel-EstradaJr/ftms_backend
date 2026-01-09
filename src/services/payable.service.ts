import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

export class PayableService {
  /**
   * Create a new payable
   */
  async createPayable(data: any, userId: string, userInfo?: any, req?: any) {
    try {
      const payable = await prisma.payable.create({
        data: {
          referenceCode: data.referenceCode,
          entityName: data.entityName,
          entityType: data.entityType,
          description: data.description,
          amountDue: data.amountDue.toString(),
          remainingBalance: data.amountDue.toString(),
          dueDate: new Date(data.dueDate),
          frequency: data.frequency,
          interestRate: data.interestRate?.toString(),
          paymentStatus: 'pending',
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Account Payable',
        { id: payable.id, code: payable.referenceCode },
        payable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Payable created: ${payable.referenceCode}`);
      return payable;
    } catch (error) {
      logger.error('Error creating payable:', error);
      throw error;
    }
  }

  /**
   * List payables with filtering and pagination
   */
  async listPayables(filters: any, page = 1, limit = 10) {
    try {
      const where: any = { is_deleted: false };

      if (filters.entityName) where.entityName = { contains: filters.entityName };
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
      if (filters.isSettled !== undefined) where.isSettled = filters.isSettled === 'true';

      const skip = (page - 1) * limit;
      const [payables, total] = await Promise.all([
        prisma.payable.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dueDate: 'desc' },
        }),
        prisma.payable.count({ where }),
      ]);

      return {
        data: payables,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing payables:', error);
      throw error;
    }
  }

  /**
   * Get a payable by ID
   */
  async getPayableById(id: number) {
    const payable = await prisma.payable.findUnique({ where: { id } });
    if (!payable || payable.is_deleted) {
      throw new NotFoundError(`Payable ${id} not found`);
    }
    return payable;
  }

  /**
   * Update a payable
   */
  async updatePayable(id: number, updates: any, userId: string, userInfo?: any, req?: any) {
    try {
      const oldPayable = await this.getPayableById(id);

      const updateData: any = { ...updates, updatedBy: userId };
      if (updates.amountDue) updateData.amountDue = updates.amountDue.toString();
      if (updates.amountPaid) updateData.amountPaid = updates.amountPaid.toString();
      if (updates.remainingBalance) updateData.remainingBalance = updates.remainingBalance.toString();
      if (updates.interestRate) updateData.interestRate = updates.interestRate.toString();
      if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);

      const newPayable = await prisma.payable.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Account Payable',
        { id, code: newPayable.referenceCode },
        oldPayable,
        newPayable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Payable updated: ${newPayable.referenceCode}`);
      return newPayable;
    } catch (error) {
      logger.error('Error updating payable:', error);
      throw error;
    }
  }

  /**
   * Delete a payable
   */
  async deletePayable(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const payable = await this.getPayableById(id);

      await prisma.payable.update({
        where: { id },
        data: {
          is_deleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Account Payable',
        { id, code: payable.referenceCode },
        payable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Payable deleted: ${payable.referenceCode}`);
    } catch (error) {
      logger.error('Error deleting payable:', error);
      throw error;
    }
  }

  /**
   * Record a payment against a payable
   */
  async recordPayment(id: number, paymentAmount: number, userId: string, userInfo?: any, req?: any) {
    try {
      const payable = await this.getPayableById(id);

      if (payable.isSettled) {
        throw new ValidationError('Payable is already settled');
      }

      const currentPaid = parseFloat(payable.amountPaid?.toString() || '0');
      const payment = parseFloat(paymentAmount.toString());
      const newPaid = currentPaid + payment;

      const amountDue = parseFloat(payable.amountDue.toString());
      const newBalance = amountDue - newPaid;

      if (newBalance < 0) {
        throw new ValidationError('Payment amount exceeds remaining balance');
      }

      const isSettled = newBalance === 0;
      const paymentStatus = isSettled ? 'paid' : newBalance < amountDue ? 'partial' : 'pending';

      const updated = await prisma.payable.update({
        where: { id },
        data: {
          amountPaid: newPaid.toString(),
          remainingBalance: newBalance.toString(),
          isSettled,
          paymentStatus,
          updatedBy: userId,
        },
      });

      await AuditLogClient.log({
        moduleName: 'Account Payable',
        action: 'PAYMENT_RECORDED',
        recordId: id.toString(),
        recordCode: payable.referenceCode,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: { paymentAmount: payment, newBalance, isSettled },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payment recorded for payable: ${payable.referenceCode}`);
      return updated;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }
}
