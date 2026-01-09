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
          code: data.code || data.referenceCode,
          creditor_name: data.creditor_name || data.entityName,
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
        'Account Payable',
        { id: payable.id, code: payable.code },
        payable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Payable created: ${payable.code}`);
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

      if (filters.creditor_name) where.creditor_name = { contains: filters.creditor_name };
      if (filters.status) where.status = filters.status;

      const skip = (page - 1) * limit;
      const [payables, total] = await Promise.all([
        prisma.payable.findMany({
          where,
          skip,
          take: limit,
          orderBy: { due_date: 'desc' },
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

      const updateData: any = { ...updates, updated_by: userId };
      if (updates.total_amount) updateData.total_amount = updates.total_amount.toString();
      if (updates.paid_amount) updateData.paid_amount = updates.paid_amount.toString();
      if (updates.balance) updateData.balance = updates.balance.toString();
      if (updates.interest_rate) updateData.interest_rate = updates.interest_rate.toString();
      if (updates.due_date) updateData.due_date = new Date(updates.due_date);

      const newPayable = await prisma.payable.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Account Payable',
        { id, code: newPayable.code },
        oldPayable,
        newPayable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`Payable updated: ${newPayable.code}`);
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
          deleted_by: userId,
          deleted_at: new Date(),
        },
      });

      await AuditLogClient.logDelete(
        'Account Payable',
        { id, code: payable.code },
        payable,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`Payable deleted: ${payable.code}`);
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

      if (payable.status === 'PAID') {
        throw new ValidationError('Payable is already fully paid');
      }

      const currentPaid = parseFloat(payable.paid_amount?.toString() || '0');
      const payment = parseFloat(paymentAmount.toString());
      const newPaid = currentPaid + payment;

      const totalAmount = parseFloat(payable.total_amount.toString());
      const newBalance = totalAmount - newPaid;

      if (newBalance < 0) {
        throw new ValidationError('Payment amount exceeds remaining balance');
      }

      const newStatus = newBalance === 0 ? 'PAID' : newBalance < totalAmount ? 'PARTIALLY_PAID' : 'PENDING';

      const updated = await prisma.payable.update({
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
        moduleName: 'Account Payable',
        action: 'PAYMENT_RECORDED',
        recordId: id.toString(),
        recordCode: payable.code,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: { paymentAmount: payment, newBalance, status: newStatus },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payment recorded for payable: ${payable.code}`);
      return updated;
    } catch (error) {
      logger.error('Error recording payment:', error);
      throw error;
    }
  }
}
