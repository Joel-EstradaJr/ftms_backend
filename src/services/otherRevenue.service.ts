/**
 * Other Revenue Service
 * Handles business logic for other revenue records (non-trip, non-rental revenues)
 * Supports installment scheduling with cascade payment logic
 */

import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { lookupEmployeeName } from '../integrations/hr/employeeLookup';
import { transactionalCodeGenerators } from '../utils/codeGenerators';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../config/logger';
import {
  CreateOtherRevenueDTO,
  UpdateOtherRevenueDTO,
  RecordInstallmentPaymentDTO,
  OtherRevenueListQuery,
  OtherRevenueResponse,
  RevenueTypeResponse,
  CascadePaymentResult,
  CascadePaymentAllocation,
  InstallmentStatus,
  ReceivableStatus,
} from '../types/otherRevenue.types';
import { Decimal } from '@prisma/client/runtime/library';

// Revenue types to exclude (handled by separate modules)
const EXCLUDED_REVENUE_TYPES = ['TRIP', 'RENTAL'];

export class OtherRevenueService {
  // ==========================================================================
  // REVENUE TYPES
  // ==========================================================================

  /**
   * Get all active revenue types (excluding TRIP and RENTAL)
   */
  async getRevenueTypes(): Promise<RevenueTypeResponse[]> {
    try {
      const types = await prisma.revenue_type.findMany({
        where: {
          is_deleted: false,
          code: { notIn: EXCLUDED_REVENUE_TYPES },
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      });

      logger.info(`[Other Revenue] Retrieved ${types.length} revenue types`);
      return types;
    } catch (error) {
      logger.error('[Other Revenue] Error fetching revenue types:', error);
      throw error;
    }
  }

  // ==========================================================================
  // LIST & GET
  // ==========================================================================

  /**
   * List other revenue records with filtering and pagination
   */
  async list(query: OtherRevenueListQuery) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        order = 'desc',
        search,
        dateFrom,
        dateTo,
        amountFrom,
        amountTo,
        status,
        revenue_type_id,
      } = query;

      // Build where clause
      const where: any = {
        is_deleted: false,
        revenue_type: {
          code: { notIn: EXCLUDED_REVENUE_TYPES },
        },
      };

      // Search filter (code or description)
      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.date_recorded = {};
        if (dateFrom) where.date_recorded.gte = new Date(dateFrom);
        if (dateTo) where.date_recorded.lte = new Date(dateTo);
      }

      // Amount range filter
      if (amountFrom !== undefined || amountTo !== undefined) {
        where.amount = {};
        if (amountFrom !== undefined) where.amount.gte = amountFrom;
        if (amountTo !== undefined) where.amount.lte = amountTo;
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      // Revenue type filter
      if (revenue_type_id) {
        where.revenue_type_id = revenue_type_id;
      }

      const skip = (page - 1) * limit;

      // Execute query
      const [revenues, total] = await Promise.all([
        prisma.revenue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: order },
          include: {
            revenue_type: {
              select: { id: true, code: true, name: true, description: true },
            },
            receivable: {
              select: {
                id: true,
                code: true,
                debtor_ref: true,
                debtor_name: true,
                status: true,
                total_amount: true,
                paid_amount: true,
                balance: true,
              },
            },
          },
        }),
        prisma.revenue.count({ where }),
      ]);

      logger.info(`[Other Revenue] Listed ${revenues.length} of ${total} records`);

      const totalPages = Math.ceil(total / limit);

      return {
        data: revenues,
        meta: {
          page,
          limit,
          totalCount: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('[Other Revenue] Error listing revenues:', error);
      throw error;
    }
  }

  /**
   * Get a single other revenue record by ID with full relations
   */
  async getById(id: number): Promise<OtherRevenueResponse> {
    try {
      const revenue = await prisma.revenue.findUnique({
        where: { id },
        include: {
          revenue_type: {
            select: { id: true, code: true, name: true, description: true },
          },
          receivable: {
            include: {
              installment_schedule: {
                orderBy: { installment_number: 'asc' },
                include: {
                  payments: {
                    orderBy: { payment_date: 'desc' },
                  },
                },
              },
            },
          },
        },
      });

      if (!revenue) {
        throw new NotFoundError(`Revenue record with ID ${id} not found`);
      }

      if (revenue.is_deleted) {
        throw new NotFoundError(`Revenue record with ID ${id} has been deleted`);
      }

      // Verify it's not a TRIP or RENTAL type
      if (EXCLUDED_REVENUE_TYPES.includes(revenue.revenue_type.code)) {
        throw new ValidationError(`Revenue type ${revenue.revenue_type.code} is not managed by this endpoint`);
      }

      logger.info(`[Other Revenue] Retrieved revenue: ${revenue.code}`);
      return revenue as unknown as OtherRevenueResponse;
    } catch (error) {
      logger.error(`[Other Revenue] Error fetching revenue ${id}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new other revenue record
   * Optionally creates receivable and installment schedule for unearned revenue
   */
  async create(data: CreateOtherRevenueDTO, userId: string, userInfo?: any, req?: any) {
    try {
      // Validate revenue type
      const revenueType = await prisma.revenue_type.findUnique({
        where: { id: data.revenue_type_id },
      });

      if (!revenueType || revenueType.is_deleted) {
        throw new NotFoundError(`Revenue type with ID ${data.revenue_type_id} not found`);
      }

      if (EXCLUDED_REVENUE_TYPES.includes(revenueType.code)) {
        throw new ValidationError(`Revenue type ${revenueType.code} cannot be created via this endpoint`);
      }

      // If unearned revenue, validate required fields
      if (data.is_unearned_revenue) {
        if (!data.debtor_ref && !data.debtor_name) {
          throw new ValidationError('Either debtor_ref or debtor_name is required for unearned revenue');
        }
        if (!data.due_date) {
          throw new ValidationError('Due date is required for unearned revenue');
        }
        if (data.installment_plan && data.installment_plan !== 'ONE_TIME') {
          if (!data.schedule_items || data.schedule_items.length === 0) {
            throw new ValidationError('Installment schedule items are required for installment plans');
          }
        }
      }

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        const dateRecorded = data.date_recorded ? new Date(data.date_recorded) : new Date();

        // Generate revenue code
        const revenueCode = await transactionalCodeGenerators.generateOtherRevenueCode(tx, dateRecorded);

        let receivableId: number | null = null;

        // Create receivable and schedule if unearned revenue
        if (data.is_unearned_revenue) {
          // Lookup debtor name from HR API if debtor_ref provided
          let debtorName = data.debtor_name || 'Unknown - Pending Sync';
          if (data.debtor_ref) {
            debtorName = await lookupEmployeeName(data.debtor_ref);
          }

          // Generate receivable code
          const receivableCode = await transactionalCodeGenerators.generateReceivableCode(tx, dateRecorded);

          // Calculate expected installment amount
          const scheduleCount = data.schedule_items?.length || 1;
          const expectedInstallment = new Decimal(data.amount).dividedBy(scheduleCount);

          // Create receivable
          const receivable = await tx.receivable.create({
            data: {
              code: receivableCode,
              debtor_ref: data.debtor_ref || null,
              debtor_name: debtorName,
              description: data.description || `Receivable for ${revenueType.name}`,
              total_amount: data.amount,
              due_date: new Date(data.due_date!),
              status: 'PENDING',
              installment_plan: data.installment_plan || 'ONE_TIME',
              expected_installment: expectedInstallment,
              balance: data.amount,
              paid_amount: 0,
              created_by: userId,
            },
          });

          receivableId = receivable.id;

          // Create installment schedule
          if (data.schedule_items && data.schedule_items.length > 0) {
            // Validate schedule totals match amount
            const scheduleTotal = data.schedule_items.reduce((sum, item) => sum + item.amount_due, 0);
            if (Math.abs(scheduleTotal - data.amount) > 0.01) {
              throw new ValidationError(
                `Schedule total (${scheduleTotal}) does not match revenue amount (${data.amount})`
              );
            }

            await tx.revenue_installment_schedule.createMany({
              data: data.schedule_items.map((item) => ({
                receivable_id: receivable.id,
                installment_number: item.installment_number,
                due_date: new Date(item.due_date),
                amount_due: item.amount_due,
                balance: item.amount_due,
                status: 'PENDING',
                created_by: userId,
              })),
            });
          } else {
            // Create single one-time installment
            await tx.revenue_installment_schedule.create({
              data: {
                receivable_id: receivable.id,
                installment_number: 1,
                due_date: new Date(data.due_date!),
                amount_due: data.amount,
                balance: data.amount,
                status: 'PENDING',
                created_by: userId,
              },
            });
          }

          logger.info(`[Other Revenue] Created receivable: ${receivableCode} with schedule`);
        }

        // Create revenue record
        const revenue = await tx.revenue.create({
          data: {
            code: revenueCode,
            revenue_type_id: data.revenue_type_id,
            amount: data.amount,
            date_recorded: dateRecorded,
            date_expected: data.is_unearned_revenue && data.due_date ? new Date(data.due_date) : null,
            description: data.description,
            status: data.is_unearned_revenue ? 'PENDING' : 'RECORDED',
            approval_status: 'PENDING',
            payment_method: data.payment_method,
            payment_reference: data.payment_reference,
            receivable_id: receivableId,
            created_by: userId,
          },
          include: {
            revenue_type: {
              select: { id: true, code: true, name: true, description: true },
            },
            receivable: {
              include: {
                installment_schedule: {
                  orderBy: { installment_number: 'asc' },
                },
              },
            },
          },
        });

        return revenue;
      });

      // Audit log
      await AuditLogClient.logCreate(
        'Other Revenue',
        { id: result.id, code: result.code },
        result,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`[Other Revenue] Created revenue: ${result.code}`);
      return result;
    } catch (error) {
      logger.error('[Other Revenue] Error creating revenue:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update an other revenue record
   * Amount and schedule can only be updated if no payments have been made
   */
  async update(id: number, data: UpdateOtherRevenueDTO, userId: string, userInfo?: any, req?: any) {
    try {
      // Get existing record
      const existing = await prisma.revenue.findUnique({
        where: { id },
        include: {
          revenue_type: true,
          receivable: {
            include: {
              installment_schedule: {
                include: { payments: true },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundError(`Revenue record with ID ${id} not found`);
      }

      if (existing.is_deleted) {
        throw new NotFoundError(`Revenue record with ID ${id} has been deleted`);
      }

      if (EXCLUDED_REVENUE_TYPES.includes(existing.revenue_type.code)) {
        throw new ValidationError(`Revenue type ${existing.revenue_type.code} cannot be updated via this endpoint`);
      }

      // Check if payments exist
      const hasPayments =
        existing.receivable?.installment_schedule?.some((s) => s.payments.length > 0) || false;

      // Validate amount/schedule changes
      if (hasPayments) {
        if (data.amount !== undefined) {
          throw new ConflictError('Cannot change amount after payments have been made');
        }
        if (data.schedule_items !== undefined) {
          throw new ConflictError('Cannot change installment schedule after payments have been made');
        }
        if (data.installment_plan !== undefined) {
          throw new ConflictError('Cannot change installment plan after payments have been made');
        }
      }

      // Execute update in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update revenue record
        const updateData: any = {
          updated_by: userId,
        };

        if (data.description !== undefined) updateData.description = data.description;
        if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
        if (data.payment_reference !== undefined) updateData.payment_reference = data.payment_reference;
        if (data.amount !== undefined) updateData.amount = data.amount;

        const updatedRevenue = await tx.revenue.update({
          where: { id },
          data: updateData,
        });

        // Update receivable and schedule if needed
        if (existing.receivable && !hasPayments) {
          if (data.amount !== undefined) {
            // Update receivable total and balance
            await tx.receivable.update({
              where: { id: existing.receivable.id },
              data: {
                total_amount: data.amount,
                balance: data.amount,
                updated_by: userId,
              },
            });
          }

          // Update schedule if provided
          if (data.schedule_items && data.schedule_items.length > 0) {
            // Delete old schedule
            await tx.revenue_installment_schedule.deleteMany({
              where: { receivable_id: existing.receivable.id },
            });

            // Create new schedule
            await tx.revenue_installment_schedule.createMany({
              data: data.schedule_items.map((item) => ({
                receivable_id: existing.receivable!.id,
                installment_number: item.installment_number,
                due_date: new Date(item.due_date),
                amount_due: item.amount_due,
                balance: item.amount_due,
                status: 'PENDING',
                created_by: userId,
              })),
            });

            // Update installment plan if provided
            if (data.installment_plan) {
              await tx.receivable.update({
                where: { id: existing.receivable.id },
                data: {
                  installment_plan: data.installment_plan,
                  expected_installment: new Decimal(data.amount || existing.amount.toString()).dividedBy(
                    data.schedule_items.length
                  ),
                },
              });
            }
          }
        }

        // Fetch updated record with relations
        return tx.revenue.findUnique({
          where: { id },
          include: {
            revenue_type: {
              select: { id: true, code: true, name: true, description: true },
            },
            receivable: {
              include: {
                installment_schedule: {
                  orderBy: { installment_number: 'asc' },
                  include: { payments: true },
                },
              },
            },
          },
        });
      });

      // Audit log
      await AuditLogClient.logUpdate(
        'Other Revenue',
        { id, code: existing.code },
        existing,
        result,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        req
      );

      logger.info(`[Other Revenue] Updated revenue: ${existing.code}`);
      return result;
    } catch (error) {
      logger.error(`[Other Revenue] Error updating revenue ${id}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Soft delete an other revenue record
   * Cannot delete if payments have been made
   */
  async softDelete(id: number, userId: string, userInfo?: any, req?: any, reason?: string) {
    try {
      const existing = await prisma.revenue.findUnique({
        where: { id },
        include: {
          revenue_type: true,
          receivable: {
            include: {
              installment_schedule: {
                include: { payments: true },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundError(`Revenue record with ID ${id} not found`);
      }

      if (existing.is_deleted) {
        throw new NotFoundError(`Revenue record with ID ${id} has already been deleted`);
      }

      if (EXCLUDED_REVENUE_TYPES.includes(existing.revenue_type.code)) {
        throw new ValidationError(`Revenue type ${existing.revenue_type.code} cannot be deleted via this endpoint`);
      }

      // Check if payments exist
      const hasPayments =
        existing.receivable?.installment_schedule?.some((s) => s.payments.length > 0) || false;

      if (hasPayments) {
        throw new ConflictError('Cannot delete revenue record after payments have been made');
      }

      // Soft delete in transaction
      await prisma.$transaction(async (tx) => {
        // Soft delete revenue
        await tx.revenue.update({
          where: { id },
          data: {
            is_deleted: true,
            deleted_by: userId,
            deleted_at: new Date(),
          },
        });

        // Soft delete receivable if exists
        if (existing.receivable) {
          await tx.receivable.update({
            where: { id: existing.receivable.id },
            data: {
              is_deleted: true,
              deleted_by: userId,
              deleted_at: new Date(),
            },
          });

          // Soft delete schedule items
          await tx.revenue_installment_schedule.updateMany({
            where: { receivable_id: existing.receivable.id },
            data: {
              is_deleted: true,
              deleted_by: userId,
              deleted_at: new Date(),
            },
          });
        }
      });

      // Audit log
      await AuditLogClient.logDelete(
        'Other Revenue',
        { id, code: existing.code },
        existing,
        { id: userId, name: userInfo?.username, role: userInfo?.role },
        reason,
        req
      );

      logger.info(`[Other Revenue] Deleted revenue: ${existing.code}`);
      return { success: true, message: `Revenue ${existing.code} deleted successfully` };
    } catch (error) {
      logger.error(`[Other Revenue] Error deleting revenue ${id}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // INSTALLMENT PAYMENTS - CASCADE LOGIC
  // ==========================================================================

  /**
   * Record an installment payment with cascade overflow logic
   *
   * Cascade Logic:
   * 1. Apply payment to the target installment first
   * 2. If payment exceeds installment balance, overflow to next installment(s)
   * 3. Continue cascading until payment is fully allocated
   * 4. Track carried_over_amount for each affected installment
   * 5. Update receivable totals and status
   */
  async recordInstallmentPayment(
    data: RecordInstallmentPaymentDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ): Promise<CascadePaymentResult> {
    try {
      // Validate installment exists
      const installment = await prisma.revenue_installment_schedule.findUnique({
        where: { id: data.installment_id },
        include: {
          receivable: {
            include: {
              installment_schedule: {
                orderBy: { installment_number: 'asc' },
              },
              revenues: {
                where: { is_deleted: false },
                take: 1,
              },
            },
          },
        },
      });

      if (!installment) {
        throw new NotFoundError(`Installment with ID ${data.installment_id} not found`);
      }

      if (installment.is_deleted) {
        throw new NotFoundError(`Installment with ID ${data.installment_id} has been deleted`);
      }

      if (installment.status === 'PAID') {
        throw new ValidationError(`Installment ${data.installment_id} is already fully paid`);
      }

      if (installment.status === 'CANCELLED' || installment.status === 'WRITTEN_OFF') {
        throw new ValidationError(`Cannot make payment on ${installment.status.toLowerCase()} installment`);
      }

      const receivable = installment.receivable;
      if (!receivable) {
        throw new NotFoundError('Receivable not found for installment');
      }

      if (receivable.status === 'PAID' || receivable.status === 'CANCELLED' || receivable.status === 'WRITTEN_OFF') {
        throw new ValidationError(`Cannot make payment on ${receivable.status.toLowerCase()} receivable`);
      }

      // Get revenue type for payment revenue record
      const originalRevenue = receivable.revenues[0];
      if (!originalRevenue) {
        throw new NotFoundError('Original revenue record not found');
      }

      // Execute cascade payment in transaction
      const result = await prisma.$transaction(async (tx) => {
        const paymentDate = new Date(data.payment_date);
        let remainingAmount = new Decimal(data.amount_paid);
        const allocations: CascadePaymentAllocation[] = [];
        const paymentRecordIds: number[] = [];

        // Generate payment revenue code
        const paymentRevenueCode = await transactionalCodeGenerators.generatePaymentRevenueCode(tx, paymentDate);

        // Create payment revenue record (actual cash received)
        const paymentRevenue = await tx.revenue.create({
          data: {
            code: paymentRevenueCode,
            revenue_type_id: originalRevenue.revenue_type_id,
            amount: data.amount_paid,
            date_recorded: paymentDate,
            description: `Payment for ${receivable.code} - Installment #${installment.installment_number}`,
            status: 'RECORDED',
            approval_status: 'APPROVED',
            payment_method: data.payment_method || null,
            payment_reference: data.payment_reference || null,
            receivable_id: receivable.id,
            created_by: userId,
          },
        });

        // Get all unpaid/partially paid installments starting from target
        const eligibleInstallments = receivable.installment_schedule.filter(
          (s) =>
            !s.is_deleted &&
            s.status !== 'PAID' &&
            s.status !== 'CANCELLED' &&
            s.status !== 'WRITTEN_OFF' &&
            s.installment_number >= installment.installment_number
        );

        // Process cascade payments
        for (const schedule of eligibleInstallments) {
          if (remainingAmount.lessThanOrEqualTo(0)) break;

          const previousBalance = new Decimal(schedule.balance.toString());
          const amountToApply = Decimal.min(remainingAmount, previousBalance);
          const newBalance = previousBalance.minus(amountToApply);
          const isCarriedOver = schedule.id !== data.installment_id;

          // Determine new status
          let newStatus: InstallmentStatus;
          if (newBalance.equals(0)) {
            newStatus = 'PAID';
          } else if (newBalance.lessThan(new Decimal(schedule.amount_due.toString()))) {
            newStatus = 'PARTIALLY_PAID';
          } else {
            newStatus = schedule.status as InstallmentStatus;
          }

          // Update installment
          await tx.revenue_installment_schedule.update({
            where: { id: schedule.id },
            data: {
              amount_paid: new Decimal(schedule.amount_paid.toString()).plus(amountToApply),
              balance: newBalance,
              status: newStatus,
              carried_over_amount: isCarriedOver
                ? new Decimal(schedule.carried_over_amount.toString()).plus(amountToApply)
                : schedule.carried_over_amount,
              updated_by: userId,
            },
          });

          // Create payment record
          const paymentRecord = await tx.revenue_installment_payment.create({
            data: {
              installment_id: schedule.id,
              revenue_id: paymentRevenue.id,
              amount_paid: amountToApply,
              payment_date: paymentDate,
              payment_method: data.payment_method || null,
              payment_reference: data.payment_reference || null,
              created_by: userId,
            },
          });

          paymentRecordIds.push(paymentRecord.id);

          // Record allocation
          allocations.push({
            installment_id: schedule.id,
            installment_number: schedule.installment_number,
            previous_balance: previousBalance.toNumber(),
            amount_applied: amountToApply.toNumber(),
            new_balance: newBalance.toNumber(),
            new_status: newStatus,
            is_carried_over: isCarriedOver,
          });

          remainingAmount = remainingAmount.minus(amountToApply);
        }

        // Calculate new receivable totals
        const newPaidAmount = new Decimal(receivable.paid_amount.toString()).plus(data.amount_paid);
        const newReceivableBalance = new Decimal(receivable.total_amount.toString()).minus(newPaidAmount);

        // Determine receivable status
        let receivableNewStatus: ReceivableStatus;
        if (newReceivableBalance.lessThanOrEqualTo(0)) {
          receivableNewStatus = 'PAID';
        } else if (newPaidAmount.greaterThan(0)) {
          receivableNewStatus = 'PARTIALLY_PAID';
        } else {
          receivableNewStatus = receivable.status as ReceivableStatus;
        }

        // Update receivable
        await tx.receivable.update({
          where: { id: receivable.id },
          data: {
            paid_amount: newPaidAmount,
            balance: newReceivableBalance,
            status: receivableNewStatus,
            last_payment_date: paymentDate,
            last_payment_amount: data.amount_paid,
            updated_by: userId,
          },
        });

        // Update original revenue status if fully paid
        if (receivableNewStatus === 'PAID') {
          await tx.revenue.update({
            where: { id: originalRevenue.id },
            data: {
              status: 'RECORDED',
              updated_by: userId,
            },
          });
        }

        return {
          success: true,
          total_amount_paid: data.amount_paid,
          allocations,
          remaining_amount: remainingAmount.toNumber(),
          receivable_new_status: receivableNewStatus,
          receivable_new_balance: newReceivableBalance.toNumber(),
          receivable_new_paid_amount: newPaidAmount.toNumber(),
          payment_records_created: paymentRecordIds,
          revenue_id: paymentRevenue.id,
        };
      });

      // Audit log
      await AuditLogClient.log({
        moduleName: 'Other Revenue',
        action: 'INSTALLMENT_PAYMENT_CASCADE',
        recordId: data.installment_id.toString(),
        recordCode: `${installment.receivable?.code}-${installment.installment_number}`,
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        newValues: {
          amount_paid: data.amount_paid,
          allocations: result.allocations,
          receivable_status: result.receivable_new_status,
        },
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(
        `[Other Revenue] Cascade payment: ${data.amount_paid} applied to ${result.allocations.length} installments`
      );

      return result;
    } catch (error) {
      logger.error(`[Other Revenue] Error recording installment payment:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get receivable details with installment schedule
   */
  async getReceivableDetails(receivableId: number) {
    try {
      const receivable = await prisma.receivable.findUnique({
        where: { id: receivableId },
        include: {
          installment_schedule: {
            orderBy: { installment_number: 'asc' },
            where: { is_deleted: false },
            include: {
              payments: {
                orderBy: { payment_date: 'desc' },
              },
            },
          },
        },
      });

      if (!receivable || receivable.is_deleted) {
        throw new NotFoundError(`Receivable with ID ${receivableId} not found`);
      }

      return receivable;
    } catch (error) {
      logger.error(`[Other Revenue] Error fetching receivable ${receivableId}:`, error);
      throw error;
    }
  }

  /**
   * Get installment schedule for a revenue record
   */
  async getInstallmentSchedule(revenueId: number) {
    try {
      const revenue = await prisma.revenue.findUnique({
        where: { id: revenueId },
        include: {
          receivable: {
            include: {
              installment_schedule: {
                orderBy: { installment_number: 'asc' },
                where: { is_deleted: false },
                include: {
                  payments: {
                    orderBy: { payment_date: 'desc' },
                  },
                },
              },
            },
          },
        },
      });

      if (!revenue || revenue.is_deleted) {
        throw new NotFoundError(`Revenue with ID ${revenueId} not found`);
      }

      if (!revenue.receivable) {
        return { hasSchedule: false, schedule: [] };
      }

      return {
        hasSchedule: true,
        receivable: {
          id: revenue.receivable.id,
          code: revenue.receivable.code,
          debtor_name: revenue.receivable.debtor_name,
          total_amount: revenue.receivable.total_amount,
          paid_amount: revenue.receivable.paid_amount,
          balance: revenue.receivable.balance,
          status: revenue.receivable.status,
        },
        schedule: revenue.receivable.installment_schedule,
      };
    } catch (error) {
      logger.error(`[Other Revenue] Error fetching installment schedule for revenue ${revenueId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const otherRevenueService = new OtherRevenueService();
