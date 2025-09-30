import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Attendance {
  date: string;
  status: string;
}

interface BenefitType {
  name: string;
}

interface DeductionType {
  name: string;
}

interface Benefit {
  benefitType: BenefitType;
  value: string | number;
  frequency: string;
  effectiveDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

interface Deduction {
  deductionType: DeductionType;
  value: string | number;
  frequency: string;
  type?: string;
  effectiveDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

interface Position {
  positionName: string;
  department: {
    departmentName: string;
  };
}

interface HREmployee {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  employeeStatus: string;
  hiredate: string;
  terminationDate?: string | null;
  position?: Position;
  basicRate: string;
  attendances?: Attendance[];
  benefits?: Benefit[];
  deductions?: Deduction[];
}

interface PayrollError {
  employee: string;
  reason: string;
}

interface ProrationItem {
  value: string | number;
  frequency: string;
}

function parseDate(dateStr: string) {
  return new Date(dateStr);
}

function validateBasicRate(rate: string): number | null {
  const num = Number(rate);
  return isNaN(num) || num <= 0 ? null : num;
}

function validateDateRange(start: Date, end: Date): boolean {
  return start <= end;
}

function validateEmployeeStatus(status: string): boolean {
  return Boolean(status) && status.toLowerCase() === 'active';
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function getDaysWorked(attendances: Attendance[], start: Date, end: Date, weekendWorkAllowed: boolean): number {
  return attendances.filter(att => {
    const attDate = new Date(att.date);
    if (!isDateInRange(attDate, start, end)) return false;
    if (att.status !== 'Present') return false;
    if (!weekendWorkAllowed) {
      const day = attDate.getDay();
      if (day === 0 || day === 6) return false; // Sunday=0, Saturday=6
    }
    return true;
  }).length;
}

function getPayrollPeriodConfig(config: any, defaultWorkDays = 22) {
  return {
    defaultWorkDays: config?.default_work_days || defaultWorkDays,
    weekendWorkAllowed: Boolean(config?.weekend_work_allowed) || false,
    holidayWorkRate: Number(config?.holiday_work_rate) || 1.5,
    overtimeRate: Number(config?.overtime_rate) || 1.25,
  };
}

function getProratedAmount(item: ProrationItem, payrollPeriod: string, daysWorked: number, defaultWorkDays: number): number {
  const freq = (item.frequency || '').toLowerCase();
  const value = Number(item.value);
  if (isNaN(value)) return 0;

  if (freq === payrollPeriod.toLowerCase()) {
    return value;
  }
  if (freq === 'monthly' && (payrollPeriod === 'weekly' || payrollPeriod === 'semi-monthly' || payrollPeriod === 'custom')) {
    return value * (daysWorked / defaultWorkDays);
  }
  // Add more rules as needed
  return value; // Default to full value if no proration rule matches
}

function toFrequencyEnum(val: string): 'WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY' {
  const v = val.toLowerCase();
  if (v === 'weekly') return 'WEEKLY';
  if (v === 'semi-monthly' || v === 'semi_monthly' || v === 'semimonthly') return 'SEMI_MONTHLY';
  return 'MONTHLY';
}

type OverlapRecord = {
  payroll_id: string;
  payroll_start_date: Date;
  payroll_end_date: Date;
  status: string;
} | null;

async function hasOverlap(employee_number: string, start: Date, end: Date): Promise<OverlapRecord> {
  try {
    const overlaps = await prisma.payrollRecord.findFirst({
      where: {
        employee_number,
        OR: [
          {
            payroll_start_date: { lte: end },
            payroll_end_date: { gte: start },
          },
        ],
        is_deleted: false,
      },
      select: {
        payroll_id: true,
        payroll_start_date: true,
        payroll_end_date: true,
        status: true,
      }
    });
    
    if (overlaps) {
      console.log(`Overlap found for ${employee_number}:`, {
        existing: {
          start: overlaps.payroll_start_date,
          end: overlaps.payroll_end_date,
          status: overlaps.status
        },
        requested: {
          start,
          end
        }
      });
    }
    
    return overlaps;
  } catch (error) {
    console.error(`Error checking overlap for ${employee_number}:`, error);
    return null;
  }
}

// Mock HR data function
function getMockHREmployees(): HREmployee[] {
  return [
    {
      "employeeNumber": "EMP-2025-OFAFFC",
      "firstName": "Carl",
      "middleName": "Aldrey D.",
      "lastName": "Bergado",
      "suffix": "",
      "employeeStatus": "active",
      "hiredate": "2025-06-27T00:00:00.000Z",
      "terminationDate": null,
      "basicRate": "500",
      "position": {
        "positionName": "HR Officer",
        "department": {
          "departmentName": "Human Resources"
        }
      },
      "attendances": [
        {
          "date": "2025-06-26T00:00:00.000Z",
          "status": "Present"
        },
        {
          "date": "2025-06-28T00:00:00.000Z",
          "status": "Present"
        }
      ],
      "benefits": [
        {
          "benefitType": {
            "name": "Holiday Pay"
          },
          "value": "500",
          "frequency": "monthly",
          "effectiveDate": "2025-06-17T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ],
      "deductions": [
        {
          "deductionType": {
            "name": "Philhealth"
          },
          "type": "fixed",
          "value": "500",
          "frequency": "monthly",
          "effectiveDate": "2025-06-26T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ]
    },
    {
      "employeeNumber": "EMP-2025-1G46NX",
      "firstName": "John Mark",
      "middleName": "Altoveros",
      "lastName": "Garces",
      "suffix": "",
      "employeeStatus": "active",
      "hiredate": "2025-06-26T00:00:00.000Z",
      "terminationDate": null,
      "basicRate": "750",
      "position": {
        "positionName": "Operations Manager",
        "department": {
          "departmentName": "Operations"
        }
      },
      "attendances": [],
      "benefits": [
        {
          "benefitType": {
            "name": "Safety Benefit"
          },
          "value": "500",
          "frequency": "monthly",
          "effectiveDate": "2025-06-24T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ],
      "deductions": [
        {
          "deductionType": {
            "name": "Philhealth"
          },
          "type": "fixed",
          "value": "500",
          "frequency": "monthly",
          "effectiveDate": "2025-06-27T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ]
    },
    {
      "employeeNumber": "EMP-2023-GKYTQR",
      "firstName": "Brian",
      "middleName": "Sanoria",
      "lastName": "Caube",
      "suffix": "",
      "employeeStatus": "active",
      "hiredate": "2023-12-17T00:00:00.000Z",
      "terminationDate": null,
      "basicRate": "700",
      "position": {
        "positionName": "Accountant",
        "department": {
          "departmentName": "Finance"
        }
      },
      "attendances": [],
      "benefits": [
        {
          "benefitType": {
            "name": "Holiday Pay"
          },
          "value": "15000",
          "frequency": "annually",
          "effectiveDate": "2025-06-27T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ],
      "deductions": [
        {
          "deductionType": {
            "name": "SSS"
          },
          "type": "percentage",
          "value": "5",
          "frequency": "monthly",
          "effectiveDate": "2025-06-25T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ]
    },
    {
      "employeeNumber": "EMP-2024-P84Y18",
      "firstName": "Kristine Mae",
      "middleName": "",
      "lastName": "Cleofas",
      "suffix": "",
      "employeeStatus": "active",
      "hiredate": "2024-11-12T00:00:00.000Z",
      "terminationDate": null,
      "basicRate": "900",
      "position": {
        "positionName": "Stockroom Supervisor",
        "department": {
          "departmentName": "Inventory"
        }
      },
      "attendances": [],
      "benefits": [
        {
          "benefitType": {
            "name": "13th Month Pay"
          },
          "value": "20000",
          "frequency": "annually",
          "effectiveDate": "2025-06-28T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ],
      "deductions": [
        {
          "deductionType": {
            "name": "Pag-ibig"
          },
          "type": "fixed",
          "value": "300",
          "frequency": "monthly",
          "effectiveDate": "2025-06-28T00:00:00.000Z",
          "endDate": null,
          "isActive": true
        }
      ]
    }
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { start, end, periodType } = await req.json();
    if (!start || !end || !periodType) {
      return NextResponse.json({ success: false, error: 'Missing start, end, or periodType.' }, { status: 400 });
    }
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!validateDateRange(startDate, endDate)) {
      return NextResponse.json({ success: false, error: 'Invalid date range.' }, { status: 400 });
    }

    // Fetch global payroll config
    const globalConfig = await prisma.payrollConfiguration.findFirst();
    const payrollConfig = getPayrollPeriodConfig(globalConfig);

    // Get HR data directly from mock function
    const hrData: HREmployee[] = getMockHREmployees();

  // Get payroll frequency config for all employees
  const configs = await prisma.payrollFrequencyConfig.findMany({ select: { employee_number: true, payroll_frequency: true } });
  const configMap = new Map(configs.map(cfg => [cfg.employee_number, String(cfg.payroll_frequency).toLowerCase()]));

    // Filter employees by payroll period and active status
    const eligibleEmployees = hrData.filter((emp) => {
      // Check if employee is active
      if (emp.employeeStatus.toLowerCase() !== 'active') {
        return false;
      }

      // Get employee's payroll period from config, default to monthly
      const empPeriod = configMap.get(emp.employeeNumber) || 'monthly';
      
      // Filter by requested payroll period
      return empPeriod === periodType.toLowerCase();
    });

    // Log information about employee filtering
    console.log('Payroll generation details:', {
      totalEmployees: hrData.length,
      activeEmployees: hrData.filter(emp => emp.employeeStatus.toLowerCase() === 'active').length,
      eligibleEmployees: eligibleEmployees.length,
      requestedPeriod: periodType,
      dateRange: { start: startDate, end: endDate }
    });

    if (eligibleEmployees.length === 0) {
      console.log('No eligible employees found. Possible reasons:');
      console.log('- No employees are active');
      console.log('- No employees are configured for the requested payroll period:', periodType);
      console.log('- Employee payroll period configurations:', Array.from(configMap.entries()));
    }

    let generated = 0, skipped = 0, filtered_out = 0;
    const errors: PayrollError[] = [];
    const createdRecords: unknown[] = [];

    for (const emp of eligibleEmployees) {
      // Validation
      if (!validateEmployeeStatus(emp.employeeStatus)) {
        skipped++;
        errors.push({ employee: emp.employeeNumber, reason: 'Inactive status' });
        continue;
      }
      const basicRate = validateBasicRate(emp.basicRate);
      if (!basicRate) {
        skipped++;
        errors.push({ employee: emp.employeeNumber, reason: 'Invalid basicRate' });
        continue;
      }
      
      const payrollPeriod = periodType; // Use the requested period
      const defaultWorkDays = payrollConfig.defaultWorkDays;
      const weekendWorkAllowed = payrollConfig.weekendWorkAllowed;
      
      // Days worked
      const daysWorked = getDaysWorked(emp.attendances || [], startDate, endDate, weekendWorkAllowed);
      
      // Overlap check
      const existingRecord = await hasOverlap(emp.employeeNumber, startDate, endDate);
      if (existingRecord) {
        skipped++;
        const existingStart = existingRecord.payroll_start_date.toLocaleDateString();
        const existingEnd = existingRecord.payroll_end_date.toLocaleDateString();
        const status = existingRecord.status;
        errors.push({ 
          employee: emp.employeeNumber, 
          reason: `Payroll record already exists for ${existingStart} - ${existingEnd} (Status: ${status})` 
        });
        continue;
      }
      // Proration and calculation
      const dailyRate = basicRate / defaultWorkDays;
      const basicPay = dailyRate * daysWorked;
      // Benefits
      const processedBenefits = [];
      const benefitTotals = { revenue_benefit: 0, safety_benefit: 0, additional_benefits: 0, service_incentive_leave: 0, holiday_pay: 0, thirteenth_month_pay: 0 };
      for (const benefit of emp.benefits || []) {
        const prorated = getProratedAmount(benefit as ProrationItem, payrollPeriod, daysWorked, defaultWorkDays);
        processedBenefits.push({ ...benefit, prorated });
        const name = (benefit.benefitType.name || '').toLowerCase();
        if (name.includes('revenue')) benefitTotals.revenue_benefit += prorated;
        else if (name.includes('safety')) benefitTotals.safety_benefit += prorated;
        else if (name.includes('service') || name.includes('leave')) benefitTotals.service_incentive_leave += prorated;
        else if (name.includes('holiday')) benefitTotals.holiday_pay += prorated;
        else if (name.includes('13th') || name.includes('thirteenth')) benefitTotals.thirteenth_month_pay += prorated;
        else benefitTotals.additional_benefits += prorated;
      }
      // Deductions
      const processedDeductions = [];
      const deductionTotals = { sss_deduction: 0, philhealth_deduction: 0, pag_ibig_deduction: 0, cash_advance: 0, damage_shortage: 0, other_deductions: 0 };
      for (const deduction of emp.deductions || []) {
        const prorated = getProratedAmount(deduction as ProrationItem, payrollPeriod, daysWorked, defaultWorkDays);
        processedDeductions.push({ ...deduction, prorated });
        const name = (deduction.deductionType.name || '').toLowerCase();
        if (name.includes('sss')) deductionTotals.sss_deduction += prorated;
        else if (name.includes('philhealth')) deductionTotals.philhealth_deduction += prorated;
        else if (name.includes('pag-ibig') || name.includes('pag ibig')) deductionTotals.pag_ibig_deduction += prorated;
        else if (name.includes('cash') || name.includes('advance')) deductionTotals.cash_advance += prorated;
        else if (name.includes('damage') || name.includes('shortage') || name.includes('short')) deductionTotals.damage_shortage += prorated;
        else deductionTotals.other_deductions += prorated;
      }
      // Totals
      const grossTotalEarnings = basicPay + benefitTotals.revenue_benefit + benefitTotals.safety_benefit + benefitTotals.additional_benefits + benefitTotals.service_incentive_leave + benefitTotals.holiday_pay + benefitTotals.thirteenth_month_pay;
      const totalDeductions = deductionTotals.sss_deduction + deductionTotals.philhealth_deduction + deductionTotals.pag_ibig_deduction + deductionTotals.cash_advance + deductionTotals.damage_shortage + deductionTotals.other_deductions;
      const netPay = grossTotalEarnings - totalDeductions;
      // Calculation notes
      const calculationNotes = `Payroll period: ${payrollPeriod}. Days worked: ${daysWorked}. Daily rate: ${dailyRate.toFixed(2)}. Proration applied for benefits/deductions as needed.`;
      // Resolve global FKs for period and status
      const gf = await (prisma as any).globalFrequency.findFirst({ where: { name: { equals: payrollPeriod, mode: 'insensitive' }, is_deleted: false } });
      const gs = await (prisma as any).globalPayrollStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, is_deleted: false } });

      // Insert PayrollRecord
      const payrollRecord = await prisma.payrollRecord.create({
        data: {
          payroll_id: `payroll_${emp.employeeNumber}_${start}_${end}`,
          employee_number: emp.employeeNumber,
          employee_name: [emp.firstName, emp.middleName, emp.lastName, emp.suffix].filter(Boolean).join(' '),
          first_name: emp.firstName,
          middle_name: emp.middleName || null,
          last_name: emp.lastName,
          suffix: emp.suffix || null,
          employee_status: emp.employeeStatus,
          hire_date: new Date(emp.hiredate),
          termination_date: emp.terminationDate ? new Date(emp.terminationDate) : undefined,
          job_title: emp.position?.positionName || '-',
          department: emp.position?.department?.departmentName || '-',
          payroll_period: toFrequencyEnum(payrollPeriod),
          // Connect to global frequency if available
          ...(gf?.id ? { payrollPeriod: { connect: { id: gf.id } } } : {}),
          payroll_start_date: startDate,
          payroll_end_date: endDate,
          basic_rate: basicRate,
          days_worked: daysWorked,
          basic_pay: basicPay,
          overtime_regular: 0,
          overtime_holiday: 0,
          service_incentive_leave: benefitTotals.service_incentive_leave,
          holiday_pay: benefitTotals.holiday_pay,
          thirteenth_month_pay: benefitTotals.thirteenth_month_pay,
          revenue_benefit: benefitTotals.revenue_benefit,
          safety_benefit: benefitTotals.safety_benefit,
          additional_benefits: benefitTotals.additional_benefits,
          sss_deduction: deductionTotals.sss_deduction,
          philhealth_deduction: deductionTotals.philhealth_deduction,
          pag_ibig_deduction: deductionTotals.pag_ibig_deduction,
          cash_advance: deductionTotals.cash_advance,
          damage_shortage: deductionTotals.damage_shortage,
          other_deductions: deductionTotals.other_deductions,
          gross_total_earnings: grossTotalEarnings,
          total_deductions: totalDeductions,
          net_pay: netPay,
          status: 'PENDING',
          // Connect to global payroll status if available
          ...(gs?.id ? { payrollStatus: { connect: { id: gs.id } } } : {}),
          date_released: null,
          created_by: 'system', // TODO: Use actual user if available
          hr_data_snapshot: emp as any,
          calculation_notes: calculationNotes,
          processed_benefits: processedBenefits as any,
          processed_deductions: processedDeductions as any,

        },
      });
      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'CREATED',
          table_affected: 'PayrollRecord',
          record_id: payrollRecord.payroll_id,
          performed_by: 'system', // TODO: Use actual user if available
          details: { new: payrollRecord },
        },
      });
      generated++;
      createdRecords.push(payrollRecord);
    }
    return NextResponse.json({ success: true, generated, skipped, filtered_out, errors });
  } catch (error) {
    console.error('Payroll generation error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 