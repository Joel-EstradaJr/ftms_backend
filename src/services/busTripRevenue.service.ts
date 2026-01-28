// ============================================================================
// BUS TRIP REVENUE SERVICE
// Core business logic for managing bus trip revenue records
// Follows data mappings from trip_revenue.md
// ============================================================================

import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma, receivable_frequency, receivable_status, payment_method } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';
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

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCOUNT_CODES = {
    CASH: '1000',
    BANK_TRANSFER: '1005',
    E_WALLET: '1010',
    DRIVER_RECEIVABLE: '1100',
    CONDUCTOR_RECEIVABLE: '1105',
    REVENUE_BOUNDARY: '3000',
    REVENUE_PERCENTAGE: '3005',
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
    // CODE GENERATION
    // --------------------------------------------------------------------------

    /**
     * Generate unique revenue code in format REV-YYYY-XXXX
     */
    private async generateRevenueCode(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `REV-${year}-`;

        const lastRevenue = await prisma.revenue.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1;
        if (lastRevenue?.code) {
            const parts = lastRevenue.code.split('-');
            const lastNumber = parseInt(parts[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    /**
   * Generate unique receivable code in format RCVL-YYYY-XXXX
   * @param offset - Optional offset to generate sequential codes in same call (default 0)
   */
    private async generateReceivableCode(offset: number = 0): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `RCVL-${year}-`;

        const lastReceivable = await prisma.receivable.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1 + offset;
        if (lastReceivable?.code) {
            const parts = lastReceivable.code.split('-');
            const lastNumber = parseInt(parts[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1 + offset;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    /**
     * Map payment method string from bus_trip_local to valid enum
     * Handles case differences and alternative names
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
     * Determine remittance status
     */
    private determineRemittanceStatus(
        tripRevenue: Prisma.Decimal | null,
        expectedRemittance: Prisma.Decimal
    ): receivable_status {
        const revenue = tripRevenue ?? new Prisma.Decimal(0);
        return revenue.greaterThanOrEqualTo(expectedRemittance) ? 'PAID' : 'PARTIALLY_PAID';
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

        // Status filter
        if (filters.status) {
            where.remittance_status = filters.status;
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

        // Search across multiple fields
        if (filters.search) {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { bus_trip: { bus: { body_number: { contains: filters.search, mode: 'insensitive' } } } },
            ];
        }

        // Sorting
        const orderBy: Prisma.revenueOrderByWithRelationInput = {};
        if (filters.sort_by === 'date_recorded') {
            orderBy.date_recorded = filters.sort_order || 'desc';
        } else if (filters.sort_by === 'amount') {
            orderBy.amount = filters.sort_order || 'desc';
        } else {
            orderBy.created_at = 'desc';
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
                remittance_status: rev.remittance_status,
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
            remittance_status: revenue.remittance_status,

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
        if (revenue.remittance_status === 'PARTIALLY_PAID' && shortage.greaterThan(0)) {
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
        const remittanceStatus = this.determineRemittanceStatus(busTrip.trip_revenue, expectedRemittance);
        const hasShortage = shortage.greaterThan(0);

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
            const revenue = await tx.revenue.create({
                data: {
                    code: revenueCode,
                    revenue_type_id: revenueType.id,
                    amount: busTrip.trip_revenue ?? new Prisma.Decimal(0),
                    date_recorded: dateRecorded,
                    date_expected: dateExpected,
                    description: data.description ?? null,
                    remittance_status: remittanceStatus,
                    driver_receivable_id: driverReceivableId,
                    conductor_receivable_id: conductorReceivableId,
                    payment_method: this.mapPaymentMethod(busTrip.payment_method),
                    bus_trip_assignment_id: data.assignment_id,
                    bus_trip_id: data.bus_trip_id,
                    created_by: userId,
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
        const tripRevenue = Number(busTrip.trip_revenue ?? 0);
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
                description: `${busTrip.assignment_type} revenue - ₱${tripRevenue} received (Expected: ₱${Number(expectedRemittance)}, Shortage: ₱${Number(shortage)}) - Payment: ${paymentMethodEnum} - Bus: ${busTrip.bus?.body_number}`,
                date: dateRecorded.toISOString().split('T')[0],
                entries: [
                    {
                        account_code: assetAccountCode,
                        debit: tripRevenue,
                        credit: 0,
                        description: 'Cash received from trip',
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
                description: `${busTrip.assignment_type} revenue - ₱${tripRevenue} - Payment: ${paymentMethodEnum} - Bus: ${busTrip.bus?.body_number}`,
                date: dateRecorded.toISOString().split('T')[0],
                entries: [
                    {
                        account_code: assetAccountCode,
                        debit: tripRevenue,
                        credit: 0,
                        description: 'Cash received from trip',
                    },
                    {
                        account_code: revenueAccountCode,
                        debit: 0,
                        credit: tripRevenue,
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
                        remittance_status: 'PAID',
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

            // Handle remittance_status
            if (data.remittance_status !== undefined) {
                updateRevenueData.remittance_status = data.remittance_status;
            } else if (data.amount !== undefined && existing.bus_trip && !data.delete_receivables) {
                // Auto-calculate status based on amount if not explicitly provided
                const expectedRemittance = this.calculateExpectedRemittance(
                    existing.bus_trip.assignment_type,
                    existing.bus_trip.trip_revenue,
                    existing.bus_trip.assignment_value,
                    existing.bus_trip.trip_fuel_expense
                );
                const newAmount = new Prisma.Decimal(data.amount);
                updateRevenueData.remittance_status = newAmount.greaterThanOrEqualTo(expectedRemittance) ? 'PAID' : 'PARTIALLY_PAID';
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
                const payment = await tx.revenue_installment_payment.create({
                    data: {
                        installment_id: installment.id,
                        revenue_id: revenue.id,
                        amount_paid: amountToApply,
                        payment_date: paymentDate,
                        payment_method: data.payment_method,
                        payment_reference: data.payment_reference ?? null,
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
            const newReceivableStatus: receivable_status = newReceivableBalance.lessThanOrEqualTo(0)
                ? 'PAID'
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
            reference_id: `${revenue.code}-PAY-${result.paymentRecords[0]?.id}`,
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
}

// Export singleton instance
export const busTripRevenueService = new BusTripRevenueService();
