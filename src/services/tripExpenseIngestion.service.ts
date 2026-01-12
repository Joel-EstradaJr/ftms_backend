// ============================================================================
// TRIP EXPENSE INGESTION SERVICE
// Handles fetching, deduplication, and persistence of expenses from external APIs
// ============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

// ============================================================================
// INTERFACES - External API Response Structures
// ============================================================================

/**
 * External Bus Trip Details from BOMS API
 * Source: https://boms-api.agilabuscorp.me/api/Bus-Trips-Details
 */
interface ExternalBusTripDetails {
    assignment_id: string;
    bus_trip_id: string;
    bus_route: string;
    date_assigned: string;
    trip_fuel_expense: number;
    trip_revenue: number;
    assignment_type: string;
    assignment_value: number;
    payment_method: string;
    employee_driver: any;
    employee_conductor: any;
    bus_plate_number: string;
    bus_type: string;
    body_number: string | null;
}

/**
 * External Rental Request Details from BOMS API
 * Source: https://boms-api.agilabuscorp.me/api/Rental-Request-Details
 */
interface ExternalRentalDetails {
    assignment_id: string;
    bus_plate_number: string;
    bus_type: string;
    body_number: string | null;
    rental_status: string;
    rental_destination: string;
    rental_start_date: string;
    rental_end_date: string;
    total_rental_amount: number;
    down_payment_amount: number;
    balance_amount: number;
    down_payment_date?: string;
    full_payment_date?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
    rental_fuel_expense: number;
    employees?: any;
}

/**
 * Ingestion result summary
 */
interface IngestionResult {
    success: boolean;
    source: 'operational' | 'rental';
    total_fetched: number;
    new_expenses_created: number;
    expenses_updated: number;
    skipped_duplicates: number;
    errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class TripExpenseIngestionService {
    private readonly BOMS_API_BASE = 'https://boms-api.agilabuscorp.me/api';

    // --------------------------------------------------------------------------
    // CODE GENERATION
    // --------------------------------------------------------------------------

    /**
     * Generate unique expense code in format EXP-YYYY-NNNN
     */
    private async generateExpenseCode(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `EXP-${year}-`;

        const lastExpense = await prisma.expense.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1;
        if (lastExpense?.code) {
            const lastNumber = parseInt(lastExpense.code.split('-')[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    // --------------------------------------------------------------------------
    // EXTERNAL API FETCHING
    // --------------------------------------------------------------------------

    /**
     * Fetch operational trip data from BOMS API
     */
    async fetchOperationalTripsFromAPI(): Promise<ExternalBusTripDetails[]> {
        try {
            const url = `${this.BOMS_API_BASE}/Bus-Trips-Details`;
            logger.info(`[TripExpenseIngestion] Fetching from: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            logger.info(`[TripExpenseIngestion] Fetched ${Array.isArray(data) ? data.length : 0} operational trips`);

            return Array.isArray(data) ? data : [];
        } catch (error) {
            logger.error('[TripExpenseIngestion] Failed to fetch operational trips:', error);
            throw error;
        }
    }

    /**
     * Fetch rental trip data from BOMS API
     */
    async fetchRentalTripsFromAPI(): Promise<ExternalRentalDetails[]> {
        try {
            const url = `${this.BOMS_API_BASE}/Rental-Request-Details`;
            logger.info(`[TripExpenseIngestion] Fetching from: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            logger.info(`[TripExpenseIngestion] Fetched ${Array.isArray(data) ? data.length : 0} rental trips`);

            return Array.isArray(data) ? data : [];
        } catch (error) {
            logger.error('[TripExpenseIngestion] Failed to fetch rental trips:', error);
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // TRIP DATA SYNC (Upsert to cache tables)
    // --------------------------------------------------------------------------

    /**
     * Sync operational trip to cache table (operational_trip)
     */
    private async syncOperationalTripToCache(trip: ExternalBusTripDetails) {
        await prisma.operational_trip.upsert({
            where: {
                assignment_id_bus_trip_id: {
                    assignment_id: trip.assignment_id,
                    bus_trip_id: trip.bus_trip_id,
                },
            },
            update: {
                bus_route: trip.bus_route,
                date_assigned: trip.date_assigned ? new Date(trip.date_assigned) : null,
                trip_fuel_expense: trip.trip_fuel_expense,
                trip_revenue: trip.trip_revenue,
                assignment_type: trip.assignment_type,
                assignment_value: trip.assignment_value,
                payment_method: trip.payment_method,
                employee_driver: trip.employee_driver ? JSON.stringify(trip.employee_driver) : null,
                employee_conductor: trip.employee_conductor ? JSON.stringify(trip.employee_conductor) : null,
                bus_plate_number: trip.bus_plate_number,
                bus_type: trip.bus_type,
                body_number: trip.body_number,
                last_synced_at: new Date(),
                is_deleted: false,
            },
            create: {
                assignment_id: trip.assignment_id,
                bus_trip_id: trip.bus_trip_id,
                bus_route: trip.bus_route,
                date_assigned: trip.date_assigned ? new Date(trip.date_assigned) : null,
                trip_fuel_expense: trip.trip_fuel_expense,
                trip_revenue: trip.trip_revenue,
                assignment_type: trip.assignment_type,
                assignment_value: trip.assignment_value,
                payment_method: trip.payment_method,
                employee_driver: trip.employee_driver ? JSON.stringify(trip.employee_driver) : null,
                employee_conductor: trip.employee_conductor ? JSON.stringify(trip.employee_conductor) : null,
                bus_plate_number: trip.bus_plate_number,
                bus_type: trip.bus_type,
                body_number: trip.body_number,
                is_expense_recorded: false,
                is_revenue_recorded: false,
            },
        });
    }

    /**
     * Sync rental trip to cache table (rental_trip)
     */
    private async syncRentalTripToCache(trip: ExternalRentalDetails) {
        await prisma.rental_trip.upsert({
            where: {
                assignment_id: trip.assignment_id,
            },
            update: {
                bus_plate_number: trip.bus_plate_number,
                bus_type: trip.bus_type,
                body_number: trip.body_number,
                rental_status: trip.rental_status,
                rental_destination: trip.rental_destination,
                rental_start_date: trip.rental_start_date ? new Date(trip.rental_start_date) : null,
                rental_end_date: trip.rental_end_date ? new Date(trip.rental_end_date) : null,
                total_rental_amount: trip.total_rental_amount,
                down_payment_amount: trip.down_payment_amount,
                balance_amount: trip.balance_amount,
                down_payment_date: trip.down_payment_date ? new Date(trip.down_payment_date) : null,
                full_payment_date: trip.full_payment_date ? new Date(trip.full_payment_date) : null,
                cancelled_at: trip.cancelled_at ? new Date(trip.cancelled_at) : null,
                cancellation_reason: trip.cancellation_reason,
                rental_fuel_expense: trip.rental_fuel_expense,
                employees: trip.employees ? JSON.stringify(trip.employees) : null,
                last_synced_at: new Date(),
                is_deleted: false,
            },
            create: {
                assignment_id: trip.assignment_id,
                bus_plate_number: trip.bus_plate_number,
                bus_type: trip.bus_type,
                body_number: trip.body_number,
                rental_status: trip.rental_status,
                rental_destination: trip.rental_destination,
                rental_start_date: trip.rental_start_date ? new Date(trip.rental_start_date) : null,
                rental_end_date: trip.rental_end_date ? new Date(trip.rental_end_date) : null,
                total_rental_amount: trip.total_rental_amount,
                down_payment_amount: trip.down_payment_amount,
                balance_amount: trip.balance_amount,
                down_payment_date: trip.down_payment_date ? new Date(trip.down_payment_date) : null,
                full_payment_date: trip.full_payment_date ? new Date(trip.full_payment_date) : null,
                cancelled_at: trip.cancelled_at ? new Date(trip.cancelled_at) : null,
                cancellation_reason: trip.cancellation_reason,
                rental_fuel_expense: trip.rental_fuel_expense,
                employees: trip.employees ? JSON.stringify(trip.employees) : null,
                is_expense_recorded: false,
                is_revenue_recorded: false,
            },
        });
    }

    // --------------------------------------------------------------------------
    // EXPENSE INGESTION - OPERATIONAL TRIPS
    // --------------------------------------------------------------------------

    /**
     * Ingest operational trip expenses from external API
     * Creates expenses only for trips that have fuel expenses > 0
     * Implements deduplication based on trip assignment composite key
     */
    async ingestOperationalTripExpenses(): Promise<IngestionResult> {
        const result: IngestionResult = {
            success: true,
            source: 'operational',
            total_fetched: 0,
            new_expenses_created: 0,
            expenses_updated: 0,
            skipped_duplicates: 0,
            errors: [],
        };

        try {
            // Fetch trips from external API
            const trips = await this.fetchOperationalTripsFromAPI();
            result.total_fetched = trips.length;

            // Get default expense type for fuel
            const fuelExpenseType = await prisma.expense_type.findFirst({
                where: {
                    OR: [
                        { code: 'FUEL' },
                        { name: { contains: 'Fuel', mode: 'insensitive' } },
                    ],
                    is_deleted: false,
                },
            });

            if (!fuelExpenseType) {
                throw new Error('Fuel expense type not found in database');
            }

            for (const trip of trips) {
                try {
                    // Skip if no fuel expense
                    if (!trip.trip_fuel_expense || trip.trip_fuel_expense <= 0) {
                        continue;
                    }

                    // First, sync the trip data to cache
                    await this.syncOperationalTripToCache(trip);

                    // Check if expense already exists for this trip
                    const existingExpense = await prisma.expense.findFirst({
                        where: {
                            operational_trip_assignment_id: trip.assignment_id,
                            operational_trip_bus_trip_id: trip.bus_trip_id,
                            is_deleted: false,
                        },
                    });

                    if (existingExpense) {
                        // Check if amount has changed and expense is still PENDING
                        if (
                            existingExpense.status === 'PENDING' &&
                            parseFloat(existingExpense.amount.toString()) !== trip.trip_fuel_expense
                        ) {
                            // Update only if PENDING and amount changed
                            await prisma.expense.update({
                                where: { id: existingExpense.id },
                                data: {
                                    amount: trip.trip_fuel_expense,
                                    updated_at: new Date(),
                                    updated_by: 'SYSTEM_SYNC',
                                },
                            });
                            result.expenses_updated++;
                            logger.info(`[TripExpenseIngestion] Updated expense ${existingExpense.code} with new amount`);
                        } else {
                            result.skipped_duplicates++;
                        }
                        continue;
                    }

                    // Generate new expense code
                    const expenseCode = await this.generateExpenseCode();

                    // Create new expense with PENDING status
                    await prisma.expense.create({
                        data: {
                            code: expenseCode,
                            expense_type_id: fuelExpenseType.id,
                            amount: trip.trip_fuel_expense,
                            date_recorded: trip.date_assigned ? new Date(trip.date_assigned) : new Date(),
                            description: `Auto-generated fuel expense for trip ${trip.assignment_id}/${trip.bus_trip_id}`,
                            status: 'PENDING',
                            operational_trip_assignment_id: trip.assignment_id,
                            operational_trip_bus_trip_id: trip.bus_trip_id,
                            payment_method: this.mapPaymentMethod(trip.payment_method),
                            created_by: 'SYSTEM_SYNC',
                        },
                    });

                    result.new_expenses_created++;
                    logger.info(`[TripExpenseIngestion] Created expense ${expenseCode} for trip ${trip.assignment_id}`);

                } catch (tripError: any) {
                    result.errors.push({
                        id: `${trip.assignment_id}/${trip.bus_trip_id}`,
                        error: tripError.message,
                    });
                    logger.error(`[TripExpenseIngestion] Error processing trip ${trip.assignment_id}:`, tripError);
                }
            }

            logger.info(`[TripExpenseIngestion] Operational ingestion complete: ${JSON.stringify(result)}`);
            return result;

        } catch (error: any) {
            result.success = false;
            result.errors.push({ id: 'fetch', error: error.message });
            logger.error('[TripExpenseIngestion] Operational ingestion failed:', error);
            return result;
        }
    }

    // --------------------------------------------------------------------------
    // EXPENSE INGESTION - RENTAL TRIPS
    // --------------------------------------------------------------------------

    /**
     * Ingest rental trip expenses from external API
     * Creates expenses only for rentals that have fuel expenses > 0
     * Implements deduplication based on rental assignment ID
     */
    async ingestRentalTripExpenses(): Promise<IngestionResult> {
        const result: IngestionResult = {
            success: true,
            source: 'rental',
            total_fetched: 0,
            new_expenses_created: 0,
            expenses_updated: 0,
            skipped_duplicates: 0,
            errors: [],
        };

        try {
            // Fetch rentals from external API
            const rentals = await this.fetchRentalTripsFromAPI();
            result.total_fetched = rentals.length;

            // Get default expense type for fuel
            const fuelExpenseType = await prisma.expense_type.findFirst({
                where: {
                    OR: [
                        { code: 'FUEL' },
                        { name: { contains: 'Fuel', mode: 'insensitive' } },
                    ],
                    is_deleted: false,
                },
            });

            if (!fuelExpenseType) {
                throw new Error('Fuel expense type not found in database');
            }

            for (const rental of rentals) {
                try {
                    // Skip if no fuel expense
                    if (!rental.rental_fuel_expense || rental.rental_fuel_expense <= 0) {
                        continue;
                    }

                    // First, sync the rental data to cache
                    await this.syncRentalTripToCache(rental);

                    // Check if expense already exists for this rental
                    const existingExpense = await prisma.expense.findFirst({
                        where: {
                            rental_trip_assignment_id: rental.assignment_id,
                            is_deleted: false,
                        },
                    });

                    if (existingExpense) {
                        // Check if amount has changed and expense is still PENDING
                        if (
                            existingExpense.status === 'PENDING' &&
                            parseFloat(existingExpense.amount.toString()) !== rental.rental_fuel_expense
                        ) {
                            // Update only if PENDING and amount changed
                            await prisma.expense.update({
                                where: { id: existingExpense.id },
                                data: {
                                    amount: rental.rental_fuel_expense,
                                    updated_at: new Date(),
                                    updated_by: 'SYSTEM_SYNC',
                                },
                            });
                            result.expenses_updated++;
                            logger.info(`[TripExpenseIngestion] Updated expense ${existingExpense.code} with new amount`);
                        } else {
                            result.skipped_duplicates++;
                        }
                        continue;
                    }

                    // Generate new expense code
                    const expenseCode = await this.generateExpenseCode();

                    // Create new expense with PENDING status
                    await prisma.expense.create({
                        data: {
                            code: expenseCode,
                            expense_type_id: fuelExpenseType.id,
                            amount: rental.rental_fuel_expense,
                            date_recorded: rental.rental_start_date ? new Date(rental.rental_start_date) : new Date(),
                            description: `Auto-generated fuel expense for rental ${rental.assignment_id}`,
                            status: 'PENDING',
                            rental_trip_assignment_id: rental.assignment_id,
                            payment_method: 'CASH',
                            created_by: 'SYSTEM_SYNC',
                        },
                    });

                    result.new_expenses_created++;
                    logger.info(`[TripExpenseIngestion] Created expense ${expenseCode} for rental ${rental.assignment_id}`);

                } catch (rentalError: any) {
                    result.errors.push({
                        id: rental.assignment_id,
                        error: rentalError.message,
                    });
                    logger.error(`[TripExpenseIngestion] Error processing rental ${rental.assignment_id}:`, rentalError);
                }
            }

            logger.info(`[TripExpenseIngestion] Rental ingestion complete: ${JSON.stringify(result)}`);
            return result;

        } catch (error: any) {
            result.success = false;
            result.errors.push({ id: 'fetch', error: error.message });
            logger.error('[TripExpenseIngestion] Rental ingestion failed:', error);
            return result;
        }
    }

    // --------------------------------------------------------------------------
    // FULL SYNC
    // --------------------------------------------------------------------------

    /**
     * Run full sync for both operational and rental trip expenses
     */
    async runFullSync(): Promise<{
        operational: IngestionResult;
        rental: IngestionResult;
        timestamp: Date;
    }> {
        logger.info('[TripExpenseIngestion] Starting full sync...');

        const [operational, rental] = await Promise.all([
            this.ingestOperationalTripExpenses(),
            this.ingestRentalTripExpenses(),
        ]);

        const summary = {
            operational,
            rental,
            timestamp: new Date(),
        };

        logger.info(`[TripExpenseIngestion] Full sync complete: ${JSON.stringify({
            operational: {
                new: operational.new_expenses_created,
                updated: operational.expenses_updated,
                skipped: operational.skipped_duplicates,
                errors: operational.errors.length,
            },
            rental: {
                new: rental.new_expenses_created,
                updated: rental.expenses_updated,
                skipped: rental.skipped_duplicates,
                errors: rental.errors.length,
            },
        })}`);

        return summary;
    }

    // --------------------------------------------------------------------------
    // HELPERS
    // --------------------------------------------------------------------------

    /**
     * Map external payment method to internal enum
     */
    private mapPaymentMethod(externalMethod: string): 'CASH' | 'BANK_TRANSFER' | 'ONLINE' {
        const normalized = externalMethod?.toUpperCase() || '';

        if (normalized.includes('BANK') || normalized.includes('TRANSFER')) {
            return 'BANK_TRANSFER';
        }
        if (normalized.includes('ONLINE') || normalized.includes('GCASH') || normalized.includes('MAYA')) {
            return 'ONLINE';
        }

        return 'CASH';
    }

    /**
     * Get sync status summary
     */
    async getSyncStatus() {
        const [
            totalExpenses,
            pendingExpenses,
            approvedExpenses,
            lastOperationalTrip,
            lastRentalTrip,
        ] = await Promise.all([
            prisma.expense.count({ where: { is_deleted: false } }),
            prisma.expense.count({ where: { status: 'PENDING', is_deleted: false } }),
            prisma.expense.count({ where: { status: 'APPROVED', is_deleted: false } }),
            prisma.operational_trip.findFirst({
                orderBy: { last_synced_at: 'desc' },
                select: { last_synced_at: true },
            }),
            prisma.rental_trip.findFirst({
                orderBy: { last_synced_at: 'desc' },
                select: { last_synced_at: true },
            }),
        ]);

        return {
            expenses: {
                total: totalExpenses,
                pending: pendingExpenses,
                approved: approvedExpenses,
            },
            last_sync: {
                operational: lastOperationalTrip?.last_synced_at,
                rental: lastRentalTrip?.last_synced_at,
            },
        };
    }
}

export const tripExpenseIngestionService = new TripExpenseIngestionService();
export default tripExpenseIngestionService;
