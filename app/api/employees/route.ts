// ftms_deployed\app\api\employees\route.ts
import { NextResponse } from 'next/server';
import { fetchEmployeesForReimbursement } from '@/lib/hr/employees';

// GET - Return all employees from HR API
export async function GET() {
  try {
    // Fetch directly from HR API
    const employees = await fetchEmployeesForReimbursement();
    
    return NextResponse.json(employees);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    console.error('Failed to fetch employees:', errorMessage);
    
    // Graceful fallback: return empty array with diagnostic header so UI can continue
    const res = NextResponse.json([], { status: 200 });
    res.headers.set('X-API-Status', 'error-fallback');
    res.headers.set('X-API-Error', errorMessage);
    return res;
  }
} 