import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

export class ReceivableService {
  /**
   * Create a new receivable
   */
  async createReceivable(data: any, userId: string, userInfo?: any, req?: any) {
    try {
      const receivable = await prisma.accountReceivable.create({
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
          collectionStatus: 'pending',
          createdBy: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Account Receivable',
        { id: receivable.id, code: receivable.referenceCode },
        receivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Receivable created: ${receivable.referenceCode}`);
      return receivable;
    } catch (error) {
      logger.error('Error creating receivable:', error);
      throw error;
    }
  }

  /**
   * List receivables with filtering and pagination
   */
  async listReceivables(filters: any, page = 1, limit = 10) {
    try {
      const where: any = { isDeleted: false };

      if (filters.entityName) where.entityName = { contains: filters.entityName };
      if (filters.entityType) where.entityType = filters.entityType;
      if (filters.collectionStatus) where.collectionStatus = filters.collectionStatus;
      if (filters.isSettled !== undefined) where.isSettled = filters.isSettled === 'true';

      const skip = (page - 1) * limit;
      const [receivables, total] = await Promise.all([
        prisma.accountReceivable.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dueDate: 'desc' },
        }),
        prisma.accountReceivable.count({ where }),
      ]);

      return {
        data: receivables,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing receivables:', error);
      throw error;
    }
  }

  /**
   * Get a receivable by ID
   */
  async getReceivableById(id: number) {
    const receivable = await prisma.accountReceivable.findUnique({ where: { id } });
    if (!receivable || receivable.isDeleted) {
      throw new NotFoundError(`Receivable ${id} not found`);
    }
    return receivable;
  }

  /**
   * Update a receivable
   */
  async updateReceivable(id: number, updates: any, userId: string, userInfo?: any, req?: any) {
    try {
      const oldReceivable = await this.getReceivableById(id);

      const updateData: any = { ...updates, updatedBy: userId };
      if (updates.amountDue) updateData.amountDue = updates.amountDue.toString();
      if (updates.amountPaid) updateData.amountPaid = updates.amountPaid.toString();
      if (updates.remainingBalance) updateData.remainingBalance = updates.remainingBalance.toString();
      if (updates.interestRate) updateData.interestRate = updates.interestRate.toString();
      if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);

      const newReceivable = await prisma.accountReceivable.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Account Receivable',
        { id, code: newReceivable.referenceCode },
        oldReceivable,
        newReceivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Receivable updated: ${newReceivable.referenceCode}`);
      return newReceivable;
    } catch (error) {
      logger.error('Error updating receivable:', error);
      throw error;
    }
  }

  /**
   * Delete a receivable
   */
  async deleteReceivable(id: number, userId: string, reason: string, userInfo?: any, req?: any) {
    try {
      const receivable = await this.getReceivableById(id);

      await prisma.accountReceivable.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Account Receivable',
        { id, code: receivable.referenceCode },
        receivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Receivable deleted: ${receivable.referenceCode}`);
    } catch (error) {
      logger.error('Error deleting receivable:', error);
      throw error;
    }
  }

  /**
   * Record a payment against a receivable
   */
  async recordPayment(id: number, paymentAmount: number, userId: string, userInfo?: any, req?: any) {
    try {
      const receivable = await this.getReceivableById(id);

      if (receivable.isSettled) {
        throw new ValidationError('Receivable is already settled');
      }

      const currentPaid = parseFloat(receivable.amountPaid?.toString() || '0');
      const payment = parseFloat(paymentAmount.toString());
      const newPaid = currentPaid + payment;

      const amountDue = parseFloat(receivable.amountDue.toString());
      const newBalance = amountDue - newPaid;

      if (newBalance < 0) {
        throw new ValidationError('Payment amount exceeds remaining balance');
      }

      const isSettled = newBalance === 0;
      const collectionStatus = isSettled ? 'paid' : newBalance < amountDue ? 'partial' : 'pending';

      const updated = await prisma.accountReceivable.update({
        where: { id },
        data: {
          amountPaid: newPaid.toString(),
          remainingBalance: newBalance.toString(),
          isSettled,
          collectionStatus,
          updatedBy: userId,
        },
      });

      await AuditLogClient.log({
        moduleName: 'Account Receivable',
        action: 'PAYMENT_RECORDED',
        recordId: id.toString(),
        recordCode: receivable.referenceCode,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: { paymentAmount: payment, newBalance, isSettled },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payment recorded for receivable: ${receivable.referenceCode}`);
      return updated;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }
}
