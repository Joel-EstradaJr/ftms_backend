import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/operations/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'
import { createRevenueFromBusTrip } from '@/lib/revenues/createFromBusTrip'

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { assignment_id, bus_trip_id, category_id, total_amount, collection_date, created_by, source_ref } = data;

  try {
    // If creating from BusTripID, delegate to helper aligned with Operations API
    if (bus_trip_id) {
      const created = await createRevenueFromBusTrip({
        bus_trip_id,
        created_by,
        collection_date: collection_date || undefined,
      });
      return NextResponse.json(created);
    }

    const finalAmount = total_amount;
    let assignmentData = null;

    // Convert collection_date string to Date object for comparison and storage, default to today
    const collectionDateTime = collection_date ? new Date(collection_date) : new Date();
    
    // Validate that the collection_date is not in the future
    const now = new Date();
    if (collectionDateTime > now) {
      return NextResponse.json(
        { error: 'Collection date cannot be in the future' },
        { status: 400 }
      );
    }

    // --- ANTI-DUPLICATE LOGIC ---
    if (assignment_id) {
      // Check for duplicate revenue record for the same assignment and collection_date (with time precision)
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          assignment_id,
          collection_date: collectionDateTime,
          category_id,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this assignment and collection date/time already exists.' },
          { status: 409 }
        );
      }
      assignmentData = await getAssignmentById(assignment_id);
      if (!assignmentData) {
        return NextResponse.json(
          { error: 'Assignment not found in Operations API' },
          { status: 404 }
        );
      }
    } else {
      // For non-assignment revenues, check for duplicate by category, amount, and exact datetime
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          category_id,
          total_amount: finalAmount,
          collection_date: collectionDateTime,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this category, amount and collection date/time already exists.' },
          { status: 409 }
        );
      }
    }

    const newRevenue = await prisma.revenueRecord.create({
      data: {
        revenue_id: await generateId('REV'),
        assignment_id: assignment_id ?? null,
        bus_trip_id: assignmentData?.bus_trip_id ?? null,
        category_id,
        source_id: null,
        source_ref: source_ref ?? null,
        total_amount: finalAmount,
        collection_date: collectionDateTime,
        created_by,
      },
      include: {
        category: true,
        source: true,
      }
    });

    await logAudit({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: newRevenue.revenue_id,
      performed_by: created_by,
      details: `Created revenue record with amount ₱${finalAmount} for ${collectionDateTime.toISOString()}`,
    });

    return NextResponse.json(newRevenue);
  } catch (error) {
    console.error('Failed to create revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dateFilter = searchParams.get('dateFilter');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  let dateCondition = {};

  if (dateFilter) {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateCondition = {
          collection_date: {
            gte: startOfDay,
            lt: endOfDay
          }
        };
        break;
      case 'Month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateCondition = {
          collection_date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };
        break;
      case 'Year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateCondition = {
          collection_date: {
            gte: startOfYear,
            lte: endOfYear
          }
        };
        break;
    }
  } else if (dateFrom && dateTo) {
    // Convert date strings to full datetime range
    const fromDateTime = new Date(dateFrom);
    fromDateTime.setHours(0, 0, 0, 0);
    
    const toDateTime = new Date(dateTo);
    toDateTime.setHours(23, 59, 59, 999);
    
    dateCondition = {
      collection_date: {
        gte: fromDateTime,
        lte: toDateTime
      }
    };
  }

  const revenues = await prisma.revenueRecord.findMany({ 
    where: { 
      is_deleted: false,
      ...dateCondition
    },
    include: {
      category: true,
      source: true,
    },
    orderBy: { created_at: 'desc' }
  });
  
  return NextResponse.json(revenues);
}