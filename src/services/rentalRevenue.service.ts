// ============================================================================
// RENTAL REVENUE SERVICE
// Core business logic for managing rental revenue records
// All fields aligned with database schema (revenue + rental_local tables)
// ============================================================================

import { prisma } from '../config/database';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma, payment_method, receivable_status } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';
import { AuditLogClient } from '../integrations/audit/audit.client';
import {
    RentalRevenueListFilters,
    RentalRevenueListItem,
    RentalRevenueDetailResponse,
    CreateRentalRevenueDTO,
    UpdateRentalRevenueDTO,
    CancelRentalRevenueDTO,
    RentalRevenueAnalytics,
    PaginatedRentalRevenueResponse,
    PaymentMethodEnum,
} from '../controllers/rentalRevenue.dto';

// ============================================================================
// CONSTANTS
// ============================================================================

const RENTAL_REVENUE_TYPE_CODE = 'REVT-003'; // Rental revenue type code

// Account codes for journal entries (matching Bus Trip Revenue pattern)
const ACCOUNT_CODES = {
    CASH: '1000',
    BANK_TRANSFER: '1005',
    E_WALLET: '1010',
    RENTAL_REVENUE: '3010', // Rental revenue account
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RentalRevenueService {
    private journalEntryService: JournalEntryAutoService;

    constructor() {
        this.journalEntryService = new JournalEntryAutoService();
    }

    // --------------------------------------------------------------------------
    // HELPER: Get asset account code based on payment method
    // --------------------------------------------------------------------------

    private getAssetAccountCode(paymentMethod: payment_method | string | null): string {
        switch (paymentMethod) {
            case 'BANK_TRANSFER':
                return ACCOUNT_CODES.BANK_TRANSFER;
            case 'E_WALLET':
                return ACCOUNT_CODES.E_WALLET;
            default:
                return ACCOUNT_CODES.CASH;
        }
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

    // --------------------------------------------------------------------------
    // HELPER: Format decimal to number
    // --------------------------------------------------------------------------

    private toNumber(value: Prisma.Decimal | null | undefined): number {
        if (value === null || value === undefined) return 0;
        return Number(value);
    }

    // --------------------------------------------------------------------------
    // HELPER: Format date to ISO string
    // --------------------------------------------------------------------------

    private formatDate(date: Date | null | undefined): string | null {
        if (!date) return null;
        return date.toISOString();
    }

    // --------------------------------------------------------------------------
    // LIST RENTAL REVENUES
    // --------------------------------------------------------------------------

    async listRentalRevenues(
        filters: RentalRevenueListFilters,
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedRentalRevenueResponse> {
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.revenueWhereInput = {
            is_deleted: false,
            rental_assignment_id: { not: null }, // Only rental revenues
        };

        // Date filters
        if (filters.date_recorded_from || filters.date_recorded_to) {
            where.date_recorded = {};
            if (filters.date_recorded_from) {
                where.date_recorded.gte = new Date(filters.date_recorded_from);
            }
            if (filters.date_recorded_to) {
                where.date_recorded.lte = new Date(filters.date_recorded_to);
            }
        }

        // Payment method filter
        if (filters.payment_method) {
            where.payment_method = filters.payment_method as payment_method;
        }

        // Remittance status filter
        if (filters.remittance_status) {
            where.remittance_status = filters.remittance_status as receivable_status;
        }

        // Amount filters
        if (filters.amount_min !== undefined || filters.amount_max !== undefined) {
            where.amount = {};
            if (filters.amount_min !== undefined) {
                where.amount.gte = filters.amount_min;
            }
            if (filters.amount_max !== undefined) {
                where.amount.lte = filters.amount_max;
            }
        }

        // Rental-specific filters (applied via rental relation)
        const rentalWhere: Prisma.rental_localWhereInput = {
            is_deleted: false,
        };

        if (filters.rental_status) {
            rentalWhere.rental_status = filters.rental_status;
        }

        if (filters.down_payment_date_from || filters.down_payment_date_to) {
            rentalWhere.down_payment_date = {};
            if (filters.down_payment_date_from) {
                rentalWhere.down_payment_date.gte = new Date(filters.down_payment_date_from);
            }
            if (filters.down_payment_date_to) {
                rentalWhere.down_payment_date.lte = new Date(filters.down_payment_date_to);
            }
        }

        if (filters.rental_start_date_from || filters.rental_start_date_to) {
            rentalWhere.rental_start_date = {};
            if (filters.rental_start_date_from) {
                rentalWhere.rental_start_date.gte = new Date(filters.rental_start_date_from);
            }
            if (filters.rental_start_date_to) {
                rentalWhere.rental_start_date.lte = new Date(filters.rental_start_date_to);
            }
        }

        if (filters.balance_min !== undefined || filters.balance_max !== undefined) {
            rentalWhere.balance_amount = {};
            if (filters.balance_min !== undefined) {
                rentalWhere.balance_amount.gte = filters.balance_min;
            }
            if (filters.balance_max !== undefined) {
                rentalWhere.balance_amount.lte = filters.balance_max;
            }
        }

        // Apply rental filters if any were set
        if (Object.keys(rentalWhere).length > 1) { // More than just is_deleted
            where.rental = rentalWhere;
        }

        // Search filter (case-insensitive, partial match across multiple fields)
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            where.OR = [
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { rental_assignment_id: { contains: searchTerm, mode: 'insensitive' } },
                { rental: { rental_package: { contains: searchTerm, mode: 'insensitive' } } },
                { rental: { rental_status: { contains: searchTerm, mode: 'insensitive' } } },
                { payment_method: { equals: searchTerm.toUpperCase() as payment_method } },
            ];
        }

        // Build order by
        const orderBy: Prisma.revenueOrderByWithRelationInput = {};
        const sortField = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';

        switch (sortField) {
            case 'code':
                orderBy.code = sortOrder;
                break;
            case 'date_recorded':
                orderBy.date_recorded = sortOrder;
                break;
            case 'total_rental_amount':
                orderBy.amount = sortOrder;
                break;
            case 'balance_amount':
                // Sort by rental balance - requires raw query or different approach
                orderBy.created_at = sortOrder;
                break;
            default:
                orderBy.created_at = sortOrder;
        }

        // Execute query
        const [revenues, total] = await Promise.all([
            prisma.revenue.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    revenue_type: true,
                    rental: {
                        include: {
                            bus: true,
                        },
                    },
                },
            }),
            prisma.revenue.count({ where }),
        ]);

        // Transform to response format
        const data: RentalRevenueListItem[] = revenues.map((rev) => ({
            // Revenue fields
            id: rev.id,
            code: rev.code,
            revenue_type_id: rev.revenue_type_id,
            revenue_type_name: rev.revenue_type.name,
            amount: this.toNumber(rev.amount),
            date_recorded: this.formatDate(rev.date_recorded),
            description: rev.description,
            payment_method: rev.payment_method as PaymentMethodEnum | null,
            remittance_status: rev.remittance_status,

            // Rental fields
            assignment_id: rev.rental_assignment_id || '',
            rental_status: rev.rental?.rental_status || null,
            rental_package: rev.rental?.rental_package || null,
            total_rental_amount: this.toNumber(rev.rental?.total_rental_amount),
            down_payment_amount: this.toNumber(rev.rental?.down_payment_amount),
            balance_amount: this.toNumber(rev.rental?.balance_amount),
            down_payment_date: this.formatDate(rev.rental?.down_payment_date),
            full_payment_date: this.formatDate(rev.rental?.full_payment_date),
            cancelled_at: this.formatDate(rev.rental?.cancelled_at),
            rental_start_date: this.formatDate(rev.rental?.rental_start_date),
            rental_end_date: this.formatDate(rev.rental?.rental_end_date),

            // Bus info
            bus_id: rev.rental?.bus_id || null,
            bus_plate_number: rev.rental?.bus?.license_plate || null,
            bus_body_number: rev.rental?.bus?.body_number || null,

            // Audit
            created_at: rev.created_at.toISOString(),
            updated_at: rev.updated_at?.toISOString() || null,
        }));

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------------------------
    // GET RENTAL REVENUE BY ID
    // --------------------------------------------------------------------------

    async getRentalRevenueById(id: number): Promise<RentalRevenueDetailResponse> {
        const revenue = await prisma.revenue.findFirst({
            where: {
                id,
                is_deleted: false,
                rental_assignment_id: { not: null },
            },
            include: {
                revenue_type: true,
                rental: {
                    include: {
                        bus: true,
                        employees: true,
                    },
                },
                receivable: true,
                journal_entry: true,
            },
        });

        if (!revenue) {
            throw new NotFoundError('Rental revenue not found');
        }

        return {
            // Revenue fields
            id: revenue.id,
            code: revenue.code,
            revenue_type_id: revenue.revenue_type_id,
            revenue_type_code: revenue.revenue_type.code,
            revenue_type_name: revenue.revenue_type.name,
            amount: this.toNumber(revenue.amount),
            date_recorded: this.formatDate(revenue.date_recorded),
            date_expected: this.formatDate(revenue.date_expected),
            description: revenue.description,
            payment_method: revenue.payment_method as PaymentMethodEnum | null,
            payment_reference: revenue.payment_reference,
            remittance_status: revenue.remittance_status,
            journal_entry_id: revenue.journal_entry_id,

            // Rental fields
            assignment_id: revenue.rental_assignment_id || '',
            rental_status: revenue.rental?.rental_status || null,
            rental_package: revenue.rental?.rental_package || null,
            total_rental_amount: this.toNumber(revenue.rental?.total_rental_amount),
            down_payment_amount: this.toNumber(revenue.rental?.down_payment_amount),
            balance_amount: this.toNumber(revenue.rental?.balance_amount),
            down_payment_date: this.formatDate(revenue.rental?.down_payment_date),
            full_payment_date: this.formatDate(revenue.rental?.full_payment_date),
            cancelled_at: this.formatDate(revenue.rental?.cancelled_at),
            cancellation_reason: revenue.rental?.cancellation_reason || null,
            rental_start_date: this.formatDate(revenue.rental?.rental_start_date),
            rental_end_date: this.formatDate(revenue.rental?.rental_end_date),

            // Bus info
            bus_id: revenue.rental?.bus_id || null,
            bus_plate_number: revenue.rental?.bus?.license_plate || null,
            bus_body_number: revenue.rental?.bus?.body_number || null,
            bus_type: revenue.rental?.bus?.type || null,

            // Employees
            employees: (revenue.rental?.employees || []).map((emp) => ({
                employee_id: emp.employee_number,
                name: emp.employee_number, // rental_employee_local only has employee_number
                role: null,
            })),

            // Receivable
            receivable: revenue.receivable
                ? {
                    id: revenue.receivable.id,
                    code: revenue.receivable.code,
                    status: revenue.receivable.status,
                    amount_due: this.toNumber(revenue.receivable.total_amount),
                    amount_paid: this.toNumber(revenue.receivable.paid_amount),
                    balance: this.toNumber(revenue.receivable.balance),
                }
                : null,

            // Journal entry
            journal_entry: revenue.journal_entry
                ? {
                    id: revenue.journal_entry.id,
                    code: revenue.journal_entry.code,
                    status: revenue.journal_entry.status,
                    posted_at: this.formatDate(revenue.journal_entry.approved_at),
                }
                : null,

            // Audit
            created_by: revenue.created_by,
            created_at: revenue.created_at.toISOString(),
            updated_by: revenue.updated_by,
            updated_at: revenue.updated_at?.toISOString() || null,
        };
    }

    // --------------------------------------------------------------------------
    // CREATE RENTAL REVENUE
    // --------------------------------------------------------------------------

    async createRentalRevenue(
        data: CreateRentalRevenueDTO,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        // Get rental record
        const rental = await prisma.rental_local.findFirst({
            where: {
                assignment_id: data.assignment_id,
                is_deleted: false,
            },
        });

        if (!rental) {
            throw new NotFoundError(`Rental with assignment_id ${data.assignment_id} not found`);
        }

        // Check if already recorded
        if (rental.is_revenue_recorded) {
            throw new BadRequestError('Revenue has already been recorded for this rental');
        }

        // Get rental revenue type
        let revenueType = await prisma.revenue_type.findFirst({
            where: { code: RENTAL_REVENUE_TYPE_CODE, is_deleted: false },
        });

        // Create default rental revenue type if not exists
        if (!revenueType) {
            revenueType = await prisma.revenue_type.create({
                data: {
                    code: RENTAL_REVENUE_TYPE_CODE,
                    name: 'Bus Rental',
                    description: 'Revenue from bus rental services',
                    created_by: userId,
                },
            });
        }

        // Generate revenue code
        const revenueCode = await this.generateRevenueCode();

        // Calculate amount (use downpayment for initial revenue)
        const downPayment = data.down_payment_amount !== undefined
            ? data.down_payment_amount
            : this.toNumber(rental.down_payment_amount);

        // Create revenue record
        const revenue = await prisma.revenue.create({
            data: {
                code: revenueCode,
                revenue_type_id: revenueType.id,
                amount: downPayment,
                date_recorded: data.date_recorded ? new Date(data.date_recorded) : new Date(),
                description: data.description || `Rental revenue for assignment ${data.assignment_id}`,
                payment_method: (data.payment_method as payment_method) || 'CASH',
                payment_reference: data.payment_reference,
                remittance_status: 'PENDING',
                rental_assignment_id: data.assignment_id,
                created_by: userId,
            },
        });

        // Update rental to mark as revenue recorded
        await prisma.rental_local.update({
            where: { assignment_id: data.assignment_id },
            data: {
                is_revenue_recorded: true,
                down_payment_date: new Date(),
            },
        });

        // Create journal entry for downpayment
        const dateRecorded = data.date_recorded ? new Date(data.date_recorded) : new Date();
        const paymentMethodStr = (data.payment_method as payment_method) || 'CASH';
        const assetAccountCode = this.getAssetAccountCode(paymentMethodStr);

        const jePayload: CreateAutoJournalEntryInput = {
            module: 'Rental Revenue',
            reference_id: revenueCode,
            description: `Bus rental downpayment - Assignment: ${data.assignment_id} - Amount: ₱${downPayment} - Payment: ${paymentMethodStr}`,
            date: dateRecorded.toISOString().split('T')[0],
            entries: [
                {
                    account_code: assetAccountCode,
                    debit: downPayment,
                    credit: 0,
                    description: 'Cash received from rental downpayment',
                },
                {
                    account_code: ACCOUNT_CODES.RENTAL_REVENUE,
                    debit: 0,
                    credit: downPayment,
                    description: 'Rental revenue recognized (downpayment)',
                },
            ],
        };

        // Create journal entry
        const journalEntry = await this.journalEntryService.createAutoJournalEntry(
            jePayload,
            userId,
            userInfo,
            req
        );

        // Link journal entry to revenue
        await prisma.revenue.update({
            where: { id: revenue.id },
            data: { journal_entry_id: journalEntry.id },
        });

        // Audit log
        await AuditLogClient.logCreate(
            'Rental Revenue',
            { id: revenue.id, code: revenueCode },
            revenue,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`Created rental revenue ${revenueCode} for assignment ${data.assignment_id} with journal entry ${journalEntry.code}`);

        return this.getRentalRevenueById(revenue.id);
    }

    // --------------------------------------------------------------------------
    // UPDATE RENTAL REVENUE
    // --------------------------------------------------------------------------

    async updateRentalRevenue(
        id: number,
        data: UpdateRentalRevenueDTO,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        // Get existing revenue
        const existing = await prisma.revenue.findFirst({
            where: { id, is_deleted: false, rental_assignment_id: { not: null } },
            include: { rental: true },
        });

        if (!existing) {
            throw new NotFoundError('Rental revenue not found');
        }

        // Build revenue update
        const revenueUpdate: Prisma.revenueUpdateInput = {
            updated_by: userId,
        };

        if (data.date_recorded !== undefined) {
            revenueUpdate.date_recorded = new Date(data.date_recorded);
        }
        if (data.date_expected !== undefined) {
            revenueUpdate.date_expected = new Date(data.date_expected);
        }
        if (data.description !== undefined) {
            revenueUpdate.description = data.description;
        }
        if (data.payment_method !== undefined) {
            revenueUpdate.payment_method = data.payment_method as payment_method;
        }
        if (data.payment_reference !== undefined) {
            revenueUpdate.payment_reference = data.payment_reference;
        }
        if (data.remittance_status !== undefined) {
            revenueUpdate.remittance_status = data.remittance_status as receivable_status;
        }

        // Update revenue
        await prisma.revenue.update({
            where: { id },
            data: revenueUpdate,
        });

        // Update rental if rental fields provided
        if (existing.rental_assignment_id && (data.down_payment_amount !== undefined || data.down_payment_date !== undefined)) {
            const rentalUpdate: Prisma.rental_localUpdateInput = {};

            if (data.down_payment_amount !== undefined) {
                rentalUpdate.down_payment_amount = data.down_payment_amount;
                // Recalculate balance
                const totalAmount = this.toNumber(existing.rental?.total_rental_amount);
                rentalUpdate.balance_amount = totalAmount - data.down_payment_amount;
            }
            if (data.down_payment_date !== undefined) {
                rentalUpdate.down_payment_date = new Date(data.down_payment_date);
            }

            await prisma.rental_local.update({
                where: { assignment_id: existing.rental_assignment_id },
                data: rentalUpdate,
            });
        }

        // Handle balance payment
        if (data.pay_balance && existing.rental_assignment_id) {
            await this.payBalance(
                id,
                data.balance_payment_method || 'CASH',
                data.balance_payment_reference,
                userId,
                userInfo,
                req
            );
        }

        logger.info(`Updated rental revenue ${existing.code}`);

        return this.getRentalRevenueById(id);
    }

    // --------------------------------------------------------------------------
    // CANCEL RENTAL REVENUE
    // --------------------------------------------------------------------------

    async cancelRentalRevenue(
        id: number,
        data: CancelRentalRevenueDTO,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        // Get existing revenue
        const existing = await prisma.revenue.findFirst({
            where: { id, is_deleted: false, rental_assignment_id: { not: null } },
        });

        if (!existing) {
            throw new NotFoundError('Rental revenue not found');
        }

        // Update revenue status
        await prisma.revenue.update({
            where: { id },
            data: {
                remittance_status: 'CANCELLED',
                updated_by: userId,
            },
        });

        // Update rental status
        if (existing.rental_assignment_id) {
            await prisma.rental_local.update({
                where: { assignment_id: existing.rental_assignment_id },
                data: {
                    rental_status: 'cancelled',
                    cancelled_at: new Date(),
                    cancellation_reason: data.cancellation_reason,
                },
            });
        }

        logger.info(`Cancelled rental revenue ${existing.code}`);

        return this.getRentalRevenueById(id);
    }

    // --------------------------------------------------------------------------
    // PAY BALANCE
    // --------------------------------------------------------------------------

    async payBalance(
        id: number,
        paymentMethod: PaymentMethodEnum,
        paymentReference: string | undefined,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        // Get existing revenue
        const existing = await prisma.revenue.findFirst({
            where: { id, is_deleted: false, rental_assignment_id: { not: null } },
            include: { rental: true },
        });

        if (!existing) {
            throw new NotFoundError('Rental revenue not found');
        }

        if (!existing.rental) {
            throw new BadRequestError('No rental associated with this revenue');
        }

        const balanceAmount = this.toNumber(existing.rental.balance_amount);
        if (balanceAmount <= 0) {
            throw new BadRequestError('No balance remaining to pay');
        }

        // Update revenue amount to include balance
        const currentAmount = this.toNumber(existing.amount);
        await prisma.revenue.update({
            where: { id },
            data: {
                amount: currentAmount + balanceAmount,
                remittance_status: 'PAID',
                updated_by: userId,
            },
        });

        // Update rental
        await prisma.rental_local.update({
            where: { assignment_id: existing.rental_assignment_id! },
            data: {
                balance_amount: 0,
                full_payment_date: new Date(),
                rental_status: 'completed',
            },
        });

        // Create journal entry for balance payment
        const assetAccountCode = this.getAssetAccountCode(paymentMethod);
        const dateRecorded = new Date();

        const jePayload: CreateAutoJournalEntryInput = {
            module: 'Rental Revenue',
            reference_id: existing.code,
            description: `Bus rental balance payment - Assignment: ${existing.rental_assignment_id} - Amount: ₱${balanceAmount} - Payment: ${paymentMethod}`,
            date: dateRecorded.toISOString().split('T')[0],
            entries: [
                {
                    account_code: assetAccountCode,
                    debit: balanceAmount,
                    credit: 0,
                    description: 'Cash received from rental balance payment',
                },
                {
                    account_code: ACCOUNT_CODES.RENTAL_REVENUE,
                    debit: 0,
                    credit: balanceAmount,
                    description: 'Rental revenue recognized (balance payment)',
                },
            ],
        };

        // Create journal entry
        const journalEntry = await this.journalEntryService.createAutoJournalEntry(
            jePayload,
            userId,
            userInfo,
            req
        );

        // Audit log
        await AuditLogClient.logUpdate(
            'Rental Revenue',
            { id: existing.id, code: existing.code },
            { balance_amount: balanceAmount, remittance_status: 'PENDING' },
            { balance_amount: 0, remittance_status: 'PAID', journal_entry_id: journalEntry.id },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`Paid balance for rental revenue ${existing.code} with journal entry ${journalEntry.code}`);

        return this.getRentalRevenueById(id);
    }

    // --------------------------------------------------------------------------
    // GET ANALYTICS
    // --------------------------------------------------------------------------

    async getAnalytics(dateFrom?: string, dateTo?: string): Promise<RentalRevenueAnalytics> {
        const where: Prisma.revenueWhereInput = {
            is_deleted: false,
            rental_assignment_id: { not: null },
        };

        if (dateFrom || dateTo) {
            where.date_recorded = {};
            if (dateFrom) where.date_recorded.gte = new Date(dateFrom);
            if (dateTo) where.date_recorded.lte = new Date(dateTo);
        }

        // Get aggregates
        const [
            totalCount,
            totalRevenue,
            byStatus,
            byPaymentMethod,
            recentRevenues,
            pendingBalance,
        ] = await Promise.all([
            prisma.revenue.count({ where }),
            prisma.revenue.aggregate({
                where,
                _sum: { amount: true },
            }),
            prisma.revenue.groupBy({
                by: ['remittance_status'],
                where,
                _count: true,
            }),
            prisma.revenue.groupBy({
                by: ['payment_method'],
                where,
                _count: true,
            }),
            this.listRentalRevenues({}, 1, 5),
            prisma.rental_local.aggregate({
                where: {
                    is_deleted: false,
                    is_revenue_recorded: true,
                    balance_amount: { gt: 0 },
                },
                _sum: { balance_amount: true },
            }),
        ]);

        // Transform status counts
        const statusMap: Record<string, number> = {
            approved: 0,
            completed: 0,
            cancelled: 0,
        };

        // We need to query rentals separately for rental_status
        const rentalStatusCounts = await prisma.rental_local.groupBy({
            by: ['rental_status'],
            where: {
                is_deleted: false,
                is_revenue_recorded: true,
            },
            _count: true,
        });

        rentalStatusCounts.forEach((item) => {
            if (item.rental_status && statusMap.hasOwnProperty(item.rental_status)) {
                statusMap[item.rental_status] = item._count;
            }
        });

        // Transform payment method counts
        const paymentMethodMap: Record<PaymentMethodEnum, number> = {
            CASH: 0,
            BANK_TRANSFER: 0,
            E_WALLET: 0,
            REIMBURSEMENT: 0,
        };
        byPaymentMethod.forEach((item) => {
            if (item.payment_method) {
                paymentMethodMap[item.payment_method as PaymentMethodEnum] = item._count;
            }
        });

        return {
            total_rentals: totalCount,
            total_revenue: this.toNumber(totalRevenue._sum.amount),
            total_pending_balance: this.toNumber(pendingBalance._sum.balance_amount),
            by_status: statusMap as RentalRevenueAnalytics['by_status'],
            by_payment_method: paymentMethodMap,
            recent_rentals: recentRevenues.data,
        };
    }

    // --------------------------------------------------------------------------
    // GET UNRECORDED RENTALS
    // --------------------------------------------------------------------------

    async getUnrecordedRentals(
        page: number = 1,
        limit: number = 10,
        search?: string
    ): Promise<{ data: any[]; pagination: any }> {
        const skip = (page - 1) * limit;

        const where: Prisma.rental_localWhereInput = {
            is_deleted: false,
            is_revenue_recorded: false,
            rental_status: { not: 'cancelled' },
        };

        if (search) {
            where.OR = [
                { assignment_id: { contains: search, mode: 'insensitive' } },
                { rental_package: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [rentals, total] = await Promise.all([
            prisma.rental_local.findMany({
                where,
                skip,
                take: limit,
                orderBy: { rental_start_date: 'desc' },
                include: { bus: true },
            }),
            prisma.rental_local.count({ where }),
        ]);

        return {
            data: rentals.map((r) => ({
                assignment_id: r.assignment_id,
                bus_id: r.bus_id,
                bus_plate_number: r.bus?.license_plate,
                bus_body_number: r.bus?.body_number,
                rental_status: r.rental_status,
                rental_package: r.rental_package,
                rental_start_date: this.formatDate(r.rental_start_date),
                rental_end_date: this.formatDate(r.rental_end_date),
                total_rental_amount: this.toNumber(r.total_rental_amount),
                down_payment_amount: this.toNumber(r.down_payment_amount),
                balance_amount: this.toNumber(r.balance_amount),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // --------------------------------------------------------------------------
    // PROCESS UNSYNCED RENTALS - Auto-create revenue for all unrecorded rentals
    // --------------------------------------------------------------------------

    /**
     * Process all unsynced rentals - batch create revenues
     * Called automatically after external data sync
     */
    async processUnsyncedRentals(
        userId: string,
        userInfo?: any,
        req?: any
    ): Promise<{
        total: number;
        processed: number;
        failed: number;
        results: Array<{
            assignment_id: string;
            success: boolean;
            revenue_id?: number;
            revenue_code?: string;
            error?: string;
        }>;
    }> {
        logger.info('[RentalRevenueService] Processing all unsynced rentals');

        // Get all unsynced rentals with approved status and downpayment received
        const unsyncedRentals = await prisma.rental_local.findMany({
            where: {
                is_revenue_recorded: false,
                is_deleted: false,
                // Only process rentals that have downpayment or are approved
                OR: [
                    { rental_status: 'approved' },
                    { rental_status: 'completed' },
                    { down_payment_amount: { gt: 0 } },
                ],
            },
            orderBy: { rental_start_date: 'asc' },
        });

        const results: Array<{
            assignment_id: string;
            success: boolean;
            revenue_id?: number;
            revenue_code?: string;
            error?: string;
        }> = [];
        let processed = 0;
        let failed = 0;

        for (const rental of unsyncedRentals) {
            try {
                // Create revenue for this rental
                const revenue = await this.createRentalRevenue(
                    {
                        assignment_id: rental.assignment_id,
                        payment_method: 'CASH', // Default payment method
                    },
                    userId,
                    userInfo,
                    req
                );

                results.push({
                    assignment_id: rental.assignment_id,
                    success: true,
                    revenue_id: revenue.id,
                    revenue_code: revenue.code,
                });
                processed++;

                logger.info(`[RentalRevenueService] Created revenue for rental ${rental.assignment_id}: ${revenue.code}`);
            } catch (error) {
                logger.error(`[RentalRevenueService] Failed to process rental ${rental.assignment_id}:`, error);
                results.push({
                    assignment_id: rental.assignment_id,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
                failed++;
            }
        }

        logger.info(`[RentalRevenueService] Processed ${processed} rentals, ${failed} failed`);

        return {
            total: unsyncedRentals.length,
            processed,
            failed,
            results,
        };
    }
}

// Export singleton instance
export const rentalRevenueService = new RentalRevenueService();
