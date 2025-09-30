// app\api\assignments\route.ts
import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Prefer serving from local cache to minimize external calls
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const rows = await (prisma as any).busTripCache.findMany({
      where: { date_assigned: { gte: since } },
      orderBy: { date_assigned: 'desc' },
    });
    const assignments = rows.map((r: any) => ({
      assignment_id: r.assignment_id,
      bus_trip_id: r.bus_trip_id,
      bus_route: r.bus_route,
      is_revenue_recorded: Boolean(r.is_revenue_recorded),
      is_expense_recorded: Boolean(r.is_expense_recorded),
      date_assigned: r.date_assigned?.toISOString?.() ?? r.date_assigned,
      trip_fuel_expense: Number(r.trip_fuel_expense) || 0,
      trip_revenue: Number(r.trip_revenue) || 0,
      assignment_type: r.assignment_type,
      assignment_value: Number(r.assignment_value) || 0,
      payment_method: r.payment_method || '',
      driver_name: r.driver_name || null,
      conductor_name: r.conductor_name || null,
      bus_plate_number: r.bus_plate_number || null,
      bus_type: r.bus_type || null,
      body_number: r.body_number || null,
      driver_id: r.driver_name || undefined,
      conductor_id: r.conductor_name || undefined,
    }));
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const total = assignments.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = assignments.slice(start, end);
    
    // If assignments is empty, it means the API failed but we're returning empty array as fallback
    if (assignments.length === 0) {
      console.warn('Assignments cache is empty - API may be unavailable or cache not populated yet');
      const res = NextResponse.json([], { 
        status: 200,
        headers: {
          'X-API-Status': 'fallback-empty',
          'X-API-Message': 'Assignments cache empty, returning empty list'
        }
      });
      res.headers.set('X-Total-Count', '0');
      res.headers.set('X-Page', String(page));
      res.headers.set('X-Limit', String(limit));
      res.headers.set('X-Total-Pages', '1');
      return res;
    }
    
  const res = NextResponse.json(paged);
    res.headers.set('X-Total-Count', String(total));
    res.headers.set('X-Page', String(page));
    res.headers.set('X-Limit', String(limit));
    res.headers.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / limit))));
  // Allow brief client/proxy caching to reduce repeat fetches during idle periods
  res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (error: unknown) {
    console.error('Failed to fetch assignments from Operations API:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    // Return empty array with error status instead of throwing
    const res = NextResponse.json([], { 
      status: 200,
      headers: {
        'X-API-Status': 'error-fallback',
        'X-API-Error': errorMessage
      }
    });
    res.headers.set('X-Total-Count', '0');
    res.headers.set('X-Page', '1');
    res.headers.set('X-Limit', '10');
    res.headers.set('X-Total-Pages', '1');
    return res;
  }
}