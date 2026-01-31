import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { expense_status, payment_method, payable_status, installment_status, Prisma } from '@prisma/client';
import { JournalEntryAutoService } from '../../../services/journalEntryAuto.service';
import { supplierSyncService } from '../../../services/supplierSync.service';

const router = Router();

// Apply authentication middleware
router.use(authenticate);

// Journal entry service for auto-generation on approval
const journalEntryService = new JournalEntryAutoService();

/**
 * Administrative (Other) Expense Routes
 * 
 * Module for managing administrative/other expenses that are NOT tied to
 * bus trips or rentals. Uses vendor and invoice_number fields.
 * 
 * Filter criteria: expense.vendor IS NOT NULL OR expense_type.code IN (EXPT-003 to EXPT-012)
 */

// Admin expense type codes (EXPT-003 to EXPT-012)
const ADMIN_EXPENSE_TYPE_CODES = [
    'EXPT-003', 'EXPT-004', 'EXPT-005', 'EXPT-006', 'EXPT-007',
    'EXPT-008', 'EXPT-009', 'EXPT-010', 'EXPT-011', 'EXPT-012'
];

// Expense type to COA account code mapping
const EXPENSE_TYPE_TO_COA: Record<string, string> = {
    'EXPT-003': '4200', // Bad Debt Expense
    'EXPT-004': '4205', // Office Supplies Expense
    'EXPT-005': '4210', // Utilities Expense
    'EXPT-006': '4215', // Rent Expense
    'EXPT-007': '4220', // Internet Expense
    'EXPT-008': '4225', // Professional Fees Expense
    'EXPT-009': '4230', // Insurance Expense
    'EXPT-010': '4235', // License & Permit Expense
    'EXPT-011': '4240', // Communication Expense
    'EXPT-012': '4245', // Miscellaneous Expense
};

// ===========================
// Reference Data Endpoints
// ===========================

/**
 * GET /expense-types
 * Returns administrative expense types for dropdown
 */
router.get('/expense-types', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expenseTypes = await prisma.expense_type.findMany({
            where: {
                is_deleted: false,
                code: { in: ADMIN_EXPENSE_TYPE_CODES },
            },
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
            },
            orderBy: { code: 'asc' },
        });

        res.json({
            success: true,
            data: expenseTypes,
        });
    } catch (error) {
        logger.error('Error fetching admin expense types:', error);
        next(error);
    }
});

/**
 * GET /payment-methods
 * Returns payment methods enum
 */
router.get('/payment-methods', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paymentMethods = [
            { id: 1, code: 'CASH', name: 'Cash' },
            { id: 2, code: 'BANK_TRANSFER', name: 'Bank Transfer' },
            { id: 3, code: 'E_WALLET', name: 'E-Wallet' },
            { id: 4, code: 'REIMBURSEMENT', name: 'Reimbursement' },
        ];

        res.json({
            success: true,
            data: paymentMethods,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /vendors
 * Returns unified vendor list for dropdown
 */
router.get('/vendors', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendors = await supplierSyncService.getVendorList();
        res.json({
            success: true,
            data: vendors,
        });
    } catch (error) {
        logger.error('Error fetching vendors:', error);
        next(error);
    }
});

// ===========================
// CRUD Operations
// ===========================

/**
 * GET /
 * List administrative expenses with pagination, search, and filters
 * Search/filter only on visible table columns: Date, Request Code, Vendor, Invoice #, Amount, Status
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            page = '1',
            limit = '10',
            search,
            date_from,
            date_to,
            status,
            amount_min,
            amount_max,
            sort_by = 'date_recorded',
            sort_order = 'desc',
        } = req.query;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Get admin expense type IDs
        const adminExpenseTypes = await prisma.expense_type.findMany({
            where: { code: { in: ADMIN_EXPENSE_TYPE_CODES }, is_deleted: false },
            select: { id: true },
        });
        const adminExpenseTypeIds = adminExpenseTypes.map(t => t.id);

        // Base where clause: admin expenses only (NOT tied to trips, OR has vendor)
        const where: any = {
            is_deleted: false,
            AND: [
                {
                    OR: [
                        // Has vendor_id (administrative expense)
                        { vendor_id: { not: null } },
                        // Admin expense type
                        { expense_type_id: { in: adminExpenseTypeIds } },
                    ],
                },
                // NOT operational (no trip links)
                { bus_trip_assignment_id: null },
                { rental_assignment_id: null },
            ],
        };

        // Search filter - only on visible table columns
        if (search) {
            const searchStr = String(search).toLowerCase();
            where.AND.push({
                OR: [
                    { code: { contains: searchStr, mode: 'insensitive' } },
                    { invoice_number: { contains: searchStr, mode: 'insensitive' } },
                    // Search in vendor relation
                    { vendor: { name: { contains: searchStr, mode: 'insensitive' } } },
                    { vendor: { supplier_local: { supplier_name: { contains: searchStr, mode: 'insensitive' } } } },
                ],
            });
        }

        // Date range filter
        if (date_from || date_to) {
            where.date_recorded = {};
            if (date_from) where.date_recorded.gte = new Date(date_from as string);
            if (date_to) {
                const endDate = new Date(date_to as string);
                endDate.setHours(23, 59, 59, 999);
                where.date_recorded.lte = endDate;
            }
        }

        // Status filter
        if (status) {
            const statuses = (status as string).split(',');
            where.status = { in: statuses };
        }

        // Amount range filter
        if (amount_min || amount_max) {
            where.amount = {};
            if (amount_min) where.amount.gte = parseFloat(amount_min as string);
            if (amount_max) where.amount.lte = parseFloat(amount_max as string);
        }

        // Sorting
        const orderBy: any = {};
        const sortField = sort_by as string;
        const sortDir = (sort_order as string).toLowerCase() === 'asc' ? 'asc' : 'desc';
        if (['date_recorded', 'code', 'vendor', 'amount', 'status', 'created_at'].includes(sortField)) {
            orderBy[sortField] = sortDir;
        } else {
            orderBy.date_recorded = 'desc';
        }

        // Get total count
        const total = await prisma.expense.count({ where });

        // Get expenses with relations
        const expenses = await prisma.expense.findMany({
            where,
            skip,
            take: limitNum,
            orderBy,
            include: {
                expense_type: {
                    select: { id: true, code: true, name: true },
                },
                vendor: {
                    include: { supplier_local: true },
                },
                payable: {
                    select: {
                        id: true,
                        code: true,
                        status: true,
                        total_amount: true,
                        paid_amount: true,
                        balance: true,
                    },
                },
                journal_entry: {
                    select: { id: true, code: true, status: true },
                },
            },
        });

        // Get summary counts
        const pendingCount = await prisma.expense.count({
            where: { ...where, status: 'PENDING' },
        });
        const approvedCount = await prisma.expense.count({
            where: { ...where, status: 'APPROVED' },
        });
        const totalAmount = await prisma.expense.aggregate({
            where,
            _sum: { amount: true },
        });

        // Transform to match frontend expectations
        const transformedExpenses = expenses.map((exp: any) => {
            // Derive vendor name from relation
            const vendorName = exp.vendor?.supplier_local?.supplier_name || exp.vendor?.name || null;
            const vendorCode = exp.vendor?.supplier_local?.supplier_id || exp.vendor?.code || null;

            return {
                id: exp.id,
                code: exp.code,
                expense_type_id: exp.expense_type_id,
                expense_type_name: exp.expense_type?.name,
                expense_type_code: exp.expense_type?.code,
                date_recorded: exp.date_recorded?.toISOString().split('T')[0] || null,
                amount: parseFloat(exp.amount?.toString() || '0'),
                description: exp.description,
                vendor_id: exp.vendor_id,
                vendor: vendorName,  // For backwards compatibility
                vendor_name: vendorName,
                vendor_code: vendorCode,
                invoice_number: exp.invoice_number,
                status: exp.status,
                payment_method: exp.payment_method,
                payment_reference: exp.payment_reference,

                // Payable info
                payable_id: exp.payable_id,
                paymentStatus: exp.payable?.status || (exp.status === 'APPROVED' ? 'PAID' : 'PENDING'),
                balance: exp.payable ? parseFloat(exp.payable.balance?.toString() || '0') : 0,

                // Journal entry
                journal_entry_id: exp.journal_entry_id,
                journal_entry_code: exp.journal_entry?.code,

                // Audit trail
                created_by: exp.created_by,
                created_at: exp.created_at?.toISOString(),
                updated_at: exp.updated_at?.toISOString(),
                approved_by: exp.approved_by,
                approved_at: exp.approved_at?.toISOString(),
            };
        });

        res.json({
            success: true,
            data: {
                expenses: transformedExpenses,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    total_pages: Math.ceil(total / limitNum),
                },
                summary: {
                    pending_count: pendingCount,
                    approved_count: approvedCount,
                    total_amount: parseFloat(totalAmount._sum.amount?.toString() || '0'),
                },
            },
        });
    } catch (error) {
        logger.error('Error fetching administrative expenses:', error);
        next(error);
    }
});

/**
 * GET /:id
 * Get single expense by ID with full details including payment schedule
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const expense = await prisma.expense.findFirst({
            where: {
                id: parseInt(id),
                is_deleted: false,
            },
            include: {
                expense_type: true,
                payable: {
                    include: {
                        installment_schedule: {
                            where: { is_deleted: false },
                            orderBy: { installment_number: 'asc' },
                            include: {
                                payments: {
                                    where: { is_deleted: false },
                                    orderBy: { payment_date: 'desc' },
                                },
                            },
                        },
                    },
                },
                journal_entry: {
                    include: {
                        lines: {
                            include: {
                                account: { select: { account_code: true, account_name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        // Transform schedule items for frontend
        const scheduleItems = expense.payable?.installment_schedule?.map(inst => ({
            id: inst.id,
            payable_id: inst.payable_id,
            installment_number: inst.installment_number,
            due_date: inst.due_date.toISOString().split('T')[0],
            amount_due: parseFloat(inst.amount_due.toString()),
            amount_paid: parseFloat(inst.amount_paid.toString()),
            balance: parseFloat(inst.balance.toString()),
            status: inst.status,
            isPastDue: new Date(inst.due_date) < new Date() && inst.status !== 'PAID',
            isEditable: inst.status === 'PENDING',
            payments: inst.payments.map(p => ({
                id: p.id,
                amount_paid: parseFloat(p.amount_paid.toString()),
                payment_date: p.payment_date.toISOString(),
                payment_method: p.payment_method,
                payment_reference: p.payment_reference,
            })),
        })) || [];

        res.json({
            success: true,
            data: {
                id: expense.id,
                code: expense.code,
                expense_type_id: expense.expense_type_id,
                expense_type_name: expense.expense_type?.name,
                expense_type_code: expense.expense_type?.code,
                date_recorded: expense.date_recorded?.toISOString().split('T')[0],
                amount: parseFloat(expense.amount?.toString() || '0'),
                description: expense.description,
                vendor: expense.vendor,
                invoice_number: expense.invoice_number,
                status: expense.status,
                payment_method: expense.payment_method,
                payment_reference: expense.payment_reference,

                // Payable info
                payable_id: expense.payable_id,
                paymentStatus: expense.payable?.status || 'PENDING',
                balance: expense.payable ? parseFloat(expense.payable.balance?.toString() || '0') : 0,
                frequency: expense.payable?.frequency,
                scheduleItems,

                // Journal entry
                journal_entry_id: expense.journal_entry_id,
                journal_entry_code: expense.journal_entry?.code,
                journal_entry_status: expense.journal_entry?.status,

                // Audit trail
                created_by: expense.created_by,
                created_at: expense.created_at?.toISOString(),
                updated_by: expense.updated_by,
                updated_at: expense.updated_at?.toISOString(),
                approved_by: expense.approved_by,
                approved_at: expense.approved_at?.toISOString(),
                rejected_by: expense.rejected_by,
                rejected_at: expense.rejected_at?.toISOString(),
                approval_remarks: expense.approval_remarks,
                rejection_remarks: expense.rejection_remarks,
            },
        });
    } catch (error) {
        logger.error('Error fetching expense:', error);
        next(error);
    }
});

/**
 * POST /
 * Create new administrative expense
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            expense_type_id,
            date_recorded,
            amount,
            description,
            vendor_id,  // Changed from vendor string to vendor_id FK
            invoice_number,
            payment_method: paymentMethodInput,
            payment_reference,
            // Payable/schedule fields
            enable_schedule,
            frequency,
            number_of_payments,
            schedule_start_date,
        } = req.body;

        const userId = req.user?.sub || 'system';

        // Validate required fields
        if (!expense_type_id || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: expense_type_id, amount',
            });
        }

        // Validate expense type is administrative
        const expenseType = await prisma.expense_type.findFirst({
            where: { id: expense_type_id, is_deleted: false },
        });

        if (!expenseType) {
            return res.status(400).json({
                success: false,
                message: 'Invalid expense type',
            });
        }

        // Generate expense code in format ADM-XXXXXX
        const lastExpense = await prisma.expense.findFirst({
            where: { code: { startsWith: 'ADM-' } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });
        const nextNum = lastExpense
            ? parseInt(lastExpense.code.replace('ADM-', '')) + 1
            : 1;
        const expenseCode = `ADM-${nextNum.toString().padStart(6, '0')}`;

        // Determine payment method
        const paymentMethod: payment_method = paymentMethodInput as payment_method || 'CASH';

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // Get vendor name for payable (if schedule enabled)
            let vendorName = 'Unknown Vendor';
            if (vendor_id) {
                const vendorRecord = await tx.vendor.findUnique({
                    where: { id: vendor_id },
                    include: { supplier_local: true },
                });
                if (vendorRecord) {
                    vendorName = vendorRecord.supplier_local?.supplier_name || vendorRecord.name || 'Unknown Vendor';
                }
            }

            // Create payable if schedule is enabled
            let payableId: number | null = null;
            if (enable_schedule && frequency && number_of_payments && number_of_payments > 1) {
                const payable = await tx.payable.create({
                    data: {
                        code: `PAY-${expenseCode}`,
                        creditor_name: vendorName,
                        description: `Payment schedule for ${expenseCode}`,
                        total_amount: amount,
                        balance: amount,
                        status: 'PENDING',
                        created_by: userId,
                    },
                });
                payableId = payable.id;

                // Create installment schedule
                const installmentAmount = parseFloat((amount / number_of_payments).toFixed(2));
                const startDate = schedule_start_date ? new Date(schedule_start_date) : new Date();

                for (let i = 0; i < number_of_payments; i++) {
                    const dueDate = new Date(startDate);

                    // Calculate due date based on frequency
                    switch (frequency) {
                        case 'WEEKLY':
                            dueDate.setDate(dueDate.getDate() + (i * 7));
                            break;
                        case 'BIWEEKLY':
                            dueDate.setDate(dueDate.getDate() + (i * 14));
                            break;
                        case 'MONTHLY':
                            dueDate.setMonth(dueDate.getMonth() + i);
                            break;
                        case 'DAILY':
                        default:
                            dueDate.setDate(dueDate.getDate() + i);
                            break;
                    }

                    await tx.expense_installment_schedule.create({
                        data: {
                            payable_id: payable.id,
                            installment_number: i + 1,
                            due_date: dueDate,
                            amount_due: installmentAmount,
                            amount_paid: 0,
                            balance: installmentAmount,
                            status: 'PENDING',
                            created_by: userId,
                        },
                    });
                }
            }

            // Create expense
            const expense = await tx.expense.create({
                data: {
                    code: expenseCode,
                    expense_type_id,
                    amount,
                    date_recorded: date_recorded ? new Date(date_recorded) : new Date(),
                    description,
                    vendor_id: vendor_id || null,
                    invoice_number,
                    status: 'PENDING',
                    payment_method: paymentMethod,
                    payment_reference,
                    payable_id: payableId,
                    created_by: userId,
                },
                include: {
                    expense_type: true,
                    vendor: { include: { supplier_local: true } },
                    payable: true,
                },
            });

            return expense;
        });

        res.status(201).json({
            success: true,
            message: 'Administrative expense created successfully',
            data: {
                id: result.id,
                code: result.code,
                expense_type_name: result.expense_type?.name,
                amount: parseFloat(result.amount.toString()),
                status: result.status,
                payable_id: result.payable_id,
            },
        });
    } catch (error) {
        logger.error('Error creating administrative expense:', error);
        next(error);
    }
});

/**
 * PUT /:id
 * Update expense (only allowed for PENDING status)
 */
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user?.sub || 'system';

        // Check if expense exists and is editable
        const existing = await prisma.expense.findFirst({
            where: { id: parseInt(id), is_deleted: false },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        if (existing.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only PENDING expenses can be edited',
            });
        }

        const {
            expense_type_id,
            date_recorded,
            amount,
            description,
            vendor_id,  // Changed from vendor string to vendor_id FK
            invoice_number,
            payment_method: paymentMethodInput,
            payment_reference,
        } = req.body;

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                expense_type_id: expense_type_id || undefined,
                date_recorded: date_recorded ? new Date(date_recorded) : undefined,
                amount: amount !== undefined ? amount : undefined,
                description: description !== undefined ? description : undefined,
                vendor_id: vendor_id !== undefined ? vendor_id : undefined,
                invoice_number: invoice_number !== undefined ? invoice_number : undefined,
                payment_method: paymentMethodInput || undefined,
                payment_reference: payment_reference !== undefined ? payment_reference : undefined,
                updated_by: userId,
            },
            include: {
                expense_type: true,
                vendor: { include: { supplier_local: true } },
            },
        });

        res.json({
            success: true,
            message: 'Expense updated successfully',
            data: {
                id: expense.id,
                code: expense.code,
            },
        });
    } catch (error) {
        logger.error('Error updating expense:', error);
        next(error);
    }
});

/**
 * PATCH /:id/soft-delete
 * Soft delete expense (only PENDING status)
 */
router.patch('/:id/soft-delete', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.sub || 'system';

        const existing = await prisma.expense.findFirst({
            where: { id: parseInt(id), is_deleted: false },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        if (existing.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only PENDING expenses can be deleted',
            });
        }

        await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                is_deleted: true,
                deleted_by: userId,
                deleted_at: new Date(),
                deletion_remarks: reason || null,
            },
        });

        res.json({
            success: true,
            message: 'Expense deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting expense:', error);
        next(error);
    }
});

/**
 * POST /:id/approve
 * Approve expense and create journal entry
 * Journal Entry:
 *   Debit: Expense account (determined by expense_type)
 *   Credit: Cash/Bank/Payable (based on payment_method)
 */
router.post('/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const userId = req.user?.sub || 'system';

        const existing = await prisma.expense.findFirst({
            where: { id: parseInt(id), is_deleted: false },
            include: { expense_type: true },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        if (existing.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only PENDING expenses can be approved',
            });
        }

        // Determine accounts for journal entry
        const expenseTypeCode = existing.expense_type?.code || 'EXPT-012';
        const debitAccountCode = EXPENSE_TYPE_TO_COA[expenseTypeCode] || '4245'; // Default to Miscellaneous

        // Credit account based on payment method
        let creditAccountCode: string;
        switch (existing.payment_method) {
            case 'BANK_TRANSFER':
                creditAccountCode = '1005'; // Bank Account
                break;
            case 'E_WALLET':
                creditAccountCode = '1010'; // E-Wallet
                break;
            case 'REIMBURSEMENT':
                creditAccountCode = '2010'; // Accounts Payable - Employees
                break;
            case 'CASH':
            default:
                creditAccountCode = '1000'; // Cash on Hand
                break;
        }

        // Get account IDs
        const debitAccount = await prisma.chart_of_account.findFirst({
            where: { account_code: debitAccountCode, is_deleted: false },
        });
        const creditAccount = await prisma.chart_of_account.findFirst({
            where: { account_code: creditAccountCode, is_deleted: false },
        });

        if (!debitAccount || !creditAccount) {
            return res.status(400).json({
                success: false,
                message: 'Required chart of accounts not found. Please run the seeder.',
            });
        }

        // Create journal entry and update expense in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Generate JE code using ID-based sequencing
            const lastJE = await tx.journal_entry.findFirst({
                orderBy: { id: 'desc' },
                select: { id: true },
            });
            const nextJENum = (lastJE?.id || 0) + 1;
            const jeCode = `JE-${nextJENum.toString().padStart(6, '0')}`;

            // Create journal entry
            const journalEntry = await tx.journal_entry.create({
                data: {
                    code: jeCode,
                    date: existing.date_recorded || new Date(),
                    reference: existing.code,
                    description: `Admin expense: ${existing.description || existing.expense_type?.name || 'Administrative Expense'}`,
                    total_debit: existing.amount,
                    total_credit: existing.amount,
                    status: 'DRAFT',
                    entry_type: 'AUTO_GENERATED',
                    created_by: userId,
                },
            });


            // Create journal entry lines
            await tx.journal_entry_line.createMany({
                data: [
                    {
                        journal_entry_id: journalEntry.id,
                        account_id: debitAccount.id,
                        debit: existing.amount,
                        credit: 0,
                        description: `Expense: ${existing.expense_type?.name}`,
                        line_number: 1,
                        created_by: userId,
                    },
                    {
                        journal_entry_id: journalEntry.id,
                        account_id: creditAccount.id,
                        debit: 0,
                        credit: existing.amount,
                        description: `Payment for ${existing.code}`,
                        line_number: 2,
                        created_by: userId,
                    },
                ],
            });

            // Update expense
            const expense = await tx.expense.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'APPROVED',
                    approved_by: userId,
                    approved_at: new Date(),
                    approval_remarks: remarks || null,
                    journal_entry_id: journalEntry.id,
                    updated_by: userId,
                },
                include: {
                    expense_type: true,
                    journal_entry: true,
                },
            });

            return { expense, journalEntry };
        });

        res.json({
            success: true,
            message: 'Expense approved and journal entry created',
            data: {
                id: result.expense.id,
                code: result.expense.code,
                status: result.expense.status,
                journal_entry: {
                    id: result.journalEntry.id,
                    code: result.journalEntry.code,
                    status: result.journalEntry.status,
                },
            },
        });
    } catch (error) {
        logger.error('Error approving expense:', error);
        next(error);
    }
});

/**
 * POST /:id/reject
 * Reject expense with reason
 */
router.post('/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.sub || 'system';

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required',
            });
        }

        const existing = await prisma.expense.findFirst({
            where: { id: parseInt(id), is_deleted: false },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        if (existing.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Only PENDING expenses can be rejected',
            });
        }

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                status: 'REJECTED',
                rejected_by: userId,
                rejected_at: new Date(),
                rejection_remarks: reason,
                updated_by: userId,
            },
        });

        res.json({
            success: true,
            message: 'Expense rejected',
            data: {
                id: expense.id,
                code: expense.code,
                status: expense.status,
            },
        });
    } catch (error) {
        logger.error('Error rejecting expense:', error);
        next(error);
    }
});

/**
 * POST /payment
 * Record a payment for an expense installment schedule
 */
router.post('/payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            expenseId,
            scheduleItemId,
            scheduleItemIds,
            amountPaid,
            paymentDate,
            paymentMethod,
            cascadeBreakdown,
        } = req.body;

        const userId = req.user?.sub || 'system';

        // Validate required fields
        if (!expenseId || !amountPaid) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: expenseId, amountPaid',
            });
        }

        // Validate expense exists and has payable
        const expense = await prisma.expense.findFirst({
            where: { id: expenseId, is_deleted: false },
            include: {
                expense_type: true,
                payable: {
                    include: {
                        installment_schedule: {
                            orderBy: { installment_number: 'asc' },
                        },
                    },
                },
            },
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found',
            });
        }

        if (!expense.payable) {
            return res.status(400).json({
                success: false,
                message: 'Expense does not have a payment schedule',
            });
        }

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            const payments: any[] = [];
            let remainingAmount = amountPaid;

            // Process cascade breakdown if provided
            if (cascadeBreakdown && cascadeBreakdown.length > 0) {
                for (const breakdown of cascadeBreakdown) {
                    const installmentId = typeof breakdown.scheduleItemId === 'string'
                        ? parseInt(breakdown.scheduleItemId)
                        : breakdown.scheduleItemId;

                    const installment = await tx.expense_installment_schedule.findUnique({
                        where: { id: installmentId },
                    });

                    if (!installment) {
                        logger.warn(`[OTHER_EXPENSE] Installment ${installmentId} not found, skipping`);
                        continue;
                    }

                    const currentBalance = Number(installment.balance);
                    const amountToApply = Math.min(breakdown.amountApplied, currentBalance);

                    if (amountToApply <= 0) continue;

                    // Create payment record
                    const payment = await tx.expense_installment_payment.create({
                        data: {
                            installment_id: installmentId,
                            expense_id: expenseId,
                            amount_paid: amountToApply,
                            payment_date: new Date(paymentDate || new Date()),
                            payment_method: paymentMethod as payment_method || 'CASH',
                            created_by: userId,
                        },
                    });
                    payments.push(payment);

                    // Update installment
                    const newAmountPaid = Number(installment.amount_paid) + amountToApply;
                    const newBalance = Number(installment.amount_due) - newAmountPaid;
                    const newStatus = newBalance <= 0
                        ? 'PAID'
                        : newAmountPaid > 0
                            ? 'PARTIALLY_PAID'
                            : 'PENDING';

                    await tx.expense_installment_schedule.update({
                        where: { id: installmentId },
                        data: {
                            amount_paid: newAmountPaid,
                            balance: Math.max(0, newBalance),
                            status: newStatus,
                            updated_by: userId,
                            updated_at: new Date(),
                        },
                    });
                }
            } else {
                // Simple single installment payment
                const installmentId = typeof scheduleItemId === 'string'
                    ? parseInt(scheduleItemId)
                    : scheduleItemId;

                const installment = await tx.expense_installment_schedule.findUnique({
                    where: { id: installmentId },
                });

                if (!installment) {
                    throw new Error('Installment not found');
                }

                const currentBalance = Number(installment.balance);
                const amountToApply = Math.min(amountPaid, currentBalance);

                // Create payment record
                const payment = await tx.expense_installment_payment.create({
                    data: {
                        installment_id: installmentId,
                        expense_id: expenseId,
                        amount_paid: amountToApply,
                        payment_date: new Date(paymentDate || new Date()),
                        payment_method: paymentMethod as payment_method || 'CASH',
                        created_by: userId,
                    },
                });
                payments.push(payment);

                // Update installment
                const newAmountPaid = Number(installment.amount_paid) + amountToApply;
                const newBalance = Number(installment.amount_due) - newAmountPaid;
                const newStatus = newBalance <= 0
                    ? 'PAID'
                    : newAmountPaid > 0
                        ? 'PARTIALLY_PAID'
                        : 'PENDING';

                await tx.expense_installment_schedule.update({
                    where: { id: installmentId },
                    data: {
                        amount_paid: newAmountPaid,
                        balance: Math.max(0, newBalance),
                        status: newStatus,
                        updated_by: userId,
                        updated_at: new Date(),
                    },
                });
            }

            // Update payable status based on all installments
            const allInstallments = await tx.expense_installment_schedule.findMany({
                where: { payable_id: expense.payable!.id },
            });

            const totalPaid = allInstallments.reduce((sum, i) => sum + Number(i.amount_paid), 0);
            const totalDue = allInstallments.reduce((sum, i) => sum + Number(i.amount_due), 0);
            const allPaid = allInstallments.every(i => i.status === 'PAID');
            const somePaid = allInstallments.some(i => i.status === 'PAID' || i.status === 'PARTIALLY_PAID');

            let payableStatusValue: payable_status = 'PENDING';
            if (allPaid) {
                payableStatusValue = 'PAID';
            } else if (somePaid) {
                payableStatusValue = 'PARTIALLY_PAID';
            }

            await tx.payable.update({
                where: { id: expense.payable!.id },
                data: {
                    status: payableStatusValue,
                    paid_amount: totalPaid,
                    balance: Math.max(0, totalDue - totalPaid),
                    last_payment_date: new Date(paymentDate || new Date()),

                    last_payment_amount: amountPaid,
                    updated_by: userId,
                    updated_at: new Date(),
                },
            });

            logger.info(`[OTHER_EXPENSE] Recorded payment of ${amountPaid} for expense ${expense.code}`);

            return {
                payments,
                payableStatus: payableStatusValue,

                totalPaid,
                totalDue,
                balance: Math.max(0, totalDue - totalPaid),
            };
        });

        res.json({
            success: true,
            message: `Payment of ${amountPaid} recorded successfully`,
            data: result,
        });
    } catch (error: any) {
        logger.error('Error recording expense payment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record payment',
        });
    }
});

export default router;
