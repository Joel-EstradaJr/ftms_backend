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
import { Prisma, payment_method, receivable_frequency, receivable_status, installment_status } from '@prisma/client';

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
    sortBy?: 'date_recorded' | 'amount' | 'created_at';
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
 * Generates a unique revenue code
 */
function generateRevenueCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REV-OTH-${timestamp}-${random}`.toUpperCase();
}

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
        const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'WRITTEN_OFF'];

        // Check if search matches or partially matches a valid status
        const matchedStatus = validStatuses.find(s =>
            s.includes(normalizedSearch) || normalizedSearch.includes(s)
        );

        if (matchedStatus) {
            searchConditions.push({ remittance_status: matchedStatus as receivable_status });
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
        // Normalize status: "Partially Paid" -> "PARTIALLY_PAID"
        const normalizedStatus = status.trim().toUpperCase().replace(/\s+/g, '_');
        where.remittance_status = normalizedStatus as receivable_status;
    }

    // Execute query
    const [records, totalCount] = await Promise.all([
        prisma.revenue.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
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
                            },
                            orderBy: { due_date: 'asc' }
                        }
                    }
                },
                journal_entry: {
                    select: {
                        id: true,
                        code: true,
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
            remittance_status: r.remittance_status,
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
                    status: s.status
                }))
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
            by: ['remittance_status'],
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
        remittance_status: record.remittance_status,
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
    const code = generateRevenueCode();
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
            const receivable = await tx.receivable.create({
                data: {
                    code: `RCV-${code}`,
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
                    case 'WEEKLY':
                        scheduleDate.setDate(startDate.getDate() + (i * 7));
                        break;
                    case 'MONTHLY':
                        scheduleDate.setMonth(startDate.getMonth() + i);
                        break;
                    case 'QUARTERLY':
                        scheduleDate.setMonth(startDate.getMonth() + (i * 3));
                        break;
                    default:
                        scheduleDate.setDate(startDate.getDate() + (i * 7));
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
                remittance_status: input.isUnearnedRevenue ? 'PENDING' : 'PAID',
                created_by: input.created_by
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

        logger.info(`[OTHER_REVENUE] Created revenue ${code} for type ${revenueType.name}`);

        return revenue;
    });

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
    if (existing.remittance_status !== 'PENDING') {
        throw new Error('Only records with PENDING status can be edited');
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

    logger.info(`[OTHER_REVENUE] Updated revenue ${updated.code}`);

    return updated;
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

    if (!revenue.receivable) {
        throw new Error('Revenue record does not have a receivable schedule');
    }

    // Use transaction for atomicity
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

                // Create payment record
                const payment = await tx.revenue_installment_payment.create({
                    data: {
                        installment_id: installmentId,
                        revenue_id: input.revenueId,
                        amount_paid: amountToApply,
                        payment_date: new Date(input.paymentDate),
                        payment_method: input.paymentMethod as payment_method,
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

            // Create payment record
            const payment = await tx.revenue_installment_payment.create({
                data: {
                    installment_id: installmentId,
                    revenue_id: input.revenueId,
                    amount_paid: amountToApply,
                    payment_date: new Date(input.paymentDate),
                    payment_method: input.paymentMethod as payment_method,
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

        let receivableStatus: receivable_status = 'PENDING';
        if (allPaid) {
            receivableStatus = 'PAID';
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
                remittance_status: receivableStatus,
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
 */
export async function softDeleteOtherRevenue(id: number, deletedBy: string) {
    // Check if record exists and is deletable
    const existing = await prisma.revenue.findFirst({
        where: { id, is_deleted: false },
        include: { receivable: true }
    });

    if (!existing) {
        throw new Error('Revenue record not found');
    }

    // Only allow deletion for PENDING status
    if (existing.remittance_status !== 'PENDING') {
        throw new Error('Only records with PENDING status can be deleted');
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

    return result;
}
