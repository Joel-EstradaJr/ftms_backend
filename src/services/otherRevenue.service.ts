/**
 * OTHER REVENUE SERVICE
 * 
 * Handles CRUD operations for other revenue records (non-bus trip, non-rental).
 * Supports:
 * - Paginated list with filters
 * - Create with optional receivable/installments
 * - View with relations
 * - Update with validation
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma, payment_method, receivable_frequency, payment_status, installment_status, approval_status, journal_status } from '@prisma/client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from './journalEntryAuto.service';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
import { Request } from 'express';
import { generateCode } from '../utils/codeGenerator';
import {
    REVENUE_TYPE_TO_REVENUE_COA,
    REVENUE_TYPE_TO_RECEIVABLE_COA,
    getAssetCOACode as getAssetAccountCodeFromMapping,
    getRevenueCOACode,
    getReceivableCOACode
} from '../lib/coaMapping';

// --------------------------
// COA MAPPINGS (LEGACY - NOW USES CENTRALIZED coaMapping.ts)
// --------------------------

/**
 * @deprecated Use REVENUE_TYPE_TO_REVENUE_COA from '../lib/coaMapping' instead
 * Revenue Type Code → Chart of Account Code mapping
 * Based on seed_core_data.ts COA definitions
 */
const REVENUE_TYPE_TO_COA: Record<string, string> = REVENUE_TYPE_TO_REVENUE_COA;

/**
 * Get asset account code based on payment method
 * Uses centralized mapping from coaMapping.ts
 */
function getAssetAccountCode(paymentMethod: payment_method | string | null): string {
    return getAssetAccountCodeFromMapping(paymentMethod?.toString() || null);
}

/**
 * Get revenue account code based on revenue type
 * Uses centralized mapping from coaMapping.ts
 */
async function getRevenueAccountCode(revenueTypeId: number): Promise<string> {
    const revenueType = await prisma.revenue_type.findUnique({
        where: { id: revenueTypeId },
        select: { code: true }
    });

    if (!revenueType) {
        return '3065'; // Default to Miscellaneous Income
    }

    return getRevenueCOACode(revenueType.code);
}

/**
 * Get receivable account code based on revenue type
 * Each revenue type has its own dedicated AR account
 */
async function getReceivableAccountCode(revenueTypeId: number): Promise<string> {
    const revenueType = await prisma.revenue_type.findUnique({
        where: { id: revenueTypeId },
        select: { code: true }
    });

    if (!revenueType) {
        return '1160'; // Default to AR - Miscellaneous Income
    }

    return getReceivableCOACode(revenueType.code);
}

// Journal Entry Service instance
const journalEntryService = new JournalEntryAutoService();

// --------------------------
// TYPES
// --------------------------

export interface OtherRevenueListParams {
    page: number;
    limit: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    revenueTypeId?: number;
    status?: string;
    sortBy?: 'date_recorded' | 'amount' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
}

export interface OtherRevenueCreateInput {
    revenue_type_id: number;
    amount: number;
    date_recorded: string;
    description: string;
    payment_method: string;
    payment_reference?: string;
    department_id?: number;  // Reference to department_local
    remarks?: string;
    isUnearnedRevenue: boolean;
    scheduleFrequency?: string;
    scheduleStartDate?: string;
    numberOfPayments?: number;
    created_by: string;
}

export interface OtherRevenueUpdateInput {
    revenue_type_id?: number;
    amount?: number;
    date_recorded?: string;
    description?: string;
    payment_method?: string;
    payment_reference?: string;
    department_id?: number;  // Reference to department_local
    remarks?: string;
    updated_by: string;
}

// --------------------------
// HELPERS
// --------------------------

/**
 * Combines department, description, and remarks into full description
 */
function buildFullDescription(department?: string, description?: string, remarks?: string): string {
    const parts: string[] = [];
    if (department) parts.push(`[${department}]`);
    if (description) parts.push(description);
    if (remarks) parts.push(`(${remarks})`);
    return parts.join(' ');
}

/**
 * Parses full description back into components
 */
function parseFullDescription(fullDesc: string): { department?: string; description: string; remarks?: string } {
    let department: string | undefined;
    let remarks: string | undefined;
    let description = fullDesc;

    // Extract department [...]
    const deptMatch = fullDesc.match(/^\[([^\]]+)\]\s*/);
    if (deptMatch) {
        department = deptMatch[1];
        description = fullDesc.slice(deptMatch[0].length);
    }

    // Extract remarks (...)
    const remarksMatch = description.match(/\s*\(([^)]+)\)$/);
    if (remarksMatch) {
        remarks = remarksMatch[1];
        description = description.slice(0, -remarksMatch[0].length);
    }

    return { department, description: description.trim(), remarks };
}

// --------------------------
// SERVICE METHODS
// --------------------------

/**
 * List other revenue records with filters and pagination
 */
export async function listOtherRevenue(params: OtherRevenueListParams) {
    const { page, limit, search, startDate, endDate, revenueTypeId, status, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    // Build where clause - exclude bus trip and rental revenue (type IDs 1, 2, 3)
    const where: Prisma.revenueWhereInput = {
        is_deleted: false,
        revenue_type_id: {
            gte: 4 // Other revenue types start from ID 4
        }
    };

    // Search filter - match visible table columns
    if (search) {
        // Check if search is a number (for amount/receivable)
        const numericSearch = parseFloat(search);
        const isNumericSearch = !isNaN(numericSearch);

        // Build search conditions for visible columns
        const searchConditions: Prisma.revenueWhereInput[] = [
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            // Search by revenue type name (Source column)
            { revenue_type: { name: { contains: search, mode: 'insensitive' } } },
        ];

        // Add numeric search for amount column
        if (isNumericSearch) {
            searchConditions.push({ amount: { equals: numericSearch } });
        }

        // Normalize status search (handle "Partially Paid" -> "PARTIALLY_PAID")
        const normalizedSearch = search.trim().toUpperCase().replace(/\s+/g, '_');
        const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'COMPLETED', 'CANCELLED', 'WRITTEN_OFF'];

        // Check if search matches or partially matches a valid status
        const matchedStatus = validStatuses.find(s =>
            s.includes(normalizedSearch) || normalizedSearch.includes(s)
        );

        if (matchedStatus) {
            searchConditions.push({ payment_status: matchedStatus as payment_status });
        }

        where.OR = searchConditions;
    }

    // Date range filter
    if (startDate || endDate) {
        where.date_recorded = {};
        if (startDate) where.date_recorded.gte = new Date(startDate);
        if (endDate) where.date_recorded.lte = new Date(endDate);
    }

    // Revenue type filter (override if specific type requested)
    if (revenueTypeId) {
        where.revenue_type_id = revenueTypeId;
    }

    // Status filter - normalize input to match enum values
    if (status) {
        // Handle both approval_status and payment_status
        const normalizedStatus = status.trim().toUpperCase().replace(/\s+/g, '_');

        if (['PENDING', 'APPROVED', 'REJECTED'].includes(normalizedStatus)) {
            where.approval_status = normalizedStatus as approval_status;
        } else {
            where.payment_status = normalizedStatus as payment_status;
        }
    }



    // Build order by
    let orderBy: any;
    switch (sortBy) {
        case 'updated_at':
            orderBy = { updated_at: sortOrder };
            break;
        case 'date_recorded':
            orderBy = { date_recorded: sortOrder };
            break;
        case 'amount':
            orderBy = { amount: sortOrder };
            break;
        default:
            orderBy = { updated_at: sortOrder };
    }

    // Execute query
    const [records, totalCount] = await Promise.all([
        prisma.revenue.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                revenue_type: {
                    select: { id: true, code: true, name: true }
                },
                department: {
                    select: { id: true, department_name: true }
                },
                receivable: {
                    select: {
                        id: true,
                        status: true,
                        total_amount: true,
                        frequency: true,
                        number_of_payments: true,
                        installment_start_date: true,
                        installment_schedule: {
                            select: {
                                id: true,
                                installment_number: true,
                                due_date: true,
                                amount_due: true,
                                amount_paid: true,
                                balance: true,
                                status: true,
                                payments: {
                                    select: {
                                        id: true,
                                        amount_paid: true,
                                        payment_date: true,
                                        payment_method: true,
                                        payment_reference: true,
                                        created_by: true,
                                        created_at: true
                                    },
                                    orderBy: { payment_date: 'desc' }
                                }
                            },
                            orderBy: { due_date: 'asc' }
                        }
                    }
                },
                journal_entry: {
                    select: {
                        id: true,
                        code: true,
                        status: true,
                        date: true,
                        lines: {
                            select: {
                                account: {
                                    select: { account_code: true, account_name: true }
                                }
                            },
                            take: 1
                        }
                    }
                }
            }
        }),
        prisma.revenue.count({ where })
    ]);

    // Calculate analytics
    const analytics = await calculateAnalytics(revenueTypeId);

    // Parse descriptions for backwards compatibility with old records that had department in description
    const parsedDescriptions = records.map(r => {
        const parsed = parseFullDescription(r.description || '');
        // Don't include deprecated department from description parsing
        return { description: parsed.description, remarks: parsed.remarks };
    });

    return {
        records: records.map((r, i) => ({
            id: r.id,
            code: r.code,
            date_recorded: r.date_recorded,
            date_expected: r.date_expected,
            revenueType: r.revenue_type,
            department: r.department,  // Department relation object
            department_id: r.department_id,
            description: parsedDescriptions[i].description,
            remarks: parsedDescriptions[i].remarks,
            amount: Number(r.amount),
            approval_status: r.approval_status,  // Include approval_status from database
            accounting_status: r.accounting_status,  // Include accounting_status from database
            approvalRemarks: r.approval_remarks,
            payment_status: r.payment_status,
            payment_method: r.payment_method,
            payment_reference: r.payment_reference,
            isUnearnedRevenue: !!r.receivable,
            accountCode: r.journal_entry?.lines?.[0]?.account?.account_code,
            created_by: r.created_by,
            created_at: r.created_at,
            receivable: r.receivable ? {
                id: r.receivable.id,
                status: r.receivable.status,
                frequency: r.receivable.frequency,
                numberOfPayments: r.receivable.number_of_payments,
                scheduleStartDate: r.receivable.installment_start_date,
                scheduleItems: r.receivable.installment_schedule.map(s => ({
                    id: s.id,
                    installmentNumber: s.installment_number,
                    dueDate: s.due_date,
                    amountDue: Number(s.amount_due),
                    amountPaid: Number(s.amount_paid),
                    balance: Number(s.balance),
                    status: s.status,
                    // Include payment transaction records for payment history
                    payments: s.payments?.map(p => ({
                        id: p.id,
                        amountPaid: Number(p.amount_paid),
                        paymentDate: p.payment_date,
                        paymentMethod: p.payment_method,
                        paymentReference: p.payment_reference,
                        createdBy: p.created_by,
                        createdAt: p.created_at
                    })) || []
                }))
            } : null,
            // Journal Entry for edit/delete restrictions
            journalEntry: r.journal_entry ? {
                id: r.journal_entry.id,
                code: r.journal_entry.code,
                status: r.journal_entry.status
            } : null
        })),
        pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNextPage: page * limit < totalCount,
            hasPreviousPage: page > 1
        },
        analytics
    };
}

/**
 * Calculate analytics for other revenue
 */
async function calculateAnalytics(revenueTypeId?: number) {
    const where: Prisma.revenueWhereInput = {
        is_deleted: false,
        revenue_type_id: revenueTypeId || { gte: 4 }
    };

    const [totalAmount, byType, byStatus] = await Promise.all([
        prisma.revenue.aggregate({
            where,
            _sum: { amount: true },
            _count: true
        }),
        prisma.revenue.groupBy({
            by: ['revenue_type_id'],
            where,
            _sum: { amount: true },
            _count: true
        }),
        prisma.revenue.groupBy({
            by: ['payment_status'],
            where,
            _sum: { amount: true },
            _count: true
        })
    ]);

    return {
        totalAmount: Number(totalAmount._sum.amount || 0),
        totalRecords: totalAmount._count,
        byType,
        byStatus
    };
}

/**
 * Get a single other revenue record by ID
 */
export async function getOtherRevenueById(id: number) {
    const record = await prisma.revenue.findFirst({
        where: { id, is_deleted: false },
        include: {
            revenue_type: true,
            department: true,  // Include department relation
            receivable: {
                include: {
                    installment_schedule: {
                        orderBy: { due_date: 'asc' },
                        include: {
                            payments: true
                        }
                    }
                }
            },
            journal_entry: {
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    }
                }
            }
        }
    });

    if (!record) return null;

    // Parse description for backwards compatibility (don't include deprecated department field)
    const parsed = parseFullDescription(record.description || '');

    return {
        id: record.id,
        code: record.code,
        date_recorded: record.date_recorded,
        date_expected: record.date_expected,
        revenueType: record.revenue_type,
        department: record.department,  // Department relation object
        department_id: record.department_id,
        description: parsed.description,
        remarks: parsed.remarks,
        amount: Number(record.amount),
        status: (record as any).status,
        approvalRemarks: (record as any).approval_remarks,
        payment_status: record.payment_status,
        payment_method: record.payment_method,
        payment_reference: record.payment_reference,
        isUnearnedRevenue: !!record.receivable,
        accountCode: record.journal_entry?.lines?.[0]?.account?.account_code,
        created_by: record.created_by,
        created_at: record.created_at,
        updated_by: record.updated_by,
        updated_at: record.updated_at,
        receivable: record.receivable,
        journalEntry: record.journal_entry
    };
}

/**
 * Create a new other revenue record
 */
export async function createOtherRevenue(input: OtherRevenueCreateInput) {
    // Use unified code generator
    const code = await generateCode('revenue');
    // Build description from description and remarks only (department now stored in department_id)
    const fullDescription = input.remarks
        ? `${input.description} (${input.remarks})`
        : input.description;

    // Validate revenue type exists and is an "other" type (ID >= 4)
    const revenueType = await prisma.revenue_type.findFirst({
        where: { id: input.revenue_type_id, is_deleted: false }
    });

    if (!revenueType) {
        throw new Error('Invalid revenue type');
    }

    if (revenueType.id < 4) {
        throw new Error('Cannot create bus trip or rental revenue via this endpoint');
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
        let receivableId: number | undefined;

        // Get department name if department_id is provided
        let departmentName = 'General';
        if (input.department_id) {
            const department = await tx.department_local.findUnique({
                where: { id: input.department_id },
                select: { department_name: true }
            });
            if (department) {
                departmentName = department.department_name;
            }
        }

        // Create receivable if unearned revenue
        if (input.isUnearnedRevenue && input.scheduleFrequency && input.numberOfPayments) {
            // Use unified code generator for receivable
            const receivableCode = await generateCode('receivable');
            const receivable = await tx.receivable.create({
                data: {
                    code: receivableCode,
                    debtor_name: departmentName,
                    description: fullDescription,
                    total_amount: input.amount,
                    installment_start_date: input.scheduleStartDate ? new Date(input.scheduleStartDate) : new Date(),
                    frequency: input.scheduleFrequency as receivable_frequency,
                    number_of_payments: input.numberOfPayments,
                    status: 'PENDING',
                    created_by: input.created_by,
                }
            });
            receivableId = receivable.id;

            // Create installment schedule
            const amountPerInstallment = input.amount / input.numberOfPayments;
            const startDate = new Date(input.scheduleStartDate || new Date());

            for (let i = 0; i < input.numberOfPayments; i++) {
                const scheduleDate = new Date(startDate);
                switch (input.scheduleFrequency) {
                    case 'DAILY':
                        scheduleDate.setDate(startDate.getDate() + i);
                        break;
                    case 'WEEKLY':
                        scheduleDate.setDate(startDate.getDate() + (i * 7));
                        break;
                    case 'BIWEEKLY':
                        scheduleDate.setDate(startDate.getDate() + (i * 14));
                        break;
                    case 'MONTHLY':
                        scheduleDate.setMonth(startDate.getMonth() + i);
                        break;
                    case 'QUARTERLY':
                        scheduleDate.setMonth(startDate.getMonth() + (i * 3));
                        break;
                    default:
                        // Default to daily for unknown frequencies
                        scheduleDate.setDate(startDate.getDate() + i);
                }

                await tx.revenue_installment_schedule.create({
                    data: {
                        receivable_id: receivableId,
                        installment_number: i + 1,
                        due_date: scheduleDate,
                        amount_due: amountPerInstallment,
                        balance: amountPerInstallment,
                        status: 'PENDING',
                    }
                });
            }
        }

        // Create revenue record
        // BUSINESS RULE: On creation:
        // - approval_status = PENDING (needs approval)
        // - accounting_status = NULL (no journal entry yet - will be created on approval)
        // - payment_status = COMPLETED if no receivable, PENDING if receivable exists
        const revenue = await tx.revenue.create({
            data: {
                code,
                revenue_type_id: input.revenue_type_id,
                amount: input.amount,
                date_recorded: new Date(input.date_recorded),
                description: fullDescription,
                department_id: input.department_id,  // Store department reference
                payment_method: input.payment_method as payment_method,
                payment_reference: input.payment_reference,
                receivable_id: receivableId,
                payment_status: input.isUnearnedRevenue ? 'PENDING' : 'COMPLETED',
                approval_status: 'PENDING',
                // NO accounting_status set - remains null until approval creates JE
                created_by: input.created_by,
                updated_at: new Date()
            },
            include: {
                revenue_type: true,
                department: true,  // Include department relation
                receivable: {
                    include: {
                        installment_schedule: true
                    }
                }
            }
        });

        logger.info(`[OTHER_REVENUE] Created revenue ${code} for type ${revenueType.name}. Waiting for approval.`);

        return revenue;
    });

    // Audit log for creation (outside transaction to not block main operation)
    await AuditLogClient.logCreate(
        AuditEntityTypes.OTHER_REVENUE,
        { id: result.id, code: result.code },
        result,
        { id: input.created_by || 'system' }
    );

    return result;
}

/**
 * Generate Journal Entry for an approved revenue record
 */
async function generateRevenueJournalEntry(revenueId: number, userId: string) {
    const revenue = await prisma.revenue.findUnique({
        where: { id: revenueId },
        include: { revenue_type: true, receivable: true }
    });

    if (!revenue) throw new Error('Revenue not found');
    if (revenue.journal_entry_id) return; // Already generated

    try {
        const revenueAccountCode = await getRevenueAccountCode(revenue.revenue_type_id);
        // Get type-specific receivable account (not generic AR)
        const receivableAccountCode = await getReceivableAccountCode(revenue.revenue_type_id);
        const dateRecorded = (revenue.date_recorded || new Date()).toISOString().split('T')[0];

        let journalEntryInput: CreateAutoJournalEntryInput;

        if (revenue.receivable) {
            // Unearned Revenue: DR Accounts Receivable (type-specific), CR Revenue
            journalEntryInput = {
                module: 'OTHER_REVENUE',
                reference_id: revenue.id.toString(),
                description: `${revenue.revenue_type.name} - ${revenue.description || 'Unearned Revenue'}`,
                date: dateRecorded,
                entries: [
                    {
                        account_code: receivableAccountCode,
                        debit: Number(revenue.amount),
                        credit: 0,
                        description: `AR - ${revenue.revenue_type.name}`
                    },
                    {
                        account_code: revenueAccountCode,
                        debit: 0,
                        credit: Number(revenue.amount),
                        description: `Revenue - ${revenue.revenue_type.name}`
                    }
                ]
            };
        } else {
            // Regular Revenue: DR Cash/Bank, CR Revenue
            const assetAccountCode = getAssetAccountCode(revenue.payment_method);
            journalEntryInput = {
                module: 'OTHER_REVENUE',
                reference_id: revenue.id.toString(),
                description: `${revenue.revenue_type.name} - ${revenue.description || revenue.revenue_type.name}`,
                date: dateRecorded,
                entries: [
                    {
                        account_code: assetAccountCode,
                        debit: Number(revenue.amount),
                        credit: 0,
                        description: `Payment received - ${revenue.payment_method}`
                    },
                    {
                        account_code: revenueAccountCode,
                        debit: 0,
                        credit: Number(revenue.amount),
                        description: `Revenue - ${revenue.revenue_type.name}`
                    }
                ]
            };
        }

        const journalEntry = await journalEntryService.createAutoJournalEntry(journalEntryInput, userId);

        await prisma.revenue.update({
            where: { id: revenue.id },
            data: { journal_entry_id: journalEntry.id }
        });

        logger.info(`[OTHER_REVENUE] Created journal entry ${journalEntry.code} for revenue ${revenue.code}`);
        return journalEntry;
    } catch (error) {
        logger.error(`[OTHER_REVENUE] Failed to generate journal entry for revenue ${revenue.code}:`, error);
        throw error;
    }
}

/**
 * Approve an other revenue record
 */
export async function approveOtherRevenue(id: number, userId: string) {
    const record = await prisma.revenue.findUnique({
        where: { id },
        include: { 
            journal_entry: true,
            revenue_type: true,
            department: true
        }
    });

    if (!record) throw new Error('Revenue record not found');
    if (record.approval_status !== 'PENDING') throw new Error(`Cannot approve record with status ${record.approval_status}`);

    // Determine if this is unearned revenue (has receivable/installments)
    const isUnearnedRevenue = record.receivable_id !== null;

    // BUSINESS RULE: On approval:
    // - approval_status = APPROVED
    // - accounting_status = DRAFT (JE will be created with DRAFT status)
    // - payment_status = COMPLETED if no receivable, PENDING if receivable exists
    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.revenue.update({
            where: { id },
            data: {
                approval_status: 'APPROVED',
                accounting_status: 'DRAFT', // JE is created with DRAFT status
                payment_status: isUnearnedRevenue ? 'PENDING' : 'COMPLETED',
                updated_by: userId,
                updated_at: new Date()
            },
            include: { revenue_type: true }
        });

        return updated;
    });

    // Audit log for approval - include full record for proper summary
    await AuditLogClient.logApprove(
        AuditEntityTypes.OTHER_REVENUE,
        { id: record.id, code: record.code },
        { id: userId },
        { 
            ...record,
            approval_status: record.approval_status 
        },
        { 
            ...record,
            approval_status: 'APPROVED', 
            payment_status: isUnearnedRevenue ? 'PENDING' : 'COMPLETED' 
        }
    );

    // Generate JE after status update - non-blocking so approval succeeds even if JE fails
    let jeError: Error | null = null;
    try {
        await generateRevenueJournalEntry(id, userId);
    } catch (err) {
        jeError = err instanceof Error ? err : new Error(String(err));
        // IMPORTANT: Log the full error message for debugging
        logger.error(`[OTHER_REVENUE] ⚠️ JOURNAL ENTRY FAILED for ${record.code}:`, jeError.message);
        logger.error(`[OTHER_REVENUE] Full error:`, jeError);
    }

    logger.info(`[OTHER_REVENUE] Approved revenue ${record.code} by ${userId}${jeError ? ' (JE FAILED - check logs)' : ''}`);
    return result;
}

/**
 * Reject an other revenue record
 */
export async function rejectOtherRevenue(id: number, remarks: string | undefined, userId: string) {
    const record = await prisma.revenue.findUnique({
        where: { id },
        include: {
            revenue_type: true,
            department: true
        }
    });

    if (!record) throw new Error('Revenue record not found');
    if (record.approval_status !== 'PENDING') throw new Error(`Cannot reject record with status ${record.approval_status}`);

    // BUSINESS RULE: On rejection:
    // - approval_status = REJECTED
    // - payment_status = CANCELLED
    // - accounting_status remains DRAFT (no JE will be created, journal_entry_id stays null)
    const result = await prisma.revenue.update({
        where: { id },
        data: {
            approval_status: 'REJECTED',
            payment_status: 'CANCELLED',
            // Note: accounting_status stays DRAFT, but journal_entry_id is null = no JE exists
            approval_remarks: remarks || null,
            updated_by: userId,
            updated_at: new Date()
        }
    });

    // Audit log for rejection - include full record for proper summary
    await AuditLogClient.logReject(
        AuditEntityTypes.OTHER_REVENUE,
        { id: record.id, code: record.code },
        { id: userId },
        remarks,
        { 
            ...record,
            approval_status: record.approval_status, 
            payment_status: record.payment_status 
        },
        { 
            ...record,
            approval_status: 'REJECTED', 
            payment_status: 'CANCELLED', 
            approval_remarks: remarks 
        }
    );

    logger.info(`[OTHER_REVENUE] Rejected revenue ${record.code} by ${userId}${remarks ? `. Reason: ${remarks}` : ''}`);
    return result;
}

/**
 * Update an existing other revenue record
 * Only allowed for PENDING status records
 */
export async function updateOtherRevenue(id: number, input: OtherRevenueUpdateInput) {
    // Check if record exists and is editable
    const existing = await prisma.revenue.findFirst({
        where: { id, is_deleted: false },
        include: { receivable: true }
    });

    if (!existing) {
        throw new Error('Revenue record not found');
    }

    // STRICT: Only allow editing for PENDING status
    if (existing.payment_status !== 'PENDING') {
        throw new Error('Only records with PENDING status can be edited');
    }

    // Check if journal entry exists and is NOT in DRAFT status - block edit if so
    // Journal Entry status is the single source of truth for edit restrictions
    if (existing.journal_entry_id) {
        const journalEntry = await prisma.journal_entry.findUnique({
            where: { id: existing.journal_entry_id },
            select: { status: true }
        });
        if (journalEntry && journalEntry.status !== 'DRAFT') {
            throw new Error('Cannot edit revenue record - journal entry is no longer in DRAFT status');
        }
    }

    // Build update data
    const updateData: Prisma.revenueUpdateInput = {
        updated_by: input.updated_by,
        updated_at: new Date()
    };

    if (input.revenue_type_id) {
        // Validate revenue type
        const revenueType = await prisma.revenue_type.findFirst({
            where: { id: input.revenue_type_id, is_deleted: false }
        });
        if (!revenueType || revenueType.id < 4) {
            throw new Error('Invalid revenue type');
        }
        updateData.revenue_type = { connect: { id: input.revenue_type_id } };
    }

    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.date_recorded) updateData.date_recorded = new Date(input.date_recorded);
    if (input.payment_method) updateData.payment_method = input.payment_method as payment_method;
    if (input.payment_reference !== undefined) updateData.payment_reference = input.payment_reference;

    // Update department_id if provided
    if (input.department_id !== undefined) {
        if (input.department_id === null) {
            updateData.department = { disconnect: true };
        } else {
            updateData.department = { connect: { id: input.department_id } };
        }
    }

    // Update description if provided (no longer includes department)
    if (input.description !== undefined || input.remarks !== undefined) {
        const currentDesc = existing.description || '';
        // Extract current remarks if present
        const remarksMatch = currentDesc.match(/\s*\(([^)]+)\)$/);
        const currentRemarks = remarksMatch ? remarksMatch[1] : '';
        const baseDesc = remarksMatch ? currentDesc.slice(0, -remarksMatch[0].length).trim() : currentDesc;

        const newDesc = input.description ?? baseDesc;
        const newRemarks = input.remarks ?? currentRemarks;
        updateData.description = newRemarks ? `${newDesc} (${newRemarks})` : newDesc;
    }

    const updated = await prisma.revenue.update({
        where: { id },
        data: updateData,
        include: {
            revenue_type: true,
            department: true,  // Include department relation
            receivable: {
                include: { installment_schedule: true }
            }
        }
    });

    // If amount was updated and there's an associated receivable (unearned revenue),
    // recalculate the receivable total and installment schedule
    if (input.amount !== undefined && updated.receivable) {
        const newAmount = input.amount;
        const receivable = updated.receivable;
        const installments = receivable.installment_schedule;

        if (installments && installments.length > 0) {
            // Calculate new amount per installment
            const numberOfPayments = installments.length;
            const amountPerInstallment = newAmount / numberOfPayments;

            // Update each installment, preserving paid amounts and recalculating balances
            for (const installment of installments) {
                const paidAmount = Number(installment.amount_paid);
                const newAmountDue = amountPerInstallment;
                const newBalance = Math.max(0, newAmountDue - paidAmount);

                // Determine new status based on payments
                let newStatus: installment_status = 'PENDING';
                if (paidAmount >= newAmountDue) {
                    newStatus = 'PAID';
                } else if (paidAmount > 0) {
                    newStatus = 'PARTIALLY_PAID';
                } else {
                    // Check if overdue
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (new Date(installment.due_date) < today) {
                        newStatus = 'OVERDUE';
                    }
                }

                await prisma.revenue_installment_schedule.update({
                    where: { id: installment.id },
                    data: {
                        amount_due: newAmountDue,
                        balance: newBalance,
                        status: newStatus,
                        updated_by: input.updated_by,
                        updated_at: new Date()
                    }
                });
            }

            // Update receivable total_amount
            await prisma.receivable.update({
                where: { id: receivable.id },
                data: {
                    total_amount: newAmount,
                    updated_by: input.updated_by,
                    updated_at: new Date()
                }
            });

            logger.info(`[OTHER_REVENUE] Recalculated receivable and ${numberOfPayments} installments for revenue ${updated.code}`);
        }
    }

    logger.info(`[OTHER_REVENUE] Updated revenue ${updated.code}`);

    // Re-fetch with updated receivable data
    const finalResult = await prisma.revenue.findUnique({
        where: { id },
        include: {
            revenue_type: true,
            department: true,
            receivable: {
                include: {
                    installment_schedule: {
                        orderBy: { due_date: 'asc' }
                    }
                }
            }
        }
    });

    // Audit log for update
    if (finalResult) {
        await AuditLogClient.logUpdate(
            AuditEntityTypes.OTHER_REVENUE,
            { id: finalResult.id, code: finalResult.code },
            existing,
            finalResult,
            { id: input.updated_by || 'system' }
        );
    }

    return finalResult;
}

/**
 * Get all revenue types (for dropdown)
 */
export async function getOtherRevenueTypes() {
    const types = await prisma.revenue_type.findMany({
        where: {
            is_deleted: false,
            id: { gte: 4 } // Only other revenue types
        },
        orderBy: { id: 'asc' }
    });

    return types.map(t => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description
    }));
}

// --------------------------
// PAYMENT RECORDING
// --------------------------

export interface RecordPaymentInput {
    revenueId: number;
    scheduleItemId: string | number;
    scheduleItemIds?: (string | number)[];
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    recordedBy: string;
    cascadeBreakdown?: Array<{
        installmentNumber: number;
        scheduleItemId: string | number;
        amountApplied: number;
    }>;
}

/**
 * Record a payment for an other revenue installment schedule
 * Supports cascade payments across multiple installments
 */
export async function recordPayment(input: RecordPaymentInput) {
    // Validate revenue exists and has receivable
    const revenue = await prisma.revenue.findFirst({
        where: { id: input.revenueId, is_deleted: false },
        include: {
            revenue_type: true,
            receivable: {
                include: {
                    installment_schedule: {
                        orderBy: { installment_number: 'asc' }
                    }
                }
            }
        }
    });

    if (!revenue) {
        throw new Error('Revenue record not found');
    }

    // STRICT: Only allow payments for APPROVED records
    if (revenue.approval_status !== 'APPROVED') {
        throw new Error(`Cannot record payment: revenue record is ${revenue.approval_status.toLowerCase()}. Please approve it first.`);
    }

    if (!revenue.receivable) {
        throw new Error('Revenue record does not have a receivable schedule');
    }

    // =========================================================================
    // STEP 1: Create Journal Entry FIRST (before transaction)
    // BUSINESS RULE: Each payment creates its own JE with status = DRAFT
    // The JE must be manually POSTED to become visible on dashboard
    // =========================================================================
    let journalEntryId: number | null = null;
    
    try {
        const assetAccountCode = getAssetAccountCode(input.paymentMethod);
        // Get type-specific receivable account (not generic AR)
        const receivableAccountCode = await getReceivableAccountCode(revenue.revenue_type_id);
        const paymentDateStr = new Date(input.paymentDate).toISOString().split('T')[0];

        const journalEntryInput: CreateAutoJournalEntryInput = {
            module: 'OTHER_REVENUE_PAYMENT',
            reference_id: `Payment for ${revenue.code}`,
            description: `Payment for ${revenue.revenue_type.name} - ${revenue.code}`,
            date: paymentDateStr,
            entries: [
                {
                    account_code: assetAccountCode,
                    debit: input.amountPaid,
                    credit: 0,
                    description: `Payment received - ${input.paymentMethod}`
                },
                {
                    account_code: receivableAccountCode,
                    debit: 0,
                    credit: input.amountPaid,
                    description: `Reduce AR - ${revenue.revenue_type.name}`
                }
            ]
        };

        // Create JE with DRAFT status (NOT auto-posted)
        // User must manually post the JE for it to appear on dashboard
        const journalEntry = await journalEntryService.createAutoJournalEntry(
            journalEntryInput,
            input.recordedBy
        );
        journalEntryId = journalEntry.id;

        logger.info(`[OTHER_REVENUE] Created payment journal entry ${journalEntry.code} with DRAFT status`);
    } catch (jeError) {
        logger.error(`[OTHER_REVENUE] Failed to create payment journal entry:`, jeError);
        // Continue with payment recording even if JE creation fails
        // This ensures the payment is still tracked
    }

    // =========================================================================
    // STEP 2: Create payment records (with JE link) in transaction
    // =========================================================================
    const result = await prisma.$transaction(async (tx) => {
        const payments: any[] = [];
        let remainingAmount = input.amountPaid;

        // Process cascade breakdown if provided
        if (input.cascadeBreakdown && input.cascadeBreakdown.length > 0) {
            for (const breakdown of input.cascadeBreakdown) {
                const installmentId = typeof breakdown.scheduleItemId === 'string'
                    ? parseInt(breakdown.scheduleItemId)
                    : breakdown.scheduleItemId;

                const installment = await tx.revenue_installment_schedule.findUnique({
                    where: { id: installmentId }
                });

                if (!installment) {
                    logger.warn(`[OTHER_REVENUE] Installment ${installmentId} not found, skipping`);
                    continue;
                }

                const currentBalance = Number(installment.balance);
                const amountToApply = Math.min(breakdown.amountApplied, currentBalance);

                if (amountToApply <= 0) continue;

                // Create payment record with JE link
                // BUSINESS RULE: Payment accounting_status = DRAFT
                // It becomes POSTED only when the linked JE is posted
                const payment = await tx.revenue_installment_payment.create({
                    data: {
                        installment_id: installmentId,
                        revenue_id: input.revenueId,
                        amount_paid: amountToApply,
                        payment_date: new Date(input.paymentDate),
                        payment_method: input.paymentMethod as payment_method,
                        journal_entry_id: journalEntryId,
                        accounting_status: 'DRAFT', // Will be POSTED when JE is posted
                        created_by: input.recordedBy
                    }
                });
                payments.push(payment);

                // Update installment
                const newAmountPaid = Number(installment.amount_paid) + amountToApply;
                const newBalance = Number(installment.amount_due) - newAmountPaid;
                const newStatus: installment_status = newBalance <= 0
                    ? 'PAID'
                    : newAmountPaid > 0
                        ? 'PARTIALLY_PAID'
                        : 'PENDING';

                await tx.revenue_installment_schedule.update({
                    where: { id: installmentId },
                    data: {
                        amount_paid: newAmountPaid,
                        balance: Math.max(0, newBalance),
                        status: newStatus,
                        updated_by: input.recordedBy,
                        updated_at: new Date()
                    }
                });
            }
        } else {
            // Simple single installment payment
            const installmentId = typeof input.scheduleItemId === 'string'
                ? parseInt(input.scheduleItemId)
                : input.scheduleItemId;

            const installment = await tx.revenue_installment_schedule.findUnique({
                where: { id: installmentId }
            });

            if (!installment) {
                throw new Error('Installment not found');
            }

            const currentBalance = Number(installment.balance);
            const amountToApply = Math.min(input.amountPaid, currentBalance);

            // Create payment record with JE link
            // BUSINESS RULE: Payment accounting_status = DRAFT
            // It becomes POSTED only when the linked JE is posted
            const payment = await tx.revenue_installment_payment.create({
                data: {
                    installment_id: installmentId,
                    revenue_id: input.revenueId,
                    amount_paid: amountToApply,
                    payment_date: new Date(input.paymentDate),
                    payment_method: input.paymentMethod as payment_method,
                    journal_entry_id: journalEntryId,
                    accounting_status: 'DRAFT', // Will be POSTED when JE is posted
                    created_by: input.recordedBy
                }
            });
            payments.push(payment);

            // Update installment
            const newAmountPaid = Number(installment.amount_paid) + amountToApply;
            const newBalance = Number(installment.amount_due) - newAmountPaid;
            const newStatus: installment_status = newBalance <= 0
                ? 'PAID'
                : newAmountPaid > 0
                    ? 'PARTIALLY_PAID'
                    : 'PENDING';

            await tx.revenue_installment_schedule.update({
                where: { id: installmentId },
                data: {
                    amount_paid: newAmountPaid,
                    balance: Math.max(0, newBalance),
                    status: newStatus,
                    updated_by: input.recordedBy,
                    updated_at: new Date()
                }
            });
        }

        // Update receivable status based on all installments
        const allInstallments = await tx.revenue_installment_schedule.findMany({
            where: { receivable_id: revenue.receivable!.id }
        });

        const allPaid = allInstallments.every(i => i.status === 'PAID');
        const somePaid = allInstallments.some(i => i.status === 'PAID' || i.status === 'PARTIALLY_PAID');

        let receivableStatus: payment_status = 'PENDING';
        if (allPaid) {
            receivableStatus = 'COMPLETED';
        } else if (somePaid) {
            receivableStatus = 'PARTIALLY_PAID';
        }

        await tx.receivable.update({
            where: { id: revenue.receivable!.id },
            data: {
                status: receivableStatus,
                updated_by: input.recordedBy,
                updated_at: new Date()
            }
        });

        // Update revenue remittance status
        await tx.revenue.update({
            where: { id: input.revenueId },
            data: {
                payment_status: receivableStatus,
                updated_by: input.recordedBy,
                updated_at: new Date()
            }
        });

        logger.info(`[OTHER_REVENUE] Recorded payment of ${input.amountPaid} for revenue ${revenue.code}`);

        return {
            payments,
            receivableStatus,
            message: `Successfully recorded payment of ${input.amountPaid}`
        };
    });

    return result;
}

// --------------------------
// SOFT DELETE
// --------------------------

/**
 * Soft delete an other revenue record
 * Only allowed for PENDING status records
 * Uses ARCHIVE action type for audit logging (soft delete)
 */
export async function softDeleteOtherRevenue(
    id: number, 
    deletedBy: string,
    deletionReason?: string,
    req?: Request
) {
    // Check if record exists and is deletable
    const existing = await prisma.revenue.findFirst({
        where: { id, is_deleted: false },
        include: { 
            receivable: true,
            revenue_type: true,
            department: true
        }
    });

    if (!existing) {
        throw new Error('Revenue record not found');
    }

    // Only allow deletion for PENDING approval status
    if (existing.approval_status !== 'PENDING') {
        throw new Error('Only records with PENDING approval status can be deleted');
    }

    // Check if journal entry exists and is NOT in DRAFT status - block delete if so
    // Journal Entry status is the single source of truth for delete restrictions
    if (existing.journal_entry_id) {
        const journalEntry = await prisma.journal_entry.findUnique({
            where: { id: existing.journal_entry_id },
            select: { status: true }
        });
        if (journalEntry && journalEntry.status !== 'DRAFT') {
            throw new Error('Cannot delete revenue record - journal entry is no longer in DRAFT status');
        }
    }

    // Use transaction to soft delete revenue and related receivable
    const result = await prisma.$transaction(async (tx) => {
        // Soft delete the revenue record
        await tx.revenue.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_by: deletedBy,
                deleted_at: new Date()
            }
        });

        // If there's a receivable, soft delete it and its schedule items
        if (existing.receivable) {
            await tx.receivable.update({
                where: { id: existing.receivable.id },
                data: {
                    is_deleted: true,
                    deleted_by: deletedBy,
                    deleted_at: new Date()
                }
            });

            // Soft delete all installment schedule items
            await tx.revenue_installment_schedule.updateMany({
                where: { receivable_id: existing.receivable.id },
                data: {
                    deleted_by: deletedBy,
                    deleted_at: new Date()
                }
            });
        }

        logger.info(`[OTHER_REVENUE] Soft deleted revenue ${existing.code} by ${deletedBy}`);

        return { id, code: existing.code };
    });

    // Log audit for soft delete (ARCHIVE action type)
    try {
        await AuditLogClient.logArchive(
            AuditEntityTypes.OTHER_REVENUE,
            { id: existing.id, code: existing.code },
            { id: deletedBy, name: deletedBy },
            {
                code: existing.code,
                revenue_type: (existing as any).revenue_type?.name || 'Unknown',
                department: (existing as any).department?.name || 'Unknown',
                amount: existing.amount?.toString() || '0',
                description: existing.description || '',
                reason: deletionReason || 'No reason provided'
            },
            req
        );
        logger.info(`[OTHER_REVENUE] Audit log created for soft delete of ${existing.code}`);
    } catch (auditError) {
        logger.error(`[OTHER_REVENUE] Failed to create audit log for soft delete:`, auditError);
        // Don't throw - audit failure shouldn't block the operation
    }

    return result;
}
