// ============================================================================
// OPERATIONAL TRIP EXPENSE SERVICE
// Core business logic for managing operational trip expenses
// ============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { employeeService } from './employee.service';
import { Prisma } from '@prisma/client';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExpenseListFilters {
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    is_reimbursable?: boolean;
    status?: string[];
    search?: string;
    expense_name?: string;
    body_number?: string;
    trip_type?: 'operational' | 'rental' | 'all';
    sort_by?: 'date_recorded' | 'amount' | 'status';
    sort_order?: 'asc' | 'desc';
}

export interface CreateExpenseDTO {
    expense_information: {
        expense_type_id: number;
        date_recorded: string;
        amount: number;
        payment_method: 'CASH' | 'BANK_TRANSFER' | 'ONLINE';
    };
    trip_assignment?: {
        trip_type?: 'operational' | 'rental';
        operational_trip_assignment_id?: string;
        operational_trip_bus_trip_id?: string;
        rental_trip_assignment_id?: string;
    };
    accounting_details?: {
        account_id?: number;
    };
    is_reimbursable: boolean;
    reimbursable_details?: {
        employee_number: string;
        employee_name: string;
        due_date?: string;
    };
    remarks?: string;
}

export interface UpdateExpenseDTO extends Partial<CreateExpenseDTO> { }

export interface ExpenseSummary {
    pending_count: number;
    approved_count: number;
    total_approved_amount: number;
    date_from?: string;
    date_to?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class OperationalTripExpenseService {
    // --------------------------------------------------------------------------
    // CODE GENERATION
    // --------------------------------------------------------------------------

    /**
     * Generate unique expense code in format EXP-YYYY-NNNN
     */
    async generateExpenseCode(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `EXP-${year}-`;

        // Find the last expense code for this year
        const lastExpense = await prisma.expense.findFirst({
            where: {
                code: { startsWith: prefix },
            },
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

    /**
     * Generate unique payable code in format PAY-YYYY-NNNN
     */
    async generatePayableCode(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `PAY-${year}-`;

        const lastPayable = await prisma.payable.findFirst({
            where: {
                code: { startsWith: prefix },
            },
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let nextNumber = 1;
        if (lastPayable?.code) {
            const lastNumber = parseInt(lastPayable.code.split('-')[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    // --------------------------------------------------------------------------
    // LIST EXPENSES
    // --------------------------------------------------------------------------

    /**
     * List expenses with filters, search, and pagination
     */
    async listExpenses(
        filters: ExpenseListFilters,
        page: number = 1,
        limit: number = 10
    ) {
        const skip = (page - 1) * limit;
        const effectiveLimit = Math.min(limit, 100);

        // Build where clause
        const where: Prisma.expenseWhereInput = {
            is_deleted: false,
        };

        // Date range filter
        if (filters.date_from || filters.date_to) {
            where.date_recorded = {};
            if (filters.date_from) {
                where.date_recorded.gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                where.date_recorded.lte = new Date(filters.date_to);
            }
        }

        // Amount range filter
        if (filters.amount_min !== undefined || filters.amount_max !== undefined) {
            where.amount = {};
            if (filters.amount_min !== undefined) {
                where.amount.gte = filters.amount_min;
            }
            if (filters.amount_max !== undefined) {
                where.amount.lte = filters.amount_max;
            }
        }

        // Status filter
        if (filters.status && filters.status.length > 0) {
            where.status = { in: filters.status as any };
        }

        // Reimbursable filter
        if (filters.is_reimbursable !== undefined) {
            if (filters.is_reimbursable) {
                where.payable_id = { not: null };
            } else {
                where.payable_id = null;
            }
        }

        // Trip type filter
        if (filters.trip_type === 'operational') {
            where.operational_trip_assignment_id = { not: null };
        } else if (filters.trip_type === 'rental') {
            where.rental_trip_assignment_id = { not: null };
        }

        // Build order by
        const orderBy: Prisma.expenseOrderByWithRelationInput[] = [];
        if (filters.sort_by) {
            const order = filters.sort_order === 'asc' ? 'asc' : 'desc';
            orderBy.push({ [filters.sort_by]: order });
        } else {
            orderBy.push({ date_recorded: 'desc' });
            orderBy.push({ created_at: 'desc' });
        }

        // Execute query
        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                skip,
                take: effectiveLimit,
                orderBy,
                include: {
                    expense_type: true,
                    operational_trip: true,
                    rental_trip: true,
                    payable: true,
                },
            }),
            prisma.expense.count({ where }),
        ]);

        // Apply search filter (post-query for complex joins)
        let filteredExpenses = expenses;
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredExpenses = expenses.filter((e) => {
                const expenseName = e.expense_type?.name?.toLowerCase() || '';
                const bodyNumber = e.operational_trip?.body_number?.toLowerCase() ||
                    e.rental_trip?.body_number?.toLowerCase() || '';
                const code = e.code.toLowerCase();
                return expenseName.includes(searchLower) ||
                    bodyNumber.includes(searchLower) ||
                    code.includes(searchLower);
            });
        }

        if (filters.expense_name) {
            const searchLower = filters.expense_name.toLowerCase();
            filteredExpenses = filteredExpenses.filter((e) =>
                e.expense_type?.name?.toLowerCase().includes(searchLower)
            );
        }

        if (filters.body_number) {
            const searchLower = filters.body_number.toLowerCase();
            filteredExpenses = filteredExpenses.filter((e) => {
                const bodyNumber = e.operational_trip?.body_number?.toLowerCase() ||
                    e.rental_trip?.body_number?.toLowerCase() || '';
                return bodyNumber.includes(searchLower);
            });
        }

        // Format response
        const formattedExpenses = filteredExpenses.map((e) => ({
            id: e.id,
            code: e.code,
            date_recorded: e.date_recorded,
            expense_name: e.expense_type?.name,
            expense_type_id: e.expense_type_id,
            body_number: e.operational_trip?.body_number || e.rental_trip?.body_number || null,
            amount: parseFloat(e.amount.toString()),
            is_reimbursable: e.payable_id !== null,
            status: e.status,
            payment_method: e.payment_method,
            trip_type: e.operational_trip_assignment_id ? 'operational' :
                e.rental_trip_assignment_id ? 'rental' : null,
            operational_trip: e.operational_trip ? {
                assignment_id: e.operational_trip.assignment_id,
                bus_trip_id: e.operational_trip.bus_trip_id,
                bus_plate_number: e.operational_trip.bus_plate_number,
                bus_type: e.operational_trip.bus_type,
                bus_route: e.operational_trip.bus_route,
                body_number: e.operational_trip.body_number,
                date_assigned: e.operational_trip.date_assigned,
            } : null,
            rental_trip: e.rental_trip ? {
                assignment_id: e.rental_trip.assignment_id,
                bus_plate_number: e.rental_trip.bus_plate_number,
                bus_type: e.rental_trip.bus_type,
                rental_destination: e.rental_trip.rental_destination,
                body_number: e.rental_trip.body_number,
                rental_start_date: e.rental_trip.rental_start_date,
                rental_end_date: e.rental_trip.rental_end_date,
            } : null,
            payable: e.payable ? {
                id: e.payable.id,
                code: e.payable.code,
                creditor_name: e.payable.creditor_name,
                status: e.payable.status,
            } : null,
            created_by: e.created_by,
            created_at: e.created_at,
            approved_by: e.approved_by,
            approved_at: e.approved_at,
        }));

        // Get summary stats
        const summary = await this.getExpenseSummary(filters);

        return {
            expenses: formattedExpenses,
            pagination: {
                total,
                page,
                limit: effectiveLimit,
                total_pages: Math.ceil(total / effectiveLimit),
            },
            summary,
        };
    }

    // --------------------------------------------------------------------------
    // GET SINGLE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * Get expense by ID with full details
     */
    async getExpenseById(id: number) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                expense_type: true,
                operational_trip: true,
                rental_trip: true,
                payable: true,
                journal_entry: {
                    include: {
                        lines: {
                            include: {
                                account: {
                                    include: {
                                        account_type: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.is_deleted) {
            throw new NotFoundError(`Expense with ID ${id} has been deleted`);
        }

        // Get employee details if reimbursable
        let employeeDetails = null;
        if (expense.payable?.employee_reference) {
            const empResult = await employeeService.getEmployeeByNumber(expense.payable.employee_reference);
            if (empResult.success && empResult.data) {
                employeeDetails = {
                    employee_number: empResult.data.employeeNumber,
                    full_name: employeeService.formatEmployeeName(empResult.data, 'full'),
                    formal_name: employeeService.formatEmployeeName(empResult.data, 'formal'),
                    position: empResult.data.position,
                    department: empResult.data.department,
                    phone: empResult.data.phone,
                };
            }
        }

        // Get accounting details from journal entry
        let accountingDetails = null;
        if (expense.journal_entry?.lines?.length) {
            const debitLine = expense.journal_entry.lines.find((l) => parseFloat(l.debit.toString()) > 0);
            if (debitLine) {
                accountingDetails = {
                    account_code: debitLine.account.account_code,
                    account_name: debitLine.account.account_name,
                    account_id: debitLine.account.id,
                    journal_entry_id: expense.journal_entry.id,
                    is_reimbursable: expense.payable_id !== null,
                };
            }
        }

        // Determine trip details
        const tripAssignment = expense.operational_trip ? {
            trip_type: 'operational' as const,
            assignment_id: expense.operational_trip.assignment_id,
            bus_trip_id: expense.operational_trip.bus_trip_id,
            date_assigned: expense.operational_trip.date_assigned,
            body_number: expense.operational_trip.body_number,
            bus_type: expense.operational_trip.bus_type,
            bus_route: expense.operational_trip.bus_route,
            plate_number: expense.operational_trip.bus_plate_number,
        } : expense.rental_trip ? {
            trip_type: 'rental' as const,
            assignment_id: expense.rental_trip.assignment_id,
            bus_trip_id: null,
            date_assigned: expense.rental_trip.rental_start_date,
            body_number: expense.rental_trip.body_number,
            bus_type: expense.rental_trip.bus_type,
            bus_route: expense.rental_trip.rental_destination,
            plate_number: expense.rental_trip.bus_plate_number,
            rental_status: expense.rental_trip.rental_status,
            rental_start_date: expense.rental_trip.rental_start_date,
            rental_end_date: expense.rental_trip.rental_end_date,
            total_rental_amount: expense.rental_trip.total_rental_amount,
        } : null;

        // Format reimbursable details
        const reimbursableDetails = expense.payable ? {
            payable_id: expense.payable.id,
            payable_code: expense.payable.code,
            employee: employeeDetails,
            total_amount: parseFloat(expense.payable.total_amount.toString()),
            balance: parseFloat(expense.payable.balance.toString()),
            status: expense.payable.status,
        } : null;

        return {
            id: expense.id,
            code: expense.code,
            expense_information: {
                expense_code: expense.code,
                date_recorded: expense.date_recorded,
                expense_name: expense.expense_type?.name,
                expense_type_id: expense.expense_type_id,
                amount: parseFloat(expense.amount.toString()),
                payment_method: expense.payment_method,
            },
            trip_assignment_details: tripAssignment,
            accounting_details: accountingDetails,
            reimbursable_details: reimbursableDetails,
            additional_information: {
                remarks: expense.description,
            },
            audit_trail: {
                requested_by: expense.created_by,
                requested_on: expense.created_at,
                approved_by: expense.approved_by,
                approved_on: expense.approved_at,
            },
            status: expense.status,
        };
    }

    // --------------------------------------------------------------------------
    // CREATE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * Create new operational trip expense
     */
    async createExpense(data: CreateExpenseDTO, userId: string, userInfo?: any, req?: any) {
        // Validate expense type exists
        const expenseType = await prisma.expense_type.findUnique({
            where: { id: data.expense_information.expense_type_id },
        });

        if (!expenseType) {
            throw new ValidationError(`Expense type with ID ${data.expense_information.expense_type_id} not found`);
        }

        // Validate trip assignment if provided
        if (data.trip_assignment) {
            if (data.trip_assignment.trip_type === 'operational' &&
                data.trip_assignment.operational_trip_assignment_id) {
                const trip = await prisma.operational_trip.findUnique({
                    where: {
                        assignment_id_bus_trip_id: {
                            assignment_id: data.trip_assignment.operational_trip_assignment_id,
                            bus_trip_id: data.trip_assignment.operational_trip_bus_trip_id || '',
                        },
                    },
                });
                if (!trip) {
                    throw new ValidationError('Operational trip not found');
                }
            } else if (data.trip_assignment.trip_type === 'rental' &&
                data.trip_assignment.rental_trip_assignment_id) {
                const trip = await prisma.rental_trip.findUnique({
                    where: { assignment_id: data.trip_assignment.rental_trip_assignment_id },
                });
                if (!trip) {
                    throw new ValidationError('Rental trip not found');
                }
            }
        }

        // Generate expense code
        const expenseCode = await this.generateExpenseCode();

        // Handle reimbursable expense - create payable
        let payableId: number | null = null;
        if (data.is_reimbursable && data.reimbursable_details) {
            // Validate employee exists
            const empResult = await employeeService.getEmployeeByNumber(data.reimbursable_details.employee_number);
            if (!empResult.success || !empResult.data) {
                throw new ValidationError(`Employee ${data.reimbursable_details.employee_number} not found`);
            }

            const payableCode = await this.generatePayableCode();
            const creditorName = employeeService.formatCreditorName(empResult.data);

            const payable = await prisma.payable.create({
                data: {
                    code: payableCode,
                    creditor_name: creditorName,
                    employee_reference: data.reimbursable_details.employee_number,
                    description: `Reimbursement for expense ${expenseCode}`,
                    total_amount: data.expense_information.amount,
                    balance: data.expense_information.amount,
                    due_date: data.reimbursable_details.due_date
                        ? new Date(data.reimbursable_details.due_date)
                        : null,
                    status: 'PENDING',
                    created_by: userId,
                },
            });
            payableId = payable.id;
        }

        // Create expense
        const expense = await prisma.expense.create({
            data: {
                code: expenseCode,
                expense_type_id: data.expense_information.expense_type_id,
                amount: data.expense_information.amount,
                date_recorded: new Date(data.expense_information.date_recorded),
                payment_method: data.expense_information.payment_method,
                description: data.remarks,
                status: 'PENDING',
                operational_trip_assignment_id: data.trip_assignment?.trip_type === 'operational'
                    ? data.trip_assignment.operational_trip_assignment_id
                    : null,
                operational_trip_bus_trip_id: data.trip_assignment?.trip_type === 'operational'
                    ? data.trip_assignment.operational_trip_bus_trip_id
                    : null,
                rental_trip_assignment_id: data.trip_assignment?.trip_type === 'rental'
                    ? data.trip_assignment.rental_trip_assignment_id
                    : null,
                payable_id: payableId,
                created_by: userId,
            },
            include: {
                expense_type: true,
            },
        });

        // Audit log
        try {
            await AuditLogClient.logCreate(
                'Operational Trip Expense',
                { id: expense.id, code: expense.code },
                expense,
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense created: ${expense.code} by ${userId}`);

        return {
            id: expense.id,
            code: expense.code,
            expense_type_id: expense.expense_type_id,
            amount: parseFloat(expense.amount.toString()),
            status: expense.status,
            created_at: expense.created_at,
        };
    }

    // --------------------------------------------------------------------------
    // UPDATE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * Update expense (only PENDING status)
     */
    async updateExpense(
        id: number,
        data: UpdateExpenseDTO,
        userId: string,
        userInfo?: any,
        req?: any
    ) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: { payable: true },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.is_deleted) {
            throw new NotFoundError(`Expense with ID ${id} has been deleted`);
        }

        if (expense.status !== 'PENDING') {
            throw new BadRequestError('Cannot update expense with non-PENDING status');
        }

        const oldExpense = { ...expense };

        // Build update data
        const updateData: Prisma.expenseUpdateInput = {
            updated_by: userId,
            updated_at: new Date(),
        };

        if (data.expense_information) {
            if (data.expense_information.expense_type_id) {
                updateData.expense_type = { connect: { id: data.expense_information.expense_type_id } };
            }
            if (data.expense_information.amount !== undefined) {
                updateData.amount = data.expense_information.amount;
            }
            if (data.expense_information.date_recorded) {
                updateData.date_recorded = new Date(data.expense_information.date_recorded);
            }
            if (data.expense_information.payment_method) {
                updateData.payment_method = data.expense_information.payment_method;
            }
        }

        if (data.remarks !== undefined) {
            updateData.description = data.remarks;
        }

        // Handle reimbursable status change
        if (data.is_reimbursable !== undefined) {
            if (data.is_reimbursable && !expense.payable_id && data.reimbursable_details) {
                // Creating new payable
                const empResult = await employeeService.getEmployeeByNumber(data.reimbursable_details.employee_number);
                if (!empResult.success || !empResult.data) {
                    throw new ValidationError(`Employee ${data.reimbursable_details.employee_number} not found`);
                }

                const payableCode = await this.generatePayableCode();
                const amount = data.expense_information?.amount ?? parseFloat(expense.amount.toString());

                const payable = await prisma.payable.create({
                    data: {
                        code: payableCode,
                        creditor_name: employeeService.formatCreditorName(empResult.data),
                        employee_reference: data.reimbursable_details.employee_number,
                        description: `Reimbursement for expense ${expense.code}`,
                        total_amount: amount,
                        balance: amount,
                        due_date: data.reimbursable_details.due_date
                            ? new Date(data.reimbursable_details.due_date)
                            : null,
                        status: 'PENDING',
                        created_by: userId,
                    },
                });
                updateData.payable = { connect: { id: payable.id } };
            } else if (!data.is_reimbursable && expense.payable_id) {
                // Check if payable has any payments
                const payable = await prisma.payable.findUnique({
                    where: { id: expense.payable_id },
                });
                if (payable && parseFloat(payable.paid_amount.toString()) > 0) {
                    throw new BadRequestError('Cannot remove reimbursement - payable has payments');
                }
                // Soft delete the payable
                await prisma.payable.update({
                    where: { id: expense.payable_id },
                    data: { is_deleted: true, deleted_by: userId, deleted_at: new Date() },
                });
                updateData.payable = { disconnect: true };
            }
        }

        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: updateData,
        });

        // Audit log
        try {
            await AuditLogClient.logUpdate(
                'Operational Trip Expense',
                { id, code: expense.code },
                oldExpense,
                updatedExpense,
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense updated: ${expense.code} by ${userId}`);

        return {
            id: updatedExpense.id,
            code: updatedExpense.code,
            updated_at: updatedExpense.updated_at,
        };
    }

    // --------------------------------------------------------------------------
    // DELETE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * Soft delete expense (only PENDING status, no journal entry)
     */
    async softDeleteExpense(
        id: number,
        userId: string,
        reason: string,
        userInfo?: any,
        req?: any
    ) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: { payable: true },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.is_deleted) {
            throw new NotFoundError(`Expense with ID ${id} has already been deleted`);
        }

        if (expense.status !== 'PENDING') {
            throw new BadRequestError('Cannot delete expense with non-PENDING status');
        }

        if (expense.journal_entry_id) {
            throw new BadRequestError('Cannot delete expense with associated journal entry');
        }

        // Soft delete expense
        await prisma.expense.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_by: userId,
                deleted_at: new Date(),
                description: expense.description
                    ? `${expense.description}\n\nDeleted: ${reason}`
                    : `Deleted: ${reason}`,
            },
        });

        // Soft delete payable if exists and no payments made
        if (expense.payable_id) {
            const payable = await prisma.payable.findUnique({
                where: { id: expense.payable_id },
            });
            if (payable && parseFloat(payable.paid_amount.toString()) === 0) {
                await prisma.payable.update({
                    where: { id: expense.payable_id },
                    data: { is_deleted: true, deleted_by: userId, deleted_at: new Date() },
                });
            }
        }

        // Audit log
        try {
            await AuditLogClient.logDelete(
                'Operational Trip Expense',
                { id, code: expense.code },
                expense,
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                reason,
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense soft deleted: ${expense.code} by ${userId}`);
    }

    /**
     * Hard delete expense (permanent - only PENDING status, no journal entry)
     */
    async hardDeleteExpense(
        id: number,
        userId: string,
        userInfo?: any,
        req?: any
    ) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: { payable: true },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.status !== 'PENDING') {
            throw new BadRequestError('Cannot permanently delete expense with non-PENDING status');
        }

        if (expense.journal_entry_id) {
            throw new BadRequestError('Cannot permanently delete expense with associated journal entry');
        }

        // Hard delete payable if exists and no payments made
        if (expense.payable_id) {
            const payable = await prisma.payable.findUnique({
                where: { id: expense.payable_id },
            });
            if (payable && parseFloat(payable.paid_amount.toString()) === 0) {
                await prisma.payable.delete({
                    where: { id: expense.payable_id },
                });
            }
        }

        // Hard delete expense
        await prisma.expense.delete({
            where: { id },
        });

        // Audit log
        try {
            await AuditLogClient.logDelete(
                'Operational Trip Expense',
                { id, code: expense.code },
                expense,
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                'Permanent delete',
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense permanently deleted: ${expense.code} by ${userId}`);
    }

    // --------------------------------------------------------------------------
    // APPROVE / REJECT
    // --------------------------------------------------------------------------

    /**
     * Approve expense and create journal entry
     */
    async approveExpense(
        id: number,
        userId: string,
        remarks?: string,
        userInfo?: any,
        req?: any
    ) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                expense_type: true,
                payable: true,
            },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.is_deleted) {
            throw new NotFoundError(`Expense with ID ${id} has been deleted`);
        }

        if (expense.status !== 'PENDING') {
            throw new BadRequestError(`Cannot approve expense with status ${expense.status}`);
        }

        // Generate journal entry code
        const year = new Date().getFullYear();
        const jePrefix = `JE-${year}-`;
        const lastJE = await prisma.journal_entry.findFirst({
            where: { code: { startsWith: jePrefix } },
            orderBy: { code: 'desc' },
            select: { code: true },
        });

        let jeNextNumber = 1;
        if (lastJE?.code) {
            const lastNumber = parseInt(lastJE.code.split('-')[2], 10);
            if (!isNaN(lastNumber)) {
                jeNextNumber = lastNumber + 1;
            }
        }
        const jeCode = `${jePrefix}${jeNextNumber.toString().padStart(4, '0')}`;

        // Find appropriate accounts (simplified - you may need to adjust based on your COA)
        // Default expense account and cash account
        const expenseAccount = await prisma.chart_of_account.findFirst({
            where: {
                account_type: { code: 'EXPENSE' },
                is_deleted: false,
            },
        });

        const cashAccount = await prisma.chart_of_account.findFirst({
            where: {
                account_code: { contains: '101' }, // Cash account
                is_deleted: false,
            },
        });

        if (!expenseAccount || !cashAccount) {
            logger.warn('[OperationalTripExpenseService] Default accounts not found, creating JE without lines');
        }

        // Create journal entry
        const journalEntry = await prisma.journal_entry.create({
            data: {
                code: jeCode,
                date: new Date(),
                reference: expense.code,
                description: `Expense approval: ${expense.expense_type?.name || 'Expense'} - ${remarks || ''}`,
                total_debit: expense.amount,
                total_credit: expense.amount,
                status: 'POSTED',
                entry_type: 'AUTO_GENERATED',
                approved_by: userId,
                approved_at: new Date(),
                created_by: userId,
                lines: {
                    create: expenseAccount && cashAccount ? [
                        {
                            account_id: expenseAccount.id,
                            debit: expense.amount,
                            credit: 0,
                            description: `${expense.expense_type?.name || 'Expense'} - ${expense.code}`,
                            line_number: 1,
                            created_by: userId,
                        },
                        {
                            account_id: cashAccount.id,
                            debit: 0,
                            credit: expense.amount,
                            description: `Cash payment for ${expense.code}`,
                            line_number: 2,
                            created_by: userId,
                        },
                    ] : [],
                },
            },
        });

        // Update expense
        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                approved_by: userId,
                approved_at: new Date(),
                journal_entry_id: journalEntry.id,
                updated_by: userId,
                updated_at: new Date(),
                description: expense.description
                    ? `${expense.description}\n\nApproval remarks: ${remarks || 'N/A'}`
                    : remarks || null,
            },
        });

        // Audit log
        try {
            await AuditLogClient.logApproval(
                'Operational Trip Expense',
                { id, code: expense.code },
                'APPROVE',
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                remarks,
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense approved: ${expense.code} by ${userId}`);

        return {
            id: updatedExpense.id,
            code: updatedExpense.code,
            status: updatedExpense.status,
            approved_by: updatedExpense.approved_by,
            approved_at: updatedExpense.approved_at,
            journal_entry_id: journalEntry.id,
        };
    }

    /**
     * Reject expense
     */
    async rejectExpense(
        id: number,
        userId: string,
        reason: string,
        userInfo?: any,
        req?: any
    ) {
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: { payable: true },
        });

        if (!expense) {
            throw new NotFoundError(`Expense with ID ${id} not found`);
        }

        if (expense.is_deleted) {
            throw new NotFoundError(`Expense with ID ${id} has been deleted`);
        }

        // Update expense status to REJECTED (using COMPLETED as CANCELLED equivalent)
        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                status: 'REJECTED',
                description: expense.description
                    ? `${expense.description}\n\nRejection reason: ${reason}`
                    : `Rejection reason: ${reason}`,
                updated_by: userId,
                updated_at: new Date(),
            },
        });

        // Update payable status if exists
        if (expense.payable_id) {
            await prisma.payable.update({
                where: { id: expense.payable_id },
                data: {
                    status: 'CANCELLED',
                    updated_by: userId,
                    updated_at: new Date(),
                },
            });
        }

        // Audit log
        try {
            await AuditLogClient.logApproval(
                'Operational Trip Expense',
                { id, code: expense.code },
                'REJECT',
                {
                    id: userId,
                    name: userInfo?.username || userId,
                    role: userInfo?.role || 'admin',
                },
                reason,
                req
            );
        } catch (e) {
            logger.warn('[OperationalTripExpenseService] Audit log failed:', e);
        }

        logger.info(`[OperationalTripExpenseService] Expense rejected: ${expense.code} by ${userId}`);

        return {
            id: updatedExpense.id,
            code: updatedExpense.code,
            status: updatedExpense.status,
        };
    }

    // --------------------------------------------------------------------------
    // SUMMARY & EXPORT
    // --------------------------------------------------------------------------

    /**
     * Get expense summary statistics
     */
    async getExpenseSummary(filters: ExpenseListFilters = {}): Promise<ExpenseSummary> {
        const where: Prisma.expenseWhereInput = {
            is_deleted: false,
        };

        if (filters.date_from || filters.date_to) {
            where.date_recorded = {};
            if (filters.date_from) {
                where.date_recorded.gte = new Date(filters.date_from);
            }
            if (filters.date_to) {
                where.date_recorded.lte = new Date(filters.date_to);
            }
        }

        const [pendingCount, approvedData] = await Promise.all([
            prisma.expense.count({
                where: { ...where, status: 'PENDING' },
            }),
            prisma.expense.aggregate({
                where: { ...where, status: 'APPROVED' },
                _count: { _all: true },
                _sum: { amount: true },
            }),
        ]);

        return {
            pending_count: pendingCount,
            approved_count: approvedData._count?._all || 0,
            total_approved_amount: parseFloat(approvedData._sum?.amount?.toString() || '0'),
            date_from: filters.date_from,
            date_to: filters.date_to,
        };
    }

    /**
     * Export expenses with summary
     */
    async exportExpenses(filters: ExpenseListFilters) {
        const result = await this.listExpenses(filters, 1, 10000); // Get all matching
        const summary = await this.getExpenseSummary(filters);

        return {
            summary,
            expenses: result.expenses.map((e) => ({
                code: e.code,
                date_recorded: e.date_recorded,
                expense_name: e.expense_name,
                body_number: e.body_number,
                amount: e.amount,
                is_reimbursable: e.is_reimbursable,
                status: e.status,
                approved_by: e.approved_by,
                approved_at: e.approved_at,
            })),
        };
    }

    // --------------------------------------------------------------------------
    // REFERENCE DATA
    // --------------------------------------------------------------------------

    /**
     * Get expense types for dropdown
     */
    async getExpenseTypes() {
        const types = await prisma.expense_type.findMany({
            where: { is_deleted: false },
            orderBy: { name: 'asc' },
        });

        return types.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: t.description,
        }));
    }

    /**
     * Get payment methods for dropdown
     */
    getPaymentMethods() {
        return [
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'ONLINE', label: 'Online Payment (GCash, PayMaya, etc.)' },
        ];
    }

    /**
     * Get chart of accounts for dropdown
     */
    async getChartOfAccounts(search?: string, accountTypeId?: number) {
        const where: Prisma.chart_of_accountWhereInput = {
            is_deleted: false,
        };

        if (search) {
            where.OR = [
                { account_code: { contains: search, mode: 'insensitive' } },
                { account_name: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (accountTypeId) {
            where.account_type_id = accountTypeId;
        }

        const accounts = await prisma.chart_of_account.findMany({
            where,
            include: { account_type: true },
            orderBy: { account_code: 'asc' },
            take: 100,
        });

        return accounts.map((a) => ({
            id: a.id,
            account_code: a.account_code,
            account_name: a.account_name,
            account_type_id: a.account_type_id,
            account_type_name: a.account_type?.name,
            normal_balance: a.normal_balance,
        }));
    }

    /**
     * Get operational trips for dropdown
     */
    async getOperationalTrips(date?: string, search?: string) {
        const where: Prisma.operational_tripWhereInput = {
            is_deleted: false,
        };

        if (date) {
            const dateObj = new Date(date);
            where.date_assigned = {
                gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                lte: new Date(dateObj.setHours(23, 59, 59, 999)),
            };
        }

        const trips = await prisma.operational_trip.findMany({
            where,
            orderBy: { date_assigned: 'desc' },
            take: 100,
        });

        let filteredTrips = trips;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTrips = trips.filter((t) =>
                t.bus_plate_number?.toLowerCase().includes(searchLower) ||
                t.body_number?.toLowerCase().includes(searchLower) ||
                t.bus_route?.toLowerCase().includes(searchLower)
            );
        }

        return filteredTrips.map((t) => ({
            assignment_id: t.assignment_id,
            bus_trip_id: t.bus_trip_id,
            display_text: `${t.date_assigned?.toISOString().split('T')[0] || 'N/A'} | ${t.body_number || 'N/A'} | ${t.bus_type || 'N/A'} | ${t.bus_route || 'N/A'}`,
            date_assigned: t.date_assigned,
            body_number: t.body_number,
            bus_type: t.bus_type,
            bus_route: t.bus_route,
            plate_number: t.bus_plate_number,
        }));
    }

    /**
     * Get rental trips for dropdown
     */
    async getRentalTrips(dateFrom?: string, dateTo?: string, search?: string, status?: string) {
        const where: Prisma.rental_tripWhereInput = {
            is_deleted: false,
        };

        if (dateFrom) {
            where.rental_start_date = { gte: new Date(dateFrom) };
        }
        if (dateTo) {
            where.rental_end_date = { lte: new Date(dateTo) };
        }
        if (status) {
            where.rental_status = status;
        }

        const trips = await prisma.rental_trip.findMany({
            where,
            orderBy: { rental_start_date: 'desc' },
            take: 100,
        });

        let filteredTrips = trips;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTrips = trips.filter((t) =>
                t.bus_plate_number?.toLowerCase().includes(searchLower) ||
                t.body_number?.toLowerCase().includes(searchLower) ||
                t.rental_destination?.toLowerCase().includes(searchLower)
            );
        }

        return filteredTrips.map((t) => ({
            assignment_id: t.assignment_id,
            display_text: `${t.rental_start_date?.toISOString().split('T')[0] || 'N/A'} to ${t.rental_end_date?.toISOString().split('T')[0] || 'N/A'} | ${t.body_number || 'N/A'} | ${t.rental_destination || 'N/A'}`,
            rental_start_date: t.rental_start_date,
            rental_end_date: t.rental_end_date,
            body_number: t.body_number,
            bus_type: t.bus_type,
            rental_destination: t.rental_destination,
            plate_number: t.bus_plate_number,
            rental_status: t.rental_status,
            total_rental_amount: t.total_rental_amount ? parseFloat(t.total_rental_amount.toString()) : null,
        }));
    }
}

export const operationalTripExpenseService = new OperationalTripExpenseService();
export default operationalTripExpenseService;
