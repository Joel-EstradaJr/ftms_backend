/**
 * INTEGRATION PAYROLL CONTROLLER
 * Handles payroll data retrieval and HR API integration
 * Supports weekly payroll periods (Monday → Saturday)
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  fetchAndSyncPayrollFromHR,
  getWeeklyPeriodsForMonth,
  getCurrentWeeklyPeriod,
  fetchPayrollFromHR,
} from '../../../lib/hr/payrollSync';
import {
  ensureEmployeeCacheLoaded,
  getEmployeeNameInfo,
  refreshEmployeeCache,
} from '../../../lib/hr/employeeClient';

const prisma = new PrismaClient();

export class IntegrationPayrollController {
  /**
   * GET /api/integration/hr_payroll
   * Returns payroll data from local database
   * 
   * Query Parameters:
   * - payroll_period_start: Filter by period start date
   * - payroll_period_end: Filter by period end date
   * - employee_number: Filter by specific employee
   * - grouped: If true, returns data grouped by period
   */
  async getHrPayroll(req: Request, res: Response): Promise<void> {
    try {
      const { payroll_period_start, payroll_period_end, employee_number, grouped } = req.query;

      // Ensure employee cache is loaded for name enrichment
      await ensureEmployeeCacheLoaded();

      // If requesting from external HR API directly
      if (payroll_period_start && payroll_period_end) {
        try {
          const hrData = await fetchPayrollFromHR(
            payroll_period_start as string,
            payroll_period_end as string
          );

          if (grouped === 'true') {
            res.json([{
              payroll_period_start: hrData.payroll_period_start,
              payroll_period_end: hrData.payroll_period_end,
              total_employees: hrData.count,
              employees: hrData.employees.map((emp: any) => {
                // Enrich with employee name from Employee API
                const nameInfo = getEmployeeNameInfo(emp.employee_number);

                return {
                  employee_number: emp.employee_number,
                  employee_name: nameInfo?.full_name || emp.employee_number,
                  first_name: nameInfo?.first_name || '',
                  middle_name: nameInfo?.middle_name || '',
                  last_name: nameInfo?.last_name || '',
                  department: nameInfo?.department || null,
                  position: nameInfo?.position || null,
                  basic_rate: emp.basic_rate,
                  rate_type: emp.rate_type,
                  present_days: emp.attendances.filter((a: any) => a.status === 'Present').length,
                  attendances: emp.attendances,
                  benefits: emp.benefits.map((b: any) => ({
                    name: b.name,
                    value: b.value,
                    frequency: b.frequency,
                    effective_date: b.effective_date,
                    end_date: b.end_date,
                    is_active: b.is_active,
                    benefit_type: { id: '0', name: b.name },
                  })),
                  deductions: emp.deductions.map((d: any) => ({
                    name: d.name,
                    value: d.value,
                    frequency: d.frequency,
                    effective_date: d.effective_date,
                    end_date: d.end_date,
                    is_active: d.is_active,
                    deduction_type: { id: '0', name: d.name },
                  })),
                };
              }),
            }]);
          } else {
            // Return flat list of employees
            res.json(hrData.employees.map(emp => ({
              payroll_period_start: hrData.payroll_period_start,
              payroll_period_end: hrData.payroll_period_end,
              employee_number: emp.employee_number,
              employee_name: emp.employee_number,
              basic_rate: emp.basic_rate,
              rate_type: emp.rate_type,
              present_days: emp.attendances.filter(a => a.status === 'Present').length,
              attendances: emp.attendances,
              benefits: emp.benefits.map(b => ({
                value: b.value,
                frequency: b.frequency,
                effective_date: b.effective_date,
                end_date: b.end_date,
                is_active: b.is_active,
                benefit_type: { id: '0', name: b.name },
              })),
              deductions: emp.deductions.map(d => ({
                value: d.value,
                frequency: d.frequency,
                effective_date: d.effective_date,
                end_date: d.end_date,
                is_active: d.is_active,
                deduction_type: { id: '0', name: d.name },
              })),
            })));
          }
          return;
        } catch (hrError) {
          console.error('Error fetching from HR API:', hrError);
          // Fall through to database lookup
        }
      }

      // Fallback: fetch from local database
      const where: any = { is_deleted: false };

      if (employee_number) {
        where.employee_number = employee_number as string;
      }

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          payroll_period: true,
          employee: true,
          payroll_items: {
            where: { is_deleted: false },
            include: { item_type: true },
          },
          payroll_attendances: {
            where: { is_deleted: false },
          },
        },
        orderBy: { payroll_period: { period_start: 'desc' } },
      });

      const transformed = payrolls.map(p => ({
        payroll_period_start: p.payroll_period.period_start.toISOString().split('T')[0],
        payroll_period_end: p.payroll_period.period_end.toISOString().split('T')[0],
        employee_number: p.employee_number,
        employee_name: p.employee ? `${p.employee.first_name || ''} ${p.employee.last_name || ''}`.trim() : p.employee_number,
        basic_rate: p.basic_rate?.toString() || '0',
        rate_type: p.rate_type,
        present_days: p.payroll_attendances.filter(a => a.status === 'Present').length,
        attendances: p.payroll_attendances.map(a => ({
          date: a.date.toISOString().split('T')[0],
          status: a.status,
        })),
        benefits: p.payroll_items
          .filter(i => i.category === 'BENEFIT')
          .map(i => ({
            value: i.amount.toString(),
            frequency: i.frequency || 'Once',
            effective_date: i.effective_date?.toISOString().split('T')[0] || '',
            end_date: i.end_date?.toISOString().split('T')[0] || null,
            is_active: i.is_active,
            benefit_type: { id: i.item_type.id.toString(), name: i.item_type.name },
          })),
        deductions: p.payroll_items
          .filter(i => i.category === 'DEDUCTION')
          .map(i => ({
            value: i.amount.toString(),
            frequency: i.frequency || 'Once',
            effective_date: i.effective_date?.toISOString().split('T')[0] || '',
            end_date: i.end_date?.toISOString().split('T')[0] || null,
            is_active: i.is_active,
            deduction_type: { id: i.item_type.id.toString(), name: i.item_type.name },
          })),
      }));

      if (grouped === 'true') {
        // Group by period
        const groupedByPeriod = new Map<string, any[]>();
        transformed.forEach(record => {
          const key = `${record.payroll_period_start}_${record.payroll_period_end}`;
          if (!groupedByPeriod.has(key)) {
            groupedByPeriod.set(key, []);
          }
          groupedByPeriod.get(key)!.push(record);
        });

        const batches = Array.from(groupedByPeriod.entries()).map(([key, employees]) => {
          const [start, end] = key.split('_');
          return {
            payroll_period_start: start,
            payroll_period_end: end,
            total_employees: employees.length,
            employees,
          };
        });

        res.json(batches);
      } else {
        res.json(transformed);
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
   * Returns weekly payroll periods for a given month
   */
  async getPayrollPeriods(req: Request, res: Response): Promise<void> {
    try {
      const { year, month } = req.query;

      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
      const targetMonth = month !== undefined ? parseInt(month as string) : new Date().getMonth();

      const periods = getWeeklyPeriodsForMonth(targetYear, targetMonth);
      const currentPeriod = getCurrentWeeklyPeriod();

      res.json({
        year: targetYear,
        month: targetMonth + 1,
        current_period: currentPeriod,
        periods: periods.map(p => ({
          week_number: p.weekNumber,
          start: p.start,
          end: p.end,
          description: `Week ${p.weekNumber} (Mon-Sat)`,
        })),
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
   * POST /api/integration/hr_payroll/refetch
   * Re-fetch payroll data from HR (manual trigger from UI)
   * Overwrites existing staging data and recalculates deterministically
   */
  async refetchFromHR(req: Request, res: Response): Promise<void> {
    try {
      const { period_start, period_end } = req.body;

      if (!period_start || !period_end) {
        res.status(400).json({
          error: 'Missing required fields: period_start, period_end',
        });
        return;
      }

      console.log(`🔄 Re-fetching payroll from HR: ${period_start} to ${period_end}`);

      // Delete existing data for this period and re-sync
      const result = await fetchAndSyncPayrollFromHR(period_start, period_end);

      res.json({
        message: 'Payroll re-fetched and recalculated successfully',
        ...result,
      });

    } catch (error: any) {
      console.error('❌ Payroll re-fetch failed:', error);
      res.status(500).json({
        error: 'Failed to re-fetch payroll from HR',
        details: error.message,
      });
    }
  }

  /**
   * POST /api/integration/hr_payroll/sync-period/:id
   * Recalculate totals for existing payroll period
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
   * Get payroll data for a specific period from database
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
