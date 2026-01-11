/**
 * OPERATIONAL TRIP SYNCHRONIZATION UTILITY
 * 
 * Handles syncing bus trip data from external Operations system to Finance database
 * Supports upsert operations to keep data fresh
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Bus Trip Data Interface (from External Operations System)
 */
interface ExternalBusTripPayload {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string; // ISO datetime
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: 'BOUNDARY' | 'PERCENTAGE' | string;
  assignment_value: number;
  payment_method: 'Company_Cash' | 'Reimbursement' | string;
  employee_driver: any; // JSON or null
  employee_conductor: any; // JSON or null
  bus_plate_number: string;
  bus_type: 'Aircon' | 'Non-Aircon' | string;
  body_number: string | null;
}

/**
 * Sync single bus trip from external system
 */
export async function syncOperationalTrip(tripData: ExternalBusTripPayload) {
  try {
    const result = await prisma.operational_trip.upsert({
      where: {
        assignment_id_bus_trip_id: {
          assignment_id: tripData.assignment_id,
          bus_trip_id: tripData.bus_trip_id,
        },
      },
      update: {
        bus_route: tripData.bus_route,
        is_revenue_recorded: tripData.is_revenue_recorded,
        is_expense_recorded: tripData.is_expense_recorded,
        date_assigned: new Date(tripData.date_assigned),
        trip_fuel_expense: tripData.trip_fuel_expense,
        trip_revenue: tripData.trip_revenue,
        assignment_type: tripData.assignment_type,
        assignment_value: tripData.assignment_value,
        payment_method: tripData.payment_method,
        employee_driver: tripData.employee_driver ? JSON.stringify(tripData.employee_driver) : null,
        employee_conductor: tripData.employee_conductor ? JSON.stringify(tripData.employee_conductor) : null,
        bus_plate_number: tripData.bus_plate_number,
        bus_type: tripData.bus_type,
        body_number: tripData.body_number,
        last_synced_at: new Date(),
        is_deleted: false,
      },
      create: {
        assignment_id: tripData.assignment_id,
        bus_trip_id: tripData.bus_trip_id,
        bus_route: tripData.bus_route,
        is_revenue_recorded: tripData.is_revenue_recorded,
        is_expense_recorded: tripData.is_expense_recorded,
        date_assigned: new Date(tripData.date_assigned),
        trip_fuel_expense: tripData.trip_fuel_expense,
        trip_revenue: tripData.trip_revenue,
        assignment_type: tripData.assignment_type,
        assignment_value: tripData.assignment_value,
        payment_method: tripData.payment_method,
        employee_driver: tripData.employee_driver ? JSON.stringify(tripData.employee_driver) : null,
        employee_conductor: tripData.employee_conductor ? JSON.stringify(tripData.employee_conductor) : null,
        bus_plate_number: tripData.bus_plate_number,
        bus_type: tripData.bus_type,
        body_number: tripData.body_number,
        last_synced_at: new Date(),
      },
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error syncing operational trip:', error);
    return { success: false, error };
  }
}

/**
 * Sync multiple bus trips in bulk (recommended for batch operations)
 */
export async function syncOperationalTripsBulk(trips: ExternalBusTripPayload[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const trip of trips) {
    const result = await syncOperationalTrip(trip);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        assignment_id: trip.assignment_id,
        bus_trip_id: trip.bus_trip_id,
        error: result.error,
      });
    }
  }

  return results;
}

/**
 * Fetch and sync bus trips from Operations API
 */
export async function fetchAndSyncBusTripsFromOperations(apiUrl?: string) {
  try {
    const baseUrl = apiUrl || `${process.env.OP_API_BASE_URL}${process.env.OP_BUS_TRIPS_ENDPOINT}`;
    
    if (!baseUrl || baseUrl.includes('undefined')) {
      throw new Error('Operations API URL not configured. Please set OP_API_BASE_URL and OP_BUS_TRIPS_ENDPOINT in .env');
    }
    
    const response = await fetch(baseUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const trips: ExternalBusTripPayload[] = await response.json();
    
    if (!Array.isArray(trips)) {
      throw new Error('Invalid response format from Operations API');
    }

    const result = await syncOperationalTripsBulk(trips);
    
    return {
      success: true,
      total: trips.length,
      synced: result.success,
      failed: result.failed,
      errors: result.errors,
    };
  } catch (error) {
    console.error('Error fetching from Operations API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get unrecorded trips (for revenue/expense processing)
 */
export async function getUnrecordedTrips() {
  return await prisma.operational_trip.findMany({
    where: {
      OR: [
        { is_revenue_recorded: false },
        { is_expense_recorded: false },
      ],
      is_deleted: false,
    },
    orderBy: {
      date_assigned: 'desc',
    },
  });
}

/**
 * Mark trip as revenue recorded
 */
export async function markTripRevenueRecorded(assignmentId: string, busTripId: string) {
  return await prisma.operational_trip.update({
    where: {
      assignment_id_bus_trip_id: {
        assignment_id: assignmentId,
        bus_trip_id: busTripId,
      },
    },
    data: {
      is_revenue_recorded: true,
    },
  });
}

/**
 * Mark trip as expense recorded
 */
export async function markTripExpenseRecorded(assignmentId: string, busTripId: string) {
  return await prisma.operational_trip.update({
    where: {
      assignment_id_bus_trip_id: {
        assignment_id: assignmentId,
        bus_trip_id: busTripId,
      },
    },
    data: {
      is_expense_recorded: true,
    },
  });
}

/**
 * Example Usage:
 * 
 * // Sync single trip
 * await syncOperationalTrip(externalPayload);
 * 
 * // Sync bulk trips
 * await syncOperationalTripsBulk(externalPayloadArray);
 * 
 * // Fetch and sync from Operations API
 * await fetchAndSyncBusTripsFromOperations();
 * 
 * // Get unrecorded trips for processing
 * const unprocessed = await getUnrecordedTrips();
 * 
 * // After recording revenue
 * await markTripRevenueRecorded("BA-xyz", "BT-abc");
 */
