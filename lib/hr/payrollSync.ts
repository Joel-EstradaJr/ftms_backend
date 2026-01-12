/**
 * PAYROLL SYNCHRONIZATION UTILITY
 * 
 * Handles syncing payroll data from external HR system to Finance database
 * Endpoint: https://backends-liart.vercel.app/api/clean/hr_payroll
 * 
 * Supports weekly payroll periods (Monday → Saturday)
 * All calculations are deterministic and based on HR data only
 */

import { PrismaClient } from '@prisma/client';

// Types are defined locally to avoid import path issues from lib folder
// These match the HR API payload structure exactly

export type PayrollFrequency = 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
export type HRRateType = 'Daily' | 'Weekly' | 'Monthly' | 'Semi-Monthly';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Overtime';

export interface HREmployeeAttendance {
  date: string;
  status: string; // Flexible to accept any status from HR
}

export interface HREmployeeBenefit {
  name: string;
  value: string;
  frequency: PayrollFrequency;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface HREmployeeDeduction {
  name: string;
  value: string;
  frequency: PayrollFrequency;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface HREmployeeData {
  employee_number: string;
  basic_rate: string;
  rate_type: string;
  attendances: HREmployeeAttendance[];
  benefits: HREmployeeBenefit[];
  deductions: HREmployeeDeduction[];
}

export interface HRPayrollAPIResponse {
  payroll_period_start: string;
  payroll_period_end: string;
  employees: HREmployeeData[];
  count: number;
}

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const HR_PAYROLL_API_URL = process.env.HR_PAYROLL_API_URL ||
  'https://backends-liart.vercel.app/api/clean/hr_payroll';

// ============================================================================
// DATE HELPERS FOR WEEKLY PERIODS
// ============================================================================

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Saturday of the week containing the given date
 */
export function getWeekSaturday(date: Date): Date {
  const monday = getWeekMonday(date);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Check if a date falls within a date range (inclusive)
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

/**
 * Get the number of active weekdays in a range
 */
export function countWeekdaysInRange(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0) { // Exclude Sunday (0)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ============================================================================
// FREQUENCY CALCULATION HELPERS
// ============================================================================

/**
 * Determine if a benefit/deduction should be applied for a given payroll week
 * Based on frequency and effective date rules
 */
export function shouldApplyItemForWeek(
  item: { frequency: PayrollFrequency; effective_date: string; end_date: string | null; is_active: boolean },
  periodStart: Date,
  periodEnd: Date,
  payrollBatchNumber?: number // For Monthly tracking (every 4th batch = 28-day cycle)
): boolean {
  if (!item.is_active) return false;

  const effectiveDate = parseDateString(item.effective_date);
  const endDate = item.end_date ? parseDateString(item.end_date) : null;

  // End date must not be before payroll start
  if (endDate && endDate < periodStart) return false;

  // Effective date must be on or before payroll end
  if (effectiveDate > periodEnd) return false;

  switch (item.frequency) {
    case 'Once':
      // Apply once if effective date falls within payroll week
      return isDateInRange(effectiveDate, periodStart, periodEnd);

    case 'Daily':
      // Always applies (multiplied by active days later)
      return true;

    case 'Weekly':
      // Apply once per payroll batch (which is weekly)
      return true;

    case 'Monthly':
      // Apply on effective date's week, then every 4th payroll batch (28-day cycle)
      // For simplicity: apply if we're in the same week-of-month as effective date
      if (payrollBatchNumber !== undefined) {
        // Apply every 4 weeks starting from week containing effective date
        const effectiveWeekNumber = Math.floor((effectiveDate.getTime() - new Date('2026-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
        const currentWeekNumber = Math.floor((periodStart.getTime() - new Date('2026-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
        return (currentWeekNumber - effectiveWeekNumber) % 4 === 0;
      }
      // Fallback: apply if effective date day-of-month matches any day in payroll period
      const effectiveDay = effectiveDate.getDate();
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDate() === effectiveDay) return true;
      }
      return false;

    case 'Annually':
      // Apply once per year on payroll week containing effective date's month+day
      const thisYearEffective = new Date(periodStart.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
      return isDateInRange(thisYearEffective, periodStart, periodEnd);

    default:
      return false;
  }
}

/**
 * Calculate the multiplier for frequency-based items
 * Returns how many times to apply the base value
 */
export function calculateFrequencyMultiplier(
  frequency: PayrollFrequency,
  presentDays: number,
  periodStart: Date,
  periodEnd: Date
): number {
  switch (frequency) {
    case 'Once':
      return 1;
    case 'Daily':
      // Multiply by active weekdays WITH attendance (present days)
      return presentDays;
    case 'Weekly':
      return 1;
    case 'Monthly':
      return 1;
    case 'Annually':
      return 1;
    default:
      return 0;
  }
}

// ============================================================================
// PAYROLL CALCULATION
// ============================================================================

/**
 * Calculate basic pay based on present days
 * basic_rate is treated as DAILY rate regardless of rate_type in HR
 * This is per the requirement: Basic Pay = basic_rate × number of Present days
 */
export function calculateBasicPay(basicRate: number, presentDays: number): number {
  return basicRate * presentDays;
}

/**
 * Count present days from attendance records within the payroll period
 */
export function countPresentDays(attendances: HREmployeeAttendance[], periodStart: Date, periodEnd: Date): number {
  return attendances.filter(att => {
    const attDate = parseDateString(att.date);
    return att.status === 'Present' && isDateInRange(attDate, periodStart, periodEnd);
  }).length;
}

/**
 * Calculate total applicable benefits for a payroll period
 */
export function calculateTotalBenefits(
  benefits: HREmployeeBenefit[],
  periodStart: Date,
  periodEnd: Date,
  presentDays: number
): number {
  let total = 0;

  for (const benefit of benefits) {
    if (!shouldApplyItemForWeek(benefit, periodStart, periodEnd)) continue;

    const value = parseFloat(benefit.value);
    const multiplier = calculateFrequencyMultiplier(benefit.frequency, presentDays, periodStart, periodEnd);
    total += value * multiplier;
  }

  return total;
}

/**
 * Calculate total applicable deductions for a payroll period
 */
export function calculateTotalDeductions(
  deductions: HREmployeeDeduction[],
  periodStart: Date,
  periodEnd: Date,
  presentDays: number
): number {
  let total = 0;

  for (const deduction of deductions) {
    if (!shouldApplyItemForWeek(deduction, periodStart, periodEnd)) continue;

    const value = parseFloat(deduction.value);
    const multiplier = calculateFrequencyMultiplier(deduction.frequency, presentDays, periodStart, periodEnd);
    total += value * multiplier;
  }

  return total;
}

/**
 * Calculate complete payroll for an employee
 * Formula: Weekly Payroll = (Basic Pay) + (Sum of Benefits) - (Sum of Deductions)
 */
export function calculateEmployeePayroll(
  employee: HREmployeeData,
  periodStart: Date,
  periodEnd: Date
): { basicPay: number; benefits: number; deductions: number; grossPay: number; netPay: number; presentDays: number } {
  const basicRate = parseFloat(employee.basic_rate);
  const presentDays = countPresentDays(employee.attendances, periodStart, periodEnd);

  const basicPay = calculateBasicPay(basicRate, presentDays);
  const benefits = calculateTotalBenefits(employee.benefits, periodStart, periodEnd, presentDays);
  const deductions = calculateTotalDeductions(employee.deductions, periodStart, periodEnd, presentDays);

  const grossPay = basicPay + benefits;
  const netPay = grossPay - deductions;

  return { basicPay, benefits, deductions, grossPay, netPay, presentDays };
}

// ============================================================================
// HR API INTEGRATION
// ============================================================================

/**
 * Fetch payroll data from HR API
 */
export async function fetchPayrollFromHR(
  periodStart: string,
  periodEnd: string
): Promise<HRPayrollAPIResponse> {
  const params = new URLSearchParams({
    payroll_period_start: periodStart,
    payroll_period_end: periodEnd,
  });

  const url = `${HR_PAYROLL_API_URL}?${params.toString()}`;
  console.log(`🔄 Fetching payroll from HR: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HR API returned ${response.status}: ${response.statusText}`);
  }

  return await response.json() as HRPayrollAPIResponse;
}

// ============================================================================
// DATABASE SYNC OPERATIONS
// ============================================================================

/**
 * Fetch payroll data from HR API and sync to database
 * This is the main entry point for payroll synchronization
 * 
 * @param periodStart - Start date (YYYY-MM-DD), should be Monday
 * @param periodEnd - End date (YYYY-MM-DD), should be Saturday
 * @param employeeNumber - Optional specific employee filter
 */
export async function fetchAndSyncPayrollFromHR(
  periodStart: string,
  periodEnd: string,
  employeeNumber?: string
): Promise<{ success: boolean; synced: number; errors: string[]; periodId: number }> {
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // Fetch from HR API
    const data = await fetchPayrollFromHR(periodStart, periodEnd);

    // Filter by employee if specified
    const employeesToSync = employeeNumber
      ? data.employees.filter(e => e.employee_number === employeeNumber)
      : data.employees;

    // Find or create payroll period
    const payrollPeriodCode = `${periodStart}_${periodEnd}`;

    // Look for existing period by code (not unique, so use findFirst)
    let payrollPeriod = await prisma.payroll_period.findFirst({
      where: {
        payroll_period_code: payrollPeriodCode,
        is_deleted: false,
      },
    });

    if (payrollPeriod) {
      // Update existing period
      payrollPeriod = await prisma.payroll_period.update({
        where: { id: payrollPeriod.id },
        data: {
          period_start: new Date(data.payroll_period_start),
          period_end: new Date(data.payroll_period_end),
          total_employees: employeesToSync.length,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new period
      payrollPeriod = await prisma.payroll_period.create({
        data: {
          payroll_period_code: payrollPeriodCode,
          period_start: new Date(data.payroll_period_start),
          period_end: new Date(data.payroll_period_end),
          total_employees: employeesToSync.length,
          status: 'DRAFT',
        },
      });
    }

    const periodStartDate = new Date(data.payroll_period_start);
    const periodEndDate = new Date(data.payroll_period_end);

    // Process each employee's payroll
    for (const empPayroll of employeesToSync) {
      try {
        await syncEmployeePayroll(payrollPeriod.id, empPayroll, periodStartDate, periodEndDate);
        syncedCount++;
      } catch (error: any) {
        errors.push(`${empPayroll.employee_number}: ${error.message}`);
        console.error(`Error syncing payroll for ${empPayroll.employee_number}:`, error);
      }
    }

    // Update period totals
    await updatePayrollPeriodTotals(payrollPeriod.id);

    console.log(`✅ Payroll sync complete: ${syncedCount}/${employeesToSync.length} employees synced`);
    return { success: errors.length === 0, synced: syncedCount, errors, periodId: payrollPeriod.id };

  } catch (error: any) {
    console.error('❌ Payroll sync failed:', error);
    throw error;
  }
}

/**
 * Sync individual employee payroll data
 */
async function syncEmployeePayroll(
  payrollPeriodId: number,
  empPayroll: HREmployeeData,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Calculate payroll
  const calc = calculateEmployeePayroll(empPayroll, periodStart, periodEnd);

  // Map rate_type to enum
  const rateTypeMap: Record<string, string> = {
    'Weekly': 'WEEKLY',
    'Monthly': 'MONTHLY',
    'Daily': 'DAILY',
    'Semi-Monthly': 'SEMI_MONTHLY',
  };
  const rateType = rateTypeMap[empPayroll.rate_type] || 'DAILY';

  // Ensure employee exists in employees_cache before creating payroll record
  // This prevents foreign key constraint violations
  await prisma.employees_cache.upsert({
    where: {
      employee_number: empPayroll.employee_number,
    },
    update: {
      last_synced_at: new Date(),
    },
    create: {
      employee_number: empPayroll.employee_number,
      first_name: null,
      middle_name: null,
      last_name: null,
      position_name: 'Unknown', // Required field - will be updated by HR sync
      department_id: 0,         // Required field - will be updated by HR sync
      department_name: 'Unknown', // Required field - will be updated by HR sync
      last_synced_at: new Date(),
      is_deleted: false,
    },
  });

  // Upsert payroll record
  const payroll = await prisma.payroll.upsert({
    where: {
      payroll_period_id_employee_number: {
        payroll_period_id: payrollPeriodId,
        employee_number: empPayroll.employee_number,
      },
    },
    update: {
      rate_type: rateType as any,
      basic_rate: parseFloat(empPayroll.basic_rate),
      gross_pay: calc.grossPay,
      total_deductions: calc.deductions,
      net_pay: calc.netPay,
      updated_at: new Date(),
    },
    create: {
      payroll_period_id: payrollPeriodId,
      employee_number: empPayroll.employee_number,
      rate_type: rateType as any,
      basic_rate: parseFloat(empPayroll.basic_rate),
      gross_pay: calc.grossPay,
      total_deductions: calc.deductions,
      net_pay: calc.netPay,
      status: 'PENDING',
    },
  });

  // Clear and re-sync attendance
  await syncAttendances(payroll.id, empPayroll.attendances, periodStart, periodEnd);

  // Clear and re-sync benefits/deductions items
  await syncPayrollItems(payroll.id, empPayroll.benefits, empPayroll.deductions, periodStart, periodEnd, calc.presentDays);
}

/**
 * Sync attendance records for an employee
 */
async function syncAttendances(
  payrollId: number,
  attendances: HREmployeeAttendance[],
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Delete existing attendances for this payroll
  await prisma.payroll_attendance.deleteMany({
    where: { payroll_id: payrollId },
  });

  // Filter attendances within period and insert
  const filteredAttendances = attendances.filter(att => {
    const attDate = parseDateString(att.date);
    return isDateInRange(attDate, periodStart, periodEnd);
  });

  if (filteredAttendances.length > 0) {
    await prisma.payroll_attendance.createMany({
      data: filteredAttendances.map(att => ({
        payroll_id: payrollId,
        date: new Date(att.date),
        status: att.status,
      })),
    });
  }
}

/**
 * Sync benefits and deductions as payroll items
 */
async function syncPayrollItems(
  payrollId: number,
  benefits: HREmployeeBenefit[],
  deductions: HREmployeeDeduction[],
  periodStart: Date,
  periodEnd: Date,
  presentDays: number
): Promise<void> {
  // Delete existing items for this payroll
  await prisma.payroll_item.deleteMany({
    where: { payroll_id: payrollId },
  });

  // Process benefits
  for (const benefit of benefits) {
    if (!shouldApplyItemForWeek(benefit, periodStart, periodEnd)) continue;

    const value = parseFloat(benefit.value);
    const multiplier = calculateFrequencyMultiplier(benefit.frequency, presentDays, periodStart, periodEnd);
    const amount = value * multiplier;

    // Find or create item type
    const itemType = await prisma.payroll_item_type.upsert({
      where: { code: `BENEFIT_${benefit.name.toUpperCase().replace(/\s+/g, '_')}` },
      update: { name: benefit.name, category: 'BENEFIT' },
      create: {
        code: `BENEFIT_${benefit.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: benefit.name,
        category: 'BENEFIT',
      },
    });

    await prisma.payroll_item.create({
      data: {
        payroll_id: payrollId,
        item_type_id: itemType.id,
        amount: amount,
        category: 'BENEFIT',
        frequency: benefit.frequency,
        effective_date: new Date(benefit.effective_date),
        end_date: benefit.end_date ? new Date(benefit.end_date) : null,
        is_active: benefit.is_active,
      },
    });
  }

  // Process deductions
  for (const deduction of deductions) {
    if (!shouldApplyItemForWeek(deduction, periodStart, periodEnd)) continue;

    const value = parseFloat(deduction.value);
    const multiplier = calculateFrequencyMultiplier(deduction.frequency, presentDays, periodStart, periodEnd);
    const amount = value * multiplier;

    // Find or create item type
    const itemType = await prisma.payroll_item_type.upsert({
      where: { code: `DEDUCTION_${deduction.name.toUpperCase().replace(/\s+/g, '_')}` },
      update: { name: deduction.name, category: 'DEDUCTION' },
      create: {
        code: `DEDUCTION_${deduction.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: deduction.name,
        category: 'DEDUCTION',
      },
    });

    await prisma.payroll_item.create({
      data: {
        payroll_id: payrollId,
        item_type_id: itemType.id,
        amount: amount,
        category: 'DEDUCTION',
        frequency: deduction.frequency,
        effective_date: new Date(deduction.effective_date),
        end_date: deduction.end_date ? new Date(deduction.end_date) : null,
        is_active: deduction.is_active,
      },
    });
  }
}

/**
 * Update payroll period totals
 */
async function updatePayrollPeriodTotals(periodId: number): Promise<void> {
  const payrolls = await prisma.payroll.findMany({
    where: {
      payroll_period_id: periodId,
      is_deleted: false,
    },
  });

  const totalGross = payrolls.reduce((sum, p) => sum + Number(p.gross_pay), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.total_deductions), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + Number(p.net_pay), 0);

  await prisma.payroll_period.update({
    where: { id: periodId },
    data: {
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
      total_employees: payrolls.length,
    },
  });
}

/**
 * Sync payroll data for existing period (recalculate from stored HR data)
 */
export async function syncPayrollForPeriod(
  periodId: number
): Promise<{ success: boolean; synced: number }> {
  const period = await prisma.payroll_period.findUnique({
    where: { id: periodId },
    include: {
      payrolls: {
        include: {
          payroll_items: true,
          payroll_attendances: true,
        },
      },
    },
  });

  if (!period) {
    throw new Error(`Payroll period ${periodId} not found`);
  }

  // Update period totals based on stored data
  await updatePayrollPeriodTotals(periodId);

  return { success: true, synced: period.payrolls.length };
}

/**
 * Get payroll data by period
 */
export async function getPayrollByPeriod(
  periodStart: string,
  periodEnd: string
) {
  return await prisma.payroll_period.findFirst({
    where: {
      period_start: new Date(periodStart),
      period_end: new Date(periodEnd),
      is_deleted: false,
    },
    include: {
      payrolls: {
        where: { is_deleted: false },
        include: {
          employee: true,
          payroll_items: {
            where: { is_deleted: false },
            include: { item_type: true },
          },
          payroll_attendances: {
            where: { is_deleted: false },
          },
        },
      },
    },
  });
}

/**
 * Get payroll data by employee
 */
export async function getPayrollByEmployee(
  employeeNumber: string,
  periodStart?: string,
  periodEnd?: string
) {
  const whereClause: any = {
    employee_number: employeeNumber,
    is_deleted: false,
  };

  if (periodStart && periodEnd) {
    whereClause.payroll_period = {
      period_start: { gte: new Date(periodStart) },
      period_end: { lte: new Date(periodEnd) },
    };
  }

  return await prisma.payroll.findMany({
    where: whereClause,
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
    orderBy: {
      payroll_period: { period_start: 'desc' },
    },
  });
}

/**
 * Get current week's payroll period (Monday to Saturday)
 */
export function getCurrentWeeklyPeriod(): { start: string; end: string } {
  const now = new Date();
  const monday = getWeekMonday(now);
  const saturday = getWeekSaturday(now);
  return {
    start: formatDateString(monday),
    end: formatDateString(saturday),
  };
}

/**
 * Get weekly periods for a given month
 */
export function getWeeklyPeriodsForMonth(year: number, month: number): Array<{ start: string; end: string; weekNumber: number }> {
  const periods: Array<{ start: string; end: string; weekNumber: number }> = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentMonday = getWeekMonday(firstDay);
  let weekNumber = 1;

  while (currentMonday <= lastDay) {
    const saturday = getWeekSaturday(currentMonday);

    // Only include if at least part of the week is in the target month
    if (saturday >= firstDay && currentMonday <= lastDay) {
      periods.push({
        start: formatDateString(currentMonday),
        end: formatDateString(saturday),
        weekNumber,
      });
    }

    currentMonday.setDate(currentMonday.getDate() + 7);
    weekNumber++;
  }

  return periods;
}
