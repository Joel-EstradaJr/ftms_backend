/**
 * Budget Request Routes
 * 
 * Proxy routes for budget request management microservice.
 * All routes require JWT authentication.
 */

import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import * as budgetRequestService from '../../services/budgetRequest.proxy.service';
import budgetAllocationService from '../../services/budgetAllocation.service';
import { logger } from '../../config/logger';

const router = Router();

/**
 * @route   GET /finance/budget-requests
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
 * @route   GET /finance/budget-requests/:id
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
 * @route   POST /finance/budget-requests/:id/approve
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

        // Auto-allocate budget to department
        if (result.success && result.data) {
            try {
                const requestData = result.data;
                const amountToAllocate = Number(approved_amount) || Number(requestData.total_amount) || 0;

                // Determine period (YYYY-MM)
                let period = requestData.budget_period;
                // If budget_period isn't present or invalid format, fall back to created_at
                if (!period || !/^\d{4}-\d{2}$/.test(period)) {
                    const date = new Date(requestData.created_at || new Date());
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    period = `${year}-${month}`;
                }

                if (amountToAllocate > 0 && requestData.department_id) {
                    await budgetAllocationService.allocateBudget({
                        department_id: requestData.department_id,
                        amount: amountToAllocate,
                        period: period,
                        notes: `Auto-allocation from Approved Budget Request #${requestData.request_code}`
                    }, req.user?.sub || 'system');

                    logger.info(`Automatically allocated ${amountToAllocate} to department ${requestData.department_id} for request ${requestData.request_code}`);
                }
            } catch (allocError: any) {
                logger.error(`Failed to auto-allocate budget for request ${id}:`, allocError);
                // Continue without failing the main request
            }
        }

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
 * @route   POST /finance/budget-requests/:id/reject
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
