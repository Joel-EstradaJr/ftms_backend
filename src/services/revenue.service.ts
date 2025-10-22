/**
 * Revenue Service
 * Handles all business logic for revenue management
 * Migrated from Next.js API routes to Express backend
 * 
 * NOTE: This service is scaffolded based on the Next.js API routes.
 * Schema types may need adjustment based on actual Prisma schema.
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { BadRequestError, NotFoundError } from '../utils/errors';

// ===========================
// Types & Interfaces
// ===========================

export interface RevenueFormData {
  sourceId: number;
  description: string;
  amount: number;
  transactionDate: string | Date;
  paymentMethodId: number;
  busTripCacheId?: number;
  externalRefId?: string;
  externalRefType?: string;
  loanPaymentId?: number;
  documentIds?: string[];
  isAccountsReceivable?: boolean;
  arDueDate?: string | Date;
  arStatus?: 'PENDING' | 'PAID' | 'OVERDUE';
  arPaidDate?: string | Date;
  arId?: number;
  isInstallment?: boolean;
  installmentScheduleId?: number;
  installmentSchedule?: {
    totalAmount: number;
    numberOfPayments: number;
    paymentAmount: number;
    frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
    startDate: string | Date;
    interestRate?: number;
  };
  createdBy: string;
}

export interface RevenueListFilters {
  page?: number;
  limit?: number;
  sourceId?: number;
  sources?: string; // comma-separated IDs
  paymentMethods?: string; // comma-separated IDs
  externalRefType?: string;
  isAccountsReceivable?: boolean;
  isInstallment?: boolean;
  arStatus?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'revenueCode' | 'amount' | 'transactionDate';
  sortOrder?: 'asc' | 'desc';
}

export interface RevenueValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ===========================
// Revenue Service Class
// ===========================

export class RevenueService {
  /**
   * List revenues with pagination, filtering, search, and sorting
   */
  async listRevenues(filters: RevenueListFilters) {
    try {
      // Parse pagination
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));
      const skip = (page - 1) * limit;

      // Build WHERE clause
      const where: Prisma.RevenueWhereInput = {};

      // Source filters
      if (filters.sourceId) {
        where.sourceId = filters.sourceId;
      }
      if (filters.sources) {
        const sourceIds = filters.sources.split(',').map(Number).filter(n => !isNaN(n));
        if (sourceIds.length > 0) {
          where.sourceId = { in: sourceIds };
        }
      }

      // Payment method filters
      if (filters.paymentMethods) {
        const paymentMethodIds = filters.paymentMethods.split(',').map(Number).filter(n => !isNaN(n));
        if (paymentMethodIds.length > 0) {
          where.paymentMethodId = { in: paymentMethodIds };
        }
      }

      // Other filters
      if (filters.externalRefType) {
        where.externalRefType = filters.externalRefType;
      }
      if (filters.isAccountsReceivable !== undefined) {
        where.isAccountsReceivable = filters.isAccountsReceivable;
      }
      if (filters.isInstallment !== undefined) {
        where.isInstallment = filters.isInstallment;
      }
      if (filters.arStatus) {
        where.arStatus = filters.arStatus as any;
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) {
          where.transactionDate.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.transactionDate.lte = new Date(filters.endDate);
        }
      }

      // Amount range filter
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount.gte = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          where.amount.lte = filters.maxAmount;
        }
      }

      // Search filter (across multiple fields)
      if (filters.search) {
        where.OR = [
          { revenueCode: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { source: { name: { contains: filters.search, mode: 'insensitive' } } },
          { paymentMethod: { methodName: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      // Build ORDER BY clause
      const orderBy: Prisma.RevenueOrderByWithRelationInput = {};
      const sortBy = filters.sortBy || 'transactionDate';
      const sortOrder = filters.sortOrder || 'desc';
      orderBy[sortBy] = sortOrder;

      // Execute query with relations
      const [revenues, totalCount] = await Promise.all([
        prisma.revenue.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            source: true,
            paymentMethod: true,
            busTripCache: true,
            loanPayment: true,
            accountsReceivable: true,
            installmentSchedule: true,
            journalEntry: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        }),
        prisma.revenue.count({ where }),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: revenues,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      logger.error('Error listing revenues:', error);
      throw error;
    }
  }

  /**
   * Get a single revenue by ID with all relations
   */
  async getRevenueById(id: number) {
    try {
      const revenue = await prisma.revenue.findUnique({
        where: { id },
        include: {
          source: true,
          paymentMethod: true,
          busTripCache: true,
          loanPayment: {
            include: {
              loan: true,
            },
          },
          accountsReceivable: true,
          installmentSchedule: {
            include: {
              installments: true,
            },
          },
          journalEntry: {
            include: {
              lineItems: {
                include: {
                  account: {
                    include: {
                      accountType: true,
                    },
                  },
                },
              },
            },
          },
          auditLogs: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 50,
          },
        },
      });

      if (!revenue) {
        throw new NotFoundError('Revenue not found');
      }

      return revenue;
    } catch (error) {
      logger.error(`Error fetching revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new revenue record
   */
  async createRevenue(data: RevenueFormData, userId: string, ipAddress?: string) {
    try {
      // Validate revenue data
      const validation = await this.validateRevenueData(data);
      if (!validation.isValid) {
        throw new ValidationError('Revenue validation failed', validation.errors);
      }

      // Special validation for BUS_TRIP revenues
      if (data.externalRefType === 'BUS_TRIP') {
        if (!data.busTripCacheId) {
          throw new BadRequestError('Bus Trip Cache ID is required for BUS_TRIP revenue');
        }

        const busTrip = await prisma.busTripCache.findUnique({
          where: { id: data.busTripCacheId },
        });

        if (!busTrip) {
          throw new NotFoundError('Bus trip not found');
        }

        // Check if amount matches trip revenue
        if (Math.abs(data.amount - busTrip.tripRevenue) > 0.01) {
          throw new BadRequestError(
            `Revenue amount (${data.amount}) does not match bus trip revenue (${busTrip.tripRevenue})`
          );
        }

        // Check if revenue already recorded
        if (busTrip.isRevenueRecorded) {
          throw new BadRequestError('Revenue has already been recorded for this bus trip');
        }
      }

      // Special validation for LOAN_REPAYMENT revenues
      if (data.externalRefType === 'LOAN_REPAYMENT') {
        if (!data.loanPaymentId) {
          throw new BadRequestError('Loan Payment ID is required for LOAN_REPAYMENT revenue');
        }

        const loanPayment = await prisma.loanPayment.findUnique({
          where: { id: data.loanPaymentId },
        });

        if (!loanPayment) {
          throw new NotFoundError('Loan payment not found');
        }

        // Check if payment already linked to revenue
        if (loanPayment.revenueId) {
          throw new BadRequestError('This loan payment is already linked to a revenue record');
        }
      }

      // Require externalRefId for certain types
      const typesRequiringExtRef = ['RENTAL', 'DISPOSAL', 'FORFEITED_DEPOSIT', 'RENTER_DAMAGE'];
      if (typesRequiringExtRef.includes(data.externalRefType || '')) {
        if (!data.externalRefId) {
          throw new BadRequestError(`External Reference ID is required for ${data.externalRefType} revenue`);
        }
      }

      // Generate revenue code
      const revenueCode = await this.generateRevenueCode(data.transactionDate);

      // Prepare create data
      const createData: Prisma.RevenueCreateInput = {
        revenueCode,
        source: { connect: { id: data.sourceId } },
        description: data.description,
        amount: data.amount,
        transactionDate: new Date(data.transactionDate),
        paymentMethod: { connect: { id: data.paymentMethodId } },
      };

      // Optional fields
      if (data.busTripCacheId) {
        createData.busTripCache = { connect: { id: data.busTripCacheId } };
      }
      if (data.externalRefId) createData.externalRefId = data.externalRefId;
      if (data.externalRefType) createData.externalRefType = data.externalRefType;
      if (data.loanPaymentId) {
        createData.loanPayment = { connect: { id: data.loanPaymentId } };
      }
      if (data.documentIds) createData.documentIds = data.documentIds;

      // Accounts Receivable
      if (data.isAccountsReceivable) {
        createData.isAccountsReceivable = true;
        createData.arDueDate = data.arDueDate ? new Date(data.arDueDate) : null;
        createData.arStatus = data.arStatus || 'PENDING';
        if (data.arPaidDate) createData.arPaidDate = new Date(data.arPaidDate);
        if (data.arId) {
          createData.accountsReceivable = { connect: { id: data.arId } };
        }
      }

      // Installment Schedule
      if (data.isInstallment) {
        createData.isInstallment = true;
        if (data.installmentScheduleId) {
          createData.installmentSchedule = { connect: { id: data.installmentScheduleId } };
        } else if (data.installmentSchedule) {
          // Create new installment schedule
          const schedule = data.installmentSchedule;
          const startDate = new Date(schedule.startDate);
          const endDate = this.calculateInstallmentEndDate(
            startDate,
            schedule.frequency,
            schedule.numberOfPayments
          );

          createData.installmentSchedule = {
            create: {
              totalAmount: schedule.totalAmount,
              numberOfPayments: schedule.numberOfPayments,
              paymentAmount: schedule.paymentAmount,
              frequency: schedule.frequency,
              startDate,
              endDate,
              interestRate: schedule.interestRate || 0,
            },
          };
        }
      }

      // Create the revenue
      const revenue = await prisma.revenue.create({
        data: createData,
        include: {
          source: true,
          paymentMethod: true,
          busTripCache: true,
          loanPayment: true,
          accountsReceivable: true,
          installmentSchedule: true,
          journalEntry: true,
        },
      });

      // Update bus trip cache if applicable
      if (data.busTripCacheId) {
        await prisma.busTripCache.update({
          where: { id: data.busTripCacheId },
          data: { isRevenueRecorded: true },
        });
      }

      // Create audit log
      await auditClient.logCreate({
        userId,
        module: 'REVENUE',
        recordId: revenue.id,
        afterData: revenue,
        description: `Created revenue: ${revenue.revenueCode}`,
        ipAddress,
      });

      logger.info(`Revenue created: ${revenue.revenueCode} (ID: ${revenue.id})`);

      return revenue;
    } catch (error) {
      logger.error('Error creating revenue:', error);
      throw error;
    }
  }

  /**
   * Update an existing revenue record
   */
  async updateRevenue(id: number, data: RevenueFormData, userId: string, ipAddress?: string) {
    try {
      // Fetch existing revenue
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
        include: {
          journalEntry: true,
        },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      // Check if revenue is posted
      if (existingRevenue.journalEntry) {
        const jeStatus = existingRevenue.journalEntry.status;
        if (jeStatus === 'POSTED' || jeStatus === 'APPROVED') {
          throw new BadRequestError(
            'Cannot edit posted revenue. This revenue has been posted to the General Ledger and cannot be modified. Please create a reversal entry instead.'
          );
        }
      }

      // Validate the updated revenue data
      const validation = await this.validateRevenueData(data, id);
      if (!validation.isValid) {
        throw new ValidationError('Revenue validation failed', validation.errors);
      }

      // Prepare update data
      const updateData: any = {
        sourceId: data.sourceId,
        description: data.description,
        amount: data.amount,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
        paymentMethodId: data.paymentMethodId,
      };

      // Optional fields
      if (data.busTripCacheId !== undefined) updateData.busTripCacheId = data.busTripCacheId;
      if (data.externalRefId !== undefined) updateData.externalRefId = data.externalRefId;
      if (data.externalRefType !== undefined) updateData.externalRefType = data.externalRefType;
      if (data.loanPaymentId !== undefined) updateData.loanPaymentId = data.loanPaymentId;
      if (data.documentIds !== undefined) updateData.documentIds = data.documentIds;

      // Accounts Receivable fields
      if (data.isAccountsReceivable !== undefined) {
        updateData.isAccountsReceivable = data.isAccountsReceivable;
        if (data.isAccountsReceivable) {
          updateData.arDueDate = data.arDueDate ? new Date(data.arDueDate) : null;
          updateData.arStatus = data.arStatus || 'PENDING';
          if (data.arPaidDate) updateData.arPaidDate = new Date(data.arPaidDate);
          if (data.arId) updateData.arId = data.arId;
        }
      }

      // Installment fields
      if (data.isInstallment !== undefined) {
        updateData.isInstallment = data.isInstallment;
        if (data.installmentScheduleId) {
          updateData.installmentScheduleId = data.installmentScheduleId;
        }
      }

      // Update the revenue
      const updatedRevenue = await prisma.revenue.update({
        where: { id },
        data: updateData,
        include: {
          source: true,
          paymentMethod: true,
          busTripCache: true,
          loanPayment: true,
          accountsReceivable: true,
          installmentSchedule: true,
          journalEntry: true,
        },
      });

      // Create audit log
      await auditClient.logUpdate({
        userId,
        module: 'REVENUE',
        recordId: updatedRevenue.id,
        beforeData: existingRevenue,
        afterData: updatedRevenue,
        description: `Updated revenue: ${updatedRevenue.revenueCode}`,
        ipAddress,
      });

      logger.info(`Revenue updated: ${updatedRevenue.revenueCode} (ID: ${updatedRevenue.id})`);

      return updatedRevenue;
    } catch (error) {
      logger.error(`Error updating revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a revenue record
   */
  async deleteRevenue(id: number, userId: string, ipAddress?: string) {
    try {
      // Fetch existing revenue
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
        include: {
          journalEntry: true,
          installmentSchedule: {
            include: {
              installments: true,
            },
          },
        },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      // Check if revenue is posted
      if (existingRevenue.journalEntry) {
        const jeStatus = existingRevenue.journalEntry.status;
        if (jeStatus === 'POSTED' || jeStatus === 'APPROVED') {
          throw new BadRequestError(
            'Cannot delete posted revenue. This revenue has been posted to the General Ledger and cannot be deleted. Please create a reversal entry instead.'
          );
        }
      }

      // Check for installment payments
      if (existingRevenue.installmentSchedule?.installments?.length > 0) {
        const hasPayments = existingRevenue.installmentSchedule.installments.some(
          (inst: any) => inst.paidAmount > 0
        );

        if (hasPayments) {
          throw new BadRequestError(
            'Cannot delete revenue with installment payments. This revenue has installment payments recorded. Please handle those first.'
          );
        }
      }

      // Delete the revenue
      await prisma.revenue.delete({
        where: { id },
      });

      // Update bus trip cache if applicable
      if (existingRevenue.busTripCacheId) {
        await prisma.busTripCache.update({
          where: { id: existingRevenue.busTripCacheId },
          data: { isRevenueRecorded: false },
        });
      }

      // Create audit log
      await auditClient.logDelete({
        userId,
        module: 'REVENUE',
        recordId: id,
        beforeData: existingRevenue,
        description: `Deleted revenue: ${existingRevenue.revenueCode}`,
        ipAddress,
      });

      logger.info(`Revenue deleted: ${existingRevenue.revenueCode} (ID: ${id})`);

      return existingRevenue;
    } catch (error) {
      logger.error(`Error deleting revenue ${id}:`, error);
      throw error;
    }
  }

  // ===========================
  // Helper Methods
  // ===========================

  /**
   * Validate revenue data
   * Basic validation - can be expanded with lib/admin/revenues/validation.ts logic
   */
  private async validateRevenueData(
    data: RevenueFormData,
    existingId?: number
  ): Promise<RevenueValidationResult> {
    const errors: Record<string, string> = {};

    // Required fields
    if (!data.sourceId) errors.sourceId = 'Source is required';
    if (!data.description || data.description.trim().length === 0) {
      errors.description = 'Description is required';
    }
    if (!data.amount || data.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (!data.transactionDate) {
      errors.transactionDate = 'Transaction date is required';
    }
    if (!data.paymentMethodId) {
      errors.paymentMethodId = 'Payment method is required';
    }

    // Validate source exists
    if (data.sourceId) {
      const sourceExists = await prisma.revenueSource.findUnique({
        where: { id: data.sourceId },
      });
      if (!sourceExists) {
        errors.sourceId = 'Invalid revenue source';
      }
    }

    // Validate payment method exists
    if (data.paymentMethodId) {
      const methodExists = await prisma.paymentMethod.findUnique({
        where: { id: data.paymentMethodId },
      });
      if (!methodExists) {
        errors.paymentMethodId = 'Invalid payment method';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Generate a unique revenue code
   */
  private async generateRevenueCode(transactionDate: string | Date): Promise<string> {
    const date = new Date(transactionDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Find the highest sequence number for this date
    const prefix = `REV-${year}${month}${day}`;
    const lastRevenue = await prisma.revenue.findFirst({
      where: {
        revenueCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        revenueCode: 'desc',
      },
    });

    let sequence = 1;
    if (lastRevenue) {
      const lastSequence = parseInt(lastRevenue.revenueCode.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Calculate installment schedule end date
   */
  private calculateInstallmentEndDate(
    startDate: Date,
    frequency: string,
    numberOfPayments: number
  ): Date {
    const endDate = new Date(startDate);
    const daysMap: Record<string, number> = {
      DAILY: 1,
      WEEKLY: 7,
      BI_WEEKLY: 14,
      MONTHLY: 30,
      QUARTERLY: 90,
      SEMI_ANNUAL: 180,
      ANNUAL: 365,
    };

    const days = daysMap[frequency] || 30;
    const totalDays = days * numberOfPayments;
    endDate.setDate(endDate.getDate() + totalDays);

    return endDate;
  }
}

// Export singleton instance
export const revenueService = new RevenueService();
