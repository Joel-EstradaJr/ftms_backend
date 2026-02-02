// ============================================================================
// OPERATIONAL EXPENSE SERVICE
// Auto-generates expense records from bus_trip_local and rental_local
// Follows the same pattern as BusTripRevenueService
// ============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma, payment_method } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCOUNT_CODES = {
    CASH: '1000',
    BANK_TRANSFER: '1005',
    E_WALLET: '1010',
    ACCOUNTS_PAYABLE: '2000',
    FUEL_EXPENSE: '4000', // Account code 4000 - Fuel Expense per user requirement // Seeded expense account

};

const EXPENSE_TYPE_CODE = 'EXPT-001'; // Operational/Fuel expense type code

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
    processed: number;
    created: number;
    errors: string[];
}

interface ExpenseGenerationData {
    amount: Prisma.Decimal;
    description: string;
    date_recorded: Date;
    payment_method: payment_method;
    bus_trip_assignment_id?: string;
    bus_trip_id?: string;
    rental_assignment_id?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class OperationalExpenseService {
    private journalEntryService: JournalEntryAutoService;

    constructor() {
        this.journalEntryService = new JournalEntryAutoService();
    }

    // --------------------------------------------------------------------------
    // CODE GENERATION
    // --------------------------------------------------------------------------

    /**
     * Generate unique expense code in format EXP-XXXXXX
     */
    private async generateExpenseCode(): Promise<string> {
        const lastExpense = await prisma.expense.findFirst({
            orderBy: { id: 'desc' },
            select: { code: true },
        });

        let nextNum = 1;
        if (lastExpense?.code) {
            const match = lastExpense.code.match(/EXP-(\d+)/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }

        return `EXP-${nextNum.toString().padStart(6, '0')}`;
    }

    /**
     * Map payment method string to valid enum
     */
    private mapPaymentMethod(paymentMethodStr: string | null): payment_method {
        if (!paymentMethodStr) return 'CASH';

        const normalized = paymentMethodStr.toUpperCase().replace(/[^A-Z_]/g, '_');

        switch (normalized) {
            case 'CASH':
            case 'COMPANY_CASH':
                return 'CASH';
            case 'BANK_TRANSFER':
            case 'BANK':
                return 'BANK_TRANSFER';
            case 'E_WALLET':
            case 'EWALLET':
            case 'GCASH':
            case 'PAYMAYA':
                return 'E_WALLET';
            case 'REIMBURSEMENT':
                return 'REIMBURSEMENT';
            default:
                logger.warn(`[OperationalExpenseService] Unknown payment method: ${paymentMethodStr}, defaulting to CASH`);
                return 'CASH';
        }
    }

    /**
     * Get debit account code based on expense type (always use Fuel Expense)
     */
    private getExpenseAccountCode(): string {
        return ACCOUNT_CODES.FUEL_EXPENSE;
    }

    /**
     * Get credit account code based on payment method
     */
    private getCreditAccountCode(paymentMethod: payment_method): string {
        switch (paymentMethod) {
            case 'BANK_TRANSFER':
                return ACCOUNT_CODES.BANK_TRANSFER;
            case 'E_WALLET':
                return ACCOUNT_CODES.E_WALLET;
            case 'REIMBURSEMENT':
                return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
            default:
                return ACCOUNT_CODES.CASH;
        }
    }

    // --------------------------------------------------------------------------
    // SYNC BUS TRIP EXPENSES
    // --------------------------------------------------------------------------

    /**
     * Sync expenses from bus_trip_local records where is_expense_recorded = false
     * Creates expense records and journal entries
     */
    async syncBusTripExpenses(userId: string = 'system'): Promise<SyncResult> {
        logger.info('[OperationalExpenseService] Starting bus trip expense sync');

        const result: SyncResult = {
            processed: 0,
            created: 0,
            errors: [],
        };

        try {
            // Find unprocessed bus trips with fuel expense
            const unprocessedTrips = await prisma.bus_trip_local.findMany({
                where: {
                    is_expense_recorded: false,
                    is_deleted: false,
                    trip_fuel_expense: { not: null, gt: 0 },
                },
                include: {
                    bus: true,
                },
                take: 100, // Process in batches
            });

            logger.info(`[OperationalExpenseService] Found ${unprocessedTrips.length} unprocessed bus trips`);
            result.processed = unprocessedTrips.length;

            // Get the expense type
            const expenseType = await prisma.expense_type.findFirst({
                where: { code: EXPENSE_TYPE_CODE, is_deleted: false },
            });

            if (!expenseType) {
                result.errors.push('Expense type not found. Please seed expense types first.');
                return result;
            }

            // Process each trip
            for (const trip of unprocessedTrips) {
                try {
                    await this.processTrip({
                        type: 'bus_trip',
                        tripData: trip,
                        expenseTypeId: expenseType.id,
                        userId,
                    });
                    result.created++;
                } catch (error) {
                    const errorMsg = `Failed to process bus trip ${trip.assignment_id}/${trip.bus_trip_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    logger.error(`[OperationalExpenseService] ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }

            logger.info(`[OperationalExpenseService] Bus trip sync completed: ${result.created}/${result.processed} created`);
        } catch (error) {
            logger.error('[OperationalExpenseService] Bus trip sync failed:', error);
            result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }

    // --------------------------------------------------------------------------
    // SYNC RENTAL EXPENSES
    // --------------------------------------------------------------------------

    /**
     * Sync expenses from rental_local records where is_expense_recorded = false
     */
    async syncRentalExpenses(userId: string = 'system'): Promise<SyncResult> {
        logger.info('[OperationalExpenseService] Starting rental expense sync');

        const result: SyncResult = {
            processed: 0,
            created: 0,
            errors: [],
        };

        try {
            // Find unprocessed rentals
            // Note: Rentals may not have trip_fuel_expense, we generate based on operational costs
            const unprocessedRentals = await prisma.rental_local.findMany({
                where: {
                    is_expense_recorded: false,
                    is_deleted: false,
                },
                include: {
                    bus: true,
                },
                take: 100,
            });

            logger.info(`[OperationalExpenseService] Found ${unprocessedRentals.length} unprocessed rentals`);
            result.processed = unprocessedRentals.length;

            // Get the expense type
            const expenseType = await prisma.expense_type.findFirst({
                where: { code: EXPENSE_TYPE_CODE, is_deleted: false },
            });

            if (!expenseType) {
                result.errors.push('Expense type not found. Please seed expense types first.');
                return result;
            }

            // Process each rental
            for (const rental of unprocessedRentals) {
                try {
                    // For rentals, we need some expense amount - could be based on operational costs
                    // If no specific expense, we may skip or use a calculated amount
                    const expenseAmount = this.calculateRentalExpense(rental);

                    if (expenseAmount.gt(0)) {
                        await this.processTrip({
                            type: 'rental',
                            tripData: rental,
                            expenseTypeId: expenseType.id,
                            userId,
                            overrideAmount: expenseAmount,
                        });
                        result.created++;
                    } else {
                        // Mark as processed even if no expense to create
                        await prisma.rental_local.update({
                            where: { assignment_id: rental.assignment_id },
                            data: { is_expense_recorded: true },
                        });
                    }
                } catch (error) {
                    const errorMsg = `Failed to process rental ${rental.assignment_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    logger.error(`[OperationalExpenseService] ${errorMsg}`);
                    result.errors.push(errorMsg);
                }
            }

            logger.info(`[OperationalExpenseService] Rental sync completed: ${result.created}/${result.processed} created`);
        } catch (error) {
            logger.error('[OperationalExpenseService] Rental sync failed:', error);
            result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }

    /**
     * Calculate expense amount for rental
     * For now, returns 0 unless the rental has specific operational costs
     */
    private calculateRentalExpense(rental: any): Prisma.Decimal {
        // Rentals typically don't have trip_fuel_expense
        // If there are operational costs associated with rentals, add that logic here
        // For now, we return 0 to indicate no expense to generate
        return new Prisma.Decimal(0);
    }

    // --------------------------------------------------------------------------
    // PROCESS TRIP (SHARED LOGIC)
    // --------------------------------------------------------------------------

    private async processTrip(params: {
        type: 'bus_trip' | 'rental';
        tripData: any;
        expenseTypeId: number;
        userId: string;
        overrideAmount?: Prisma.Decimal;
    }): Promise<void> {
        const { type, tripData, expenseTypeId, userId, overrideAmount } = params;

        await prisma.$transaction(async (tx) => {
            // Determine expense data based on type
            let expenseData: ExpenseGenerationData;

            if (type === 'bus_trip') {
                const amount = overrideAmount ?? tripData.trip_fuel_expense ?? new Prisma.Decimal(0);
                expenseData = {
                    amount,
                    description: `Fuel expense for trip ${tripData.assignment_id} on route ${tripData.bus_route || 'N/A'}`,
                    date_recorded: tripData.date_assigned || new Date(),
                    payment_method: this.mapPaymentMethod(tripData.payment_method),
                    bus_trip_assignment_id: tripData.assignment_id,
                    bus_trip_id: tripData.bus_trip_id,
                };
            } else {
                const amount = overrideAmount ?? new Prisma.Decimal(0);
                expenseData = {
                    amount,
                    description: `Operational expense for rental ${tripData.assignment_id}`,
                    date_recorded: tripData.rental_start_date || new Date(),
                    payment_method: 'CASH',
                    rental_assignment_id: tripData.assignment_id,
                };
            }

            // Generate expense code
            const expenseCode = await this.generateExpenseCode();

            // Create expense record
            const expense = await tx.expense.create({
                data: {
                    code: expenseCode,
                    expense_type_id: expenseTypeId,
                    amount: expenseData.amount,
                    description: expenseData.description,
                    date_recorded: expenseData.date_recorded,
                    payment_method: expenseData.payment_method,
                    status: 'PENDING',
                    bus_trip_assignment_id: expenseData.bus_trip_assignment_id,
                    bus_trip_id: expenseData.bus_trip_id,
                    rental_assignment_id: expenseData.rental_assignment_id,
                    updated_at: new Date(),
                    created_by: userId,
                },
            });

            logger.info(`[OperationalExpenseService] Created expense ${expense.code} for ${type} ${type === 'bus_trip' ? tripData.assignment_id + '/' + tripData.bus_trip_id : tripData.assignment_id}`);

            // Create journal entry
            await this.createJournalEntryForExpense(tx, expense, expenseData, userId);

            // Update the trip record to mark expense as recorded
            if (type === 'bus_trip') {
                await tx.bus_trip_local.update({
                    where: {
                        assignment_id_bus_trip_id: {
                            assignment_id: tripData.assignment_id,
                            bus_trip_id: tripData.bus_trip_id,
                        },
                    },
                    data: { is_expense_recorded: true },
                });
            } else {
                await tx.rental_local.update({
                    where: { assignment_id: tripData.assignment_id },
                    data: { is_expense_recorded: true },
                });
            }
        });
    }

    // --------------------------------------------------------------------------
    // JOURNAL ENTRY CREATION
    // --------------------------------------------------------------------------

    /**
     * Create journal entry for expense
     * Debit: Expense account (Fuel Expense)
     * Credit: Cash/Bank/Payable (based on payment method)
     */
    private async createJournalEntryForExpense(
        tx: Prisma.TransactionClient,
        expense: any,
        expenseData: ExpenseGenerationData,
        userId: string
    ): Promise<void> {
        try {
            // Get account IDs by codes
            const debitAccountCode = this.getExpenseAccountCode();
            const creditAccountCode = this.getCreditAccountCode(expenseData.payment_method);

            const [debitAccount, creditAccount] = await Promise.all([
                tx.chart_of_account.findFirst({ where: { account_code: debitAccountCode, is_deleted: false } }),
                tx.chart_of_account.findFirst({ where: { account_code: creditAccountCode, is_deleted: false } }),
            ]);

            if (!debitAccount || !creditAccount) {
                logger.warn(`[OperationalExpenseService] COA not found for expense ${expense.code}. Debit: ${debitAccountCode}, Credit: ${creditAccountCode}`);
                return;
            }

            // Create journal entry
            const jeCode = `JE-${expense.code}`;
            const journalEntry = await tx.journal_entry.create({
                data: {
                    code: jeCode,
                    date: expenseData.date_recorded,
                    description: `Journal entry for ${expense.code} - ${expenseData.description}`,
                    total_debit: expenseData.amount,
                    total_credit: expenseData.amount,
                    status: 'DRAFT',
                    entry_type: 'AUTO_GENERATED',
                    reference: expense.code,
                    created_by: userId,
                },
            });

            // Create journal entry lines
            await tx.journal_entry_line.createMany({
                data: [
                    {
                        journal_entry_id: journalEntry.id,
                        account_id: debitAccount.id,
                        line_number: 1,
                        description: `Debit - ${debitAccount.account_name}`,
                        debit: expenseData.amount,
                        credit: new Prisma.Decimal(0),
                        created_by: userId,
                    },
                    {
                        journal_entry_id: journalEntry.id,
                        account_id: creditAccount.id,
                        line_number: 2,
                        description: `Credit - ${creditAccount.account_name}`,
                        debit: new Prisma.Decimal(0),
                        credit: expenseData.amount,
                        created_by: userId,
                    },
                ],
            });

            // Link journal entry to expense
            await tx.expense.update({
                where: { id: expense.id },
                data: { journal_entry_id: journalEntry.id },
            });

            logger.info(`[OperationalExpenseService] Created journal entry ${jeCode} for expense ${expense.code}`);
        } catch (error) {
            logger.error(`[OperationalExpenseService] Failed to create journal entry for expense ${expense.code}:`, error);
            // Re-throw to make expense creation atomic with JE
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // SYNC ALL
    // --------------------------------------------------------------------------

    /**
     * Sync all unprocessed trips (bus trips and rentals)
     */
    async syncAllExpenses(userId: string = 'system'): Promise<{
        busTripResult: SyncResult;
        rentalResult: SyncResult;
    }> {
        const busTripResult = await this.syncBusTripExpenses(userId);
        const rentalResult = await this.syncRentalExpenses(userId);

        return { busTripResult, rentalResult };
    }
}

// Export singleton instance
export const operationalExpenseService = new OperationalExpenseService();



