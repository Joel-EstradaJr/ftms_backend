import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = { is_deleted: false };
    if (search) {
      where.OR = [
        { employee_name: { contains: search, mode: 'insensitive' } },
        { job_title: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { payroll_period: { contains: search, mode: 'insensitive' } },
      ];
    }

    const totalCount = await prisma.payrollRecord.count({ where });
    const records = await (prisma as any).payrollRecord.findMany({
      where,
      include: {
        payrollPeriod: true,
        payrollStatus: true,
      },
      orderBy: { payroll_start_date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    // map friendly names while preserving existing fields
    const enriched = (records as any[]).map((r: any) => ({
      ...r,
      payroll_period_name: r?.payrollPeriod?.name ?? r?.payroll_period ?? null,
      payroll_status_name: r?.payrollStatus?.name ?? r?.status ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('PATCH /api/payroll - Request received');
    
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const records = Array.isArray(body) ? body : [body];
    console.log('Records to process:', records.length);
    
    const results = [];
    for (const rec of records) {
      console.log('Processing record for employee:', rec.employee_number);
      
      // Prepare data for upsert - convert date strings to Date objects
      const dataToSave = {
        ...rec,
        status: rec.status || 'Released',
        date_released: rec.date_released ? new Date(rec.date_released) : new Date(),
        // Convert string dates to Date objects for Prisma
        payroll_start_date: new Date(rec.payroll_start_date),
        payroll_end_date: new Date(rec.payroll_end_date),
        hire_date: new Date(rec.hire_date),
        termination_date: rec.termination_date ? new Date(rec.termination_date) : null,
        // Handle new signature/remarks fields
        signature: rec.signature || null,
        remarks: rec.remarks || null,
        holiday_adjustment: rec.holiday_adjustment || 0,
        allowance: rec.allowance || 0,
        total_salary: rec.total_salary || rec.net_pay || 0,
      };
      
      console.log('Data to save:', {
        employee_number: dataToSave.employee_number,
        payroll_start_date: dataToSave.payroll_start_date,
        payroll_end_date: dataToSave.payroll_end_date,
        status: dataToSave.status,
        signature: dataToSave.signature,
        remarks: dataToSave.remarks
      });
      
      try {
        // Upsert by unique constraint (employee_number, payroll_start_date, payroll_end_date)
        const saved = await prisma.payrollRecord.upsert({
          where: {
            employee_number_payroll_start_date_payroll_end_date: {
              employee_number: rec.employee_number,
              payroll_start_date: new Date(rec.payroll_start_date),
              payroll_end_date: new Date(rec.payroll_end_date),
            }
          },
          update: dataToSave,
          create: {
            ...dataToSave,
            created_by: rec.released_by || rec.created_by || 'system',
          }
        });
        
        console.log('Successfully saved record for employee:', rec.employee_number);
        results.push(saved);
      } catch (dbError) {
        console.error('Database error for employee', rec.employee_number, ':', dbError);
        throw dbError;
      }
    }
    
    console.log('PATCH completed successfully. Records processed:', results.length);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('PATCH /api/payroll - Error occurred:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}