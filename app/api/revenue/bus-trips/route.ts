import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const category = (params.get('category') || '').replace(/_/g, ' ').trim().toLowerCase();
  const limit = Math.max(1, Math.min(100, parseInt(params.get('limit') || '50', 10)));

  // filter recent 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const where: any = { date_assigned: { gte: since } };
  if (['boundary', 'percentage', 'bus rental'].includes(category)) {
    where.assignment_type = { equals: category, mode: 'insensitive' };
  }

  const rows = await prisma.assignmentCache.findMany({
    where,
    orderBy: { date_assigned: 'desc' },
    take: limit,
  });

  const mapped = rows.map((r) => ({
    assignment_id: r.assignment_id,
    bus_route: r.bus_route,
    bus_type: r.bus_type,
    date_assigned: r.date_assigned,
    trip_revenue: r.trip_revenue,
    assignment_value: r.trip_fuel_expense, // if stored differently, adjust
    assignment_type: (r as any).assignment_type,
    // Placeholders for optional fields that UI expects
    bus_plate_number: (r as any).bus_plate_number,
    body_number: (r as any).body_number,
    driver_name: (r as any).driver_name,
    conductor_name: (r as any).conductor_name,
  }));

  return NextResponse.json(mapped);
}
