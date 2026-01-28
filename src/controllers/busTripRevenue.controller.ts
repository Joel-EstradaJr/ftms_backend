// ============================================================================
// BUS TRIP REVENUE CONTROLLER
// API endpoints for managing bus trip revenue records
// ============================================================================

import { Response, NextFunction } from 'express';
import { busTripRevenueService } from '../services/busTripRevenue.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import {
    RevenueListFilters,
    CreateRevenueDTO,
    UpdateRevenueDTO,
    RecordPaymentDTO,
    UpdateConfigDTO,
    UnsyncedTripsFilters,
} from './busTripRevenue.dto';

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class BusTripRevenueController {
    // --------------------------------------------------------------------------
    // LIST REVENUES
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/bus-trip-revenue
     * List revenues with filters, search, pagination
     */
    listRevenues = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const filters: RevenueListFilters = {
                date_assigned_from: req.query.date_assigned_from as string,
                date_assigned_to: req.query.date_assigned_to as string,
                date_recorded_from: req.query.date_recorded_from as string,
                date_recorded_to: req.query.date_recorded_to as string,
                assignment_type: req.query.assignment_type as 'BOUNDARY' | 'PERCENTAGE',
                status: req.query.status as any,
                trip_revenue_min: req.query.trip_revenue_min ? Number(req.query.trip_revenue_min) : undefined,
                trip_revenue_max: req.query.trip_revenue_max ? Number(req.query.trip_revenue_max) : undefined,
                search: req.query.search as string,
                sort_by: req.query.sort_by as any,
                sort_order: req.query.sort_order as 'asc' | 'desc',
            };

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await busTripRevenueService.listRevenues(filters, page, limit);

            res.status(200).json({
                success: true,
                message: 'Revenues retrieved successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // GET REVENUE BY ID
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/bus-trip-revenue/:id
     * Get revenue details by ID
     */
    getRevenueById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const revenue = await busTripRevenueService.getRevenueById(id);

            res.status(200).json({
                success: true,
                message: 'Revenue retrieved successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // CREATE REVENUE
    // --------------------------------------------------------------------------

    /**
     * POST /api/v1/admin/bus-trip-revenue
     * Record trip revenue
     */
    createRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { assignment_id, bus_trip_id, date_recorded, description } = req.body;

            // Validation
            if (!assignment_id || typeof assignment_id !== 'string') {
                throw new ValidationError('assignment_id is required and must be a string');
            }
            if (!bus_trip_id || typeof bus_trip_id !== 'string') {
                throw new ValidationError('bus_trip_id is required and must be a string');
            }

            const data: CreateRevenueDTO = {
                assignment_id,
                bus_trip_id,
                date_recorded,
                description,
            };

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await busTripRevenueService.createRevenue(data, userId, userInfo, req);

            res.status(201).json({
                success: true,
                message: 'Revenue recorded successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // UPDATE REVENUE
    // --------------------------------------------------------------------------

    /**
     * PATCH /api/v1/admin/bus-trip-revenue/:id
     * Partially update revenue record (only provided fields are updated)
     * 
     * Supports full Edit Modal functionality:
     * - Revenue fields: date_recorded, amount, description, date_expected
     * - Status management: remittance_status, delete_receivables
     * - Receivable data: driverReceivable, conductorReceivable (with frequency, number_of_payments)
     */
    updateRevenue = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                throw new ValidationError('Invalid revenue ID');
            }

            const { 
                date_recorded, 
                amount, 
                description, 
                date_expected,
                remittance_status,
                delete_receivables,
                driverReceivable,
                conductorReceivable
            } = req.body;

            const data: UpdateRevenueDTO = {};
            
            // Revenue fields
            if (date_recorded !== undefined) data.date_recorded = date_recorded;
            if (amount !== undefined) {
                if (typeof amount !== 'number' || amount < 0) {
                    throw new ValidationError('amount must be a non-negative number');
                }
                data.amount = amount;
            }
            if (description !== undefined) data.description = description;
            if (date_expected !== undefined) data.date_expected = date_expected;
            
            // Status management
            if (remittance_status !== undefined) {
                const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF'];
                if (!validStatuses.includes(remittance_status)) {
                    throw new ValidationError(`Invalid remittance_status. Must be one of: ${validStatuses.join(', ')}`);
                }
                data.remittance_status = remittance_status;
            }
            if (delete_receivables !== undefined) data.delete_receivables = delete_receivables;
            
            // Receivable data
            if (driverReceivable !== undefined) {
                // Validate frequency if provided
                if (driverReceivable.frequency) {
                    const validFrequencies = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
                    if (!validFrequencies.includes(driverReceivable.frequency)) {
                        throw new ValidationError(`Invalid driver receivable frequency. Must be one of: ${validFrequencies.join(', ')}`);
                    }
                }
                // Validate number_of_payments if provided
                if (driverReceivable.number_of_payments !== undefined && driverReceivable.number_of_payments < 1) {
                    throw new ValidationError('Driver receivable number_of_payments must be at least 1');
                }
                data.driverReceivable = driverReceivable;
            }
            if (conductorReceivable !== undefined) {
                // Validate frequency if provided
                if (conductorReceivable.frequency) {
                    const validFrequencies = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
                    if (!validFrequencies.includes(conductorReceivable.frequency)) {
                        throw new ValidationError(`Invalid conductor receivable frequency. Must be one of: ${validFrequencies.join(', ')}`);
                    }
                }
                // Validate number_of_payments if provided
                if (conductorReceivable.number_of_payments !== undefined && conductorReceivable.number_of_payments < 1) {
                    throw new ValidationError('Conductor receivable number_of_payments must be at least 1');
                }
                data.conductorReceivable = conductorReceivable;
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const revenue = await busTripRevenueService.updateRevenue(id, data, userId, userInfo, req);

            res.status(200).json({
                success: true,
                message: 'Revenue updated successfully',
                data: revenue,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // RECORD RECEIVABLE PAYMENT
    // --------------------------------------------------------------------------

    /**
     * POST /api/v1/admin/bus-trip-revenue/receivable-payment
     * Record installment payment
     */
    recordReceivablePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { installment_id, amount_paid, payment_method, payment_date, payment_reference } = req.body;

            // Validation
            if (!installment_id || typeof installment_id !== 'number') {
                throw new ValidationError('installment_id is required and must be a number');
            }
            if (!amount_paid || typeof amount_paid !== 'number' || amount_paid <= 0) {
                throw new ValidationError('amount_paid is required and must be a positive number');
            }
            if (!payment_method) {
                throw new ValidationError('payment_method is required');
            }

            const data: RecordPaymentDTO = {
                installment_id,
                amount_paid,
                payment_method,
                payment_date,
                payment_reference,
            };

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const result = await busTripRevenueService.recordReceivablePayment(data, userId, userInfo, req);

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // CONFIGURATION
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/bus-trip-revenue/config
     * Get system configuration
     */
    getConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const config = await busTripRevenueService.getSystemConfig();

            res.status(200).json({
                success: true,
                message: 'Configuration retrieved successfully',
                data: config,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/v1/admin/bus-trip-revenue/config
     * Update system configuration
     */
    updateConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data: UpdateConfigDTO = req.body;

            // Validation
            if (data.driver_share_percentage !== undefined && data.conductor_share_percentage !== undefined) {
                const total = data.driver_share_percentage + data.conductor_share_percentage;
                if (total !== 100) {
                    throw new ValidationError('Driver and conductor share percentages must sum to 100');
                }
            }

            if (data.default_number_of_payments !== undefined && data.default_number_of_payments < 1) {
                throw new ValidationError('default_number_of_payments must be at least 1');
            }

            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const config = await busTripRevenueService.updateSystemConfig(data, userId, userInfo, req);

            res.status(200).json({
                success: true,
                message: 'Configuration updated successfully',
                data: config,
            });
        } catch (error) {
            next(error);
        }
    };

    // --------------------------------------------------------------------------
    // UNSYNCED TRIPS
    // --------------------------------------------------------------------------

    /**
     * GET /api/v1/admin/bus-trip-revenue/unsynced
     * List unsynced trips
     */
    listUnsyncedTrips = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const filters: UnsyncedTripsFilters = {
                date_from: req.query.date_from as string,
                date_to: req.query.date_to as string,
                assignment_type: req.query.assignment_type as 'BOUNDARY' | 'PERCENTAGE',
                search: req.query.search as string,
            };

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await busTripRevenueService.listUnsyncedTrips(filters, page, limit);

            res.status(200).json({
                success: true,
                message: 'Unsynced trips retrieved successfully',
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/v1/admin/bus-trip-revenue/process-unsynced
     * Process all unsynced trips
     */
    processUnsyncedTrips = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.sub || 'system';
            const userInfo = req.user;

            const result = await busTripRevenueService.processUnsyncedTrips(userId, userInfo, req);

            const status = result.failed > 0 ? 207 : 200;
            const message = result.failed > 0
                ? `Processed ${result.processed} trips with ${result.failed} failures`
                : `Successfully processed ${result.processed} trips`;

            res.status(status).json({
                success: result.failed === 0,
                message,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

// Export singleton instance
export const busTripRevenueController = new BusTripRevenueController();
