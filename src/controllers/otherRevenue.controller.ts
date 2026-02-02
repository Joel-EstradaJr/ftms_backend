/**
 * OTHER REVENUE CONTROLLER
 * 
 * Express request handlers for other revenue CRUD operations.
 * Base URL: /api/v1/admin/other-revenue
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import {
    listOtherRevenue,
    getOtherRevenueById,
    createOtherRevenue,
    updateOtherRevenue,
    getOtherRevenueTypes,
    recordPayment,
    softDeleteOtherRevenue,
    approveOtherRevenue,
    rejectOtherRevenue,
    OtherRevenueCreateInput,
    OtherRevenueUpdateInput,
    RecordPaymentInput
} from '../services/otherRevenue.service';

/**
 * GET /api/v1/admin/other-revenue
 * List other revenue records with filters and pagination
 */
export const list = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string | undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const revenueTypeId = req.query.revenueTypeId ? parseInt(req.query.revenueTypeId as string) : undefined;
        const status = req.query.status as string | undefined;
        const sortBy = (req.query.sortBy as 'date_recorded' | 'amount' | 'created_at') || 'date_recorded';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

        const result = await listOtherRevenue({
            page,
            limit,
            search,
            startDate,
            endDate,
            revenueTypeId,
            status,
            sortBy,
            sortOrder
        });

        res.status(200).json({
            status: 'success',
            data: result.records,
            pagination: result.pagination,
            analytics: result.analytics
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] List error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch other revenue records',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/v1/admin/other-revenue/:id
 * Get a single other revenue record by ID
 */
export const getById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid revenue ID'
            });
            return;
        }

        const record = await getOtherRevenueById(id);

        if (!record) {
            res.status(404).json({
                status: 'error',
                message: 'Revenue record not found'
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            data: record
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] GetById error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/v1/admin/other-revenue
 * Create a new other revenue record
 */
export const create = async (req: Request, res: Response): Promise<void> => {
    try {
        const input: OtherRevenueCreateInput = {
            revenue_type_id: req.body.revenue_type_id,
            amount: parseFloat(req.body.amount),
            date_recorded: req.body.date_recorded,
            description: req.body.description,
            payment_method: req.body.payment_method,
            payment_reference: req.body.payment_reference,
            department_id: req.body.department_id ? parseInt(req.body.department_id) : undefined,
            remarks: req.body.remarks,
            isUnearnedRevenue: req.body.isUnearnedRevenue || false,
            scheduleFrequency: req.body.scheduleFrequency,
            scheduleStartDate: req.body.scheduleStartDate,
            numberOfPayments: req.body.numberOfPayments ? parseInt(req.body.numberOfPayments) : undefined,
            created_by: req.body.created_by || 'system'
        };

        // Validation
        if (!input.revenue_type_id || isNaN(input.revenue_type_id)) {
            res.status(400).json({
                status: 'error',
                message: 'Revenue type is required'
            });
            return;
        }

        if (!input.amount || isNaN(input.amount) || input.amount <= 0) {
            res.status(400).json({
                status: 'error',
                message: 'Valid amount is required'
            });
            return;
        }

        if (!input.date_recorded) {
            res.status(400).json({
                status: 'error',
                message: 'Date recorded is required'
            });
            return;
        }

        if (!input.description) {
            res.status(400).json({
                status: 'error',
                message: 'Description is required'
            });
            return;
        }

        if (!input.payment_method) {
            res.status(400).json({
                status: 'error',
                message: 'Payment method is required'
            });
            return;
        }

        // Validate unearned revenue requirements
        if (input.isUnearnedRevenue) {
            if (!input.scheduleFrequency || !input.numberOfPayments) {
                res.status(400).json({
                    status: 'error',
                    message: 'Schedule frequency and number of payments required for unearned revenue'
                });
                return;
            }
        }

        // For Other Revenue, always start with PENDING payment status (requires approval first)
        (input as any).remittance_status = 'PENDING';

        const result = await createOtherRevenue(input);

        res.status(201).json({
            status: 'success',
            message: 'Other revenue record created successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] Create error:', error);

        if (error instanceof Error && error.message.includes('Invalid')) {
            res.status(400).json({
                status: 'error',
                message: error.message
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to create other revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * PATCH /api/v1/admin/other-revenue/:id
 * Update an existing other revenue record
 */
export const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid revenue ID'
            });
            return;
        }

        const input: OtherRevenueUpdateInput = {
            updated_by: req.body.updated_by || 'system'
        };

        // Only include fields that were provided
        if (req.body.revenue_type_id !== undefined) {
            input.revenue_type_id = parseInt(req.body.revenue_type_id);
        }
        if (req.body.amount !== undefined) {
            input.amount = parseFloat(req.body.amount);
        }
        if (req.body.date_recorded !== undefined) {
            input.date_recorded = req.body.date_recorded;
        }
        if (req.body.description !== undefined) {
            input.description = req.body.description;
        }
        if (req.body.payment_method !== undefined) {
            input.payment_method = req.body.payment_method;
        }
        if (req.body.payment_reference !== undefined) {
            input.payment_reference = req.body.payment_reference;
        }
        if (req.body.department_id !== undefined) {
            input.department_id = req.body.department_id === null ? undefined : parseInt(req.body.department_id);
        }
        if (req.body.remarks !== undefined) {
            input.remarks = req.body.remarks;
        }

        const result = await updateOtherRevenue(id, input);

        res.status(200).json({
            status: 'success',
            message: 'Other revenue record updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] Update error:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                res.status(404).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            if (error.message.includes('Cannot edit') || error.message.includes('Invalid')) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to update other revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/v1/admin/other-revenue/types
 * Get all other revenue types (for dropdown)
 */
export const getTypes = async (req: Request, res: Response): Promise<void> => {
    try {
        const types = await getOtherRevenueTypes();

        res.status(200).json({
            status: 'success',
            data: types
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] GetTypes error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch revenue types',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/v1/admin/other-revenue/payment
 * Record a payment for an other revenue installment
 */
export const recordPaymentHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const input: RecordPaymentInput = {
            revenueId: parseInt(req.body.revenueId),
            scheduleItemId: req.body.scheduleItemId,
            scheduleItemIds: req.body.scheduleItemIds,
            amountPaid: parseFloat(req.body.amountPaid),
            paymentDate: req.body.paymentDate,
            paymentMethod: req.body.paymentMethod,
            recordedBy: req.body.recordedBy || 'system',
            cascadeBreakdown: req.body.cascadeBreakdown
        };

        // Validation
        if (!input.revenueId || isNaN(input.revenueId)) {
            res.status(400).json({
                status: 'error',
                message: 'Revenue ID is required'
            });
            return;
        }

        if (!input.scheduleItemId) {
            res.status(400).json({
                status: 'error',
                message: 'Schedule item ID is required'
            });
            return;
        }

        if (!input.amountPaid || isNaN(input.amountPaid) || input.amountPaid <= 0) {
            res.status(400).json({
                status: 'error',
                message: 'Valid payment amount is required'
            });
            return;
        }

        if (!input.paymentDate) {
            res.status(400).json({
                status: 'error',
                message: 'Payment date is required'
            });
            return;
        }

        if (!input.paymentMethod) {
            res.status(400).json({
                status: 'error',
                message: 'Payment method is required'
            });
            return;
        }

        const result = await recordPayment(input);

        res.status(200).json({
            status: 'success',
            message: 'Payment recorded successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] RecordPayment error:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                res.status(404).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to record payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * DELETE /api/v1/admin/other-revenue/:id
 * Soft delete an other revenue record (only PENDING status allowed)
 */
export const deleteHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid revenue ID'
            });
            return;
        }

        const deletedBy = req.body.deleted_by || 'system';
        const deletionReason = req.body.reason || req.body.deletion_reason;
        const result = await softDeleteOtherRevenue(id, deletedBy, deletionReason, req);

        res.status(200).json({
            status: 'success',
            message: 'Revenue record deleted successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] Delete error:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                res.status(404).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            if (error.message.includes('PENDING')) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to delete revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * PATCH /api/v1/admin/other-revenue/:id/approve
 * Approve an other revenue record
 */
export const approve = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.body.userId || 'system';

        if (isNaN(id)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid revenue ID'
            });
            return;
        }

        const result = await approveOtherRevenue(id, userId);

        res.status(200).json({
            status: 'success',
            message: 'Revenue record approved successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] Approve error:', error);

        if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot approve'))) {
            res.status(400).json({
                status: 'error',
                message: error.message
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to approve revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * PATCH /api/v1/admin/other-revenue/:id/reject
 * Reject an other revenue record
 */
export const reject = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id);
        const { remarks, userId } = req.body;

        if (isNaN(id)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid revenue ID'
            });
            return;
        }

        const result = await rejectOtherRevenue(id, remarks, userId || 'system');

        res.status(200).json({
            status: 'success',
            message: 'Revenue record rejected successfully',
            data: result
        });
    } catch (error) {
        logger.error('[OTHER_REVENUE] Reject error:', error);

        if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Cannot reject'))) {
            res.status(400).json({
                status: 'error',
                message: error.message
            });
            return;
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to reject revenue record',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
