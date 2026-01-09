/**
 * Revenue Service (Schema-Aligned)
 * Business logic for revenue management based on ACTUAL Prisma schema
 * 
 * Schema Fields:
 * - id, code (unique)
 * - revenueType: TRIP | RENTAL | OTHER
 * - amount, dateRecorded, remarks
 * - sourceRefNo (Trip ID / Rental ID / etc.)
 * - department
 * - Rental fields: rentalDownpayment, rentalBalance, downpaymentReceivedAt, balanceReceivedAt, isDownpaymentRefundable
 * - otherRevenueCategory (asset_sale, advertising, insurance, etc.)
 * - receiptUrl
 * - isVerified, verifiedBy, verifiedAt
 * - externalRefNo, lastSyncedAt, lastSyncStatus
 * - Audit: createdBy, createdAt, updatedBy, updatedAt, approvedBy, approvedAt, rejectedBy, rejectedAt, deletedBy, deletedAt, isDeleted
 */

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { BadRequestError, NotFoundError } from '../utils/errors';

// ===========================
// Types & Interfaces
// ===========================

export interface RevenueCreateData {
  revenueType: 'TRIP' | 'RENTAL' | 'OTHER';
  amount: number;
  dateRecorded: string | Date;
  remarks?: string;
  sourceRefNo?: string; // Trip ID / Rental ID / etc.
  department?: string;
  
  // Rental-specific
  rentalDownpayment?: number;
  rentalBalance?: number;
  downpaymentReceivedAt?: string | Date;
  balanceReceivedAt?: string | Date;
  isDownpaymentRefundable?: boolean;
  
  // Other revenue
  otherRevenueCategory?: string; // asset_sale, advertising, insurance, etc.
  
  receiptUrl?: string;
  externalRefNo?: string;
}

export interface RevenueUpdateData extends Partial<RevenueCreateData> {
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string | Date;
}

export interface RevenueListFilters {
  page?: number;
  limit?: number;
  revenueType?: 'TRIP' | 'RENTAL' | 'OTHER';
  department?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sourceRefNo?: string;
  isVerified?: boolean;
  isDeleted?: boolean;
  search?: string; // Search in code, remarks, sourceRefNo
  sortBy?: 'code' | 'amount' | 'dateRecorded' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ===========================
// Revenue Service Class
// ===========================

export class RevenueService {
  /**
   * Generate unique revenue code
   * Format: REV-YYYYMMDD-NNNN
   */
  private async generateRevenueCode(dateRecorded: Date): Promise<string> {
    const year = dateRecorded.getFullYear();
    const month = String(dateRecorded.getMonth() + 1).padStart(2, '0');
    const day = String(dateRecorded.getDate()).padStart(2, '0');
    const prefix = `REV-${year}${month}${day}`;

    // Find highest sequence for this date
    const lastRevenue = await prisma.revenue.findFirst({
      where: {
        code: {
          startsWith: prefix,
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    let sequence = 1;
    if (lastRevenue) {
      const lastSequence = parseInt(lastRevenue.code.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * List revenues with pagination, filtering, and search
   */
  async listRevenues(filters: RevenueListFilters) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));
      const skip = (page - 1) * limit;

      // Build WHERE clause
      const where: Prisma.RevenueWhereInput = {};

      // Type filter
      if (filters.revenueType) {
        where.revenueType = filters.revenueType;
      }

      // Department filter
      if (filters.department) {
        where.department = filters.department;
      }

      // Source reference filter
      if (filters.sourceRefNo) {
        where.sourceRefNo = filters.sourceRefNo;
      }

      // Verification filter
      if (filters.isVerified !== undefined) {
        where.isVerified = filters.isVerified;
      }

      // Soft delete filter (default: exclude deleted)
      where.isDeleted = filters.isDeleted !== undefined ? filters.isDeleted : false;

      // Date range filter
      if (filters.startDate || filters.endDate) {
        where.dateRecorded = {};
        if (filters.startDate) {
          where.dateRecorded.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.dateRecorded.lte = new Date(filters.endDate);
        }
      }

      // Amount range filter
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount.gte = new Decimal(filters.minAmount);
        }
        if (filters.maxAmount !== undefined) {
          where.amount.lte = new Decimal(filters.maxAmount);
        }
      }

      // Search filter
      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { remarks: { contains: filters.search, mode: 'insensitive' } },
          { sourceRefNo: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Build ORDER BY
      const orderBy: Prisma.RevenueOrderByWithRelationInput = {};
      const sortBy = filters.sortBy || 'dateRecorded';
      const sortOrder = filters.sortOrder || 'desc';
      orderBy[sortBy] = sortOrder;

      // Execute query
      const [revenues, totalCount] = await Promise.all([
        prisma.revenue.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.revenue.count({ where }),
      ]);

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: revenues,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error listing revenues:', error);
      throw error;
    }
  }

  /**
   * Get a single revenue by ID
   */
  async getRevenueById(id: number) {
    try {
      const revenue = await prisma.revenue.findUnique({
        where: { id },
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
   * Get revenue by code
   */
  async getRevenueByCode(code: string) {
    try {
      const revenue = await prisma.revenue.findUnique({
        where: { code },
      });

      if (!revenue) {
        throw new NotFoundError('Revenue not found');
      }

      return revenue;
    } catch (error) {
      logger.error(`Error fetching revenue ${code}:`, error);
      throw error;
    }
  }

  /**
   * Create a new revenue
   */
  async createRevenue(data: RevenueCreateData, userId: string, ipAddress?: string) {
    try {
      // Validate amount
      if (!data.amount || data.amount <= 0) {
        throw new BadRequestError('Amount must be greater than 0');
      }

      // Validate rental data if RENTAL type
      if (data.revenueType === 'RENTAL') {
        if (data.rentalDownpayment && data.rentalBalance) {
          const total = data.rentalDownpayment + data.rentalBalance;
          if (Math.abs(total - data.amount) > 0.01) {
            throw new BadRequestError(
              `Rental downpayment (${data.rentalDownpayment}) + balance (${data.rentalBalance}) must equal total amount (${data.amount})`
            );
          }
        }
      }

      // Generate revenue code
      const dateRecorded = new Date(data.dateRecorded);
      const code = await this.generateRevenueCode(dateRecorded);

      // Create revenue
      const revenue = await prisma.revenue.create({
        data: {
          code,
          revenueType: data.revenueType,
          amount: new Decimal(data.amount),
          dateRecorded,
          remarks: data.remarks,
          sourceRefNo: data.sourceRefNo,
          department: data.department,
          rentalDownpayment: data.rentalDownpayment ? new Decimal(data.rentalDownpayment) : null,
          rentalBalance: data.rentalBalance ? new Decimal(data.rentalBalance) : null,
          downpaymentReceivedAt: data.downpaymentReceivedAt ? new Date(data.downpaymentReceivedAt) : null,
          balanceReceivedAt: data.balanceReceivedAt ? new Date(data.balanceReceivedAt) : null,
          isDownpaymentRefundable: data.isDownpaymentRefundable || false,
          otherRevenueCategory: data.otherRevenueCategory,
          receiptUrl: data.receiptUrl,
          externalRefNo: data.externalRefNo,
          createdBy: userId,
          updatedAt: new Date(), // Required by schema
        },
      });

      // Audit log
      await AuditLogClient.logCreate(
        'REVENUE',
        { id: revenue.id, code: revenue.code },
        revenue,
        { id: userId }
      );

      logger.info(`Revenue created: ${revenue.code} (ID: ${revenue.id})`);

      return revenue;
    } catch (error) {
      logger.error('Error creating revenue:', error);
      throw error;
    }
  }

  /**
   * Update an existing revenue
   */
  async updateRevenue(id: number, data: RevenueUpdateData, userId: string, ipAddress?: string) {
    try {
      // Fetch existing revenue
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      // Prevent editing deleted revenue
      if (existingRevenue.isDeleted) {
        throw new BadRequestError('Cannot edit deleted revenue');
      }

      // Prevent editing approved revenue (optional business rule)
      if (existingRevenue.approvedBy && existingRevenue.approvedAt) {
        throw new BadRequestError(
          'Cannot edit approved revenue. Please create a reversal entry instead.'
        );
      }

      // Prepare update data
      const updateData: Prisma.RevenueUpdateInput = {
        updatedBy: userId,
        updatedAt: new Date(),
      };

      if (data.revenueType) updateData.revenueType = data.revenueType;
      if (data.amount !== undefined) updateData.amount = new Decimal(data.amount);
      if (data.dateRecorded) updateData.dateRecorded = new Date(data.dateRecorded);
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.sourceRefNo !== undefined) updateData.sourceRefNo = data.sourceRefNo;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.rentalDownpayment !== undefined) {
        updateData.rentalDownpayment = data.rentalDownpayment ? new Decimal(data.rentalDownpayment) : null;
      }
      if (data.rentalBalance !== undefined) {
        updateData.rentalBalance = data.rentalBalance ? new Decimal(data.rentalBalance) : null;
      }
      if (data.downpaymentReceivedAt !== undefined) {
        updateData.downpaymentReceivedAt = data.downpaymentReceivedAt ? new Date(data.downpaymentReceivedAt) : null;
      }
      if (data.balanceReceivedAt !== undefined) {
        updateData.balanceReceivedAt = data.balanceReceivedAt ? new Date(data.balanceReceivedAt) : null;
      }
      if (data.isDownpaymentRefundable !== undefined) {
        updateData.isDownpaymentRefundable = data.isDownpaymentRefundable;
      }
      if (data.otherRevenueCategory !== undefined) updateData.otherRevenueCategory = data.otherRevenueCategory;
      if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
      if (data.externalRefNo !== undefined) updateData.externalRefNo = data.externalRefNo;
      if (data.isVerified !== undefined) {
        updateData.isVerified = data.isVerified;
        if (data.isVerified) {
          updateData.verifiedBy = data.verifiedBy || userId;
          updateData.verifiedAt = data.verifiedAt ? new Date(data.verifiedAt) : new Date();
        }
      }

      // Update revenue
      const updatedRevenue = await prisma.revenue.update({
        where: { id },
        data: updateData,
      });

      // Audit log
      await AuditLogClient.logUpdate(
        'REVENUE',
        { id: updatedRevenue.id, code: updatedRevenue.code },
        existingRevenue,
        updatedRevenue,
        { id: userId }
      );

      logger.info(`Revenue updated: ${updatedRevenue.code} (ID: ${updatedRevenue.id})`);

      return updatedRevenue;
    } catch (error) {
      logger.error(`Error updating revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Soft delete a revenue
   */
  async deleteRevenue(id: number, userId: string, ipAddress?: string) {
    try {
      // Fetch existing revenue
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      // Check if already deleted
      if (existingRevenue.isDeleted) {
        throw new BadRequestError('Revenue already deleted');
      }

      // Prevent deleting approved revenue
      if (existingRevenue.approvedBy && existingRevenue.approvedAt) {
        throw new BadRequestError(
          'Cannot delete approved revenue. Please create a reversal entry instead.'
        );
      }

      // Soft delete
      const deletedRevenue = await prisma.revenue.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        },
      });

      // Audit log
      await AuditLogClient.logDelete(
        'REVENUE',
        { id: existingRevenue.id, code: existingRevenue.code },
        existingRevenue,
        { id: userId }
      );

      logger.info(`Revenue deleted: ${existingRevenue.code} (ID: ${id})`);

      return deletedRevenue;
    } catch (error) {
      logger.error(`Error deleting revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Approve a revenue (admin only)
   */
  async approveRevenue(id: number, userId: string, ipAddress?: string) {
    try {
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      if (existingRevenue.isDeleted) {
        throw new BadRequestError('Cannot approve deleted revenue');
      }

      if (existingRevenue.approvedBy) {
        throw new BadRequestError('Revenue already approved');
      }

      const approvedRevenue = await prisma.revenue.update({
        where: { id },
        data: {
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      await AuditLogClient.logApproval(
        'REVENUE',
        { id: approvedRevenue.id, code: approvedRevenue.code },
        'APPROVE',
        { id: userId }
      );

      logger.info(`Revenue approved: ${approvedRevenue.code} (ID: ${id})`);

      return approvedRevenue;
    } catch (error) {
      logger.error(`Error approving revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reject a revenue (admin only)
   */
  async rejectRevenue(id: number, userId: string, remarks: string, ipAddress?: string) {
    try {
      const existingRevenue = await prisma.revenue.findUnique({
        where: { id },
      });

      if (!existingRevenue) {
        throw new NotFoundError('Revenue not found');
      }

      if (existingRevenue.isDeleted) {
        throw new BadRequestError('Cannot reject deleted revenue');
      }

      if (existingRevenue.rejectedBy) {
        throw new BadRequestError('Revenue already rejected');
      }

      const rejectedRevenue = await prisma.revenue.update({
        where: { id },
        data: {
          rejectedBy: userId,
          rejectedAt: new Date(),
          remarks: remarks, // Store rejection reason
        },
      });

      await AuditLogClient.logApproval(
        'REVENUE',
        { id: rejectedRevenue.id, code: rejectedRevenue.code },
        'REJECT',
        { id: userId },
        remarks
      );

      logger.info(`Revenue rejected: ${rejectedRevenue.code} (ID: ${id})`);

      return rejectedRevenue;
    } catch (error) {
      logger.error(`Error rejecting revenue ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(startDate?: string, endDate?: string) {
    try {
      const where: Prisma.RevenueWhereInput = {
        isDeleted: false,
      };

      if (startDate || endDate) {
        where.dateRecorded = {};
        if (startDate) where.dateRecorded.gte = new Date(startDate);
        if (endDate) where.dateRecorded.lte = new Date(endDate);
      }

      const [totalCount, totalAmount, byType] = await Promise.all([
        prisma.revenue.count({ where }),
        prisma.revenue.aggregate({
          where,
          _sum: {
            amount: true,
          },
        }),
        prisma.revenue.groupBy({
          by: ['revenueType'],
          where,
          _count: {
            id: true,
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      return {
        totalCount,
        totalAmount: totalAmount._sum.amount?.toString() || '0',
        byType: byType.map(item => ({
          type: item.revenueType,
          count: item._count.id,
          amount: item._sum.amount?.toString() || '0',
        })),
      };
    } catch (error) {
      logger.error('Error getting revenue stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const revenueService = new RevenueService();
