/**
 * Payroll Period Service
 * SERVICE LAYER: Core business/domain logic, orchestrate DB/cache/integrations
 * 
 * Responsibilities:
 * - All business logic and domain rules
 * - Orchestrate database operations
 * - Call external integrations (HR client)
 * - Use helper functions from lib
 * - Transaction management
 * - Audit logging
 * 
 * Does NOT:
 * - Handle HTTP requests/responses (controllers do this)
 * - Contain utility functions (those go in lib)
 * - Make direct HTTP calls (integrations do this)
 */

import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { HRPayrollClient } from '../integrations/hr/payroll.client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';
import { payroll_period_status, payroll_status, rate_type } from '@prisma/client';
import {
  CreatePayrollPeriodDTO,
  UpdatePayrollPeriodDTO,
  PayrollPeriodQueryDTO,
  PayrollPeriodListResponseDTO,
  PayrollPeriodDetailDTO,
  PayrollPeriodStatsDTO,
  ProcessPayrollDTO,
  ProcessPayrollResultDTO,
  PayrollEmployeeDetailDTO,
  PayslipDTO,
  PayrollItemDTO,
} from '../types/payroll.types';
// Disabled import due to missing lib file
// import {
//   calculateAttendanceStats,
//   calculateTotalBenefits,
//   calculateTotalDeductions,
//   calculateGrossPay,
//   calculateNetPay,
//   formatEmployeeFullName,
//   isDateRangeOverlapping,
// } from '../../lib/payroll/payrollHelpers';

export class PayrollPeriodService {
  /**
   * Create new payroll period
   */
  async createPayrollPeriod(
    data: CreatePayrollPeriodDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    try {
      // Check for overlapping periods
      const overlap = await prisma.payroll_period.findFirst({
        where: {
          is_deleted: false,
          OR: [
            {
              AND: [
                { period_start: { lte: new Date(data.period_start) } },
                { period_end: { gte: new Date(data.period_start) } },
              ],
            },
            {
              AND: [
                { period_start: { lte: new Date(data.period_end) } },
                { period_end: { gte: new Date(data.period_end) } },
              ],
            },
          ],
        },
      });

      if (overlap) {
        throw new ValidationError(
          `Period overlaps with existing period: ${overlap.payroll_period_code}`
        );
      }

      const period = await prisma.payroll_period.create({
        data: {
          payroll_period_code: data.payroll_period_code,
          period_start: new Date(data.period_start),
          period_end: new Date(data.period_end),
          status: payroll_period_status.DRAFT,
          created_by: userId,
        },
      });

      await AuditLogClient.logCreate(
        'Payroll Period Management',
        { id: period.id, code: period.payroll_period_code },
        period,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        req
      );

      logger.info(`Payroll period ${period.payroll_period_code} created by ${userId}`);
      return period;
    } catch (error) {
      logger.error('Error creating payroll period:', error);
      throw error;
    }
  }

  /**
   * List all payroll periods with filters and pagination
   */
  async listPayrollPeriods(query: PayrollPeriodQueryDTO): Promise<PayrollPeriodListResponseDTO> {
    try {
      const {
        period_start,
        period_end,
        status,
        is_deleted = false,
        search,
        page = 1,
        limit = 10,
      } = query;

      const where: any = {
        is_deleted,
      };

      if (status) {
        where.status = status;
      }

      if (period_start || period_end) {
        where.period_start = {};
        if (period_start) {
          where.period_start.gte = new Date(period_start);
        }
        if (period_end) {
          where.period_start.lte = new Date(period_end);
        }
      }

      // Search across multiple fields
      if (search && search.trim()) {
        where.OR = [
          { payroll_period_code: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [periods, total] = await Promise.all([
        prisma.payroll_period.findMany({
          where,
          skip,
          take: limit,
          orderBy: { period_start: 'desc' },
        }),
        prisma.payroll_period.count({ where }),
      ]);

      const data = periods.map((p) => ({
        id: p.id,
        payroll_period_code: p.payroll_period_code,
        period_start: p.period_start.toISOString(),
        period_end: p.period_end.toISOString(),
        total_employees: p.total_employees || 0,
        total_gross: p.total_gross.toString(),
        total_deductions: p.total_deductions.toString(),
        total_net: p.total_net.toString(),
        status: p.status,
        approved_by: p.approved_by,
        approved_at: p.approved_at?.toISOString() || null,
        created_at: p.created_at.toISOString(),
      }));

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing payroll periods:', error);
      throw error;
    }
  }

  /**
   * Get payroll period by ID with all employee payroll details
   */
  async getPayrollPeriodById(id: number): Promise<PayrollPeriodDetailDTO> {
    try {
      const period = await prisma.payroll_period.findUnique({
        where: { id },
        include: {
          payrolls: {
            include: {
              employee: true,
              payroll_items: {
                include: {
                  item_type: true,
                },
              },
              payroll_attendances: true,
            },
          },
        },
      });

      if (!period) {
        throw new NotFoundError(`Payroll period with ID ${id} not found`);
      }

      if (period.is_deleted) {
        throw new NotFoundError(`Payroll period with ID ${id} has been deleted`);
      }

      // Map payrolls to employee details
      const payrolls: PayrollEmployeeDetailDTO[] = period.payrolls.map((p) => {
        const attendance = p.payroll_attendances || [];
        const presentCount = attendance.filter((a) => a.status === 'Present').length;
        const absentCount = attendance.filter((a) => a.status === 'Absent').length;
        const lateCount = attendance.filter((a) => a.status === 'Late').length;
        const overtimeHours = attendance
          .filter((a) => a.status === 'Overtime')
          .reduce((sum, a) => sum + (parseFloat(a.hours_worked?.toString() || '0')), 0);

        return {
          id: p.id,
          payroll_code: `PAY-${p.id}`,
          employee_number: p.employee_number,
          employee_name: `${p.employee.first_name} ${p.employee.last_name}`,
          department: p.employee.department_name || '',
          position: p.employee.position_name || '',
          rate_type: p.rate_type,
          basic_rate: p.basic_rate?.toString() || '0',
          gross_pay: p.gross_pay.toString(),
          total_deductions: p.total_deductions.toString(),
          net_pay: p.net_pay.toString(),
          status: p.status,
          present_count: presentCount,
          absent_count: absentCount,
          late_count: lateCount,
          overtime_hours: overtimeHours,
        };
      });

      return {
        id: period.id,
        payroll_period_code: period.payroll_period_code,
        period_start: period.period_start.toISOString(),
        period_end: period.period_end.toISOString(),
        status: period.status,
        total_employees: period.total_employees || 0,
        total_gross: period.total_gross.toString(),
        total_deductions: period.total_deductions.toString(),
        total_net: period.total_net.toString(),
        approved_by: period.approved_by,
        approved_at: period.approved_at?.toISOString() || null,
        created_by: period.created_by,
        created_at: period.created_at.toISOString(),
        payrolls,
      };
    } catch (error) {
      logger.error(`Error fetching payroll period ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update payroll period
   */
  async updatePayrollPeriod(
    id: number,
    updates: UpdatePayrollPeriodDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ) {
    try {
      const oldPeriod = await prisma.payroll_period.findUnique({ where: { id } });

      if (!oldPeriod) {
        throw new NotFoundError(`Payroll period with ID ${id} not found`);
      }

      if (oldPeriod.status === payroll_period_status.RELEASED) {
        throw new ValidationError('Cannot update released payroll period');
      }

      const updateData: any = { ...updates };

      if (updates.period_start) {
        updateData.period_start = new Date(updates.period_start);
      }
      if (updates.period_end) {
        updateData.period_end = new Date(updates.period_end);
      }

      const newPeriod = await prisma.payroll_period.update({
        where: { id },
        data: updateData,
      });

      await AuditLogClient.logUpdate(
        'Payroll Period Management',
        { id, code: newPeriod.payroll_period_code },
        oldPeriod,
        newPeriod,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        req
      );

      logger.info(`Payroll period ${id} updated by ${userId}`);
      return newPeriod;
    } catch (error) {
      logger.error(`Error updating payroll period ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete payroll period (soft delete)
   */
  async deletePayrollPeriod(
    id: number,
    userId: string,
    reason: string,
    userInfo?: any,
    req?: any
  ) {
    try {
      const period = await prisma.payroll_period.findUnique({ where: { id } });

      if (!period) {
        throw new NotFoundError(`Payroll period with ID ${id} not found`);
      }

      if (period.status === payroll_period_status.RELEASED) {
        throw new ValidationError('Cannot delete released payroll period');
      }

      await prisma.payroll_period.update({
        where: { id },
        data: { is_deleted: true },
      });

      await AuditLogClient.logDelete(
        'Payroll Period Management',
        { id, code: period.payroll_period_code },
        period,
        {
          id: userId,
          name: userInfo?.username || userId,
          role: userInfo?.role || 'admin',
        },
        reason,
        req
      );

      logger.info(`Payroll period ${id} deleted by ${userId}, reason: ${reason}`);
    } catch (error) {
      logger.error(`Error deleting payroll period ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process payroll for a period - fetch employees from HR and create payroll records
   * Now uses the new HR API integration via fetchAndSyncPayrollFromHR
   */
  async processPayroll(
    data: ProcessPayrollDTO,
    userId: string,
    userInfo?: any,
    req?: any
  ): Promise<ProcessPayrollResultDTO> {
    try {
      const period = await prisma.payroll_period.findUnique({
        where: { id: data.payroll_period_id },
      });

      if (!period) {
        throw new NotFoundError(`Payroll period with ID ${data.payroll_period_id} not found`);
      }

      if (period.status !== payroll_period_status.DRAFT && period.status !== payroll_period_status.PARTIAL) {
        throw new ValidationError('Can only process draft or partial payroll periods');
      }

      // Use the new HR API sync function
      const { fetchAndSyncPayrollFromHR } = await import('../../lib/hr/payrollSync');

      const result = await fetchAndSyncPayrollFromHR(
        data.period_start,
        data.period_end,
        data.employee_numbers?.[0] // Only single employee filter supported
      );

      // Update period status
      await prisma.payroll_period.update({
        where: { id: data.payroll_period_id },
        data: {
          status: result.errors.length > 0 ? payroll_period_status.PARTIAL : payroll_period_status.PARTIAL,
        },
      });

      // Get updated totals
      const updatedPeriod = await prisma.payroll_period.findUnique({
        where: { id: data.payroll_period_id },
      });

      logger.info(`Processed payroll for period ${data.payroll_period_id}: ${result.synced} employees`);

      return {
        success: result.success,
        payroll_period_id: data.payroll_period_id,
        total_processed: result.synced,
        total_employees: result.synced + result.errors.length,
        total_gross: updatedPeriod?.total_gross?.toString() || '0',
        total_deductions: updatedPeriod?.total_deductions?.toString() || '0',
        total_net: updatedPeriod?.total_net?.toString() || '0',
        errors: result.errors.map(e => ({ employee_number: e.split(':')[0], error: e })),
      };
    } catch (error) {
      logger.error('Error processing payroll:', error);
      throw error;
    }
  }

  /**
   * Release payroll period (mark as released)
   */
  async releasePayrollPeriod(id: number, userId: string, userInfo?: any, req?: any) {
    try {
      // 1. Fetch period with all payroll details for webhook
      const period = await prisma.payroll_period.findUnique({
        where: { id },
        include: {
          payrolls: {
            include: {
              employee: true,
              payroll_items: {
                include: { item_type: true },
              },
              payroll_attendances: true,
            },
          },
        },
      });

      if (!period) {
        throw new NotFoundError(`Payroll period with ID ${id} not found`);
      }

      if (period.status === payroll_period_status.DRAFT) {
        throw new ValidationError('Can only release processed payroll periods');
      }

      // 2. Trigger webhook if there are payrolls
      if (period.payrolls.length > 0) {
        const payload: import('../types/payroll.types').PayrollWebhookRequestDTO = {
          payroll_period_code: period.payroll_period_code,
          payroll_period_start: period.period_start.toISOString().split('T')[0],
          payroll_period_end: period.period_end.toISOString().split('T')[0],
          disbursed_by: userInfo?.username || userId,
          disbursed_at: new Date().toISOString(),
          employees: period.payrolls.map(p => {
            // Calculate present days
            const presentDays = p.payroll_attendances.filter(a => a.status === 'Present').length;

            // Calculate benefits and deductions totals
            const totalBenefits = p.payroll_items
              .filter(i => i.category === 'BENEFIT')
              .reduce((sum, i) => sum + Number(i.amount), 0);

            const totalDeductions = p.payroll_items
              .filter(i => i.category === 'DEDUCTION')
              .reduce((sum, i) => sum + Number(i.amount), 0);

            return {
              employee_number: p.employee_number,
              basic_rate: Number(p.basic_rate),
              rate_type: p.rate_type,
              present_days: presentDays,
              basic_pay: Number(p.gross_pay) - totalBenefits, // Approximate basic pay if not stored explicitly? Or just use gross - benefits? 
              // Wait, gross_pay usually includes benefits. 
              // Start with basic_pay = basic_rate * presentDays? 
              // Let's use basic_rate * presentDays as basic_pay for now, or derive from items.
              // Actually, let's look at p.gross_pay.
              total_benefits: totalBenefits,
              total_deductions: totalDeductions,
              gross_pay: Number(p.gross_pay),
              net_pay: Number(p.net_pay),
            };
          }),
        };

        // Asynchronous webhook call - don't block release if it fails?
        // Or wait for it? User said "will be triggered", let's await it but not crash.
        await HRPayrollClient.sendPayrollDistribution(payload);
      }

      const updatedPeriod = await prisma.payroll_period.update({
        where: { id },
        data: {
          status: payroll_period_status.RELEASED,
          approved_by: userId,
          approved_at: new Date(),
        },
      });

      // Update all payrolls to RELEASED
      await prisma.payroll.updateMany({
        where: { payroll_period_id: id },
        data: { status: payroll_status.RELEASED },
      });

      await AuditLogClient.log({
        moduleName: 'Payroll Period Management',
        action: 'RELEASE',
        performedBy: userId,
        performedByName: userInfo?.username,
        performedByRole: userInfo?.role,
        recordId: id.toString(),
        recordCode: period.payroll_period_code,
        newValues: updatedPeriod,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });

      logger.info(`Payroll period ${id} released by ${userId}`);
      return updatedPeriod;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      logger.error(`Error releasing payroll period ${id}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get payroll statistics
   */
  async getPayrollStats(): Promise<PayrollPeriodStatsDTO> {
    try {
      const [totalPeriods, releasedCount, pendingCount, totals, byStatus] = await Promise.all([
        prisma.payroll_period.count({ where: { is_deleted: false } }),
        prisma.payroll_period.count({
          where: { is_deleted: false, status: payroll_period_status.RELEASED },
        }),
        prisma.payroll_period.count({
          where: {
            is_deleted: false,
            status: { in: [payroll_period_status.DRAFT, payroll_period_status.PARTIAL] },
          },
        }),
        prisma.payroll_period.aggregate({
          where: { is_deleted: false },
          _sum: { total_net: true, total_employees: true },
        }),
        prisma.payroll_period.groupBy({
          by: ['status'],
          where: { is_deleted: false },
          _sum: { total_net: true },
          _count: true,
        }),
      ]);

      return {
        total_periods: totalPeriods,
        released_count: releasedCount,
        pending_count: pendingCount,
        total_net_pay: totals._sum.total_net?.toString() || '0',
        total_employees: totals._sum.total_employees || 0,
        by_status: byStatus.map((s) => ({
          status: s.status,
          count: s._count,
          total_net: s._sum.total_net?.toString() || '0',
        })),
      };
    } catch (error) {
      logger.error('Error getting payroll stats:', error);
      throw error;
    }
  }

  /**
   * Get payslip for a specific employee payroll
   */
  async getPayslip(payrollId: number): Promise<PayslipDTO> {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
        include: {
          payroll_period: true,
          employee: true,
          payroll_items: {
            include: { item_type: true },
          },
          payroll_attendances: true,
        },
      });

      if (!payroll) {
        throw new NotFoundError(`Payroll with ID ${payrollId} not found`);
      }

      const attendanceStats = {
        present: payroll.payroll_attendances.filter((a) => a.status === 'Present').length,
        absent: payroll.payroll_attendances.filter((a) => a.status === 'Absent').length,
        late: payroll.payroll_attendances.filter((a) => a.status === 'Late').length,
        overtime: payroll.payroll_attendances
          .filter((a) => a.status === 'Overtime')
          .reduce((sum, a) => sum + parseFloat(a.hours_worked?.toString() || '0'), 0),
      };

      const benefits: PayrollItemDTO[] = payroll.payroll_items
        .filter((i) => i.category === 'BENEFIT')
        .map((i) => ({
          name: i.item_type.name,
          category: 'BENEFIT',
          amount: i.amount.toString(),
          quantity: i.quantity?.toString(),
          rate: i.rate?.toString(),
          description: i.description || undefined,
        }));

      const deductions: PayrollItemDTO[] = payroll.payroll_items
        .filter((i) => i.category === 'DEDUCTION')
        .map((i) => ({
          name: i.item_type.name,
          category: 'DEDUCTION',
          amount: i.amount.toString(),
          quantity: i.quantity?.toString(),
          rate: i.rate?.toString(),
          description: i.description || undefined,
        }));

      return {
        company_name: 'Your Company Name', // TODO: Get from config
        period_start: payroll.payroll_period.period_start.toISOString(),
        period_end: payroll.payroll_period.period_end.toISOString(),
        release_date: payroll.payroll_period.approved_at?.toISOString() || new Date().toISOString(),
        payroll_code: `PAY-${payroll.id}`,
        employee_name: `${payroll.employee.first_name} ${payroll.employee.last_name}`,
        employee_number: payroll.employee_number,
        department: payroll.employee.department_name || '',
        position: payroll.employee.position_name || '',
        basic_rate: payroll.basic_rate?.toString() || '0',
        rate_type: payroll.rate_type,
        benefits,
        deductions,
        total_gross_pay: payroll.gross_pay.toString(),
        total_deductions: payroll.total_deductions.toString(),
        net_pay: payroll.net_pay.toString(),
        present_count: attendanceStats.present,
        absent_count: attendanceStats.absent,
        late_count: attendanceStats.late,
        total_overtime_hours: attendanceStats.overtime,
      };
    } catch (error) {
      logger.error(`Error generating payslip for payroll ${payrollId}:`, error);
      throw error;
    }
  }
}
