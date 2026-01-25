/**
 * Budget Request Routes
 * 
 * Proxy routes for budget request management microservice.
 * All routes require JWT authentication.
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import * as budgetRequestService from '../../services/budgetRequest.proxy.service';
import { logger } from '../../config/logger';

const router = Router();

/**
 * @route   GET /api/finance/budget-requests
 * @desc    List all budget requests
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const filters = {
            status: req.query.status as string,
            department_id: req.query.department_id as string,
            request_type: req.query.request_type as string,
            page: req.query.page ? parseInt(req.query.page as string) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        };

        const result = await budgetRequestService.listBudgetRequests(token, filters);

        res.json({
            success: true,
            data: result.data || result,
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    } catch (error: any) {
        logger.error('Error in GET /budget-requests:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch budget requests',
        });
    }
});

/**
 * @route   GET /api/finance/budget-requests/:id
 * @desc    Get a single budget request
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;

        const result = await budgetRequestService.getBudgetRequestById(token, id);

        res.json({
            success: true,
            data: result.data || result,
        });
    } catch (error: any) {
        logger.error('Error in GET /budget-requests/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch budget request',
        });
    }
});

/**
 * @route   POST /api/finance/budget-requests/:id/approve
 * @desc    Approve a budget request
 * @access  Private (Admin only)
 */
router.post('/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;
        const { approved_amount, remarks } = req.body;

        const result = await budgetRequestService.approveBudgetRequest(token, id, {
            approved_amount,
            remarks,
        });

        res.json({
            success: true,
            message: 'Budget request approved successfully',
            data: result.data || result,
        });
    } catch (error: any) {
        logger.error('Error in POST /budget-requests/:id/approve:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to approve budget request',
        });
    }
});

/**
 * @route   POST /api/finance/budget-requests/:id/reject
 * @desc    Reject a budget request
 * @access  Private (Admin only)
 */
router.post('/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required',
            });
        }

        const result = await budgetRequestService.rejectBudgetRequest(token, id, {
            rejection_reason,
        });

        res.json({
            success: true,
            message: 'Budget request rejected successfully',
            data: result.data || result,
        });
    } catch (error: any) {
        logger.error('Error in POST /budget-requests/:id/reject:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reject budget request',
        });
    }
});

export default router;
