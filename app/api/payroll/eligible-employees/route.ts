import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const HR_API_PAYROLL_URL = process.env.HR_API_PAYROLL_URL;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const payrollPeriod = searchParams.get('payrollPeriod')?.toLowerCase();

    if (!start || !end || !payrollPeriod) {
      return NextResponse.json({ success: false, error: 'Missing required params' }, { status: 400 });
    }

    // Fetch all HR payroll data for the date range
    const hrRes = await fetch(`${HR_API_PAYROLL_URL}?start=${start}&end=${end}`);
    if (!hrRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch HR data' }, { status: 500 });
    }
    const hrEmployees: unknown[] = await hrRes.json();

    // Get payroll frequency config for all employees
    const configs: Array<{employee_number: string; payroll_period: string}> = await prisma.payrollFrequencyConfig.findMany();
    const configMap = new Map(configs.map(cfg => [cfg.employee_number, cfg.payroll_period.toLowerCase()]));

    // Filter employees by payroll period
    const eligible = hrEmployees.filter((emp) => {
      const employee = emp as Record<string, unknown>;
      const empPeriod = configMap.get(employee.employeeNumber as string) || 'monthly';
      return empPeriod === payrollPeriod;
    });

    return NextResponse.json({ success: true, employees: eligible });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 