import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auditLogger';
import { upsertBoundaryLoanForRevenue } from '@/lib/loans';

type BusTripFromOps = {
  assignment_id: string;
  bus_trip_id: string;
  trip_fuel_expense: number | null;
  trip_revenue: number | null;
  payment_method: string | null;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string | null;
  assignment_type: 'Boundary' | 'Percentage' | 'Bus Rental' | string | null;
  assignment_value: number | null;
};

async function fetchBusTrip(bus_trip_id: string): Promise<BusTripFromOps | null> {
  // First try our local cache for speed and to avoid external traffic
  try {
    const row = await (prisma as any).busTripCache.findFirst({ where: { bus_trip_id } });
    if (row) {
      return {
        assignment_id: row.assignment_id,
        bus_trip_id: row.bus_trip_id,
        trip_fuel_expense: Number(row.trip_fuel_expense) || 0,
        trip_revenue: Number(row.trip_revenue) || 0,
        payment_method: String(row.payment_method || ''),
        is_revenue_recorded: Boolean(row.is_revenue_recorded),
        is_expense_recorded: Boolean(row.is_expense_recorded),
        date_assigned: row.date_assigned?.toISOString() ?? null,
        assignment_type: (row.assignment_type as any) ?? null,
        assignment_value: Number(row.assignment_value) || 0,
      } as BusTripFromOps;
    }
  } catch {}
  // No direct external calls; if not in cache, return null and let callers handle gracefully
  return null;
}

async function resolveCategoryIdByName(name: 'Percentage' | 'Boundary' | 'Bus Rental'): Promise<string> {
  const cat = await prisma.globalCategory.findFirst({ where: { name } } as any);
  if (!cat || !(cat as any).id) throw new Error(`GlobalCategory seed missing: ${name}`);
  return (cat as any).id as string;
}

export async function createRevenueFromBusTrip(params: {
  bus_trip_id: string;
  created_by: string;
  collection_date?: string | Date;
  override_amount?: number; // if provided, use this amount instead of Operations trip revenue
}): Promise<import('@prisma/client').RevenueRecord> {
  const { bus_trip_id, created_by } = params;
  const collection_date = params.collection_date ? new Date(params.collection_date) : new Date();
  const now = new Date();
  if (collection_date > now) throw new Error('Collection date cannot be in the future');

  const trip = await fetchBusTrip(bus_trip_id);
  if (!trip) throw new Error('Bus trip not found in cache');

  // idempotency: check existing record for same assignment + BusTrip
  const assignmentType = trip.assignment_type === 'Boundary' || trip.assignment_type === 'Percentage' || trip.assignment_type === 'Bus Rental'
    ? trip.assignment_type
    : 'Bus Rental';
  const category_id = await resolveCategoryIdByName(assignmentType as any);
  const existing = await prisma.revenueRecord.findFirst({ where: { bus_trip_id, assignment_id: trip.assignment_id, is_deleted: false } });
  if (existing) return existing;

  if (trip.trip_revenue == null && typeof params.override_amount !== 'number') {
    throw new Error('Trip has no revenue (Sales)');
  }

  // Determine category and source mapping based on assignment type
  // category_id already resolved above
  // Resolve default Pending payment status for revenue module (required field)
  const pendingStatus = await prisma.globalPaymentStatus.findFirst({
    where: { name: { equals: 'Pending', mode: 'insensitive' }, applicable_modules: { has: 'revenue' } }
  });
  if (!pendingStatus) {
    throw new Error('Missing Pending payment status for revenue module');
  }

  const created = await prisma.revenueRecord.create({
    data: ({
      revenue_id: await (await import('@/lib/idGenerator')).generateId('REV'),
      assignment_id: trip.assignment_id,
      bus_trip_id: trip.bus_trip_id,
      total_amount: (typeof params.override_amount === 'number' ? params.override_amount : (trip.trip_revenue as unknown as any)),
      created_by,
      collection_date,
      // link required relations via connect
      category: { connect: { id: category_id } },
      payment_status: { connect: { id: pendingStatus.id } },
      // no source_id/source_ref in schema; omit
      is_deleted: false,
    } as any),
    include: { category: true, source: true },
  });

  // Skip external PATCH; webhooks/refresh will align upstream state if needed

  await logAudit({
    action: 'CREATE',
    table_affected: 'RevenueRecord',
    record_id: created.revenue_id,
    performed_by: created_by,
    details: `Created revenue from bus trip ${bus_trip_id} amount ₱${created.total_amount}`,
  });

  // Apply Option 2 Loan for Boundary category
  try {
    if (trip.assignment_type === 'Boundary') {
      const assignment_value = Number(trip.assignment_value) || 0;
      const trip_revenue = Number(trip.trip_revenue) || 0;
      const total_amount = Number(created.total_amount) || 0;
      const loanCalc = await upsertBoundaryLoanForRevenue({
        revenue_id: created.revenue_id,
        assignment_value,
        trip_revenue,
        total_amount,
      });
      console.log('[CREATE BUS TRIP][Revenue] Boundary Option2 loan:', loanCalc);
    }
  } catch (e) {
    console.warn('Loan upsert (bus-trip) failed (non-fatal):', e);
  }

  return created;
}
