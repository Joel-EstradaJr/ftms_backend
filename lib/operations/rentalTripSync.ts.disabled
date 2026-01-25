/**
 * RENTAL TRIP SYNCHRONIZATION UTILITY (Operations System)
 * 
 * Syncs rental trip data from external Operations system to Finance database
 * Endpoint: https://boms-api.agilabuscorp.me/api/Rental-Request-Details
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Rental Trip Employee Interface
 */
interface RentalTripEmployee {
  employee_id: string;
  employee_firstName: string | null;
  employee_middleName: string | null;
  employee_lastName: string | null;
  employee_position_name: string;
}

/**
 * Rental Details Interface
 */
interface RentalDetails {
  rental_package: string;
  rental_start_date: string;
  rental_end_date: string;
  total_rental_amount: number;
  down_payment_amount: number | null;
  balance_amount: number | null;
  down_payment_date: string | null;
  full_payment_date: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

/**
 * Rental Trip Data Interface (from External Operations System)
 */
interface ExternalRentalTripPayload {
  assignment_id: string;
  bus_plate_number: string;
  bus_type: string;
  body_number: string;
  rental_status: string;
  rental_details: RentalDetails;
  employees: RentalTripEmployee[];
}

/**
 * Sync single rental trip from Operations system
 */
export async function syncRentalTrip(tripData: ExternalRentalTripPayload) {
  try {
    const result = await prisma.rental_trip.upsert({
      where: {
        assignment_id: tripData.assignment_id,
      },
      update: {
        bus_plate_number: tripData.bus_plate_number,
        bus_type: tripData.bus_type,
        body_number: tripData.body_number === 'Unknown' ? null : tripData.body_number,
        rental_status: tripData.rental_status,
        rental_destination: tripData.rental_details.rental_package,
        rental_start_date: tripData.rental_details.rental_start_date 
          ? new Date(tripData.rental_details.rental_start_date) 
          : null,
        rental_end_date: tripData.rental_details.rental_end_date 
          ? new Date(tripData.rental_details.rental_end_date) 
          : null,
        total_rental_amount: tripData.rental_details.total_rental_amount,
        down_payment_amount: tripData.rental_details.down_payment_amount,
        balance_amount: tripData.rental_details.balance_amount,
        down_payment_date: tripData.rental_details.down_payment_date 
          ? new Date(tripData.rental_details.down_payment_date) 
          : null,
        full_payment_date: tripData.rental_details.full_payment_date 
          ? new Date(tripData.rental_details.full_payment_date) 
          : null,
        cancelled_at: tripData.rental_details.cancelled_at 
          ? new Date(tripData.rental_details.cancelled_at) 
          : null,
        cancellation_reason: tripData.rental_details.cancellation_reason,
        employees: tripData.employees.length > 0 
          ? JSON.stringify(tripData.employees) 
          : null,
        last_synced_at: new Date(),
        is_deleted: false,
      },
      create: {
        assignment_id: tripData.assignment_id,
        bus_plate_number: tripData.bus_plate_number,
        bus_type: tripData.bus_type,
        body_number: tripData.body_number === 'Unknown' ? null : tripData.body_number,
        rental_status: tripData.rental_status,
        rental_destination: tripData.rental_details.rental_package,
        rental_start_date: tripData.rental_details.rental_start_date 
          ? new Date(tripData.rental_details.rental_start_date) 
          : null,
        rental_end_date: tripData.rental_details.rental_end_date 
          ? new Date(tripData.rental_details.rental_end_date) 
          : null,
        total_rental_amount: tripData.rental_details.total_rental_amount,
        down_payment_amount: tripData.rental_details.down_payment_amount,
        balance_amount: tripData.rental_details.balance_amount,
        down_payment_date: tripData.rental_details.down_payment_date 
          ? new Date(tripData.rental_details.down_payment_date) 
          : null,
        full_payment_date: tripData.rental_details.full_payment_date 
          ? new Date(tripData.rental_details.full_payment_date) 
          : null,
        cancelled_at: tripData.rental_details.cancelled_at 
          ? new Date(tripData.rental_details.cancelled_at) 
          : null,
        cancellation_reason: tripData.rental_details.cancellation_reason,
        employees: tripData.employees.length > 0 
          ? JSON.stringify(tripData.employees) 
          : null,
        last_synced_at: new Date(),
      },
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error syncing rental trip:', error);
    return { success: false, error };
  }
}

/**
 * Sync multiple rental trips in bulk
 */
export async function syncRentalTripsBulk(trips: ExternalRentalTripPayload[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const trip of trips) {
    const result = await syncRentalTrip(trip);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        assignment_id: trip.assignment_id,
        error: result.error,
      });
    }
  }

  return results;
}

/**
 * Fetch and sync rental trips from Operations API
 */
export async function fetchAndSyncRentalTripsFromOperations(apiUrl?: string) {
  try {
    const baseUrl = apiUrl || `${process.env.OP_API_BASE_URL}${process.env.OP_RENTAL_TRIPS_ENDPOINT}`;
    
    if (!baseUrl || baseUrl.includes('undefined')) {
      throw new Error('Operations API URL not configured. Please set OP_API_BASE_URL and OP_RENTAL_TRIPS_ENDPOINT in .env');
    }
    
    const response = await fetch(baseUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const trips = await response.json() as ExternalRentalTripPayload[];
    
    if (!Array.isArray(trips)) {
      throw new Error('Invalid response format from Operations API');
    }

    const result = await syncRentalTripsBulk(trips);
    
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
 * Get unrecorded rental trips (for revenue/expense processing)
 */
export async function getUnrecordedRentalTrips() {
  return await prisma.rental_trip.findMany({
    where: {
      OR: [
        { is_revenue_recorded: false },
        { is_expense_recorded: false },
      ],
      is_deleted: false,
    },
    orderBy: {
      rental_start_date: 'desc',
    },
  });
}

/**
 * Mark rental trip as revenue recorded
 */
export async function markRentalTripRevenueRecorded(assignmentId: string) {
  return await prisma.rental_trip.update({
    where: {
      assignment_id: assignmentId,
    },
    data: {
      is_revenue_recorded: true,
    },
  });
}

/**
 * Mark rental trip as expense recorded
 */
export async function markRentalTripExpenseRecorded(assignmentId: string) {
  return await prisma.rental_trip.update({
    where: {
      assignment_id: assignmentId,
    },
    data: {
      is_expense_recorded: true,
    },
  });
}

/**
 * Get rental trips by status
 */
export async function getRentalTripsByStatus(status: string) {
  return await prisma.rental_trip.findMany({
    where: {
      rental_status: status,
      is_deleted: false,
    },
    orderBy: {
      rental_start_date: 'desc',
    },
  });
}

/**
 * Parse employees from JSON field
 */
export function parseRentalTripEmployees(rental_trip: any): RentalTripEmployee[] {
  if (!rental_trip.employees) return [];
  
  try {
    return JSON.parse(rental_trip.employees);
  } catch (error) {
    console.error('Error parsing rental trip employees:', error);
    return [];
  }
}

/**
 * Example Usage:
 * 
 * // Fetch and sync from Operations API
 * await fetchAndSyncRentalTripsFromOperations();
 * 
 * // Get unrecorded trips for processing
 * const unprocessed = await getUnrecordedRentalTrips();
 * 
 * // After recording revenue
 * await markRentalTripRevenueRecorded("BA-xyz123");
 * 
 * // Get approved rentals
 * const approved = await getRentalTripsByStatus('approved');
 * 
 * // Parse employees from rental trip
 * const employees = parseRentalTripEmployees(rentalTrip);
 */
