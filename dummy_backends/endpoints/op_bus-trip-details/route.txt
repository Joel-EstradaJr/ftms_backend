// endpoints\clean\op_bus-trip-details\route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/client';
import { withCors } from '@/lib/withcors';
import { authenticateRequest } from '@/lib/auth';

const getAssignmentSummary = async (request: NextRequest) => {
  const { error, token, status } = await authenticateRequest(request);
  // Auth disabled for testing - uncomment for production
  // if (error) {
  //   return NextResponse.json({ error }, { status });
  // }

  const { searchParams } = new URL(request.url);
  const filterBy = searchParams.get("RequestType")?.toLowerCase(); // "revenue", "expense", or null

  // Build trip condition dynamically (same logic as raw endpoint)
  const tripConditions: any = {
    TripExpense: { not: null },
    Sales: { not: null },
  };

  // Apply extra condition based on filterBy
  if (filterBy === "revenue") {
    tripConditions.IsRevenueRecorded = false;
  } else if (filterBy === "expense") {
    tripConditions.IsExpenseRecorded = false;
  } else {
    // Default: filter those that are not fully recorded
    tripConditions.OR = [
      { IsRevenueRecorded: false },
      { IsExpenseRecorded: false },
    ];
  }

  try {
    // Fetch assignments with bus trips (matching raw endpoint structure)
    const assignments = await prisma.busAssignment.findMany({
      where: {
        IsDeleted: false,
        RegularBusAssignment: {
          BusTrips: {
            some: tripConditions,
          },
        },
      },
      select: {
        BusAssignmentID: true,
        BusID: true,
        Route: { select: { RouteName: true } },
        RegularBusAssignment: {
          select: {
            DriverID: true,
            ConductorID: true,
            driver: { select: { firstName: true, lastName: true } },
            conductor: { select: { firstName: true, lastName: true } },
            BusTrips: {
              where: tripConditions,
              select: {
                BusTripID: true,
                DispatchedAt: true,
                TripExpense: true,
                Sales: true,
                Payment_Method: true,
                IsExpenseRecorded: true,
                IsRevenueRecorded: true,
              },
            },
            QuotaPolicies: {
              select: {
                StartDate: true,
                EndDate: true,
                Fixed: { select: { Quota: true } },
                Percentage: { select: { Percentage: true } },
              },
            },
          },
        },
        // Get bus details from our unified schema
        Bus: {
          select: {
            plate_number: true,
            bus_type: true,
            body_number: true,
          },
        },
      },
    });

    // Process results to match raw endpoint output structure
    const result = assignments.flatMap(a => {
      const busTrips = a.RegularBusAssignment?.BusTrips || [];
      const quotaPolicies = a.RegularBusAssignment?.QuotaPolicies || [];
      const driver = a.RegularBusAssignment?.driver;
      const conductor = a.RegularBusAssignment?.conductor;
      const bus = a.Bus;

      return busTrips.map(trip => {
        let quotaPolicy = null;
        if (trip?.DispatchedAt) {
          quotaPolicy = quotaPolicies.find(qp =>
            qp.StartDate && qp.EndDate &&
            trip.DispatchedAt != null &&
            trip.DispatchedAt >= qp.StartDate &&
            trip.DispatchedAt <= qp.EndDate
          );
        }

        let assignment_type = null;
        let assignment_value = null;
        if (quotaPolicy?.Fixed) {
          assignment_type = 'Boundary';
          assignment_value = quotaPolicy.Fixed.Quota;
        } else if (quotaPolicy?.Percentage) {
          assignment_type = 'Percentage';
          assignment_value = quotaPolicy.Percentage.Percentage;
        } else {
          assignment_type = 'Bus Rental';
          assignment_value = null;
        }

        // Output structure matching raw endpoint exactly
        return {
          assignment_id: a.BusAssignmentID,
          bus_trip_id: trip.BusTripID,
          bus_route: a.Route?.RouteName || null,
          is_revenue_recorded: trip?.IsRevenueRecorded ?? false,
          is_expense_recorded: trip?.IsExpenseRecorded ?? false,
          date_assigned: trip?.DispatchedAt?.toISOString() ?? null,
          trip_fuel_expense: trip?.TripExpense ? Number(trip.TripExpense) : null,
          trip_revenue: trip?.Sales ? Number(trip.Sales) : null,
          assignment_type,
          assignment_value,
          payment_method: trip?.Payment_Method ?? null,
          driver_name: driver ? `${driver.firstName} ${driver.lastName}` : null,
          conductor_name: conductor ? `${conductor.firstName} ${conductor.lastName}` : null,
          bus_plate_number: bus?.plate_number ?? null,
          bus_type: bus?.bus_type ?? null,
          body_number: bus?.body_number ?? null,
        };
      });
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('BUS_TRIP_DETAILS_ERROR', err);
    return NextResponse.json(
      { error: 'Failed to fetch bus trip details', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

const patchHandler = async (request: NextRequest) => {
  const { user, error, status } = await authenticateRequest(request);
  // Auth disabled for testing - uncomment for production
  // if (error) {
  //   return NextResponse.json({ error }, { status });
  // }

  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an array of records' }, { status: 400 });
    }

    const updates = body.filter((item) => typeof item?.bus_trip_id === 'string');

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid bus_trip_id values found' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      updates.map((item) => {
        const updateData: Record<string, any> = {
          UpdatedBy: user?.employeeId || null,
        };

        if ('IsRevenueRecorded' in item && typeof item.IsRevenueRecorded === 'boolean') {
          updateData.IsRevenueRecorded = item.IsRevenueRecorded;
        }

        if ('IsExpenseRecorded' in item && typeof item.IsExpenseRecorded === 'boolean') {
          updateData.IsExpenseRecorded = item.IsExpenseRecorded;
        }

        if (Object.keys(updateData).length <= 1) {
          // Only UpdatedBy is included, skip this update.
          return Promise.reject(new Error('No update fields provided'));
        }

        return prisma.busTrip.update({
          where: { BusTripID: item.bus_trip_id },
          data: updateData,
          select: {
            BusTripID: true,
            IsRevenueRecorded: true,
            IsExpenseRecorded: true,
            UpdatedBy: true,
          },
        });
      })
    );

    const updated = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const failed = results
      .map((r, i) => ({ result: r, id: updates[i]?.bus_trip_id }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, id }) => ({
        bus_trip_id: id,
        reason: (result as PromiseRejectedResult).reason?.message || 'Update failed',
      }));

    return NextResponse.json({ updated, failed }, { status: 200 });
  } catch (error) {
    console.error('PATCH_BUS_TRIP_FLAGS_ERROR', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const GET = withCors(getAssignmentSummary);
export const PATCH = withCors(patchHandler);
export const OPTIONS = withCors(() => Promise.resolve(new NextResponse(null, { status: 204 })));
