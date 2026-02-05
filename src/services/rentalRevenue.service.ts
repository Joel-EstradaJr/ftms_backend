// ============================================================================
// RENTAL REVENUE SERVICE
// Core business logic for managing rental revenue records
// All fields aligned with database schema (revenue + rental_local tables)
// 
// Payment Flow:
// 1. Downpayment: Creates revenue record + receivable for balance
// 2. Balance Payment: Creates installment payment record
// ============================================================================

import { prisma } from '../config/database';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { logger } from '../config/logger';
import { Prisma, payment_method, payment_status, approval_status, journal_status, installment_status } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
import { generateCode } from '../utils/codeGenerator';
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
import {
    REVENUE_TYPE_TO_REVENUE_COA,
    REVENUE_TYPE_TO_RECEIVABLE_COA,
    PAYMENT_METHOD_TO_ASSET_COA
} from '../lib/coaMapping';

// ============================================================================
// CONSTANTS (Using centralized COA mappings)
// ============================================================================

const RENTAL_REVENUE_TYPE_CODE = 'REVT-003'; // Rental revenue type code

/**
 * Account codes for journal entries
 * Uses centralized COA mapping for consistency across all services
 */
const ACCOUNT_CODES = {
    CASH: PAYMENT_METHOD_TO_ASSET_COA['CASH'],                           // 1000
    BANK_TRANSFER: PAYMENT_METHOD_TO_ASSET_COA['BANK_TRANSFER'],         // 1005
    E_WALLET: PAYMENT_METHOD_TO_ASSET_COA['E_WALLET'],                   // 1010
    RENTAL_REVENUE: REVENUE_TYPE_TO_REVENUE_COA['REVT-003'],             // 3010 - Rental Service Revenue
    RENTAL_RECEIVABLE: REVENUE_TYPE_TO_RECEIVABLE_COA['REVT-003'],       // 1110 - AR - Rental Revenue
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
    // HELPER: Map payment method string to valid enum
    // --------------------------------------------------------------------------

    /**
     * Map payment method string from rental_local to valid enum
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
                // Default to CASH for unknown payment methods
                return 'CASH';
        }
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

        // Payment status filter (replaces remittance_status)
        if (filters.payment_status) {
            where.payment_status = filters.payment_status as payment_status;
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
        // Matches table columns: Revenue Code, Assignment ID, Status, and related rental/bus data
        if (filters.search) {
            const searchTerm = filters.search.trim();

            // Build OR conditions for text search
            const searchConditions: Prisma.revenueWhereInput[] = [
                { code: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { rental_assignment_id: { contains: searchTerm, mode: 'insensitive' } },
                { rental: { rental_package: { contains: searchTerm, mode: 'insensitive' } } },
                { rental: { rental_status: { contains: searchTerm, mode: 'insensitive' } } },
                { rental: { bus: { license_plate: { contains: searchTerm, mode: 'insensitive' } } } },
                { rental: { bus: { body_number: { contains: searchTerm, mode: 'insensitive' } } } },
            ];

            // Only add payment_method search if the term matches a valid enum value
            // Note: REIMBURSEMENT is excluded as it's not used for revenue records
            const searchUpper = searchTerm.toUpperCase();
            if (['CASH', 'BANK_TRANSFER', 'E_WALLET'].includes(searchUpper)) {
                searchConditions.push({ payment_method: { equals: searchUpper as payment_method } });
            }

            where.OR = searchConditions;
        }

        // Build order by
        const orderBy: Prisma.revenueOrderByWithRelationInput = {};
        const sortField = filters.sort_by || 'updated_at';
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
                orderBy.updated_at = sortOrder;
                break;
            case 'updated_at':
                orderBy.updated_at = sortOrder;
                break;
            default:
                orderBy.updated_at = sortOrder;
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
            payment_status: rev.payment_status,
            approval_status: rev.approval_status,
            accounting_status: rev.accounting_status,

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
                receivable: {
                    include: {
                        installment_schedule: {
                            include: {
                                payments: {
                                    include: {
                                        journal_entry: true,
                                    },
                                },
                            },
                        },
                    },
                },
                journal_entry: true,
                installment_payments: {
                    include: {
                        journal_entry: true,
                    },
                },
            },
        });

        if (!revenue) {
            throw new NotFoundError('Rental revenue not found');
        }

        // Collect all installment payments from receivable schedule or direct payments
        const installmentPayments = revenue.receivable?.installment_schedule
            ?.flatMap((schedule) => schedule.payments || []) || [];

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
            payment_status: revenue.payment_status,
            approval_status: revenue.approval_status,
            accounting_status: revenue.accounting_status,
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

            // Receivable (for balance tracking)
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

            // Installment payments (balance payments)
            installment_payments: installmentPayments.map((payment) => ({
                id: payment.id,
                amount_paid: this.toNumber(payment.amount_paid),
                payment_date: this.formatDate(payment.payment_date),
                payment_method: payment.payment_method as PaymentMethodEnum | null,
                payment_reference: payment.payment_reference,
                journal_entry: payment.journal_entry
                    ? {
                        id: payment.journal_entry.id,
                        code: payment.journal_entry.code,
                        status: payment.journal_entry.status,
                    }
                    : null,
            })),

            // Journal entry (for downpayment)
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

    /**
     * Create rental revenue record with receivable for balance.
     * 
     * Flow:
     * 1. Create revenue record for downpayment amount
     * 2. If balance exists, create receivable + installment schedule
     * 3. Create journal entry for downpayment
     * 4. Link revenue to receivable
     */
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

        // Calculate amounts
        const totalRentalAmount = this.toNumber(rental.total_rental_amount);
        const downPayment = data.down_payment_amount !== undefined
            ? data.down_payment_amount
            : this.toNumber(rental.down_payment_amount);
        const balanceAmount = totalRentalAmount - downPayment;

        // Map payment method (REIMBURSEMENT -> CASH for revenue records)
        const mappedPaymentMethod = this.mapPaymentMethod(data.payment_method || null);
        const dateRecorded = data.date_recorded ? new Date(data.date_recorded) : new Date();

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            let receivableId: number | undefined;

            // Create receivable for balance if balance > 0
            if (balanceAmount > 0) {
                const receivableCode = await generateCode('receivable');
                const receivable = await tx.receivable.create({
                    data: {
                        code: receivableCode,
                        debtor_name: `Rental Customer - ${data.assignment_id}`,
                        description: `Balance payment for rental assignment ${data.assignment_id}`,
                        total_amount: balanceAmount,
                        balance: balanceAmount,
                        paid_amount: 0,
                        status: 'PENDING',
                        number_of_payments: 1, // Single balance payment
                        frequency: 'MONTHLY', // Default frequency
                        created_by: userId,
                    },
                });
                receivableId = receivable.id;

                // Create single installment schedule for the balance
                await tx.revenue_installment_schedule.create({
                    data: {
                        receivable_id: receivableId,
                        installment_number: 1,
                        due_date: new Date(dateRecorded.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                        amount_due: balanceAmount,
                        amount_paid: 0,
                        balance: balanceAmount,
                        status: 'PENDING',
                        created_by: userId,
                    },
                });

                logger.info(`Created receivable ${receivableCode} for rental balance of ₱${balanceAmount}`);
            }

            // Create revenue record
            const revenue = await tx.revenue.create({
                data: {
                    code: revenueCode,
                    revenue_type_id: revenueType!.id,
                    amount: downPayment,
                    date_recorded: dateRecorded,
                    description: data.description || `Rental revenue for assignment ${data.assignment_id}`,
                    payment_method: mappedPaymentMethod,
                    payment_reference: data.payment_reference,
                    approval_status: 'APPROVED', // Auto-approved for rental revenue
                    accounting_status: 'DRAFT',
                    payment_status: balanceAmount > 0 ? 'PENDING' : 'COMPLETED', // PENDING if balance exists
                    rental_assignment_id: data.assignment_id,
                    receivable_id: receivableId, // Link to receivable for balance tracking
                    created_by: userId,
                    updated_at: new Date(),
                },
            });

            // Update rental to mark as revenue recorded
            await tx.rental_local.update({
                where: { assignment_id: data.assignment_id },
                data: {
                    is_revenue_recorded: true,
                    down_payment_date: dateRecorded,
                },
            });

            return { revenue, receivableId };
        });

        // Create journal entry for downpayment (outside transaction for JE service)
        const assetAccountCode = this.getAssetAccountCode(mappedPaymentMethod);

        const jePayload: CreateAutoJournalEntryInput = {
            module: 'Rental Revenue',
            reference_id: revenueCode,
            description: `Bus rental downpayment - Assignment: ${data.assignment_id} - Amount: ₱${downPayment} - Payment: ${mappedPaymentMethod}`,
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
            where: { id: result.revenue.id },
            data: { journal_entry_id: journalEntry.id },
        });

        // Audit log
        await AuditLogClient.logCreate(
            'Rental Revenue',
            { id: result.revenue.id, code: revenueCode },
            result.revenue,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`Created rental revenue ${revenueCode} for assignment ${data.assignment_id} with journal entry ${journalEntry.code}${result.receivableId ? ` and receivable for balance ₱${balanceAmount}` : ''}`);

        return this.getRentalRevenueById(result.revenue.id);
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
            // Map payment method (REIMBURSEMENT -> CASH for revenue records)
            revenueUpdate.payment_method = this.mapPaymentMethod(data.payment_method);
        }
        if (data.payment_reference !== undefined) {
            revenueUpdate.payment_reference = data.payment_reference;
        }
        if (data.payment_status !== undefined) {
            revenueUpdate.payment_status = data.payment_status as payment_status;
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

    /**
     * Cancel a rental revenue with proper accounting handling.
     * 
     * ACCOUNTING RULES:
     * 1. If downpayment JE is POSTED → create reversal JE
     * 2. If any balance payment JE is POSTED → create reversal JE
     * 3. Cancel outstanding receivables (zero out balances)
     * 4. Update all statuses appropriately
     * 5. Log all cancellation actions to audit
     * 
     * @param id - Revenue ID to cancel
     * @param data - Cancellation data with reason
     * @param userId - User performing cancellation
     * @param userInfo - User info for audit
     * @param req - Request object for audit
     */
    async cancelRentalRevenue(
        id: number,
        data: CancelRentalRevenueDTO,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        logger.info(`[RentalRevenueService] Cancelling rental revenue ID: ${id}`);

        // Get existing revenue with all related records
        const existing = await prisma.revenue.findFirst({
            where: { id, is_deleted: false, rental_assignment_id: { not: null } },
            include: {
                journal_entry: true,
                receivable: {
                    include: {
                        installment_schedule: {
                            include: {
                                payments: {
                                    include: {
                                        journal_entry: true,
                                    },
                                },
                            },
                        },
                    },
                },
                installment_payments: {
                    include: {
                        journal_entry: true,
                    },
                },
            },
        });

        if (!existing) {
            throw new NotFoundError('Rental revenue not found');
        }

        // Track reversal JEs created for audit
        const reversalJEs: { original_code: string; reversal_code: string; amount: number }[] = [];
        const previousData = {
            payment_status: existing.payment_status,
            accounting_status: existing.accounting_status,
            journal_entry_status: existing.journal_entry?.status || null,
            receivable_status: existing.receivable?.status || null,
            receivable_balance: Number(existing.receivable?.balance || 0),
        };

        // STEP 1: Handle downpayment reversal if JE is POSTED
        if (existing.journal_entry && existing.journal_entry.status === 'POSTED') {
            logger.info(`[RentalRevenueService] Creating reversal JE for downpayment: ${existing.journal_entry.code}`);
            
            try {
                const reversalJE = await this.journalEntryService.createReversalJournalEntry(
                    {
                        reversal_of_id: existing.journal_entry.id,
                        reason: `Rental cancellation: ${data.cancellation_reason || 'No reason provided'}`,
                    },
                    userId,
                    userInfo,
                    req
                );

                reversalJEs.push({
                    original_code: existing.journal_entry.code,
                    reversal_code: reversalJE.code,
                    amount: Number(existing.amount),
                });

                logger.info(`[RentalRevenueService] Created reversal JE ${reversalJE.code} for downpayment`);
            } catch (error) {
                // Log but continue - reversal may fail if already reversed
                logger.warn(`[RentalRevenueService] Could not reverse downpayment JE: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // STEP 2: Handle balance payment reversals if any JEs are POSTED
        const installmentPayments = existing.receivable?.installment_schedule
            ?.flatMap((schedule) => schedule.payments || []) || [];

        for (const payment of installmentPayments) {
            if (payment.journal_entry && payment.journal_entry.status === 'POSTED') {
                logger.info(`[RentalRevenueService] Creating reversal JE for balance payment: ${payment.journal_entry.code}`);
                
                try {
                    const reversalJE = await this.journalEntryService.createReversalJournalEntry(
                        {
                            reversal_of_id: payment.journal_entry.id,
                            reason: `Rental cancellation: ${data.cancellation_reason || 'No reason provided'}`,
                        },
                        userId,
                        userInfo,
                        req
                    );

                    reversalJEs.push({
                        original_code: payment.journal_entry.code,
                        reversal_code: reversalJE.code,
                        amount: Number(payment.amount_paid),
                    });

                    logger.info(`[RentalRevenueService] Created reversal JE ${reversalJE.code} for balance payment`);
                } catch (error) {
                    logger.warn(`[RentalRevenueService] Could not reverse payment JE: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        // STEP 3: Update all records in a transaction
        await prisma.$transaction(async (tx) => {
            // Update revenue status
            await tx.revenue.update({
                where: { id },
                data: {
                    payment_status: 'CANCELLED',
                    accounting_status: reversalJEs.length > 0 ? 'REVERSED' : existing.accounting_status,
                    updated_by: userId,
                },
            });

            // Cancel receivable if exists
            if (existing.receivable) {
                await tx.receivable.update({
                    where: { id: existing.receivable.id },
                    data: {
                        status: 'CANCELLED',
                        balance: 0,
                        updated_by: userId,
                    },
                });

                // Cancel all installment schedules
                for (const schedule of existing.receivable.installment_schedule || []) {
                    await tx.revenue_installment_schedule.update({
                        where: { id: schedule.id },
                        data: {
                            status: 'CANCELLED',
                            balance: 0,
                            updated_by: userId,
                        },
                    });
                }
            }

            // Update rental status
            if (existing.rental_assignment_id) {
                await tx.rental_local.update({
                    where: { assignment_id: existing.rental_assignment_id },
                    data: {
                        rental_status: 'cancelled',
                        cancelled_at: new Date(),
                        cancellation_reason: data.cancellation_reason,
                    },
                });
            }
        });

        // STEP 4: Audit log for cancellation
        const newData = {
            payment_status: 'CANCELLED',
            accounting_status: reversalJEs.length > 0 ? 'REVERSED' : existing.accounting_status,
            receivable_status: existing.receivable ? 'CANCELLED' : null,
            receivable_balance: 0,
            reversals_created: reversalJEs,
            cancellation_reason: data.cancellation_reason,
        };

        await AuditLogClient.logUpdate(
            AuditEntityTypes.RENTAL_REVENUE,
            { id: existing.id, code: existing.code },
            previousData,
            newData,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`[RentalRevenueService] Cancelled rental revenue ${existing.code} with ${reversalJEs.length} reversal JEs`);

        return this.getRentalRevenueById(id);
    }

    // --------------------------------------------------------------------------
    // PAY BALANCE
    // --------------------------------------------------------------------------

    /**
     * Pay the outstanding balance for a rental revenue.
     * 
     * Creates an installment payment record instead of a new revenue record.
     * This ensures:
     * - Single revenue record per rental (shown in table)
     * - Balance payments tracked via receivable/installment system
     * - Proper journal entry linkage for installment payment
     * - Consistent with other revenue receivable patterns
     * 
     * @param id - The revenue ID
     * @param paymentMethod - Payment method for balance payment
     * @param paymentReference - Optional payment reference
     * @param userId - User performing the action
     * @param userInfo - User info for audit
     * @param req - Request object for audit
     * @returns The updated revenue record with payment details
     */
    async payBalance(
        id: number,
        paymentMethod: PaymentMethodEnum,
        paymentReference: string | undefined,
        userId: string,
        userInfo: any,
        req: any
    ): Promise<RentalRevenueDetailResponse> {
        // Get existing revenue with receivable and installment schedule
        const existing = await prisma.revenue.findFirst({
            where: { id, is_deleted: false, rental_assignment_id: { not: null } },
            include: { 
                rental: true, 
                revenue_type: true,
                receivable: {
                    include: {
                        installment_schedule: true,
                    },
                },
            },
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

        // Check if receivable exists (should have been created when recording revenue)
        if (!existing.receivable) {
            throw new BadRequestError('No receivable record found for this rental. Cannot process balance payment.');
        }

        // Get the pending installment schedule
        const pendingInstallment = existing.receivable.installment_schedule.find(
            (s) => s.status === 'PENDING' || s.status === 'PARTIALLY_PAID'
        );

        if (!pendingInstallment) {
            throw new BadRequestError('No pending installment found for balance payment');
        }

        // Map payment method (REIMBURSEMENT -> CASH for revenue records)
        const mappedPaymentMethod = this.mapPaymentMethod(paymentMethod);
        const dateRecorded = new Date();

        // Create journal entry for balance payment
        const assetAccountCode = this.getAssetAccountCode(mappedPaymentMethod);

        const jePayload: CreateAutoJournalEntryInput = {
            module: 'Rental Revenue',
            reference_id: existing.code,
            description: `Bus rental balance payment - Assignment: ${existing.rental_assignment_id} - Amount: ₱${balanceAmount} - Payment: ${mappedPaymentMethod}`,
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

        // Use transaction for atomicity
        await prisma.$transaction(async (tx) => {
            // Create installment payment record
            // CRITICAL: accounting_status MUST start as DRAFT
            // It will be updated to POSTED when the linked JE is posted
            await tx.revenue_installment_payment.create({
                data: {
                    installment_id: pendingInstallment.id,
                    revenue_id: id,
                    amount_paid: balanceAmount,
                    payment_date: dateRecorded,
                    payment_method: mappedPaymentMethod,
                    payment_reference: paymentReference,
                    journal_entry_id: journalEntry.id,
                    accounting_status: 'DRAFT', // Explicit: must be DRAFT until JE is POSTED
                    created_by: userId,
                },
            });

            // Update installment schedule to PAID
            await tx.revenue_installment_schedule.update({
                where: { id: pendingInstallment.id },
                data: {
                    amount_paid: balanceAmount,
                    balance: 0,
                    status: 'PAID',
                    updated_by: userId,
                },
            });

            // Update receivable to COMPLETED
            await tx.receivable.update({
                where: { id: existing.receivable!.id },
                data: {
                    status: 'COMPLETED',
                    paid_amount: balanceAmount,
                    balance: 0,
                    last_payment_date: dateRecorded,
                    last_payment_amount: balanceAmount,
                    updated_by: userId,
                },
            });

            // Update revenue status to COMPLETED
            await tx.revenue.update({
                where: { id },
                data: {
                    payment_status: 'COMPLETED',
                    updated_by: userId,
                },
            });

            // Update rental
            await tx.rental_local.update({
                where: { assignment_id: existing.rental_assignment_id! },
                data: {
                    balance_amount: 0,
                    full_payment_date: dateRecorded,
                    rental_status: 'completed',
                },
            });
        });

        // Audit log for balance payment
        await AuditLogClient.logUpdate(
            'Rental Revenue',
            { id: existing.id, code: existing.code },
            { balance_amount: balanceAmount, payment_status: 'PENDING' },
            { 
                balance_amount: 0, 
                payment_status: 'COMPLETED', 
                installment_payment: {
                    amount: balanceAmount,
                    payment_method: mappedPaymentMethod,
                    journal_entry_id: journalEntry.id,
                },
            },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            req
        );

        logger.info(`Paid balance ₱${balanceAmount} for rental revenue ${existing.code} with journal entry ${journalEntry.code}`);

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
                by: ['payment_status'],
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
        // Note: REIMBURSEMENT is excluded as it's not used for revenue records
        const paymentMethodMap: Record<PaymentMethodEnum, number> = {
            CASH: 0,
            BANK_TRANSFER: 0,
            E_WALLET: 0,
        };
        byPaymentMethod.forEach((item) => {
            if (item.payment_method && item.payment_method !== 'REIMBURSEMENT') {
                paymentMethodMap[item.payment_method as PaymentMethodEnum] = item._count;
            } else if (item.payment_method === 'REIMBURSEMENT') {
                // Count REIMBURSEMENT as CASH (legacy data handling)
                paymentMethodMap.CASH += item._count;
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

    // --------------------------------------------------------------------------
    // ARCHIVE / RESTORE / DELETE RENTAL REVENUE
    // --------------------------------------------------------------------------

    /**
     * Archive a rental revenue record (soft delete)
     */
    async archiveRentalRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[RentalRevenueService] Archiving rental revenue ID: ${id}`);

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

        const result = await prisma.revenue.update({
            where: { id },
            data: {
                is_deleted: true,
                archived_by: userId,
                archived_at: new Date(),
            },
        });

        await AuditLogClient.logArchive(
            AuditEntityTypes.RENTAL_REVENUE,
            { id, code: revenue.code },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            { code: revenue.code, payment_status: revenue.payment_status },
            req
        );

        logger.info(`[RentalRevenueService] Archived rental revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been archived`, data: result };
    }

    /**
     * Restore an archived rental revenue record
     */
    async restoreRentalRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[RentalRevenueService] Restoring rental revenue ID: ${id}`);

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
            AuditEntityTypes.RENTAL_REVENUE,
            { id, code: revenue.code },
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            { code: revenue.code },
            req
        );

        logger.info(`[RentalRevenueService] Restored rental revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been restored`, data: result };
    }

    /**
     * Permanently delete an archived rental revenue record
     */
    async hardDeleteRentalRevenue(id: number, userId: string, userInfo?: any, req?: any) {
        logger.info(`[RentalRevenueService] Hard deleting rental revenue ID: ${id}`);

        const revenue = await prisma.revenue.findUnique({
            where: { id },
        });

        if (!revenue) {
            throw new NotFoundError(`Revenue record with ID ${id} not found`);
        }

        if (!revenue.is_deleted) {
            throw new BadRequestError('Cannot permanently delete an active revenue record. Archive it first.');
        }

        await prisma.revenue.delete({
            where: { id },
        });

        await AuditLogClient.logDelete(
            'Revenue',
            { id, code: revenue.code },
            revenue,
            { id: userId, name: userInfo?.username, role: userInfo?.role },
            'Permanent deletion',
            req
        );

        logger.info(`[RentalRevenueService] Permanently deleted rental revenue: ${revenue.code}`);
        return { success: true, message: `Revenue ${revenue.code} has been permanently deleted` };
    }
}

// Export singleton instance
export const rentalRevenueService = new RentalRevenueService();
