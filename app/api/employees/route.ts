// ftms_deployed\app\api\employees\route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Return all employees from local cache (EmployeeCache)
export async function GET() {
  try {
    const rows = await (prisma as any).employeeCache.findMany({
      orderBy: { last_synced_at: 'desc' },
    });

    const employees = rows.map((e: any) => ({
      employee_id: e.employee_number,
      name: [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
      job_title: e.position,
      department: e.department,
      phone: e.phone || undefined,
    }));

    const res = NextResponse.json(employees, { status: 200 });
    // Small cache to reduce duplicate calls during idle periods
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.headers.set('X-API-Source', 'EmployeeCache');
    res.headers.set('X-Total-Count', String(employees.length));
    return res;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal Server Error';

    console.error('Failed to read employees from cache:', errorMessage);

    // Graceful fallback: return empty array so UI can continue
    const res = NextResponse.json([], { status: 200 });
    res.headers.set('X-API-Status', 'error-fallback');
    res.headers.set('X-API-Error', errorMessage);
    return res;
  }
}