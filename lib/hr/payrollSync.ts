/**
 * PAYROLL SYNCHRONIZATION UTILITY
 * 
 * Handles syncing payroll data from external HR system to Finance database
 * Endpoint: https://api.agilabuscorp.me/finance/v2/payroll-integration
 * Supports fetching by period and optional employee filtering
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Payroll Data Interface (from External HR System)
 */
interface ExternalPayrollPayload {
  payroll_period_start: string; // YYYY-MM-DD
  payroll_period_end: string;   // YYYY-MM-DD
  employees: ExternalEmployeePayroll[];
  count: number;
}

interface ExternalEmployeePayroll {
  employee_number: string;
  basic_rate: string; // Decimal as string
  rate_type: string;  // Weekly, Monthly, etc.
  attendances: ExternalAttendance[];
  benefits: ExternalBenefitDeduction[];
  deductions: ExternalBenefitDeduction[];
}

interface ExternalAttendance {
  date: string; // YYYY-MM-DD
  status: string; // Present, Absent, etc.
}

interface ExternalBenefitDeduction {
  name: string;
  value: string; // Decimal as string
  frequency: string; // Once, Daily, Weekly, Monthly, Annually
  effective_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD or null
  is_active: boolean;
}

/**
 * Fetch payroll data from HR API and sync to database
 * @param periodStart - Start date (YYYY-MM-DD)
 * @param periodEnd - End date (YYYY-MM-DD)
 * @param employeeNumber - Optional specific employee filter
 * @param apiUrl - Optional custom API URL (for testing)
 */
export async function fetchAndSyncPayrollFromHR(
  periodStart: string,
  periodEnd: string,
  employeeNumber?: string,
  apiUrl?: string
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const baseUrl = apiUrl || `${process.env.HR_API_BASE_URL}${process.env.HR_PAYROLL_ENDPOINT}`;
  
  if (!baseUrl || baseUrl.includes('undefined')) {
    throw new Error('HR Payroll API URL not configured. Please set HR_API_BASE_URL and HR_PAYROLL_ENDPOINT in .env');
  }

  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // Build query parameters
    const params = new URLSearchParams({
      payroll_period_start: periodStart,
      payroll_period_end: periodEnd,
    });
    if (employeeNumber) {
      params.append('employee_number', employeeNumber);
    }

    const url = `${baseUrl}?${params.toString()}`;
    console.log(`Fetching payroll from HR: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HR API returned ${response.status}: ${response.statusText}`);
    }

    const data: ExternalPayrollPayload = await response.json();
    
    // Find or create payroll period
    const payrollPeriod = await prisma.payroll_period.upsert({
      where: {
        payroll_period_code: `${periodStart}_${periodEnd}`,
      },
      update: {
        period_start: new Date(data.payroll_period_start),
        period_end: new Date(data.payroll_period_end),
        total_employees: data.count,
        updated_at: new Date(),
      },
      create: {
        payroll_period_code: `${periodStart}_${periodEnd}`,
        period_start: new Date(data.payroll_period_start),
        period_end: new Date(data.payroll_period_end),
        total_employees: data.count,
        status: 'DRAFT',
      },
    });

    // Process each employee's payroll
    for (const empPayroll of data.employees) {
      try {
        await syncEmployeePayroll(payrollPeriod.id, empPayroll);
        syncedCount++;
      } catch (error: any) {
        errors.push(`${empPayroll.employee_number}: ${error.message}`);
        console.error(`Error syncing payroll for ${empPayroll.employee_number}:`, error);
      }
    }

    // Update period totals
    await updatePayrollPeriodTotals(payrollPeriod.id);

    console.log(`✅ Payroll sync complete: ${syncedCount}/${data.count} employees synced`);
    return { success: errors.length === 0, synced: syncedCount, errors };

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
  empPayroll: ExternalEmployeePayroll
): Promise<void> {
  const basicRate = parseFloat(empPayroll.basic_rate);
  
  // Map rate_type to enum
  const rateTypeMap: Record<string, string> = {
    'Weekly': 'WEEKLY',
    'Monthly': 'MONTHLY',
    'Daily': 'DAILY',
    'Hourly': 'HOURLY',
  };
  const rateType = rateTypeMap[empPayroll.rate_type] || 'MONTHLY';

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
      basic_rate: basicRate,
      updated_at: new Date(),
    },
    create: {
      payroll_period_id: payrollPeriodId,
      employee_number: empPayroll.employee_number,
      rate_type: rateType as any,
      basic_rate: basicRate,
      status: 'PENDING',
    },
  });

  // Sync attendances
  await syncAttendances(payroll.id, empPayroll.attendances);

  // Sync benefits
  await syncBenefitsDeductions(payroll.id, empPayroll.benefits, 'BENEFIT');

  // Sync deductions
  await syncBenefitsDeductions(payroll.id, empPayroll.deductions, 'DEDUCTION');

  // Recalculate payroll totals
  await calculatePayrollTotals(payroll.id);
}

/**
 * Sync attendance records for an employee
 */
async function syncAttendances(
  payrollId: number,
  attendances: ExternalAttendance[]
): Promise<void> {
  // Delete existing attendances for this payroll
  await prisma.payroll_attendance.deleteMany({
    where: { payroll_id: payrollId },
  });

  // Insert new attendances
  if (attendances.length > 0) {
    await prisma.payroll_attendance.createMany({
      data: attendances.map(att => ({
        payroll_id: payrollId,
        date: new Date(att.date),
        status: att.status,
      })),
    });
  }
}

/**
 * Sync benefits or deductions
 */
async function syncBenefitsDeductions(
  payrollId: number,
  items: ExternalBenefitDeduction[],
  category: 'BENEFIT' | 'DEDUCTION'
): Promise<void> {
  for (const item of items) {
    // Find or create item type
    const itemType = await prisma.payroll_item_type.upsert({
      where: { code: `${category}_${item.name.toUpperCase().replace(/\s+/g, '_')}` },
      update: {
        name: item.name,
        category: category,
      },
      create: {
        code: `${category}_${item.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: item.name,
        category: category,
      },
    });

    // Create payroll item
    await prisma.payroll_item.create({
      data: {
        payroll_id: payrollId,
        item_type_id: itemType.id,
        amount: parseFloat(item.value),
        category: category,
        frequency: item.frequency,
        effective_date: new Date(item.effective_date),
        end_date: item.end_date ? new Date(item.end_date) : null,
        is_active: item.is_active,
      },
    });
  }
}

/**
 * Calculate gross, deductions, and net for a payroll record
 */
async function calculatePayrollTotals(payrollId: number): Promise<void> {
  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      payroll_items: {
        where: { is_active: true, is_deleted: false },
      },
    },
  });

  if (!payroll) return;

  const basicRate = Number(payroll.basic_rate || 0);
  
  // Calculate benefits total
  const benefitsTotal = payroll.payroll_items
    .filter(item => item.category === 'BENEFIT')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // Calculate deductions total
  const deductionsTotal = payroll.payroll_items
    .filter(item => item.category === 'DEDUCTION')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const grossPay = basicRate + benefitsTotal;
  const netPay = grossPay - deductionsTotal;

  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      gross_pay: grossPay,
      total_deductions: deductionsTotal,
      net_pay: netPay,
    },
  });
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
    },
  });
}

/**
 * Sync payroll data for existing period (manual sync from cached data)
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

  // Recalculate all payroll totals
  for (const payroll of period.payrolls) {
    await calculatePayrollTotals(payroll.id);
  }

  // Update period totals
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
