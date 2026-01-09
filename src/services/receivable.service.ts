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
      const receivable = await prisma.receivable.create({
        data: {
          code: data.code || data.referenceCode,
          debtor_name: data.debtor_name || data.entityName,
          description: data.description,
          total_amount: data.total_amount?.toString() || data.amountDue?.toString(),
          balance: data.total_amount?.toString() || data.amountDue?.toString(),
          due_date: data.due_date ? new Date(data.due_date) : (data.dueDate ? new Date(data.dueDate) : null),
          installment_plan: data.installment_plan || data.frequency,
          interest_rate: data.interest_rate?.toString() || data.interestRate?.toString(),
          status: 'PENDING',
          created_by: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Account Receivable',
        { id: receivable.id, code: receivable.code },
        receivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Receivable created: ${receivable.code}`);
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
      const where: any = { is_deleted: false };

      if (filters.debtor_name) where.debtor_name = { contains: filters.debtor_name };
      if (filters.status) where.status = filters.status;

      const skip = (page - 1) * limit;
      const [receivables, total] = await Promise.all([
        prisma.receivable.findMany({
          where,
          skip,
          take: limit,
          orderBy: { due_date: 'desc' },
        }),
        prisma.receivable.count({ where }),
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
    const receivable = await prisma.receivable.findUnique({ where: { id } });
    if (!receivable || receivable.is_deleted) {
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

      const updateData: any = { ...updates, updated_by: userId };
      if (updates.total_amount) updateData.total_amount = updates.total_amount.toString();
      if (updates.paid_amount) updateData.paid_amount = updates.paid_amount.toString();
      if (updates.balance) updateData.balance = updates.balance.toString();
      if (updates.interest_rate) updateData.interest_rate = updates.interest_rate.toString();
      if (updates.due_date) updateData.due_date = new Date(updates.due_date);

      const newReceivable = await prisma.receivable.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Account Receivable',
        { id, code: newReceivable.code },
        oldReceivable,
        newReceivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Receivable updated: ${newReceivable.code}`);
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

      await prisma.receivable.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Account Receivable',
        { id, code: receivable.code },
        receivable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Receivable deleted: ${receivable.code}`);
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

      if (receivable.status === 'PAID') {
        throw new ValidationError('Receivable is already fully collected');
      }

      const currentPaid = parseFloat(receivable.paid_amount?.toString() || '0');
      const payment = parseFloat(paymentAmount.toString());
      const newPaid = currentPaid + payment;

      const totalAmount = parseFloat(receivable.total_amount.toString());
      const newBalance = totalAmount - newPaid;

      if (newBalance < 0) {
        throw new ValidationError('Payment amount exceeds remaining balance');
      }

      const newStatus = newBalance === 0 ? 'PAID' : newBalance < totalAmount ? 'PARTIALLY_PAID' : 'PENDING';

      const updated = await prisma.receivable.update({
        where: { id },
        data: {
          paid_amount: newPaid.toString(),
          balance: newBalance.toString(),
          status: newStatus,
          last_payment_date: new Date(),
          last_payment_amount: payment.toString(),
          updated_by: userId,
        },
      });

      await AuditLogClient.log({
        moduleName: 'Account Receivable',
        action: 'PAYMENT_RECORDED',
        recordId: id.toString(),
        recordCode: receivable.code,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: { paymentAmount: payment, newBalance, status: newStatus },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payment recorded for receivable: ${receivable.code}`);
      return updated;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }
}
