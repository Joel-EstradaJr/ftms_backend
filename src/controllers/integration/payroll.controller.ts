/**
 * INTEGRATION PAYROLL CONTROLLER
 * Handles payroll data retrieval for external systems
 * Supports semi-monthly period-based payroll batches
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  fetchAndSyncPayrollFromHR,
  syncPayrollForPeriod,
  getPayrollByPeriod,
  getPayrollByEmployee,
} from '../../../lib/hr/payrollSync';

const prisma = new PrismaClient();

/**
 * Calculate semi-monthly payroll periods
 * Period 1: 1st to 15th
 * Period 2: 16th to end of month
 */
function getSemiMonthlyPeriods(year?: number, month?: number) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month !== undefined ? month : now.getMonth();

  const period1Start = new Date(targetYear, targetMonth, 1);
  const period1End = new Date(targetYear, targetMonth, 15);
  
  const period2Start = new Date(targetYear, targetMonth, 16);
  const period2End = new Date(targetYear, targetMonth + 1, 0); // Last day of month

  return {
    period1: { start: period1Start, end: period1End },
    period2: { start: period2Start, end: period2End }
  };
}

export class IntegrationPayrollController {
  /**
   * GET /api/integration/hr_payroll
   * Returns payroll data grouped by period (semi-monthly)
   * 
   * Query Parameters:
   * - payroll_period_start: Filter by period start date
   * - payroll_period_end: Filter by period end date
   * - employee_number: Filter by specific employee
   * - grouped: If true, returns data grouped by period (default: false for backward compatibility)
   */
  async getHrPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { payroll_period_start, payroll_period_end, employee_number, grouped } = req.query;

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

      // Filter out Driver and PAO roles
      const filteredRecords = payrollRecords.filter(record => {
        const position = record.employee?.position_name?.toLowerCase() || '';
        return !position.includes('driver') && !position.includes('pao');
      });

      // Transform individual records
      const transformedRecords = filteredRecords.map(record => {
        const rateTypeMap: Record<string, string> = {
          MONTHLY: 'Monthly',
          DAILY: 'Daily',
          WEEKLY: 'Weekly',
          SEMI_MONTHLY: 'Semi-Monthly',
        };

        const presentDays = record.attendances.filter(a => a.status === 'Present').length;

        return {
          payroll_period_start: record.payroll_period_start.toISOString().split('T')[0],
          payroll_period_end: record.payroll_period_end.toISOString().split('T')[0],
          employee_number: record.employee_number,
          employee_name: record.employee?.first_name 
            ? `${record.employee.first_name} ${record.employee.last_name || ''}`.trim()
            : record.employee_number,
          basic_rate: record.basic_rate?.toString() || '0',
          rate_type: rateTypeMap[record.rate_type] || record.rate_type,
          present_days: presentDays,
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

      // If grouped=true, group by period
      if (grouped === 'true') {
        const groupedByPeriod = new Map<string, any[]>();
        
        transformedRecords.forEach(record => {
          const periodKey = `${record.payroll_period_start}_${record.payroll_period_end}`;
          if (!groupedByPeriod.has(periodKey)) {
            groupedByPeriod.set(periodKey, []);
          }
          groupedByPeriod.get(periodKey)!.push(record);
        });

        const batches = Array.from(groupedByPeriod.entries()).map(([periodKey, employees]) => {
          const [start, end] = periodKey.split('_');
          return {
            payroll_period_start: start,
            payroll_period_end: end,
            total_employees: employees.length,
            employees: employees,
          };
        });

        res.json(batches);
      } else {
        // Return individual records (backward compatibility)
        res.json(transformedRecords);
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/integration/hr_payroll/periods
   * Returns available semi-monthly payroll periods
   */
  async getPayrollPeriods(req: Request, res: Response): Promise<void> {
    try {
      const { year, month } = req.query;
      
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const targetMonth = month !== undefined ? parseInt(month as string) : new Date().getMonth();

      const periods = getSemiMonthlyPeriods(targetYear, targetMonth);

      res.json({
        year: targetYear,
        month: targetMonth + 1,
        periods: [
          {
            period: 1,
            start: periods.period1.start.toISOString().split('T')[0],
            end: periods.period1.end.toISOString().split('T')[0],
            description: '1st to 15th'
          },
          {
            period: 2,
            start: periods.period2.start.toISOString().split('T')[0],
            end: periods.period2.end.toISOString().split('T')[0],
            description: '16th to End of Month'
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/integration/hr_payroll/fetch-and-sync
   * Fetch payroll data from HR API and sync to database
   * 
   * Body:
   * - period_start: string (YYYY-MM-DD) - required
   * - period_end: string (YYYY-MM-DD) - required
   * - employee_number: string - optional
   */
  async fetchAndSyncPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { period_start, period_end, employee_number } = req.body;

      if (!period_start || !period_end) {
        res.status(400).json({
          error: 'Missing required fields: period_start, period_end',
        });
        return;
      }

      console.log(`🔄 Fetching payroll from HR: ${period_start} to ${period_end}`);
      
      const result = await fetchAndSyncPayrollFromHR(
        period_start,
        period_end,
        employee_number
      );

      res.json({
        message: 'Payroll sync completed',
        ...result,
      });

    } catch (error: any) {
      console.error('❌ Payroll fetch and sync failed:', error);
      res.status(500).json({
        error: 'Failed to fetch and sync payroll',
        details: error.message,
      });
    }
  }

  /**
   * POST /api/integration/hr_payroll/sync-period/:id
   * Recalculate totals for existing payroll period
   * 
   * Params:
   * - id: number - payroll period ID
   */
  async syncPeriod(req: Request, res: Response): Promise<void> {
    try {
      const periodId = parseInt(req.params.id);

      if (isNaN(periodId)) {
        res.status(400).json({ error: 'Invalid period ID' });
        return;
      }

      const result = await syncPayrollForPeriod(periodId);

      res.json({
        message: 'Payroll period synced successfully',
        ...result,
      });

    } catch (error: any) {
      console.error('❌ Payroll period sync failed:', error);
      res.status(500).json({
        error: 'Failed to sync payroll period',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/integration/hr_payroll/by-period
   * Get payroll data for a specific period
   * 
   * Query:
   * - period_start: string (YYYY-MM-DD) - required
   * - period_end: string (YYYY-MM-DD) - required
   */
  async getByPeriod(req: Request, res: Response): Promise<void> {
    try {
      const { period_start, period_end } = req.query;

      if (!period_start || !period_end) {
        res.status(400).json({
          error: 'Missing required query params: period_start, period_end',
        });
        return;
      }

      const payroll = await getPayrollByPeriod(
        period_start as string,
        period_end as string
      );

      if (!payroll) {
        res.status(404).json({
          error: 'Payroll period not found',
        });
        return;
      }

      res.json({
        payroll_period: payroll,
        employee_count: payroll.payrolls.length,
      });

    } catch (error: any) {
      console.error('❌ Get payroll by period failed:', error);
      res.status(500).json({
        error: 'Failed to get payroll by period',
        details: error.message,
      });
    }
  }

  /**
   * GET /api/integration/hr_payroll/by-employee/:employeeNumber
   * Get payroll history for specific employee
   * 
   * Params:
   * - employeeNumber: string - employee number
   * 
   * Query (optional):
   * - period_start: string (YYYY-MM-DD)
   * - period_end: string (YYYY-MM-DD)
   */
  async getByEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeNumber } = req.params;
      const { period_start, period_end } = req.query;

      const payrolls = await getPayrollByEmployee(
        employeeNumber,
        period_start as string,
        period_end as string
      );

      res.json({
        employee_number: employeeNumber,
        payroll_count: payrolls.length,
        payrolls,
      });

    } catch (error: any) {
      console.error('❌ Get payroll by employee failed:', error);
      res.status(500).json({
        error: 'Failed to get payroll by employee',
        details: error.message,
      });
    }
  }
}
