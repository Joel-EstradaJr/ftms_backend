import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertBoundaryLoanForRevenue } from '@/lib/loans';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const revenue = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id: id }, include: { category: true } });
    if (!revenue) return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    const name = (revenue.category?.name || '').replace(/_/g, ' ').trim();
    if (name !== 'Boundary') return NextResponse.json({ message: 'Loan generation only applies to Boundary' }, { status: 400 });
    if (!revenue.assignment_id) return NextResponse.json({ error: 'Assignment required for Boundary' }, { status: 400 });
    const assignment = await (prisma as any).assignmentCache.findUnique({ where: { assignment_id: revenue.assignment_id } });
    const assignment_value = Number(assignment?.assignment_value || 0);
    const trip_revenue = Number(assignment?.trip_revenue || 0);
    const total_amount = Number(revenue.total_amount || 0);
    const result = await upsertBoundaryLoanForRevenue({ revenue_id: id, assignment_value, trip_revenue, total_amount });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate loan' }, { status: 500 });
  }
}
