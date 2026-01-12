/**
 * RENTAL TRIP SYNC LIBRARY
 * Functions for syncing rental trip data from external Operations system
 */

import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import axios from 'axios';

// Environment configuration
const OPERATIONS_API_BASE_URL = process.env.OPERATIONS_API_BASE_URL || 'https://boms-api.agilabuscorp.me';

export interface RentalTripInput {
    assignment_id: string;
    bus_plate_number?: string;
    bus_type?: string;
    body_number?: string | null;
    rental_status?: string;
    rental_details?: {
        rental_package?: string;
        rental_start_date?: string;
        rental_end_date?: string;
        total_rental_amount?: number;
        down_payment_amount?: number;
        balance_amount?: number;
        down_payment_date?: string;
        full_payment_date?: string;
        cancelled_at?: string | null;
        cancellation_reason?: string | null;
    };
    employees?: Array<{
        employee_id?: string;
        employee_firstName?: string | null;
        employee_middleName?: string | null;
        employee_lastName?: string | null;
        employee_position_name?: string;
    }>;
    is_revenue_recorded?: boolean;
    is_expense_recorded?: boolean;
}

export interface SyncResult {
    success: number;
    failed: number;
    errors: Array<{ trip_id: string; error: string }>;
}

export interface FetchAndSyncResult {
    success: boolean;
    total: number;
    synced: number;
    failed: number;
    errors?: Array<{ trip_id: string; error: string }>;
    error?: string;
}

/**
 * Sync rental trips in bulk from external system
 */
export async function syncRentalTripsBulk(trips: RentalTripInput[]): Promise<SyncResult> {
    const result: SyncResult = {
        success: 0,
        failed: 0,
        errors: [],
    };

    for (const trip of trips) {
        try {
            const rentalDetails = trip.rental_details || {};

            await prisma.rental_trip.upsert({
                where: {
                    assignment_id: trip.assignment_id,
                },
                create: {
                    assignment_id: trip.assignment_id,
                    bus_plate_number: trip.bus_plate_number || null,
                    bus_type: trip.bus_type || null,
                    body_number: trip.body_number || null,
                    rental_status: trip.rental_status || null,
                    rental_destination: rentalDetails.rental_package || null,
                    rental_start_date: rentalDetails.rental_start_date
                        ? new Date(rentalDetails.rental_start_date)
                        : null,
                    rental_end_date: rentalDetails.rental_end_date
                        ? new Date(rentalDetails.rental_end_date)
                        : null,
                    total_rental_amount: rentalDetails.total_rental_amount ?? null,
                    down_payment_amount: rentalDetails.down_payment_amount ?? null,
                    balance_amount: rentalDetails.balance_amount ?? null,
                    down_payment_date: rentalDetails.down_payment_date
                        ? new Date(rentalDetails.down_payment_date)
                        : null,
                    full_payment_date: rentalDetails.full_payment_date
                        ? new Date(rentalDetails.full_payment_date)
                        : null,
                    cancelled_at: rentalDetails.cancelled_at
                        ? new Date(rentalDetails.cancelled_at)
                        : null,
                    cancellation_reason: rentalDetails.cancellation_reason || null,
                    employees: trip.employees ? JSON.stringify(trip.employees) : null,
                    is_revenue_recorded: trip.is_revenue_recorded ?? false,
                    is_expense_recorded: trip.is_expense_recorded ?? false,
                    last_synced_at: new Date(),
                },
                update: {
                    bus_plate_number: trip.bus_plate_number || null,
                    bus_type: trip.bus_type || null,
                    body_number: trip.body_number || null,
                    rental_status: trip.rental_status || null,
                    rental_destination: rentalDetails.rental_package || null,
                    rental_start_date: rentalDetails.rental_start_date
                        ? new Date(rentalDetails.rental_start_date)
                        : null,
                    rental_end_date: rentalDetails.rental_end_date
                        ? new Date(rentalDetails.rental_end_date)
                        : null,
                    total_rental_amount: rentalDetails.total_rental_amount ?? null,
                    down_payment_amount: rentalDetails.down_payment_amount ?? null,
                    balance_amount: rentalDetails.balance_amount ?? null,
                    down_payment_date: rentalDetails.down_payment_date
                        ? new Date(rentalDetails.down_payment_date)
                        : null,
                    full_payment_date: rentalDetails.full_payment_date
                        ? new Date(rentalDetails.full_payment_date)
                        : null,
                    cancelled_at: rentalDetails.cancelled_at
                        ? new Date(rentalDetails.cancelled_at)
                        : null,
                    cancellation_reason: rentalDetails.cancellation_reason || null,
                    employees: trip.employees ? JSON.stringify(trip.employees) : null,
                    is_revenue_recorded: trip.is_revenue_recorded ?? false,
                    is_expense_recorded: trip.is_expense_recorded ?? false,
                    last_synced_at: new Date(),
                },
            });
            result.success++;
        } catch (error) {
            result.failed++;
            result.errors.push({
                trip_id: trip.assignment_id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error(`[RentalTripSync] Failed to sync trip ${trip.assignment_id}:`, error);
        }
    }

    logger.info(`[RentalTripSync] Sync completed: ${result.success} success, ${result.failed} failed`);
    return result;
}

/**
 * Get rental trips that haven't been recorded as revenue or expense
 */
export async function getUnrecordedRentalTrips() {
    return prisma.rental_trip.findMany({
        where: {
            is_deleted: false,
            OR: [
                { is_revenue_recorded: false },
                { is_expense_recorded: false },
            ],
        },
        orderBy: { rental_start_date: 'desc' },
    });
}

/**
 * Get rental trips by status
 */
export async function getRentalTripsByStatus(status: string) {
    return prisma.rental_trip.findMany({
        where: {
            is_deleted: false,
            rental_status: status,
        },
        orderBy: { rental_start_date: 'desc' },
    });
}

/**
 * Fetch rental trips from external Operations API and sync
 */
export async function fetchAndSyncRentalTripsFromOperations(): Promise<FetchAndSyncResult> {
    try {
        const url = `${OPERATIONS_API_BASE_URL}/api/Rental-Request-Details`;
        logger.info(`[RentalTripSync] Fetching rental trips from ${url}`);

        const response = await axios.get(url, { timeout: 30000 });
        const trips = response.data;

        if (!Array.isArray(trips)) {
            return {
                success: false,
                total: 0,
                synced: 0,
                failed: 0,
                error: 'Invalid response from Operations API: expected array',
            };
        }

        const result = await syncRentalTripsBulk(trips);

        return {
            success: true,
            total: trips.length,
            synced: result.success,
            failed: result.failed,
            errors: result.errors.length > 0 ? result.errors : undefined,
        };
    } catch (error) {
        logger.error('[RentalTripSync] Failed to fetch and sync rental trips:', error);
        return {
            success: false,
            total: 0,
            synced: 0,
            failed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
