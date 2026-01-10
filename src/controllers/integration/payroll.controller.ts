/**
 * INTEGRATION PAYROLL CONTROLLER
 * Handles payroll data retrieval for external systems
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IntegrationPayrollController {
  /**
   * GET /api/integration/hr_payroll
   * Returns payroll data for employees (excluding Driver and PAO)
   * 
   * Query Parameters:
   * - payroll_period_start: Filter by period start date
   * - payroll_period_end: Filter by period end date
   * - employee_number: Filter by specific employee
   */
  async getHrPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { payroll_period_start, payroll_period_end, employee_number } = req.query;

      // Build where clause
      const where: any = {
        is_deleted: false,
      };

      if (payroll_period_start && payroll_period_end) {
        where.payroll_period_start = new Date(payroll_period_start as string);
        where.payroll_period_end = new Date(payroll_period_end as string);
      }

      if (employee_number) {
        where.employee_number = employee_number as string;
      }

      // Fetch payroll records with all relations
      const payrollRecords = await prisma.payroll_cache.findMany({
        where,
        include: {
          attendances: true,
          benefits: {
            include: {
              benefit_type: true,
            },
          },
          deductions: {
            include: {
              deduction_type: true,
            },
          },
          employee: true,
        },
        orderBy: {
          employee_number: 'asc',
        },
      });

      // Filter out Driver and PAO roles if needed
      const filteredRecords = payrollRecords.filter(record => {
        const position = record.employee?.position_name?.toLowerCase() || '';
        return !position.includes('driver') && !position.includes('pao');
      });

      // Transform to match required payload structure
      const response = filteredRecords.map(record => {
        // Map rate_type enum to display format
        const rateTypeMap: Record<string, string> = {
          MONTHLY: 'Monthly',
          DAILY: 'Daily',
          WEEKLY: 'Weekly',
          SEMI_MONTHLY: 'Semi-Monthly',
        };

        return {
          payroll_period_start: payroll_period_start || '',
          payroll_period_end: payroll_period_end || '',
          employee_number: record.employee_number,
          basic_rate: record.basic_rate?.toString() || '0',
          rate_type: rateTypeMap[record.rate_type] || record.rate_type,
          attendances: record.attendances.map(att => ({
            date: att.date.toISOString().split('T')[0],
            status: att.status,
          })),
          benefits: record.benefits.map(ben => ({
            value: ben.value?.toString() || '0',
            frequency: ben.frequency || '',
            effective_date: ben.effective_date?.toISOString().split('T')[0] || '',
            end_date: ben.end_date ? ben.end_date.toISOString().split('T')[0] : null,
            is_active: ben.is_active || false,
            benefit_type: {
              id: ben.benefit_type.id,
              name: ben.benefit_type.name,
            },
          })),
          deductions: record.deductions.map(ded => ({
            value: ded.value?.toString() || '0',
            frequency: ded.frequency || '',
            effective_date: ded.effective_date?.toISOString().split('T')[0] || '',
            end_date: ded.end_date ? ded.end_date.toISOString().split('T')[0] : null,
            is_active: ded.is_active || false,
            deduction_type: {
              id: ded.deduction_type.id,
              name: ded.deduction_type.name,
            },
          })),
        };
      });

      res.json(response);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
