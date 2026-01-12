/**
 * OPERATIONAL TRIP SYNC LIBRARY
 * Functions for syncing operational trip data from external Operations system
 */

import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import axios from 'axios';

// Environment configuration
const OPERATIONS_API_BASE_URL = process.env.OPERATIONS_API_BASE_URL || 'https://boms-api.agilabuscorp.me';

export interface OperationalTripInput {
    assignment_id: string;
    bus_trip_id: string;
    bus_route?: string;
    is_revenue_recorded?: boolean;
    is_expense_recorded?: boolean;
    date_assigned?: string;
    trip_fuel_expense?: number;
    trip_revenue?: number;
    assignment_type?: string;
    assignment_value?: number;
    payment_method?: string;
    employee_driver?: string | null;
    employee_conductor?: string | null;
    bus_plate_number?: string;
    bus_type?: string;
    body_number?: string | null;
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
 * Sync operational trips in bulk from external system
 */
export async function syncOperationalTripsBulk(trips: OperationalTripInput[]): Promise<SyncResult> {
    const result: SyncResult = {
        success: 0,
        failed: 0,
        errors: [],
    };

    for (const trip of trips) {
        try {
            await prisma.operational_trip.upsert({
                where: {
                    assignment_id_bus_trip_id: {
                        assignment_id: trip.assignment_id,
                        bus_trip_id: trip.bus_trip_id,
                    },
                },
                create: {
                    assignment_id: trip.assignment_id,
                    bus_trip_id: trip.bus_trip_id,
                    bus_route: trip.bus_route || null,
                    is_revenue_recorded: trip.is_revenue_recorded ?? false,
                    is_expense_recorded: trip.is_expense_recorded ?? false,
                    date_assigned: trip.date_assigned ? new Date(trip.date_assigned) : null,
                    trip_fuel_expense: trip.trip_fuel_expense ?? null,
                    trip_revenue: trip.trip_revenue ?? null,
                    assignment_type: trip.assignment_type || null,
                    assignment_value: trip.assignment_value ?? null,
                    payment_method: trip.payment_method || null,
                    employee_driver: trip.employee_driver || null,
                    employee_conductor: trip.employee_conductor || null,
                    bus_plate_number: trip.bus_plate_number || null,
                    bus_type: trip.bus_type || null,
                    body_number: trip.body_number || null,
                    last_synced_at: new Date(),
                },
                update: {
                    bus_route: trip.bus_route || null,
                    is_revenue_recorded: trip.is_revenue_recorded ?? false,
                    is_expense_recorded: trip.is_expense_recorded ?? false,
                    date_assigned: trip.date_assigned ? new Date(trip.date_assigned) : null,
                    trip_fuel_expense: trip.trip_fuel_expense ?? null,
                    trip_revenue: trip.trip_revenue ?? null,
                    assignment_type: trip.assignment_type || null,
                    assignment_value: trip.assignment_value ?? null,
                    payment_method: trip.payment_method || null,
                    employee_driver: trip.employee_driver || null,
                    employee_conductor: trip.employee_conductor || null,
                    bus_plate_number: trip.bus_plate_number || null,
                    bus_type: trip.bus_type || null,
                    body_number: trip.body_number || null,
                    last_synced_at: new Date(),
                },
            });
            result.success++;
        } catch (error) {
            result.failed++;
            result.errors.push({
                trip_id: `${trip.assignment_id}/${trip.bus_trip_id}`,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error(`[OperationalTripSync] Failed to sync trip ${trip.assignment_id}/${trip.bus_trip_id}:`, error);
        }
    }

    logger.info(`[OperationalTripSync] Sync completed: ${result.success} success, ${result.failed} failed`);
    return result;
}

/**
 * Get operational trips that haven't been recorded as revenue or expense
 */
export async function getUnrecordedTrips() {
    return prisma.operational_trip.findMany({
        where: {
            is_deleted: false,
            OR: [
                { is_revenue_recorded: false },
                { is_expense_recorded: false },
            ],
        },
        orderBy: { date_assigned: 'desc' },
    });
}

/**
 * Fetch bus trips from external Operations API and sync
 */
export async function fetchAndSyncBusTripsFromOperations(): Promise<FetchAndSyncResult> {
    try {
        const url = `${OPERATIONS_API_BASE_URL}/api/Bus-Trips-Details`;
        logger.info(`[OperationalTripSync] Fetching bus trips from ${url}`);

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

        const result = await syncOperationalTripsBulk(trips);

        return {
            success: true,
            total: trips.length,
            synced: result.success,
            failed: result.failed,
            errors: result.errors.length > 0 ? result.errors : undefined,
        };
    } catch (error) {
        logger.error('[OperationalTripSync] Failed to fetch and sync bus trips:', error);
        return {
            success: false,
            total: 0,
            synced: 0,
            failed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
