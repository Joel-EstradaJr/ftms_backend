// ============================================================================
// BUS TRIP REVENUE SERVICE
// Core business logic for managing bus trip revenue records
// Follows data mappings from trip_revenue.md
// ============================================================================

import { prisma } from '../config/database';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma, receivable_frequency, payment_status, payment_method, approval_status, journal_status } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';
import { generateCode } from '../utils/codeGenerator';
import {
    RevenueListFilters,
    CreateRevenueDTO,
    UpdateRevenueDTO,
    UpdateReceivableDTO,
    RecordPaymentDTO,
    UpdateConfigDTO,
    UnsyncedTripsFilters,
    RevenueListItem,
    RevenueDetailResponse,
    UnsyncedTripItem,
    ProcessUnsyncedResult,
    SystemConfigResponse,
    JournalEntryPayload
} from '../controllers/busTripRevenue.dto';
import {
    REVENUE_TYPE_TO_REVENUE_COA,
    REVENUE_TYPE_TO_RECEIVABLE_COA,
    PAYMENT_METHOD_TO_ASSET_COA,
    getReceivableCOACode
} from '../lib/coaMapping';

// ============================================================================
// CONSTANTS (Using centralized COA mappings)
// ============================================================================

/**
 * Account codes for journal entries
 * Uses centralized COA mapping for consistency across all services
 */
const ACCOUNT_CODES = {
    CASH: PAYMENT_METHOD_TO_ASSET_COA['CASH'],                           // 1000
    BANK_TRANSFER: PAYMENT_METHOD_TO_ASSET_COA['BANK_TRANSFER'],         // 1005
    E_WALLET: PAYMENT_METHOD_TO_ASSET_COA['E_WALLET'],                   // 1010
    DRIVER_RECEIVABLE: REVENUE_TYPE_TO_RECEIVABLE_COA['REVT-001'],       // 1100 - AR - Bus Trip Boundary
    CONDUCTOR_RECEIVABLE: REVENUE_TYPE_TO_RECEIVABLE_COA['REVT-002'],    // 1105 - AR - Bus Trip Percentage
    REVENUE_BOUNDARY: REVENUE_TYPE_TO_REVENUE_COA['REVT-001'],           // 3000 - Trip Revenue - Boundary
    REVENUE_PERCENTAGE: REVENUE_TYPE_TO_REVENUE_COA['REVT-002'],         // 3005 - Trip Revenue - Percentage
};

const REVENUE_TYPE_CODES = {
    BOUNDARY: 'REVT-001',
    PERCENTAGE: 'REVT-002',
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class BusTripRevenueService {
    private journalEntryService: JournalEntryAutoService;

    constructor() {
        this.journalEntryService = new JournalEntryAutoService();
    }

    // --------------------------------------------------------------------------
    // SEARCH HELPER METHODS
    // --------------------------------------------------------------------------

    /**
     * Month name to number mapping for date search
     */
    private static readonly MONTH_MAP: Record<string, number> = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };

    /**
     * Payment status display name mapping for search
     */
    private static readonly STATUS_MAP: Record<string, payment_status[]> = {
        'pending': ['PENDING'],
        'partial': ['PARTIALLY_PAID'],
        'partially': ['PARTIALLY_PAID'],
        'partially_paid': ['PARTIALLY_PAID'],
        'complete': ['COMPLETED'],
        'completed': ['COMPLETED'],
        'paid': ['COMPLETED', 'PARTIALLY_PAID'],
        'overdue': ['OVERDUE'],
        'cancel': ['CANCELLED'],
        'cancelled': ['CANCELLED'],
        'written': ['WRITTEN_OFF'],
        'written_off': ['WRITTEN_OFF'],
        'write_off': ['WRITTEN_OFF'],
    };

    /**
     * Assignment type mapping for search
     */
    private static readonly ASSIGNMENT_TYPE_MAP: Record<string, string[]> = {
        'bound': ['BOUNDARY'],
        'boundary': ['BOUNDARY'],
        'percent': ['PERCENTAGE'],
        'percentage': ['PERCENTAGE'],
    };

    /**
     * Parse search term and return structured search criteria
     * Handles multi-token expressions like "January 11" or "Jan 15 2026"
     */
    private parseSearchTerm(search: string): {
        monthNumber?: number;
        dayNumber?: number;
        yearNumber?: number;
        numericValue?: number;
        paymentStatuses?: payment_status[];
        assignmentTypes?: string[];
        textSearch: string;
    } {
        const searchLower = search.toLowerCase().trim();
        const result: ReturnType<typeof this.parseSearchTerm> = { textSearch: search };

        // Split search into tokens to handle expressions like "January 11" or "Jan 15 2026"
        const tokens = searchLower.split(/\s+/).filter(t => t.length > 0);

        // Process each token
        for (const token of tokens) {
            // Check for month name match
            for (const [monthName, monthNum] of Object.entries(BusTripRevenueService.MONTH_MAP)) {
                if (monthName === token || monthName.startsWith(token) || token.startsWith(monthName)) {
                    result.monthNumber = monthNum;
                    break;
                }
            }

            // Check for numeric value in token (could be day or year)
            const numericMatch = token.match(/^(\d+)$/);
            if (numericMatch) {
                const num = parseInt(numericMatch[1], 10);

                // If it's 1-31, it's a day
                if (num >= 1 && num <= 31) {
                    result.dayNumber = num;
                }

                // If it's a 4-digit number starting with 19 or 20, it's a year
                if (num >= 1900 && num <= 2100) {
                    result.yearNumber = num;
                }
            }
        }

        // Check for payment status match (on full search term)
        for (const [statusKey, statuses] of Object.entries(BusTripRevenueService.STATUS_MAP)) {
            if (statusKey.startsWith(searchLower) || searchLower.startsWith(statusKey) || searchLower.includes(statusKey)) {
                result.paymentStatuses = statuses;
                break;
            }
        }

        // Check for assignment type match (on full search term)
        for (const [typeKey, types] of Object.entries(BusTripRevenueService.ASSIGNMENT_TYPE_MAP)) {
            if (typeKey.startsWith(searchLower) || searchLower.startsWith(typeKey) || searchLower.includes(typeKey)) {
                result.assignmentTypes = types;
                break;
            }
        }

        // Check for numeric value for trip revenue (on full search term, ignoring currency symbols)
        // Only treat as trip revenue if it's a larger number (> 31) or has decimals
        const fullNumericMatch = search.replace(/[₱,\s]/g, '').match(/^(\d+\.?\d*)$/);
        if (fullNumericMatch) {
            const num = parseFloat(fullNumericMatch[1]);
            result.numericValue = num;
        }

        return result;
    }

    // --------------------------------------------------------------------------
    // CODE GENERATION (Using Unified Code Generator)
    // --------------------------------------------------------------------------

    /**
     * Generate unique revenue code using unified code generator
     * Format: REV-YYYY-XXXX
     */
    private async generateRevenueCode(): Promise<string> {
        return generateCode('revenue');
    }

    /**
     * Generate unique receivable code using unified code generator
     * Format: REC-YYYY-XXXX
     * @param offset - Optional offset to generate sequential codes in same call (default 0)
     */
    private async generateReceivableCode(offset: number = 0): Promise<string> {
        return generateCode('receivable', offset);
    }

    /**
     * Map payment method string from bus_trip_local to valid enum
     * Handles case differences and alternative names
     * 
     * NOTE: REIMBURSEMENT is mapped to CASH for revenue records.
     * Reimbursement payment method is only applicable to expense records,
     * not revenue records. External data may contain "Reimbursement" but
     * for revenue we treat it as CASH (Company_Cash).
     */
    private mapPaymentMethod(paymentMethodStr: string | null): payment_method {
        if (!paymentMethodStr) return 'CASH';

        const normalized = paymentMethodStr.toUpperCase().replace(/[^A-Z_]/g, '_');

        switch (normalized) {
            case 'CASH':
            case 'COMPANY_CASH':
            case 'REIMBURSEMENT':
                // REIMBURSEMENT is treated as CASH for revenue records
                // (Reimbursement is only applicable to expense records)
                return 'CASH';
            case 'BANK_TRANSFER':
            case 'BANK':
                return 'BANK_TRANSFER';
            case 'E_WALLET':
            case 'EWALLET':
            case 'GCASH':
            case 'PAYMAYA':
                return 'E_WALLET';
            default:
                // Log unknown payment method and default to CASH
                logger.warn(`[BusTripRevenueService] Unknown payment method: ${paymentMethodStr}, defaulting to CASH`);
                return 'CASH';
        }
    }
    // --------------------------------------------------------------------------
    // CALCULATION UTILITIES
    // --------------------------------------------------------------------------

    /**
     * Calculate expected remittance based on assignment type
     * BOUNDARY: trip_fuel_expense + assignment_value
     * PERCENTAGE: (trip_revenue × assignment_value) + trip_fuel_expense
     */
    private calculateExpectedRemittance(
        assignmentType: string | null,
        tripRevenue: Prisma.Decimal | null,
        assignmentValue: Prisma.Decimal | null,
        tripFuelExpense: Prisma.Decimal | null
    ): Prisma.Decimal {
        const revenue = tripRevenue ?? new Prisma.Decimal(0);
        const value = assignmentValue ?? new Prisma.Decimal(0);
        const fuel = tripFuelExpense ?? new Prisma.Decimal(0);

        if (assignmentType === 'BOUNDARY') {
            return fuel.add(value);
        } else if (assignmentType === 'PERCENTAGE') {
            // assignment_value is a percentage (e.g., 0.30 for 30%)
            const companyShare = revenue.mul(value);
            return companyShare.add(fuel);
        }

        // Default to BOUNDARY calculation if type is unknown
        return fuel.add(value);
    }

    /**
     * Calculate shortage
     * shortage = expected_remittance - trip_revenue
     */
    private calculateShortage(
        expectedRemittance: Prisma.Decimal,
        tripRevenue: Prisma.Decimal | null
    ): Prisma.Decimal {
        const revenue = tripRevenue ?? new Prisma.Decimal(0);
        const shortage = expectedRemittance.sub(revenue);
        return shortage.greaterThan(0) ? shortage : new Prisma.Decimal(0);
    }

    /**
     * Calculate company share amount for display
     */
    private calculateCompanyShareAmount(
        assignmentType: string | null,
        tripRevenue: Prisma.Decimal | null,
        assignmentValue: Prisma.Decimal | null
    ): Prisma.Decimal {
        const revenue = tripRevenue ?? new Prisma.Decimal(0);
        const value = assignmentValue ?? new Prisma.Decimal(0);

        if (assignmentType === 'PERCENTAGE') {
            return revenue.mul(value);
        }
        // For BOUNDARY, company share is the assignment_value itself
        return value;
    }

    /**
     * Determine payment status for remittance
     */
    private determinePaymentStatus(
        tripRevenue: Prisma.Decimal | null,
        expectedRemittance: Prisma.Decimal
    ): payment_status {
        const revenue = tripRevenue ?? new Prisma.Decimal(0);
        return revenue.greaterThanOrEqualTo(expectedRemittance) ? 'COMPLETED' : 'PARTIALLY_PAID';
    }

    /**
     * Get asset account code based on payment method
     */
    private getAssetAccountCode(paymentMethod: payment_method | null): string {
        switch (paymentMethod) {
            case 'BANK_TRANSFER':
                return ACCOUNT_CODES.BANK_TRANSFER;
            case 'E_WALLET':
                return ACCOUNT_CODES.E_WALLET;
            default:
                return ACCOUNT_CODES.CASH;
        }
    }

    /**
     * Get revenue account code based on assignment type
     */
    private getRevenueAccountCode(assignmentType: string | null): string {
        return assignmentType === 'PERCENTAGE'
            ? ACCOUNT_CODES.REVENUE_PERCENTAGE
            : ACCOUNT_CODES.REVENUE_BOUNDARY;
    }

    // --------------------------------------------------------------------------
    // INSTALLMENT SCHEDULE GENERATION
    // --------------------------------------------------------------------------

    /**
     * Calculate due dates for installments based on frequency
     */
    private calculateInstallmentDueDate(
        startDate: Date,
        installmentNumber: number,
        frequency: receivable_frequency
    ): Date {
        const dueDate = new Date(startDate);

        switch (frequency) {
            case 'DAILY':
                dueDate.setDate(dueDate.getDate() + installmentNumber);
                break;
            case 'WEEKLY':
                dueDate.setDate(dueDate.getDate() + (installmentNumber * 7));
                break;
            case 'BIWEEKLY':
                dueDate.setDate(dueDate.getDate() + (installmentNumber * 14));
                break;
            case 'MONTHLY':
                dueDate.setMonth(dueDate.getMonth() + installmentNumber);
                break;
        }

        return dueDate;
    }

    /**
     * Generate installment schedules for a receivable
     */
    private async generateInstallmentSchedules(
        tx: Prisma.TransactionClient,
        receivableId: number,
        totalAmount: Prisma.Decimal,
        startDate: Date,
        numberOfPayments: number,
        frequency: receivable_frequency,
        userId: string
    ): Promise<void> {
        const baseAmount = totalAmount.div(numberOfPayments).toDecimalPlaces(2);
        let cumulativeAmount = new Prisma.Decimal(0);

        for (let i = 1; i <= numberOfPayments; i++) {
            // Last installment handles rounding difference
            let amountDue: Prisma.Decimal;
            if (i === numberOfPayments) {
                amountDue = totalAmount.sub(cumulativeAmount);
            } else {
                amountDue = baseAmount;
                cumulativeAmount = cumulativeAmount.add(baseAmount);
            }

            const dueDate = this.calculateInstallmentDueDate(startDate, i, frequency);

            await tx.revenue_installment_schedule.create({
                data: {
                    receivable_id: receivableId,
                    installment_number: i,
                    due_date: dueDate,
                    amount_due: amountDue,
                    amount_paid: new Prisma.Decimal(0),
                    balance: amountDue,
                    status: 'PENDING',
                    created_by: userId,
                },
            });
        }
    }

    // --------------------------------------------------------------------------
    // SYSTEM CONFIGURATION
    // --------------------------------------------------------------------------

    /**
     * Get system configuration (or defaults)
     */
    async getSystemConfig(): Promise<SystemConfigResponse> {
        let config = await prisma.system_configuration.findFirst({
            where: { is_active: true, is_deleted: false },
        });

        if (!config) {
            // Return defaults if no config exists
            return {
                minimum_wage: 600,
                duration_to_receivable_hours: 72,
                receivable_due_date_days: 30,
                driver_share_percentage: 50,
                conductor_share_percentage: 50,
                default_frequency: 'WEEKLY',
                default_number_of_payments: 3,
            };
        }

        return {
            minimum_wage: Number(config.minimum_wage),
            duration_to_receivable_hours: config.duration_to_receivable_hours,
            receivable_due_date_days: config.receivable_due_date_days,
            driver_share_percentage: Number(config.driver_share_percentage),
            conductor_share_percentage: Number(config.conductor_share_percentage),
            default_frequency: config.default_frequency,
            default_number_of_payments: config.default_number_of_payments,
        };
    }

    /**
     * Update system configuration
     */
    async updateSystemConfig(
        data: UpdateConfigDTO,
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<SystemConfigResponse> {
        logger.info('[BusTripRevenueService] Updating system configuration');

        // Find or create config
        let config = await prisma.system_configuration.findFirst({
            where: { is_active: true, is_deleted: false },
        });

        const updateData: any = {
            updated_by: userId,
        };

        if (data.minimum_wage !== undefined) {
            updateData.minimum_wage = new Prisma.Decimal(data.minimum_wage);
        }
        if (data.duration_to_receivable_hours !== undefined) {
            updateData.duration_to_receivable_hours = data.duration_to_receivable_hours;
        }
        if (data.receivable_due_date_days !== undefined) {
            updateData.receivable_due_date_days = data.receivable_due_date_days;
        }
        if (data.driver_share_percentage !== undefined) {
            updateData.driver_share_percentage = new Prisma.Decimal(data.driver_share_percentage);
        }
        if (data.conductor_share_percentage !== undefined) {
            updateData.conductor_share_percentage = new Prisma.Decimal(data.conductor_share_percentage);
        }
        if (data.default_frequency !== undefined) {
            updateData.default_frequency = data.default_frequency;
        }
        if (data.default_number_of_payments !== undefined) {
            updateData.default_number_of_payments = data.default_number_of_payments;
        }

        if (config) {
            const oldConfig = { ...config };
            config = await prisma.system_configuration.update({
                where: { id: config.id },
                data: updateData,
            });

            await AuditLogClient.logUpdate(
                'System Configuration',
                { id: config.id },
                oldConfig,
                config,
                { id: userId, name: userInfo?.username, role: userInfo?.role },
                req
            );
        } else {
            config = await prisma.system_configuration.create({
                data: {
                    config_code: 'DEFAULT',
                    is_active: true,
                    created_by: userId,
                    ...updateData,
                },
            });

            await AuditLogClient.logCreate(
                'System Configuration',
                { id: config.id },
                config,
                { id: userId, name: userInfo?.username, role: userInfo?.role },
                req
            );
        }

        return this.getSystemConfig();
    }

    // --------------------------------------------------------------------------
    // LIST REVENUES
    // --------------------------------------------------------------------------

    /**
     * List revenues with filters, search, and pagination
     */
    async listRevenues(
        filters: RevenueListFilters,
        page: number = 1,
        limit: number = 10
    ): Promise<{ data: RevenueListItem[]; total: number; page: number; limit: number; pages: number }> {
        const where: Prisma.revenueWhereInput = {
            is_deleted: false,
            // Only bus trip revenues (has bus_trip relation)
            bus_trip_assignment_id: { not: null },
            bus_trip_id: { not: null },
        };

        // Payment status filter (replaces remittance_status)
        if (filters.status) {
            where.payment_status = filters.status as payment_status;
        }

        // Date recorded filter
        if (filters.date_recorded_from || filters.date_recorded_to) {
            where.date_recorded = {};
            if (filters.date_recorded_from) {
                where.date_recorded.gte = new Date(filters.date_recorded_from);
            }
            if (filters.date_recorded_to) {
                where.date_recorded.lte = new Date(filters.date_recorded_to);
            }
        }

        // Build bus trip filters for date_assigned and assignment_type
        const busTripFilters: any = {};
        if (filters.date_assigned_from || filters.date_assigned_to) {
            busTripFilters.date_assigned = {};
            if (filters.date_assigned_from) {
                busTripFilters.date_assigned.gte = new Date(filters.date_assigned_from);
            }
            if (filters.date_assigned_to) {
                busTripFilters.date_assigned.lte = new Date(filters.date_assigned_to);
            }
        }
        if (filters.assignment_type) {
            busTripFilters.assignment_type = filters.assignment_type;
        }
        if (filters.trip_revenue_min !== undefined || filters.trip_revenue_max !== undefined) {
            busTripFilters.trip_revenue = {};
            if (filters.trip_revenue_min !== undefined) {
                busTripFilters.trip_revenue.gte = new Prisma.Decimal(filters.trip_revenue_min);
            }
            if (filters.trip_revenue_max !== undefined) {
                busTripFilters.trip_revenue.lte = new Prisma.Decimal(filters.trip_revenue_max);
            }
        }

        if (Object.keys(busTripFilters).length > 0) {
            where.bus_trip = busTripFilters;
        }

        // Enhanced search across multiple fields with intelligent matching
        if (filters.search) {
            const searchCriteria = this.parseSearchTerm(filters.search);
            const orConditions: Prisma.revenueWhereInput[] = [
                // Text-based searches
                { code: { contains: filters.search, mode: 'insensitive' } },
                { bus_trip: { bus: { body_number: { contains: filters.search, mode: 'insensitive' } } } },
            ];

            // Add payment status search if matched
            if (searchCriteria.paymentStatuses && searchCriteria.paymentStatuses.length > 0) {
                orConditions.push({ payment_status: { in: searchCriteria.paymentStatuses } });
            }

            // Add assignment type search if matched
            if (searchCriteria.assignmentTypes && searchCriteria.assignmentTypes.length > 0) {
                orConditions.push({
                    bus_trip: { assignment_type: { in: searchCriteria.assignmentTypes } }
                });
            }

            // Add numeric search for trip_revenue
            // Only search trip_revenue if the number is > 31 (to avoid matching day numbers)
            // OR if there's no date context (month/year)
            if (searchCriteria.numericValue !== undefined &&
                (searchCriteria.numericValue > 31 ||
                    (!searchCriteria.monthNumber && !searchCriteria.yearNumber))) {
                const numVal = searchCriteria.numericValue;
                // Use string-based contains matching for numeric search
                // This allows "100" to match "1000", "1100", "1200" etc.
                // Convert to string and search in the numeric range
                const numStr = numVal.toString();

                // If the search is an exact whole number, match values that contain these digits
                // For example: "100" should match 100, 1000, 1100, 1200, etc.
                // "1300" should match 1300, 13000, etc.
                if (numVal >= 100) {
                    // For 3+ digit numbers, do an exact match or prefix match
                    orConditions.push({
                        bus_trip: {
                            trip_revenue: {
                                gte: new Prisma.Decimal(numVal),
                                lt: new Prisma.Decimal(numVal + 1)
                            }
                        }
                    });
                } else if (numVal > 31) {
                    // For numbers 32-99, also do exact match
                    orConditions.push({
                        bus_trip: {
                            trip_revenue: {
                                gte: new Prisma.Decimal(numVal),
                                lt: new Prisma.Decimal(numVal + 1)
                            }
                        }
                    });
                }
            }

            // Add date-based search for month + day + year combinations
            const currentYear = new Date().getFullYear();

            // If we have both month and day (e.g., "January 11")
            if (searchCriteria.monthNumber !== undefined && searchCriteria.dayNumber !== undefined) {
                const month = searchCriteria.monthNumber;
                const day = searchCriteria.dayNumber;
                const year = searchCriteria.yearNumber || currentYear;

                // Validate the day exists in the month
                const daysInMonth = new Date(year, month, 0).getDate();
                if (day <= daysInMonth) {
                    const targetDate = new Date(year, month - 1, day);
                    const nextDate = new Date(year, month - 1, day + 1);

                    // If no year specified, check multiple years
                    if (!searchCriteria.yearNumber) {
                        for (let y = currentYear - 4; y <= currentYear + 1; y++) {
                            const daysInMonthY = new Date(y, month, 0).getDate();
                            if (day <= daysInMonthY) {
                                const targetDateY = new Date(y, month - 1, day);
                                const nextDateY = new Date(y, month - 1, day + 1);

                                orConditions.push({
                                    date_recorded: {
                                        gte: targetDateY,
                                        lt: nextDateY
                                    }
                                });

                                orConditions.push({
                                    bus_trip: {
                                        date_assigned: {
                                            gte: targetDateY,
                                            lt: nextDateY
                                        }
                                    }
                                });
                            }
                        }
                    } else {
                        // Specific year provided
                        orConditions.push({
                            date_recorded: {
                                gte: targetDate,
                                lt: nextDate
                            }
                        });

                        orConditions.push({
                            bus_trip: {
                                date_assigned: {
                                    gte: targetDate,
                                    lt: nextDate
                                }
                            }
                        });
                    }
                }
            }
            // Month only search (e.g., "January")
            else if (searchCriteria.monthNumber !== undefined && !searchCriteria.dayNumber) {
                const month = searchCriteria.monthNumber;
                const year = searchCriteria.yearNumber;

                if (year) {
                    // Specific month and year
                    const startOfMonth = new Date(year, month - 1, 1);
                    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

                    orConditions.push({
                        date_recorded: {
                            gte: startOfMonth,
                            lte: endOfMonth
                        }
                    });

                    orConditions.push({
                        bus_trip: {
                            date_assigned: {
                                gte: startOfMonth,
                                lte: endOfMonth
                            }
                        }
                    });
                } else {
                    // Month across multiple years
                    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
                        const startOfMonth = new Date(y, month - 1, 1);
                        const endOfMonth = new Date(y, month, 0, 23, 59, 59);

                        orConditions.push({
                            date_recorded: {
                                gte: startOfMonth,
                                lte: endOfMonth
                            }
                        });

                        orConditions.push({
                            bus_trip: {
                                date_assigned: {
                                    gte: startOfMonth,
                                    lte: endOfMonth
                                }
                            }
                        });
                    }
                }
            }
            // Year only search (e.g., "2026")
            else if (searchCriteria.yearNumber !== undefined && !searchCriteria.monthNumber) {
                const year = searchCriteria.yearNumber;
                const startOfYear = new Date(year, 0, 1);
                const endOfYear = new Date(year, 11, 31, 23, 59, 59);

                orConditions.push({
                    date_recorded: {
                        gte: startOfYear,
                        lte: endOfYear
                    }
                });

                orConditions.push({
                    bus_trip: {
                        date_assigned: {
                            gte: startOfYear,
                            lte: endOfYear
                        }
                    }
                });
            }
            // Day only search (e.g., "15" for 15th of any month) - only if pure day number and <= 31
            else if (searchCriteria.dayNumber !== undefined &&
                !searchCriteria.monthNumber &&
                !searchCriteria.yearNumber &&
                searchCriteria.numericValue !== undefined &&
                searchCriteria.numericValue <= 31) {
                const day = searchCriteria.dayNumber;

                for (let month = 0; month < 12; month++) {
                    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
                    if (day <= daysInMonth) {
                        const targetDate = new Date(currentYear, month, day);
                        const nextDate = new Date(currentYear, month, day + 1);

                        orConditions.push({
                            date_recorded: {
                                gte: targetDate,
                                lt: nextDate
                            }
                        });

                        orConditions.push({
                            bus_trip: {
                                date_assigned: {
                                    gte: targetDate,
                                    lt: nextDate
                                }
                            }
                        });
                    }
                }
            }

            where.OR = orConditions;
        }

        // Sorting
        // Handle sorting for both direct revenue fields and related bus_trip fields
        let orderBy: Prisma.revenueOrderByWithRelationInput | Prisma.revenueOrderByWithRelationInput[] = {};

        if (filters.sort_by === 'date_recorded') {
            orderBy = { date_recorded: filters.sort_order || 'desc' };
        } else if (filters.sort_by === 'amount') {
            orderBy = { amount: filters.sort_order || 'desc' };
        } else if (filters.sort_by === 'updated_at') {
            orderBy = { updated_at: filters.sort_order || 'desc' };
        } else if (filters.sort_by === 'trip_revenue') {
            // Sort by related bus_trip.trip_revenue field
            orderBy = { bus_trip: { trip_revenue: filters.sort_order || 'desc' } };
        } else if (filters.sort_by === 'body_number') {
            // Sort by related bus_trip.bus.body_number field
            orderBy = { bus_trip: { bus: { body_number: filters.sort_order || 'desc' } } };
        } else if (filters.sort_by === 'date_assigned') {
            // Sort by related bus_trip.date_assigned field
            orderBy = { bus_trip: { date_assigned: filters.sort_order || 'desc' } };
        } else if (filters.sort_by === 'assignment_type') {
            // Sort by related bus_trip.assignment_type field
            orderBy = { bus_trip: { assignment_type: filters.sort_order || 'desc' } };
        } else if (filters.sort_by === 'assignment_value') {
            // Sort by related bus_trip.assignment_value field
            orderBy = { bus_trip: { assignment_value: filters.sort_order || 'desc' } };
        } else if (filters.sort_by === 'date_expected') {
            orderBy = { date_expected: filters.sort_order || 'desc' };
        } else {
            orderBy = { updated_at: filters.sort_order || 'desc' };
        }

        const skip = (page - 1) * limit;

        const [revenues, total] = await Promise.all([
            prisma.revenue.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    bus_trip: {
                        include: {
                            bus: {
                                select: { body_number: true },
                            },
                        },
                    },
                    driver_receivable: { select: { id: true } },
                    conductor_receivable: { select: { id: true } },
                },
            }),
            prisma.revenue.count({ where }),
        ]);

        const data: RevenueListItem[] = revenues.map((rev) => {
            const trip = rev.bus_trip;
            const expectedRemittance = this.calculateExpectedRemittance(
                trip?.assignment_type ?? null,
                trip?.trip_revenue ?? null,
                trip?.assignment_value ?? null,
                trip?.trip_fuel_expense ?? null
            );
            const shortage = this.calculateShortage(expectedRemittance, trip?.trip_revenue ?? null);

            return {
                id: rev.id,
                code: rev.code,
                body_number: trip?.bus?.body_number ?? null,
                date_assigned: trip?.date_assigned?.toISOString() ?? null,
                trip_revenue: Number(trip?.trip_revenue ?? 0),
                assignment_type: trip?.assignment_type ?? null,
                payment_status: rev.payment_status,
                approval_status: rev.approval_status || 'PENDING',
                accounting_status: rev.accounting_status || 'DRAFT',
                date_recorded: rev.date_recorded?.toISOString() ?? null,
                expected_remittance: Number(expectedRemittance),
                shortage: Number(shortage),
                has_receivables: !!(rev.driver_receivable || rev.conductor_receivable),
            };
        });

        return {
            data,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    // --------------------------------------------------------------------------
    // GET REVENUE BY ID
    // --------------------------------------------------------------------------

    /**
     * Get full revenue details by ID
     */
    async getRevenueById(id: number): Promise<RevenueDetailResponse> {
        const revenue = await prisma.revenue.findUnique({
            where: { id },
            include: {
                bus_trip: {
                    include: {
                        bus: true,
                        employees: {
                            include: {
                                employee: true,
                            },
                        },
                    },
                },
                driver_receivable: {
                    include: {
                        installment_schedule: {
                            where: { is_deleted: false },
                            orderBy: { installment_number: 'asc' },
                        },
                    },
                },
                conductor_receivable: {
                    include: {
                        installment_schedule: {
                            where: { is_deleted: false },
                            orderBy: { installment_number: 'asc' },
                        },
                    },
                },
                journal_entry: {
                    select: { id: true, code: true, status: true },
                },
            },
        });

        if (!revenue || revenue.is_deleted) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        const trip = revenue.bus_trip;
        if (!trip) {
            throw new NotFoundError(`Bus trip data not found for revenue ${id}`);
        }

        const expectedRemittance = this.calculateExpectedRemittance(
            trip.assignment_type,
            trip.trip_revenue,
            trip.assignment_value,
            trip.trip_fuel_expense
        );
        const shortage = this.calculateShortage(expectedRemittance, trip.trip_revenue);
        const companyShareAmount = this.calculateCompanyShareAmount(
            trip.assignment_type,
            trip.trip_revenue,
            trip.assignment_value
        );

        // Get driver and conductor from employees
        const driver = trip.employees?.find((e) => e.role === 'DRIVER');
        const conductor = trip.employees?.find((e) => e.role === 'CONDUCTOR');

        const formatEmployeeName = (emp: any): string => {
            if (!emp?.employee) return 'Unknown';
            const { first_name, middle_name, last_name } = emp.employee;
            return [first_name, middle_name, last_name].filter(Boolean).join(' ');
        };

        const config = await this.getSystemConfig();

        const response: RevenueDetailResponse = {
            id: revenue.id,
            code: revenue.code,
            assignment_id: revenue.bus_trip_assignment_id!,
            bus_trip_id: revenue.bus_trip_id!,
            payment_status: revenue.payment_status,
            approval_status: revenue.approval_status,
            accounting_status: revenue.accounting_status,

            bus_details: {
                date_assigned: trip.date_assigned?.toISOString() ?? null,
                body_number: trip.bus?.body_number ?? null,
                license_plate: trip.bus?.license_plate ?? null,
                bus_type: trip.bus?.type ?? null,
                route: trip.bus_route ?? null,
                assignment_type: trip.assignment_type ?? null,
                assignment_value: Number(trip.assignment_value ?? 0),
                payment_method: trip.payment_method ?? null,
                trip_revenue: Number(trip.trip_revenue ?? 0),
                trip_fuel_expense: Number(trip.trip_fuel_expense ?? 0),
                company_share_amount: Number(companyShareAmount),
            },

            employees: {
                driver: driver
                    ? {
                        employee_number: driver.employee_number,
                        name: formatEmployeeName(driver),
                    }
                    : null,
                conductor: conductor
                    ? {
                        employee_number: conductor.employee_number,
                        name: formatEmployeeName(conductor),
                    }
                    : null,
            },

            remittance: {
                date_recorded: revenue.date_recorded?.toISOString() ?? null,
                date_expected: revenue.date_expected?.toISOString() ?? null,
                expected_remittance: Number(expectedRemittance),
                amount_remitted: Number(revenue.amount),
                shortage: Number(shortage),
                description: revenue.description ?? null,
            },

            created_by: revenue.created_by,
            created_at: revenue.created_at.toISOString(),
            updated_by: revenue.updated_by,
            updated_at: revenue.updated_at?.toISOString() ?? null,
        };

        // Add shortage details if PARTIALLY_PAID
        if (revenue.payment_status === 'PARTIALLY_PAID' && shortage.greaterThan(0)) {
            const driverShare = shortage.mul(new Prisma.Decimal(config.driver_share_percentage / 100));
            const conductorShare = shortage.mul(new Prisma.Decimal(config.conductor_share_percentage / 100));

            response.shortage_details = {
                driver_share: Number(driverShare),
                conductor_share: Number(conductorShare),
                receivable_due_date: revenue.driver_receivable?.due_date?.toISOString() ?? null,
                driver_receivable: revenue.driver_receivable
                    ? {
                        id: revenue.driver_receivable.id,
                        code: revenue.driver_receivable.code,
                        debtor_name: revenue.driver_receivable.debtor_name,
                        employee_number: revenue.driver_receivable.employee_number,
                        total_amount: Number(revenue.driver_receivable.total_amount),
                        paid_amount: Number(revenue.driver_receivable.paid_amount),
                        balance: Number(revenue.driver_receivable.balance),
                        status: revenue.driver_receivable.status,
                        due_date: revenue.driver_receivable.due_date?.toISOString() ?? null,
                        frequency: revenue.driver_receivable.frequency,
                        number_of_payments: revenue.driver_receivable.number_of_payments,
                        installment_schedules: revenue.driver_receivable.installment_schedule.map((s) => ({
                            id: s.id,
                            installment_number: s.installment_number,
                            due_date: s.due_date.toISOString(),
                            amount_due: Number(s.amount_due),
                            amount_paid: Number(s.amount_paid),
                            balance: Number(s.balance),
                            status: s.status,
                        })),
                    }
                    : null,
                conductor_receivable: revenue.conductor_receivable
                    ? {
                        id: revenue.conductor_receivable.id,
                        code: revenue.conductor_receivable.code,
                        debtor_name: revenue.conductor_receivable.debtor_name,
                        employee_number: revenue.conductor_receivable.employee_number,
                        total_amount: Number(revenue.conductor_receivable.total_amount),
                        paid_amount: Number(revenue.conductor_receivable.paid_amount),
                        balance: Number(revenue.conductor_receivable.balance),
                        status: revenue.conductor_receivable.status,
                        due_date: revenue.conductor_receivable.due_date?.toISOString() ?? null,
                        frequency: revenue.conductor_receivable.frequency,
                        number_of_payments: revenue.conductor_receivable.number_of_payments,
                        installment_schedules: revenue.conductor_receivable.installment_schedule.map((s) => ({
                            id: s.id,
                            installment_number: s.installment_number,
                            due_date: s.due_date.toISOString(),
                            amount_due: Number(s.amount_due),
                            amount_paid: Number(s.amount_paid),
                            balance: Number(s.balance),
                            status: s.status,
                        })),
                    }
                    : null,
            };
        }

        // Add journal entry if exists
        if (revenue.journal_entry) {
            response.journal_entry = {
                id: revenue.journal_entry.id,
                code: revenue.journal_entry.code,
                status: revenue.journal_entry.status,
            };
        }

        return response;
    }

    // --------------------------------------------------------------------------
    // CREATE REVENUE RECORD
    // --------------------------------------------------------------------------

    /**
     * Record trip revenue - creates revenue, receivables (if shortage), and journal entry
     */
    async createRevenue(
        data: CreateRevenueDTO,
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<RevenueDetailResponse> {
        logger.info(`[BusTripRevenueService] Creating revenue for trip: ${data.assignment_id}/${data.bus_trip_id}`);

        // Fetch the bus trip
        const busTrip = await prisma.bus_trip_local.findUnique({
            where: {
                assignment_id_bus_trip_id: {
                    assignment_id: data.assignment_id,
                    bus_trip_id: data.bus_trip_id,
                },
            },
            include: {
                bus: true,
                employees: {
                    include: { employee: true },
                },
            },
        });

        if (!busTrip) {
            throw new NotFoundError(`Bus trip ${data.assignment_id}/${data.bus_trip_id} not found`);
        }

        if (busTrip.is_deleted) {
            throw new BadRequestError('Cannot record revenue for a deleted bus trip');
        }

        if (busTrip.is_revenue_recorded) {
            throw new BadRequestError('Revenue has already been recorded for this bus trip');
        }

        // Calculate financial values
        const expectedRemittance = this.calculateExpectedRemittance(
            busTrip.assignment_type,
            busTrip.trip_revenue,
            busTrip.assignment_value,
            busTrip.trip_fuel_expense
        );
        const shortage = this.calculateShortage(expectedRemittance, busTrip.trip_revenue);
        const paymentStatus = this.determinePaymentStatus(busTrip.trip_revenue, expectedRemittance);
        const hasShortage = shortage.greaterThan(0);
        const amountRemitted = busTrip.trip_revenue ?? new Prisma.Decimal(0);


        // Get config and revenue type
        const config = await this.getSystemConfig();
        const revenueTypeCode = busTrip.assignment_type === 'PERCENTAGE'
            ? REVENUE_TYPE_CODES.PERCENTAGE
            : REVENUE_TYPE_CODES.BOUNDARY;

        const revenueType = await prisma.revenue_type.findFirst({
            where: { code: revenueTypeCode, is_deleted: false },
        });

        if (!revenueType) {
            throw new NotFoundError(`Revenue type ${revenueTypeCode} not found`);
        }

        // Prepare dates
        const dateRecorded = data.date_recorded ? new Date(data.date_recorded) : new Date();
        const dateExpected = new Date(busTrip.date_assigned ?? new Date());
        dateExpected.setDate(dateExpected.getDate() + 1);

        const receivableDueDate = new Date(dateRecorded);
        receivableDueDate.setDate(receivableDueDate.getDate() + config.receivable_due_date_days);

        // Get employees
        const driver = busTrip.employees?.find((e) => e.role === 'DRIVER');
        const conductor = busTrip.employees?.find((e) => e.role === 'CONDUCTOR');

        const formatEmployeeName = (emp: any): string => {
            if (!emp?.employee) return 'Unknown';
            const { first_name, middle_name, last_name } = emp.employee;
            return [first_name, middle_name, last_name].filter(Boolean).join(' ');
        };

        // Prepare codes
        const revenueCode = await this.generateRevenueCode();
        let driverReceivableCode: string | null = null;
        let conductorReceivableCode: string | null = null;

        if (hasShortage) {
            driverReceivableCode = await this.generateReceivableCode(0);
            conductorReceivableCode = await this.generateReceivableCode(1);  // Offset by 1 for unique code
        }

        // Execute in transaction
        const result = await prisma.$transaction(async (tx) => {
            let driverReceivableId: number | null = null;
            let conductorReceivableId: number | null = null;

            // Create receivables if shortage exists
            if (hasShortage) {
                const driverShare = shortage.mul(new Prisma.Decimal(config.driver_share_percentage / 100));
                const conductorShare = shortage.mul(new Prisma.Decimal(config.conductor_share_percentage / 100));

                // Create driver receivable
                if (driver) {
                    const driverReceivable = await tx.receivable.create({
                        data: {
                            code: driverReceivableCode!,
                            debtor_name: formatEmployeeName(driver),
                            employee_number: driver.employee_number,
                            description: `DRIVER | ${busTrip.assignment_type} trip shortage - Bus: ${busTrip.bus?.body_number} - Date: ${busTrip.date_assigned?.toISOString().split('T')[0]} - Expected: ₱${expectedRemittance} - Collected: ₱${busTrip.trip_revenue} - Shortage: ₱${shortage}`,
                            total_amount: driverShare,
                            installment_start_date: dateRecorded,
                            due_date: receivableDueDate,
                            frequency: config.default_frequency as receivable_frequency,
                            number_of_payments: config.default_number_of_payments,
                            status: 'PENDING',
                            paid_amount: new Prisma.Decimal(0),
                            balance: driverShare,
                            created_by: userId,
                        },
                    });
                    driverReceivableId = driverReceivable.id;

                    // Create installment schedules for driver
                    await this.generateInstallmentSchedules(
                        tx,
                        driverReceivable.id,
                        driverShare,
                        dateRecorded,
                        config.default_number_of_payments,
                        config.default_frequency as receivable_frequency,
                        userId
                    );
                }

                // Create conductor receivable
                if (conductor) {
                    const conductorReceivable = await tx.receivable.create({
                        data: {
                            code: conductorReceivableCode!,
                            debtor_name: formatEmployeeName(conductor),
                            employee_number: conductor.employee_number,
                            description: `CONDUCTOR | ${busTrip.assignment_type} trip shortage - Bus: ${busTrip.bus?.body_number} - Date: ${busTrip.date_assigned?.toISOString().split('T')[0]} - Expected: ₱${expectedRemittance} - Collected: ₱${busTrip.trip_revenue} - Shortage: ₱${shortage}`,
                            total_amount: conductorShare,
                            installment_start_date: dateRecorded,
                            due_date: receivableDueDate,
                            frequency: config.default_frequency as receivable_frequency,
                            number_of_payments: config.default_number_of_payments,
                            status: 'PENDING',
                            paid_amount: new Prisma.Decimal(0),
                            balance: conductorShare,
                            created_by: userId,
                        },
                    });
                    conductorReceivableId = conductorReceivable.id;

                    // Create installment schedules for conductor
                    await this.generateInstallmentSchedules(
                        tx,
                        conductorReceivable.id,
                        conductorShare,
                        dateRecorded,
                        config.default_number_of_payments,
                        config.default_frequency as receivable_frequency,
                        userId
                    );
                }
            }

            // Create revenue record
            // Auto-generated from bus trip: approval_status = APPROVED, accounting_status = DRAFT
            const revenue = await tx.revenue.create({
                data: {
                    code: revenueCode,
                    revenue_type_id: revenueType.id,
                    amount: amountRemitted,  // Use actual remittance, not trip_revenue
                    date_recorded: dateRecorded,
                    date_expected: dateExpected,
                    description: data.description ?? null,
                    approval_status: 'APPROVED', // Auto-generated revenue is auto-approved
                    payment_status: paymentStatus as payment_status,
                    accounting_status: 'DRAFT', // Journal entry posting is manual
                    driver_receivable_id: driverReceivableId,
                    conductor_receivable_id: conductorReceivableId,
                    payment_method: this.mapPaymentMethod(busTrip.payment_method),
                    bus_trip_assignment_id: data.assignment_id,
                    bus_trip_id: data.bus_trip_id,
                    created_by: userId,
                    updated_at: new Date()
                },
            });

            // Mark trip as revenue recorded
            await tx.bus_trip_local.update({
                where: {
                    assignment_id_bus_trip_id: {
                        assignment_id: data.assignment_id,
                        bus_trip_id: data.bus_trip_id,
                    },
                },
                data: {
                    is_revenue_recorded: true,
                },
            });

            return { revenue, driverReceivableId, conductorReceivableId };
        });

        // Create journal entry (outside transaction to use the service)
        const tripRevenueNum = Number(busTrip.trip_revenue ?? 0);
        const amountRemittedNum = Number(amountRemitted);
        const paymentMethodEnum = this.mapPaymentMethod(busTrip.payment_method);
        const assetAccountCode = this.getAssetAccountCode(paymentMethodEnum);
        const revenueAccountCode = this.getRevenueAccountCode(busTrip.assignment_type);


        let jePayload: CreateAutoJournalEntryInput;

        if (hasShortage) {
            const driverShare = Number(shortage.mul(new Prisma.Decimal(config.driver_share_percentage / 100)));
            const conductorShare = Number(shortage.mul(new Prisma.Decimal(config.conductor_share_percentage / 100)));

            jePayload = {
                module: 'Trip Revenue',
                reference_id: revenueCode,
                description: `${busTrip.assignment_type} revenue - ₱${amountRemittedNum} remitted (Expected: ₱${Number(expectedRemittance)}, Shortage: ₱${Number(shortage)}) - Payment: ${paymentMethodEnum} - Bus: ${busTrip.bus?.body_number}`,
                date: dateRecorded.toISOString().split('T')[0],
                entries: [
                    {
                        account_code: assetAccountCode,
                        debit: amountRemittedNum,
                        credit: 0,
                        description: 'Cash received from remittance',
                    },
                    {
                        account_code: ACCOUNT_CODES.DRIVER_RECEIVABLE,
                        debit: driverShare,
                        credit: 0,
                        description: 'Driver shortage receivable',
                    },
                    {
                        account_code: ACCOUNT_CODES.CONDUCTOR_RECEIVABLE,
                        debit: conductorShare,
                        credit: 0,
                        description: 'Conductor shortage receivable',
                    },
                    {
                        account_code: revenueAccountCode,
                        debit: 0,
                        credit: Number(expectedRemittance),
                        description: 'Trip revenue recognized',
                    },
                ],
            };
        } else {
            jePayload = {
                module: 'Trip Revenue',
                reference_id: revenueCode,
                description: `${busTrip.assignment_type} revenue - ₱${amountRemittedNum} - Payment: ${paymentMethodEnum} - Bus: ${busTrip.bus?.body_number}`,
                date: dateRecorded.toISOString().split('T')[0],
                entries: [
                    {
                        account_code: assetAccountCode,
                        debit: amountRemittedNum,
                        credit: 0,
                        description: 'Cash received from remittance',
                    },
                    {
                        account_code: revenueAccountCode,
                        debit: 0,
                        credit: amountRemittedNum,
                        description: 'Trip revenue recognized',
                    },
                ],
            };
        }


        // Create journal entry
        const journalEntry = await this.journalEntryService.createAutoJournalEntry(
            jePayload,
            userId,
            userInfo,
            req
        );

        // Link journal entry to revenue
        await prisma.revenue.update({
            where: { id: result.revenue.id },
            data: { journal_entry_id: journalEntry.id },
        });

        // Audit log
        await AuditLogClient.logCreate(
            'Bus Trip Revenue',
            { id: result.revenue.id, code: revenueCode },
            result.revenue,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`[BusTripRevenueService] Created revenue: ${revenueCode}`);
        return this.getRevenueById(result.revenue.id);
    }

    // --------------------------------------------------------------------------
    // UPDATE REVENUE RECORD
    // --------------------------------------------------------------------------

    /**
     * Update revenue record with full Edit Modal support.
     * 
     * Handles:
     * - Revenue field updates (date_recorded, amount, description, date_expected)
     * - Status management (remittance_status, delete_receivables)
     * - Receivable creation/updates (driverReceivable, conductorReceivable)
     * - Installment schedule regeneration when frequency/number_of_payments change
     */
    async updateRevenue(
        id: number,
        data: UpdateRevenueDTO,
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<RevenueDetailResponse> {
        logger.info(`[BusTripRevenueService] Updating revenue ID: ${id}`);

        // Fetch existing revenue with all relations
        const existing = await prisma.revenue.findUnique({
            where: { id },
            include: {
                bus_trip: {
                    include: {
                        bus: true,
                        employees: {
                            include: { employee: true },
                        },
                    },
                },
                driver_receivable: {
                    include: { installment_schedule: true },
                },
                conductor_receivable: {
                    include: { installment_schedule: true },
                },
            },
        });

        if (!existing || existing.is_deleted) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        // Execute all updates in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // =================================================================
            // 1. Handle delete_receivables flag (revert to PAID status)
            // =================================================================
            if (data.delete_receivables === true) {
                logger.info(`[BusTripRevenueService] Deleting receivables for revenue ${id}`);

                // Delete driver receivable and its schedules
                if (existing.driver_receivable_id) {
                    await tx.revenue_installment_schedule.deleteMany({
                        where: { receivable_id: existing.driver_receivable_id },
                    });
                    await tx.receivable.delete({
                        where: { id: existing.driver_receivable_id },
                    });
                }

                // Delete conductor receivable and its schedules
                if (existing.conductor_receivable_id) {
                    await tx.revenue_installment_schedule.deleteMany({
                        where: { receivable_id: existing.conductor_receivable_id },
                    });
                    await tx.receivable.delete({
                        where: { id: existing.conductor_receivable_id },
                    });
                }

                // Clear the foreign keys
                await tx.revenue.update({
                    where: { id },
                    data: {
                        driver_receivable_id: null,
                        conductor_receivable_id: null,
                        payment_status: 'COMPLETED',
                        updated_by: userId,
                    },
                });
            }

            // =================================================================
            // 2. Handle driver receivable update/creation
            // =================================================================
            let newDriverReceivableId: number | null = existing.driver_receivable_id;

            if (data.driverReceivable) {
                const driverData = data.driverReceivable;

                if (existing.driver_receivable_id) {
                    // Update existing driver receivable
                    const updateReceivableData: any = { updated_by: userId };

                    if (driverData.debtor_name !== undefined) updateReceivableData.debtor_name = driverData.debtor_name;
                    if (driverData.description !== undefined) updateReceivableData.description = driverData.description;
                    if (driverData.total_amount !== undefined) {
                        updateReceivableData.total_amount = new Prisma.Decimal(driverData.total_amount);
                        updateReceivableData.balance = new Prisma.Decimal(driverData.total_amount);
                    }
                    if (driverData.due_date !== undefined) updateReceivableData.due_date = new Date(driverData.due_date);
                    if (driverData.employee_number !== undefined) updateReceivableData.employee_number = driverData.employee_number;
                    if (driverData.frequency !== undefined) updateReceivableData.frequency = driverData.frequency;
                    if (driverData.number_of_payments !== undefined) updateReceivableData.number_of_payments = driverData.number_of_payments;

                    await tx.receivable.update({
                        where: { id: existing.driver_receivable_id },
                        data: updateReceivableData,
                    });

                    // Regenerate installment schedules if frequency or number_of_payments changed
                    if (driverData.frequency !== undefined || driverData.number_of_payments !== undefined || driverData.installments) {
                        await this.regenerateInstallmentSchedules(
                            tx,
                            existing.driver_receivable_id,
                            driverData,
                            existing.driver_receivable,
                            userId
                        );
                    }
                } else {
                    // Create new driver receivable
                    const driverReceivableCode = await this.generateReceivableCode(0);
                    const config = await this.getSystemConfig();

                    const driverReceivable = await tx.receivable.create({
                        data: {
                            code: driverReceivableCode,
                            debtor_name: driverData.debtor_name || 'Unknown Driver',
                            employee_number: driverData.employee_number || null,
                            description: driverData.description || `Driver receivable for revenue ${existing.code}`,
                            total_amount: new Prisma.Decimal(driverData.total_amount || 0),
                            installment_start_date: new Date(),
                            due_date: driverData.due_date ? new Date(driverData.due_date) : null,
                            frequency: (driverData.frequency as receivable_frequency) || config.default_frequency as receivable_frequency,
                            number_of_payments: driverData.number_of_payments || config.default_number_of_payments,
                            status: 'PENDING',
                            paid_amount: new Prisma.Decimal(0),
                            balance: new Prisma.Decimal(driverData.total_amount || 0),
                            created_by: userId,
                        },
                    });
                    newDriverReceivableId = driverReceivable.id;

                    // Generate installment schedules
                    if (driverData.installments && driverData.installments.length > 0) {
                        // Use provided installments
                        for (const inst of driverData.installments) {
                            await tx.revenue_installment_schedule.create({
                                data: {
                                    receivable_id: driverReceivable.id,
                                    installment_number: inst.installment_number,
                                    due_date: new Date(inst.due_date),
                                    amount_due: new Prisma.Decimal(inst.amount_due),
                                    amount_paid: new Prisma.Decimal(inst.amount_paid || 0),
                                    balance: new Prisma.Decimal(inst.balance || inst.amount_due),
                                    status: 'PENDING',
                                    created_by: userId,
                                },
                            });
                        }
                    } else {
                        // Auto-generate installments
                        await this.generateInstallmentSchedules(
                            tx,
                            driverReceivable.id,
                            new Prisma.Decimal(driverData.total_amount || 0),
                            new Date(),
                            driverData.number_of_payments || config.default_number_of_payments,
                            (driverData.frequency as receivable_frequency) || config.default_frequency as receivable_frequency,
                            userId
                        );
                    }
                }
            }

            // =================================================================
            // 3. Handle conductor receivable update/creation
            // =================================================================
            let newConductorReceivableId: number | null = existing.conductor_receivable_id;

            if (data.conductorReceivable) {
                const conductorData = data.conductorReceivable;

                if (existing.conductor_receivable_id) {
                    // Update existing conductor receivable
                    const updateReceivableData: any = { updated_by: userId };

                    if (conductorData.debtor_name !== undefined) updateReceivableData.debtor_name = conductorData.debtor_name;
                    if (conductorData.description !== undefined) updateReceivableData.description = conductorData.description;
                    if (conductorData.total_amount !== undefined) {
                        updateReceivableData.total_amount = new Prisma.Decimal(conductorData.total_amount);
                        updateReceivableData.balance = new Prisma.Decimal(conductorData.total_amount);
                    }
                    if (conductorData.due_date !== undefined) updateReceivableData.due_date = new Date(conductorData.due_date);
                    if (conductorData.employee_number !== undefined) updateReceivableData.employee_number = conductorData.employee_number;
                    if (conductorData.frequency !== undefined) updateReceivableData.frequency = conductorData.frequency;
                    if (conductorData.number_of_payments !== undefined) updateReceivableData.number_of_payments = conductorData.number_of_payments;

                    await tx.receivable.update({
                        where: { id: existing.conductor_receivable_id },
                        data: updateReceivableData,
                    });

                    // Regenerate installment schedules if frequency or number_of_payments changed
                    if (conductorData.frequency !== undefined || conductorData.number_of_payments !== undefined || conductorData.installments) {
                        await this.regenerateInstallmentSchedules(
                            tx,
                            existing.conductor_receivable_id,
                            conductorData,
                            existing.conductor_receivable,
                            userId
                        );
                    }
                } else {
                    // Create new conductor receivable
                    const conductorReceivableCode = await this.generateReceivableCode(1);
                    const config = await this.getSystemConfig();

                    const conductorReceivable = await tx.receivable.create({
                        data: {
                            code: conductorReceivableCode,
                            debtor_name: conductorData.debtor_name || 'Unknown Conductor',
                            employee_number: conductorData.employee_number || null,
                            description: conductorData.description || `Conductor receivable for revenue ${existing.code}`,
                            total_amount: new Prisma.Decimal(conductorData.total_amount || 0),
                            installment_start_date: new Date(),
                            due_date: conductorData.due_date ? new Date(conductorData.due_date) : null,
                            frequency: (conductorData.frequency as receivable_frequency) || config.default_frequency as receivable_frequency,
                            number_of_payments: conductorData.number_of_payments || config.default_number_of_payments,
                            status: 'PENDING',
                            paid_amount: new Prisma.Decimal(0),
                            balance: new Prisma.Decimal(conductorData.total_amount || 0),
                            created_by: userId,
                        },
                    });
                    newConductorReceivableId = conductorReceivable.id;

                    // Generate installment schedules
                    if (conductorData.installments && conductorData.installments.length > 0) {
                        // Use provided installments
                        for (const inst of conductorData.installments) {
                            await tx.revenue_installment_schedule.create({
                                data: {
                                    receivable_id: conductorReceivable.id,
                                    installment_number: inst.installment_number,
                                    due_date: new Date(inst.due_date),
                                    amount_due: new Prisma.Decimal(inst.amount_due),
                                    amount_paid: new Prisma.Decimal(inst.amount_paid || 0),
                                    balance: new Prisma.Decimal(inst.balance || inst.amount_due),
                                    status: 'PENDING',
                                    created_by: userId,
                                },
                            });
                        }
                    } else {
                        // Auto-generate installments
                        await this.generateInstallmentSchedules(
                            tx,
                            conductorReceivable.id,
                            new Prisma.Decimal(conductorData.total_amount || 0),
                            new Date(),
                            conductorData.number_of_payments || config.default_number_of_payments,
                            (conductorData.frequency as receivable_frequency) || config.default_frequency as receivable_frequency,
                            userId
                        );
                    }
                }
            }

            // =================================================================
            // 4. Update revenue record
            // =================================================================
            const updateRevenueData: any = {
                updated_by: userId,
            };

            if (data.date_recorded !== undefined) {
                updateRevenueData.date_recorded = new Date(data.date_recorded);
            }
            if (data.amount !== undefined) {
                updateRevenueData.amount = new Prisma.Decimal(data.amount);
            }
            if (data.description !== undefined) {
                updateRevenueData.description = data.description;
            }
            if (data.date_expected !== undefined) {
                updateRevenueData.date_expected = new Date(data.date_expected);
            }

            // Update receivable foreign keys if changed
            if (newDriverReceivableId !== existing.driver_receivable_id) {
                updateRevenueData.driver_receivable_id = newDriverReceivableId;
            }
            if (newConductorReceivableId !== existing.conductor_receivable_id) {
                updateRevenueData.conductor_receivable_id = newConductorReceivableId;
            }

            // Handle payment_status (replaces remittance_status)
            if (data.payment_status !== undefined) {
                updateRevenueData.payment_status = data.payment_status as payment_status;
            } else if (data.amount !== undefined && existing.bus_trip && !data.delete_receivables) {
                // Auto-calculate status based on amount if not explicitly provided
                const expectedRemittance = this.calculateExpectedRemittance(
                    existing.bus_trip.assignment_type,
                    existing.bus_trip.trip_revenue,
                    existing.bus_trip.assignment_value,
                    existing.bus_trip.trip_fuel_expense
                );
                const newAmount = new Prisma.Decimal(data.amount);
                updateRevenueData.payment_status = newAmount.greaterThanOrEqualTo(expectedRemittance) ? 'COMPLETED' : 'PARTIALLY_PAID';
            }

            const updated = await tx.revenue.update({
                where: { id },
                data: updateRevenueData,
            });

            return updated;
        });

        // Log audit
        await AuditLogClient.logUpdate(
            'Bus Trip Revenue',
            { id, code: existing.code },
            existing,
            result,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`[BusTripRevenueService] Updated revenue: ${existing.code}`);
        return this.getRevenueById(id);
    }

    /**
     * Helper method to regenerate installment schedules for a receivable.
     * Used when frequency or number_of_payments change during edit.
     */
    private async regenerateInstallmentSchedules(
        tx: Prisma.TransactionClient,
        receivableId: number,
        updateData: UpdateReceivableDTO,
        existingReceivable: any,
        userId: string
    ): Promise<void> {
        // If explicit installments are provided, use them
        if (updateData.installments && updateData.installments.length > 0) {
            // Delete existing schedules
            await tx.revenue_installment_schedule.deleteMany({
                where: { receivable_id: receivableId },
            });

            // Create new schedules from provided data
            for (const inst of updateData.installments) {
                await tx.revenue_installment_schedule.create({
                    data: {
                        receivable_id: receivableId,
                        installment_number: inst.installment_number,
                        due_date: new Date(inst.due_date),
                        amount_due: new Prisma.Decimal(inst.amount_due),
                        amount_paid: new Prisma.Decimal(inst.amount_paid || 0),
                        balance: new Prisma.Decimal(inst.balance || inst.amount_due),
                        status: 'PENDING',
                        created_by: userId,
                    },
                });
            }
        } else if (updateData.frequency !== undefined || updateData.number_of_payments !== undefined) {
            // Auto-regenerate based on new frequency/number_of_payments
            // Only regenerate if no payments have been made
            const hasPayments = existingReceivable?.installment_schedule?.some(
                (s: any) => s.amount_paid && Number(s.amount_paid) > 0
            );

            if (!hasPayments) {
                // Delete existing schedules
                await tx.revenue_installment_schedule.deleteMany({
                    where: { receivable_id: receivableId },
                });

                // Get total amount (use updated or existing)
                const totalAmount = updateData.total_amount
                    ? new Prisma.Decimal(updateData.total_amount)
                    : existingReceivable?.total_amount || new Prisma.Decimal(0);

                const frequency = (updateData.frequency as receivable_frequency) || existingReceivable?.frequency || 'WEEKLY';
                const numberOfPayments = updateData.number_of_payments || existingReceivable?.number_of_payments || 3;
                const startDate = existingReceivable?.installment_start_date || new Date();

                // Generate new schedules
                await this.generateInstallmentSchedules(
                    tx,
                    receivableId,
                    totalAmount,
                    new Date(startDate),
                    numberOfPayments,
                    frequency as receivable_frequency,
                    userId
                );
            } else {
                logger.warn(`[BusTripRevenueService] Cannot regenerate schedules for receivable ${receivableId} - payments already made`);
            }
        }
    }

    // --------------------------------------------------------------------------
    // RECORD RECEIVABLE PAYMENT
    // --------------------------------------------------------------------------

    /**
     * Record installment payment with cascade support.
     * 
     * If the payment amount exceeds the current installment balance,
     * excess is automatically cascaded to subsequent unpaid installments.
     * Only rejects if payment exceeds total receivable balance.
     */
    async recordReceivablePayment(
        data: RecordPaymentDTO,
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<{
        success: boolean;
        message: string;
        installments_updated: Array<{
            id: number;
            installment_number: number;
            amount_applied: number;
            amount_due: number;
            amount_paid: number;
            balance: number;
            status: string;
        }>;
        receivable: any;
        total_applied: number;
    }> {
        logger.info(`[BusTripRevenueService] Recording payment for installment: ${data.installment_id}, amount: ${data.amount_paid}`);

        // Validate amount
        if (data.amount_paid <= 0) {
            throw new ValidationError('Payment amount must be greater than 0');
        }

        // Get starting installment with receivable
        const startingInstallment = await prisma.revenue_installment_schedule.findUnique({
            where: { id: data.installment_id },
            include: {
                receivable: true,
            },
        });

        if (!startingInstallment || startingInstallment.is_deleted) {
            throw new NotFoundError(`Installment with ID ${data.installment_id} not found`);
        }

        if (startingInstallment.status === 'PAID') {
            throw new BadRequestError('This installment has already been fully paid');
        }

        const receivable = startingInstallment.receivable;
        const amountPaid = new Prisma.Decimal(data.amount_paid);

        // Validate against total receivable balance (not just single installment)
        if (amountPaid.greaterThan(receivable.balance)) {
            throw new ValidationError(
                `Payment amount (${data.amount_paid}) exceeds total receivable balance (${receivable.balance})`
            );
        }

        const paymentDate = data.payment_date ? new Date(data.payment_date) : new Date();

        // Find related revenue record
        const revenue = await prisma.revenue.findFirst({
            where: {
                OR: [
                    { driver_receivable_id: receivable.id },
                    { conductor_receivable_id: receivable.id },
                ],
                is_deleted: false,
            },
        });

        if (!revenue) {
            throw new NotFoundError('Related revenue record not found');
        }

        // Get all unpaid/partially paid installments for this receivable, ordered by installment number
        const allInstallments = await prisma.revenue_installment_schedule.findMany({
            where: {
                receivable_id: receivable.id,
                is_deleted: false,
                status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
            },
            orderBy: { installment_number: 'asc' },
        });

        // Find the starting installment index
        const startIndex = allInstallments.findIndex(inst => inst.id === data.installment_id);
        if (startIndex === -1) {
            throw new ValidationError('Starting installment is no longer available for payment');
        }

        // Execute cascade payment in transaction
        const result = await prisma.$transaction(async (tx) => {
            let remainingAmount = amountPaid;
            const updatedInstallments: Array<{
                id: number;
                installment_number: number;
                amount_applied: number;
                amount_due: number;
                amount_paid: number;
                balance: number;
                status: string;
            }> = [];
            const paymentRecords: any[] = [];

            // Start from the selected installment and cascade forward
            for (let i = startIndex; i < allInstallments.length && remainingAmount.greaterThan(0); i++) {
                const installment = allInstallments[i];
                const installmentBalance = installment.balance;

                // Calculate amount to apply to this installment
                const amountToApply = remainingAmount.greaterThan(installmentBalance)
                    ? installmentBalance
                    : remainingAmount;

                if (amountToApply.lessThanOrEqualTo(0)) continue;

                // Create payment record
                // CRITICAL: accounting_status MUST start as DRAFT
                // It will be updated to POSTED when the linked JE is posted
                const payment = await tx.revenue_installment_payment.create({
                    data: {
                        installment_id: installment.id,
                        revenue_id: revenue.id,
                        amount_paid: amountToApply,
                        payment_date: paymentDate,
                        payment_method: data.payment_method,
                        payment_reference: data.payment_reference ?? null,
                        accounting_status: 'DRAFT', // Explicit: must be DRAFT until JE is POSTED
                        created_by: userId,
                    },
                });
                paymentRecords.push(payment);

                // Update installment
                const newInstallmentPaid = installment.amount_paid.add(amountToApply);
                const newInstallmentBalance = installment.balance.sub(amountToApply);
                const newInstallmentStatus = newInstallmentBalance.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIALLY_PAID';

                const updatedInstallment = await tx.revenue_installment_schedule.update({
                    where: { id: installment.id },
                    data: {
                        amount_paid: newInstallmentPaid,
                        balance: newInstallmentBalance,
                        status: newInstallmentStatus,
                        updated_by: userId,
                    },
                });

                updatedInstallments.push({
                    id: updatedInstallment.id,
                    installment_number: updatedInstallment.installment_number,
                    amount_applied: Number(amountToApply),
                    amount_due: Number(updatedInstallment.amount_due),
                    amount_paid: Number(updatedInstallment.amount_paid),
                    balance: Number(updatedInstallment.balance),
                    status: updatedInstallment.status,
                });

                // Reduce remaining amount
                remainingAmount = remainingAmount.sub(amountToApply);
            }

            // Update receivable totals
            const newReceivablePaid = receivable.paid_amount.add(amountPaid);
            const newReceivableBalance = receivable.balance.sub(amountPaid);
            const newReceivableStatus: payment_status = newReceivableBalance.lessThanOrEqualTo(0)
                ? 'COMPLETED'
                : 'PARTIALLY_PAID';

            const updatedReceivable = await tx.receivable.update({
                where: { id: receivable.id },
                data: {
                    paid_amount: newReceivablePaid,
                    balance: newReceivableBalance,
                    status: newReceivableStatus,
                    last_payment_date: paymentDate,
                    last_payment_amount: amountPaid,
                    updated_by: userId,
                },
            });

            return { paymentRecords, updatedInstallments, updatedReceivable };
        });

        // Create journal entries for all payment records
        const assetAccountCode = this.getAssetAccountCode(data.payment_method);
        const receivableAccountCode = revenue.driver_receivable_id === receivable.id
            ? ACCOUNT_CODES.DRIVER_RECEIVABLE
            : ACCOUNT_CODES.CONDUCTOR_RECEIVABLE;

        // Create a single journal entry for the total payment
        const jePayload: CreateAutoJournalEntryInput = {
            module: 'Receivable Payment',
            reference_id: `Payment for ${revenue.code}`,
            description: result.updatedInstallments.length > 1
                ? `Receivable payment - ${receivable.code} - Installments #${result.updatedInstallments.map(i => i.installment_number).join(', #')}`
                : `Receivable payment - ${receivable.code} - Installment #${startingInstallment.installment_number}`,
            date: paymentDate.toISOString().split('T')[0],
            entries: [
                {
                    account_code: assetAccountCode,
                    debit: Number(amountPaid),
                    credit: 0,
                    description: 'Cash received for receivable payment',
                },
                {
                    account_code: receivableAccountCode,
                    debit: 0,
                    credit: Number(amountPaid),
                    description: 'Receivable balance reduced',
                },
            ],
        };

        const journalEntry = await this.journalEntryService.createAutoJournalEntry(
            jePayload,
            userId,
            userInfo,
            req
        );

        // Link journal entry to first payment record
        if (result.paymentRecords.length > 0) {
            await prisma.revenue_installment_payment.update({
                where: { id: result.paymentRecords[0].id },
                data: { journal_entry_id: journalEntry.id },
            });
        }

        // Audit log
        await AuditLogClient.logCreate(
            'Receivable Payment',
            { id: result.paymentRecords[0]?.id },
            {
                installments_updated: result.updatedInstallments.length,
                total_applied: Number(amountPaid),
            },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`[BusTripRevenueService] Recorded cascade payment for ${result.updatedInstallments.length} installment(s), total: ${amountPaid}`);

        return {
            success: true,
            message: result.updatedInstallments.length > 1
                ? `Payment of ${data.amount_paid} applied across ${result.updatedInstallments.length} installments`
                : 'Payment recorded successfully',
            installments_updated: result.updatedInstallments,
            receivable: {
                id: result.updatedReceivable.id,
                code: result.updatedReceivable.code,
                total_amount: Number(result.updatedReceivable.total_amount),
                paid_amount: Number(result.updatedReceivable.paid_amount),
                balance: Number(result.updatedReceivable.balance),
                status: result.updatedReceivable.status,
            },
            total_applied: Number(amountPaid),
        };
    }

    // --------------------------------------------------------------------------
    // UNSYNCED TRIPS
    // --------------------------------------------------------------------------

    /**
     * List unsynced trips (is_revenue_recorded = false)
     */
    async listUnsyncedTrips(
        filters: UnsyncedTripsFilters = {},
        page: number = 1,
        limit: number = 10
    ): Promise<{ data: UnsyncedTripItem[]; total: number; page: number; limit: number; pages: number }> {
        const where: Prisma.bus_trip_localWhereInput = {
            is_revenue_recorded: false,
            is_deleted: false,
        };

        if (filters.date_from || filters.date_to) {
            where.date_assigned = {};
            if (filters.date_from) {
                where.date_assigned.gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                where.date_assigned.lte = new Date(filters.date_to);
            }
        }

        if (filters.assignment_type) {
            where.assignment_type = filters.assignment_type;
        }

        if (filters.search) {
            where.OR = [
                { bus: { body_number: { contains: filters.search, mode: 'insensitive' } } },
                { bus_route: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [trips, total] = await Promise.all([
            prisma.bus_trip_local.findMany({
                where,
                orderBy: { date_assigned: 'desc' },
                skip,
                take: limit,
                include: {
                    bus: { select: { body_number: true } },
                    employees: {
                        include: { employee: true },
                    },
                },
            }),
            prisma.bus_trip_local.count({ where }),
        ]);

        const formatEmployeeName = (emp: any): string => {
            if (!emp?.employee) return 'Unknown';
            const { first_name, middle_name, last_name } = emp.employee;
            return [first_name, middle_name, last_name].filter(Boolean).join(' ');
        };

        const data: UnsyncedTripItem[] = trips.map((trip) => {
            const expectedRemittance = this.calculateExpectedRemittance(
                trip.assignment_type,
                trip.trip_revenue,
                trip.assignment_value,
                trip.trip_fuel_expense
            );
            const shortage = this.calculateShortage(expectedRemittance, trip.trip_revenue);

            const driver = trip.employees?.find((e) => e.role === 'DRIVER');
            const conductor = trip.employees?.find((e) => e.role === 'CONDUCTOR');

            return {
                assignment_id: trip.assignment_id,
                bus_trip_id: trip.bus_trip_id,
                body_number: trip.bus?.body_number ?? null,
                date_assigned: trip.date_assigned?.toISOString() ?? null,
                route: trip.bus_route ?? null,
                assignment_type: trip.assignment_type ?? null,
                assignment_value: Number(trip.assignment_value ?? 0),
                trip_revenue: Number(trip.trip_revenue ?? 0),
                trip_fuel_expense: Number(trip.trip_fuel_expense ?? 0),
                expected_remittance: Number(expectedRemittance),
                shortage: Number(shortage),
                driver: driver
                    ? { employee_number: driver.employee_number, name: formatEmployeeName(driver) }
                    : null,
                conductor: conductor
                    ? { employee_number: conductor.employee_number, name: formatEmployeeName(conductor) }
                    : null,
            };
        });

        return {
            data,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Process all unsynced trips - batch create revenues
     */
    async processUnsyncedTrips(
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<ProcessUnsyncedResult> {
        logger.info('[BusTripRevenueService] Processing all unsynced trips');

        // Get all unsynced trips
        const unsyncedTrips = await prisma.bus_trip_local.findMany({
            where: {
                is_revenue_recorded: false,
                is_deleted: false,
            },
            orderBy: { date_assigned: 'asc' },
        });

        const results: ProcessUnsyncedResult['results'] = [];
        let processed = 0;
        let failed = 0;

        for (const trip of unsyncedTrips) {
            try {
                const revenue = await this.createRevenue(
                    {
                        assignment_id: trip.assignment_id,
                        bus_trip_id: trip.bus_trip_id,
                    },
                    userId,
                    userInfo,
                    req
                );

                results.push({
                    assignment_id: trip.assignment_id,
                    bus_trip_id: trip.bus_trip_id,
                    success: true,
                    revenue_id: revenue.id,
                    revenue_code: revenue.code,
                });
                processed++;
            } catch (error) {
                logger.error(`[BusTripRevenueService] Failed to process trip ${trip.assignment_id}/${trip.bus_trip_id}:`, error);
                results.push({
                    assignment_id: trip.assignment_id,
                    bus_trip_id: trip.bus_trip_id,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
                failed++;
            }
        }

        logger.info(`[BusTripRevenueService] Processed ${processed} trips, ${failed} failed`);

        return {
            total: unsyncedTrips.length,
            processed,
            failed,
            results,
        };
    }

    // --------------------------------------------------------------------------
    // ARCHIVE / RESTORE / DELETE REVENUE
    // --------------------------------------------------------------------------

    /**
     * Archive a revenue record (soft delete)
     */
    async archiveRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[BusTripRevenueService] Archiving revenue ID: ${id}`);

        const revenue = await prisma.revenue.findUnique({
            where: { id },
            select: { id: true, code: true, is_deleted: true, payment_status: true },
        });

        if (!revenue) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        if (revenue.is_deleted) {
            throw new BadRequestError('Revenue record is already archived');
        }

        // Prevent archiving if there are unpaid receivables
        if (revenue.payment_status === 'PENDING' || revenue.payment_status === 'PARTIALLY_PAID') {
            throw new BadRequestError('Cannot archive revenue with pending or partial receivables');
        }

        const result = await prisma.revenue.update({
            where: { id },
            data: {
                is_deleted: true,
                archived_by: userId,
                archived_at: new Date(),
            },
        });

        await AuditLogClient.logArchive(
            AuditEntityTypes.BUS_TRIP_REVENUE,
            { id, code: revenue.code },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            { code: revenue.code, payment_status: revenue.payment_status },
            req
        );

        logger.info(`[BusTripRevenueService] Archived revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been archived`, data: result };
    }

    /**
     * Restore an archived revenue record
     */
    async restoreRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[BusTripRevenueService] Restoring revenue ID: ${id}`);

        const revenue = await prisma.revenue.findUnique({
            where: { id },
            select: { id: true, code: true, is_deleted: true },
        });

        if (!revenue) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        if (!revenue.is_deleted) {
            throw new BadRequestError('Revenue record is not archived');
        }

        const result = await prisma.revenue.update({
            where: { id },
            data: {
                is_deleted: false,
                archived_by: userId,
                archived_at: new Date(),
            },
        });

        await AuditLogClient.logUnarchive(
            AuditEntityTypes.BUS_TRIP_REVENUE,
            { id, code: revenue.code },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            { code: revenue.code },
            req
        );

        logger.info(`[BusTripRevenueService] Restored revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been restored`, data: result };
    }

    /**
     * Permanently delete an archived revenue record
     */
    async hardDeleteRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[BusTripRevenueService] Hard deleting revenue ID: ${id}`);

        const revenue = await prisma.revenue.findUnique({
            where: { id },
            include: {
                driver_receivable: { include: { installment_schedule: true } },
                conductor_receivable: { include: { installment_schedule: true } },
            },
        });

        if (!revenue) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        if (!revenue.is_deleted) {
            throw new BadRequestError('Cannot permanently delete an active revenue record. Archive it first.');
        }

        await prisma.$transaction(async (tx) => {
            // Delete installment schedules first
            if (revenue.driver_receivable_id) {
                await tx.revenue_installment_schedule.deleteMany({
                    where: { receivable_id: revenue.driver_receivable_id },
                });
                await tx.receivable.delete({
                    where: { id: revenue.driver_receivable_id },
                });
            }

            if (revenue.conductor_receivable_id) {
                await tx.revenue_installment_schedule.deleteMany({
                    where: { receivable_id: revenue.conductor_receivable_id },
                });
                await tx.receivable.delete({
                    where: { id: revenue.conductor_receivable_id },
                });
            }

            // Delete the revenue record
            await tx.revenue.delete({
                where: { id },
            });
        });

        await AuditLogClient.logDelete(
            'Revenue',
            { id, code: revenue.code },
            revenue,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            'Permanent deletion',
            req
        );

        logger.info(`[BusTripRevenueService] Permanently deleted revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been permanently deleted` };
    }
}

// Export singleton instance
export const busTripRevenueService = new BusTripRevenueService();
