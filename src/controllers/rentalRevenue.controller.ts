// ============================================================================
// RENTAL REVENUE CONTROLLER
// API endpoints for managing rental revenue records
// All fields aligned with database schema (revenue + rental_local tables)
// ============================================================================

import { Response, NextFunction } from 'express';
import { rentalRevenueService } from '../services/rentalRevenue.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import {
    RentalRevenueListFilters,
    CreateRentalRevenueDTO,
    UpdateRentalRevenueDTO,
    CancelRentalRevenueDTO,
    VALID_PAYMENT_METHODS,
    VALID_RENTAL_STATUSES,
    VALID_REMITTANCE_STATUSES,
    PaymentMethodEnum,
} from './rentalRevenue.dto';

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class RentalRevenueController {
    // --------------------------------------------------------------------------
    // LIST RENTAL REVENUES
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/rental-revenue
     * List rental revenues with filters, search, pagination
     * 
     * Supports:
     * - Filtering by date range, status, payment method, amount range
     * - Search across assignment_id, code, description, rental_package
     * - Sorting by code, date_recorded, total_rental_amount, balance_amount
     * - Pagination
     */
    listRentalRevenues = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const filters: RentalRevenueListFilters = {
                // Date filters
                date_recorded_from: req.query.date_recorded_from as string,
                date_recorded_to: req.query.date_recorded_to as string,
                down_payment_date_from: req.query.down_payment_date_from as string,
                down_payment_date_to: req.query.down_payment_date_to as string,
                rental_start_date_from: req.query.rental_start_date_from as string,
                rental_start_date_to: req.query.rental_start_date_to as string,
                
                // Status filters
                rental_status: req.query.rental_status as any,
                remittance_status: req.query.remittance_status as any,
                
                // Payment method filter
                payment_method: req.query.payment_method as PaymentMethodEnum,
                
                // Amount filters
                amount_min: req.query.amount_min ? Number(req.query.amount_min) : undefined,
                amount_max: req.query.amount_max ? Number(req.query.amount_max) : undefined,
                balance_min: req.query.balance_min ? Number(req.query.balance_min) : undefined,
                balance_max: req.query.balance_max ? Number(req.query.balance_max) : undefined,
                
                // Search
                search: req.query.search as string,
                
                // Sorting
                sort_by: req.query.sort_by as any,
                sort_order: req.query.sort_order as 'asc' | 'desc',
            };

            // Validate payment_method if provided
            if (filters.payment_method && !VALID_PAYMENT_METHODS.includes(filters.payment_method)) {
                throw new ValidationError(`Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
            }

            // Validate rental_status if provided
            if (filters.rental_status && !VALID_RENTAL_STATUSES.includes(filters.rental_status)) {
                throw new ValidationError(`Invalid rental_status. Must be one of: ${VALID_RENTAL_STATUSES.join(', ')}`);
            }

            // Validate remittance_status if provided
            if (filters.remittance_status && !VALID_REMITTANCE_STATUSES.includes(filters.remittance_status)) {
                throw new ValidationError(`Invalid remittance_status. Must be one of: ${VALID_REMITTANCE_STATUSES.join(', ')}`);
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await rentalRevenueService.listRentalRevenues(filters, page, limit);

            res.status(200).json({
                success: true,
                message: 'Rental revenues retrieved successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // GET RENTAL REVENUE BY ID
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/rental-revenue/:id
     * Get rental revenue details by ID (for View Modal)
     * 
     * Returns complete revenue + rental data including:
     * - All revenue fields
     * - Linked rental_local data
     * - Bus information
     * - Assigned employees
     * - Receivable info (if exists)
     * - Journal entry summary
     */
    getRentalRevenueById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const revenue = await rentalRevenueService.getRentalRevenueById(id);

            res.status(200).json({
                success: true,
                message: 'Rental revenue retrieved successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // CREATE RENTAL REVENUE
    // --------------------------------------------------------------------------

    /**
     * POST /api/v1/admin/rental-revenue
     * Record new rental revenue from a rental assignment
     * 
     * Links revenue record to rental_local via assignment_id
     * Creates journal entry automatically
     */
    createRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { 
                assignment_id, 
                date_recorded, 
                description, 
                payment_method,
                payment_reference,
                down_payment_amount 
            } = req.body;

            // Validation
            if (!assignment_id || typeof assignment_id !== 'string') {
                throw new ValidationError('assignment_id is required and must be a string');
            }

            // Validate payment_method if provided
            if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
                throw new ValidationError(`Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
            }

            const data: CreateRentalRevenueDTO = {
                assignment_id,
                date_recorded,
                description,
                payment_method,
                payment_reference,
                down_payment_amount: down_payment_amount ? Number(down_payment_amount) : undefined,
            };

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await rentalRevenueService.createRentalRevenue(data, userId, userInfo, req);

            res.status(201).json({
                success: true,
                message: 'Rental revenue recorded successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // UPDATE RENTAL REVENUE
    // --------------------------------------------------------------------------

    /**
     * PATCH /api/v1/admin/rental-revenue/:id
     * Partially update rental revenue record (for Edit Modal)
     * 
     * Supports updating:
     * - Revenue fields: date_recorded, description, payment_method, etc.
     * - Rental fields: down_payment_amount, down_payment_date
     * - Status: remittance_status
     * - Balance payment: pay_balance flag
     */
    updateRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const {
                date_recorded,
                date_expected,
                description,
                payment_method,
                payment_reference,
                down_payment_amount,
                down_payment_date,
                remittance_status,
                pay_balance,
                balance_payment_method,
                balance_payment_reference,
            } = req.body;

            const data: UpdateRentalRevenueDTO = {};

            // Revenue fields
            if (date_recorded !== undefined) data.date_recorded = date_recorded;
            if (date_expected !== undefined) data.date_expected = date_expected;
            if (description !== undefined) data.description = description;
            if (payment_reference !== undefined) data.payment_reference = payment_reference;

            // Validate and set payment_method
            if (payment_method !== undefined) {
                if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
                    throw new ValidationError(`Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
                }
                data.payment_method = payment_method;
            }

            // Rental fields
            if (down_payment_amount !== undefined) {
                if (typeof down_payment_amount !== 'number' || down_payment_amount < 0) {
                    throw new ValidationError('down_payment_amount must be a non-negative number');
                }
                data.down_payment_amount = down_payment_amount;
            }
            if (down_payment_date !== undefined) data.down_payment_date = down_payment_date;

            // Status management
            if (remittance_status !== undefined) {
                if (!VALID_REMITTANCE_STATUSES.includes(remittance_status)) {
                    throw new ValidationError(`Invalid remittance_status. Must be one of: ${VALID_REMITTANCE_STATUSES.join(', ')}`);
                }
                data.remittance_status = remittance_status;
            }

            // Balance payment
            if (pay_balance !== undefined) {
                data.pay_balance = pay_balance;
                if (balance_payment_method) {
                    if (!VALID_PAYMENT_METHODS.includes(balance_payment_method)) {
                        throw new ValidationError(`Invalid balance_payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
                    }
                    data.balance_payment_method = balance_payment_method;
                }
                if (balance_payment_reference) {
                    data.balance_payment_reference = balance_payment_reference;
                }
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await rentalRevenueService.updateRentalRevenue(id, data, userId, userInfo, req);

            res.status(200).json({
                success: true,
                message: 'Rental revenue updated successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // CANCEL RENTAL REVENUE
    // --------------------------------------------------------------------------

    /**
     * POST /api/v1/admin/rental-revenue/:id/cancel
     * Cancel a rental revenue record
     * 
     * Updates rental_status to 'cancelled' and sets cancelled_at
     * Creates reversal journal entry if needed
     */
    cancelRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const { cancellation_reason } = req.body;

            const data: CancelRentalRevenueDTO = {
                cancellation_reason,
            };

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await rentalRevenueService.cancelRentalRevenue(id, data, userId, userInfo, req);

            res.status(200).json({
                success: true,
                message: 'Rental revenue cancelled successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // GET ANALYTICS
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/rental-revenue/analytics
     * Get rental revenue analytics and summary
     */
    getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const dateFrom = req.query.date_from as string;
            const dateTo = req.query.date_to as string;

            const analytics = await rentalRevenueService.getAnalytics(dateFrom, dateTo);

            res.status(200).json({
                success: true,
                message: 'Analytics retrieved successfully',
                data: analytics,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // GET UNRECORDED RENTALS
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/rental-revenue/unrecorded
     * Get rentals that haven't been recorded as revenue yet
     */
    getUnrecordedRentals = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await rentalRevenueService.getUnrecordedRentals(page, limit, search);

            res.status(200).json({
                success: true,
                message: 'Unrecorded rentals retrieved successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // PAY BALANCE
    // --------------------------------------------------------------------------

    /**
     * POST /api/v1/admin/rental-revenue/:id/pay-balance
     * Record balance payment for a rental
     * 
     * Sets balance_amount to 0 and full_payment_date to today
    /**
     * POST /api/v1/admin/rental-revenue/:id/pay-balance
     * Pay the outstanding balance on a rental
     * Updates rental_status to 'completed'
     */
    payBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const { payment_method, payment_reference } = req.body;

            // Validate payment_method if provided
            if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
                throw new ValidationError(`Invalid payment_method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await rentalRevenueService.payBalance(
                id, 
                payment_method || 'CASH', 
                payment_reference,
                userId, 
                userInfo, 
                req
            );

            res.status(200).json({
                success: true,
                message: 'Balance paid successfully. Rental is now completed.',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // ARCHIVE / RESTORE / DELETE RENTAL REVENUE
    // --------------------------------------------------------------------------

    /**
     * PATCH /api/v1/admin/rental-revenue/:id/archive
     * Archive a rental revenue record (soft delete)
     */
    archiveRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const result = await rentalRevenueService.archiveRentalRevenue(id, userId, userInfo, req);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * PATCH /api/v1/admin/rental-revenue/:id/restore
     * Restore an archived rental revenue record
     */
    restoreRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const result = await rentalRevenueService.restoreRentalRevenue(id, userId, userInfo, req);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/v1/admin/rental-revenue/:id/permanent
     * Permanently delete an archived rental revenue record
     */
    hardDeleteRentalRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const result = await rentalRevenueService.hardDeleteRentalRevenue(id, userId, userInfo, req);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}

// Export singleton instance
export const rentalRevenueController = new RentalRevenueController();
