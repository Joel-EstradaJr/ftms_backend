import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auditLogger';

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

async function getOpsEndpoint(): Promise<string> {
  const url = process.env.OP_API_BUSTRIP_URL || process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL;
  if (!url) throw new Error('OP_API_BUSTRIP_URL not configured');
  return url;
}

async function fetchBusTrip(bus_trip_id: string): Promise<BusTripFromOps | null> {
  const base = await getOpsEndpoint();
  const res = await fetch(`${base}?RequestType=revenue`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`Operations API error ${res.status}`);
  const data: BusTripFromOps[] = await res.json();
  return data.find(t => t.bus_trip_id === bus_trip_id) ?? null;
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
  if (!trip) throw new Error('Bus trip not found in Operations API');

  // idempotency: check existing record for same BusTrip and category
  const assignmentType = trip.assignment_type === 'Boundary' || trip.assignment_type === 'Percentage' || trip.assignment_type === 'Bus Rental'
    ? trip.assignment_type
    : 'Bus Rental';
  const category_id = await resolveCategoryIdByName(assignmentType as any);
  const existing = await prisma.revenueRecord.findFirst({ where: { bus_trip_id, category_id, is_deleted: false } });
  if (existing) return existing;

  if (trip.trip_revenue == null && typeof params.override_amount !== 'number') {
    throw new Error('Trip has no revenue (Sales)');
  }

  // Determine category and source mapping based on assignment type
  // category_id already resolved above

  const created = await prisma.revenueRecord.create({
    data: ({
      revenue_id: await (await import('@/lib/idGenerator')).generateId('REV'),
      assignment_id: trip.assignment_id,
      bus_trip_id: trip.bus_trip_id,
      total_amount: (typeof params.override_amount === 'number' ? params.override_amount : (trip.trip_revenue as unknown as any)),
      created_by,
      collection_date,
      category_id,
      source_id: null,
      source_ref: trip.bus_trip_id,
      is_deleted: false,
    } as any),
    include: { category: true, source: true },
  });

  try {
    // Patch Operations to mark revenue recorded
    const base = await getOpsEndpoint();
    await fetch(base, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ bus_trip_id, IsRevenueRecorded: true }]),
    });
  } catch (e) {
    // non-fatal
    console.warn('Failed to PATCH Operations API for IsRevenueRecorded', e);
  }

  await logAudit({
    action: 'CREATE',
    table_affected: 'RevenueRecord',
    record_id: created.revenue_id,
    performed_by: created_by,
    details: `Created revenue from bus trip ${bus_trip_id} amount ₱${created.total_amount}`,
  });

  return created;
}
