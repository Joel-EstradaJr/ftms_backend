// ============================================================================
// OPERATIONAL TRIP EXPENSE CONTROLLER
// HTTP request handlers for operational trip expense management
// ============================================================================

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { operationalTripExpenseService } from '../services/operationalTripExpense.service';
import { employeeService } from '../services/employee.service';
import { ValidationError } from '../utils/errors';

export class OperationalTripExpenseController {
    // --------------------------------------------------------------------------
    // LIST EXPENSES
    // --------------------------------------------------------------------------

    /**
     * GET /api/operational-trip-expenses
     * List expenses with filters, search, and pagination
     */
    listExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const {
                page,
                limit,
                date_from,
                date_to,
                amount_min,
                amount_max,
                is_reimbursable,
                status,
                search,
                expense_name,
                body_number,
                trip_type,
                sort_by,
                sort_order,
            } = req.query;

            const filters = {
                date_from: date_from as string,
                date_to: date_to as string,
                amount_min: amount_min ? parseFloat(amount_min as string) : undefined,
                amount_max: amount_max ? parseFloat(amount_max as string) : undefined,
                is_reimbursable: is_reimbursable !== undefined
                    ? is_reimbursable === 'true'
                    : undefined,
                status: status
                    ? (Array.isArray(status) ? status : [status]) as string[]
                    : undefined,
                search: search as string,
                expense_name: expense_name as string,
                body_number: body_number as string,
                trip_type: trip_type as 'operational' | 'rental' | 'all',
                sort_by: sort_by as 'date_recorded' | 'amount' | 'status',
                sort_order: sort_order as 'asc' | 'desc',
            };

            const result = await operationalTripExpenseService.listExpenses(
                filters,
                parseInt(page as string) || 1,
                parseInt(limit as string) || 10
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // GET SINGLE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * GET /api/operational-trip-expenses/:id
     * Get expense by ID with full details
     */
    getExpenseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            const expense = await operationalTripExpenseService.getExpenseById(id);

            res.json({
                success: true,
                data: expense,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // CREATE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * POST /api/operational-trip-expenses
     * Create new expense
     */
    createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const {
                expense_information,
                trip_assignment,
                accounting_details,
                is_reimbursable,
                reimbursable_details,
                remarks,
            } = req.body;

            // Validation
            if (!expense_information) {
                throw new ValidationError('expense_information is required');
            }
            if (!expense_information.expense_type_id) {
                throw new ValidationError('expense_type_id is required');
            }
            if (!expense_information.date_recorded) {
                throw new ValidationError('date_recorded is required');
            }
            if (expense_information.amount === undefined || expense_information.amount === null) {
                throw new ValidationError('amount is required');
            }
            if (!expense_information.payment_method) {
                throw new ValidationError('payment_method is required');
            }

            if (is_reimbursable && !reimbursable_details?.employee_number) {
                throw new ValidationError('employee_number is required for reimbursable expenses');
            }

            const expense = await operationalTripExpenseService.createExpense(
                {
                    expense_information,
                    trip_assignment,
                    accounting_details,
                    is_reimbursable: is_reimbursable || false,
                    reimbursable_details,
                    remarks,
                },
                req.user!.sub,
                req.user,
                req
            );

            res.status(201).json({
                success: true,
                message: 'Expense created successfully',
                data: expense,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // UPDATE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * PATCH /api/operational-trip-expenses/:id
     * Update expense (PENDING status only)
     */
    updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            const result = await operationalTripExpenseService.updateExpense(
                id,
                req.body,
                req.user!.sub,
                req.user,
                req
            );

            res.json({
                success: true,
                message: 'Expense updated successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // DELETE EXPENSE
    // --------------------------------------------------------------------------

    /**
     * PATCH /api/operational-trip-expenses/:id/soft-delete
     * Soft delete expense (set is_deleted = true)
     */
    softDeleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            const { reason } = req.body;

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            if (!reason) {
                throw new ValidationError('Deletion reason is required');
            }

            await operationalTripExpenseService.softDeleteExpense(
                id,
                req.user!.sub,
                reason,
                req.user,
                req
            );

            res.json({
                success: true,
                message: 'Expense deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/operational-trip-expenses/:id
     * Hard delete expense (permanent)
     */
    hardDeleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            await operationalTripExpenseService.hardDeleteExpense(
                id,
                req.user!.sub,
                req.user,
                req
            );

            res.json({
                success: true,
                message: 'Expense permanently deleted',
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // APPROVE / REJECT
    // --------------------------------------------------------------------------

    /**
     * POST /api/operational-trip-expenses/:id/approve
     * Approve expense
     */
    approveExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            const { remarks } = req.body;

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            const result = await operationalTripExpenseService.approveExpense(
                id,
                req.user!.sub,
                remarks,
                req.user,
                req
            );

            res.json({
                success: true,
                message: 'Expense approved successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/operational-trip-expenses/:id/reject
     * Reject expense
     */
    rejectExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            const { rejection_reason } = req.body;

            if (isNaN(id)) {
                throw new ValidationError('Invalid expense ID');
            }

            if (!rejection_reason) {
                throw new ValidationError('rejection_reason is required');
            }

            const result = await operationalTripExpenseService.rejectExpense(
                id,
                req.user!.sub,
                rejection_reason,
                req.user,
                req
            );

            res.json({
                success: true,
                message: 'Expense rejected successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // EXPORT
    // --------------------------------------------------------------------------

    /**
     * GET /api/operational-trip-expenses/export
     * Export expenses with summary
     */
    exportExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const {
                date_from,
                date_to,
                amount_min,
                amount_max,
                is_reimbursable,
                status,
            } = req.query;

            const filters = {
                date_from: date_from as string,
                date_to: date_to as string,
                amount_min: amount_min ? parseFloat(amount_min as string) : undefined,
                amount_max: amount_max ? parseFloat(amount_max as string) : undefined,
                is_reimbursable: is_reimbursable !== undefined
                    ? is_reimbursable === 'true'
                    : undefined,
                status: status
                    ? (Array.isArray(status) ? status : [status]) as string[]
                    : undefined,
            };

            const result = await operationalTripExpenseService.exportExpenses(filters);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // REFERENCE DATA ENDPOINTS
    // --------------------------------------------------------------------------

    /**
     * GET /api/operational-trip-expenses/expense-types
     * Get expense types for dropdown
     */
    getExpenseTypes = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const types = await operationalTripExpenseService.getExpenseTypes();

            res.json({
                success: true,
                data: types,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/operational-trip-expenses/payment-methods
     * Get payment methods for dropdown
     */
    getPaymentMethods = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const methods = operationalTripExpenseService.getPaymentMethods();

            res.json({
                success: true,
                data: methods,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/operational-trip-expenses/chart-of-accounts
     * Get chart of accounts for dropdown
     */
    getChartOfAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, account_type_id } = req.query;

            const accounts = await operationalTripExpenseService.getChartOfAccounts(
                search as string,
                account_type_id ? parseInt(account_type_id as string) : undefined
            );

            res.json({
                success: true,
                data: accounts,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/operational-trip-expenses/operational-trips
     * Get operational trips for dropdown
     */
    getOperationalTrips = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { date, search } = req.query;

            const trips = await operationalTripExpenseService.getOperationalTrips(
                date as string,
                search as string
            );

            res.json({
                success: true,
                data: trips,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/operational-trip-expenses/rental-trips
     * Get rental trips for dropdown
     */
    getRentalTrips = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { date_from, date_to, search, status } = req.query;

            const trips = await operationalTripExpenseService.getRentalTrips(
                date_from as string,
                date_to as string,
                search as string,
                status as string
            );

            res.json({
                success: true,
                data: trips,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/operational-trip-expenses/employees
     * Proxy to HR system for employee data
     */
    getEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, employeeNumber } = req.query;

            const result = await employeeService.getFormattedEmployees(
                search as string,
                employeeNumber as string
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch employees',
                    error: result.error,
                });
            }

            res.json({
                success: true,
                data: result.data,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const operationalTripExpenseController = new OperationalTripExpenseController();
export default operationalTripExpenseController;
