/**
 * Admin Bus Trip Revenue API Route
 * Handles listing available bus trips and creating revenue from bus trips
 * Path: /api/admin/revenue/bus-trips
 * Admin-only access - full CRUD permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/shared/auditLogger';

/**
 * GET /api/admin/revenue/bus-trips
 * List available bus trips that haven't had revenue recorded yet
 * Admin-only: Can view all bus trips
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    
    // Filters
    const assignmentType = params.get('assignmentType'); // "Percentage", "Boundary"
    const dateFrom = params.get('dateFrom');
    const dateTo = params.get('dateTo');
    const limit = Math.max(1, Math.min(100, parseInt(params.get('limit') || '50', 10)));
    const includeRecorded = params.get('includeRecorded') === 'true';

    // Build WHERE clause
    const where: any = {};

    // Filter by revenue recorded status
    if (!includeRecorded) {
      where.isRevenueRecorded = false;
    }

    // Filter by assignment type
    if (assignmentType) {
      where.assignmentType = {
        equals: assignmentType,
        mode: 'insensitive',
      };
    }

    // Date range filter (default: recent 90 days if not specified)
    if (dateFrom || dateTo) {
      where.dateAssigned = {};
      if (dateFrom) {
        where.dateAssigned.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.dateAssigned.lte = end;
      }
    } else {
      // Default: recent 90 days
      const since = new Date();
      since.setDate(since.getDate() - 90);
      where.dateAssigned = { gte: since };
    }

    // Fetch bus trips
    const busTrips = await prisma.busTripCache.findMany({
      where,
      orderBy: { dateAssigned: 'desc' },
      take: limit,
      select: {
        id: true,
        assignmentId: true,
        busTripId: true,
        busRoute: true,
        dateAssigned: true,
        tripRevenue: true,
        tripFuelExpense: true,
        assignmentType: true,
        assignmentValue: true,
        paymentMethod: true,
        driverName: true,
        conductorName: true,
        driverEmployeeNumber: true,
        conductorEmployeeNumber: true,
        busPlateNumber: true,
        busType: true,
        bodyNumber: true,
        isRevenueRecorded: true,
        isExpenseRecorded: true,
        tripStatus: true,
      },
    });

    return NextResponse.json({
      busTrips,
      count: busTrips.length,
    });
  } catch (error) {
    console.error('[Admin] Error fetching bus trips:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bus trips',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/revenue/bus-trips
 * Create revenue from a bus trip
 * Admin-only: Can create revenue from any bus trip
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { busTripCacheId, userId, overrideAmount, sourceId, paymentMethodId, remarks } = body;

    // Validate required fields
    if (!busTripCacheId) {
      return NextResponse.json(
        { error: 'Bus trip cache ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch the bus trip
    const busTrip = await prisma.busTripCache.findUnique({
      where: { id: busTripCacheId },
    });

    if (!busTrip) {
      return NextResponse.json(
        { error: 'Bus trip not found' },
        { status: 404 }
      );
    }

    // Check if revenue already recorded
    if (busTrip.isRevenueRecorded) {
      return NextResponse.json(
        { error: 'Revenue already recorded for this bus trip' },
        { status: 400 }
      );
    }

    // Determine the amount (use override if provided, otherwise use trip revenue)
    const amount = overrideAmount || parseFloat(busTrip.tripRevenue.toString());

    // Get or find BUS_TRIP revenue source
    let revenueSource;
    if (sourceId) {
      revenueSource = await prisma.revenueSource.findUnique({
        where: { id: sourceId },
      });
      if (!revenueSource || !revenueSource.isActive) {
        return NextResponse.json(
          { error: 'Invalid revenue source' },
          { status: 400 }
        );
      }
    } else {
      // Find or create BUS_TRIP source
      revenueSource = await prisma.revenueSource.findFirst({
        where: {
          sourceCode: 'BUS_TRIP',
          isActive: true,
        },
      });

      if (!revenueSource) {
        return NextResponse.json(
          { error: 'BUS_TRIP revenue source not found. Please create it first.' },
          { status: 400 }
        );
      }
    }

    // Get payment method (use provided or default to Cash)
    let paymentMethod;
    if (paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId },
      });
      if (!paymentMethod || !paymentMethod.isActive) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }
    } else {
      // Default to Cash
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          methodCode: 'CASH',
          isActive: true,
        },
      });

      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Default payment method (CASH) not found' },
          { status: 400 }
        );
      }
    }

    // Create the revenue record
    const revenue = await prisma.revenue.create({
      data: {
        sourceId: revenueSource.id,
        description: `Bus Trip Revenue - ${busTrip.busRoute} on ${busTrip.dateAssigned.toLocaleDateString()}`,
        amount,
        transactionDate: busTrip.dateAssigned,
        paymentMethodId: paymentMethod.id,
        busTripCacheId: busTrip.id,
        externalRefType: 'BUS_TRIP',
        externalRefId: busTrip.assignmentId,
        createdBy: userId,
        documentIds: remarks || null,
      },
      include: {
        source: true,
        paymentMethod: true,
        busTripCache: true,
      },
    });

    // Update bus trip cache
    await prisma.busTripCache.update({
      where: { id: busTripCacheId },
      data: { isRevenueRecorded: true },
    });

    // Create audit log
    const ipAddress = await getClientIp(req);
    await prisma.auditLog.create({
      data: {
        userId,
        userName: userId,
        action: 'CREATE',
        module: 'REVENUE',
        recordId: revenue.id,
        recordType: 'Revenue',
        afterData: revenue as any,
        description: `[Admin] Created revenue from bus trip: ${busTrip.assignmentId}`,
        ipAddress,
        revenueId: revenue.id,
      },
    });

    return NextResponse.json(
      {
        message: 'Revenue created from bus trip successfully',
        revenue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin] Error creating revenue from bus trip:', error);
    return NextResponse.json(
      {
        error: 'Failed to create revenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
