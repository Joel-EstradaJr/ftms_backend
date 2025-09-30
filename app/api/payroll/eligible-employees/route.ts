import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const payrollPeriod = searchParams.get('payrollPeriod')?.toLowerCase();

    if (!start || !end || !payrollPeriod) {
      return NextResponse.json({ success: false, error: 'Missing required params' }, { status: 400 });
    }

    // Read employees from local cache (PayrollCache) instead of calling external HR API
    // Note: start/end are accepted for interface compatibility but not used to filter cache rows here
    const cached = await (prisma as any).payrollCache.findMany({
      select: {
        employee_number: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        suffix: true,
        employee_status: true,
        hire_date: true,
        termination_date: true,
        basic_rate: true,
        position_name: true,
        department_name: true,
        attendances: true,
        benefits: true,
        deductions: true,
      },
    });
    const hrEmployees: any[] = cached.map((row: any) => ({
      employeeNumber: row.employee_number,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      suffix: row.suffix,
      employeeStatus: row.employee_status,
      hiredate: row.hire_date,
      terminationDate: row.termination_date,
      basicRate: Number(row.basic_rate) || 0,
      position: { positionName: row.position_name, department: { departmentName: row.department_name } },
      attendances: row.attendances,
      benefits: row.benefits,
      deductions: row.deductions,
    }));

    // Get payroll frequency config for all employees
    const configs = await prisma.payrollFrequencyConfig.findMany({
      select: { employee_number: true, payroll_frequency: true },
    });
    const configMap = new Map(
      configs.map((cfg) => [cfg.employee_number, String(cfg.payroll_frequency).toLowerCase()])
    );

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