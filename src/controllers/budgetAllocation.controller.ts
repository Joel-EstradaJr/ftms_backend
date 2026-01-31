// ============================================================================
// BUDGET ALLOCATION CONTROLLER - Handles HTTP requests for budget allocation
// ============================================================================

import { Request, Response } from 'express';
import budgetAllocationService from '../services/budgetAllocation.service';
import { logger } from '../config/logger';

/**
 * GET /api/v1/admin/budget-allocation
 * Get all department budgets for a specific period
 */
export async function getDepartmentBudgets(req: Request, res: Response): Promise<void> {
    try {
        const { period } = req.query;

        // Validate period format (YYYY-MM)
        if (!period || typeof period !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Budget period is required (format: YYYY-MM)',
            });
            return;
        }

        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            res.status(400).json({
                success: false,
                message: 'Invalid period format. Use YYYY-MM',
            });
            return;
        }

        const data = await budgetAllocationService.getDepartmentBudgetsByPeriod(period);

        res.json({
            success: true,
            data,
            period,
        });
    } catch (error: any) {
        logger.error('[BudgetAllocationController] getDepartmentBudgets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch department budgets',
            error: error.message,
        });
    }
}

/**
 * POST /api/v1/admin/budget-allocation/allocate
 * Allocate budget to a department
 */
export async function allocateBudget(req: Request, res: Response): Promise<void> {
    try {
        const { department_id, amount, period, notes } = req.body;
        const userId = (req as any).user?.id || 'admin'; // Get from JWT

        // Validate required fields
        if (!department_id || !amount || !period) {
            res.status(400).json({
                success: false,
                message: 'department_id, amount, and period are required',
            });
            return;
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
            return;
        }

        // Validate period format
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            res.status(400).json({
                success: false,
                message: 'Invalid period format. Use YYYY-MM',
            });
            return;
        }

        const result = await budgetAllocationService.allocateBudget(
            { department_id, amount, period, notes },
            userId
        );

        res.json({
            success: true,
            message: 'Budget allocated successfully',
            data: result,
        });
    } catch (error: any) {
        logger.error('[BudgetAllocationController] allocateBudget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to allocate budget',
            error: error.message,
        });
    }
}

/**
 * POST /api/v1/admin/budget-allocation/deduct
 * Deduct budget from a department
 */
export async function deductBudget(req: Request, res: Response): Promise<void> {
    try {
        const { department_id, amount, period, notes } = req.body;
        const userId = (req as any).user?.id || 'admin'; // Get from JWT

        // Validate required fields
        if (!department_id || !amount || !period) {
            res.status(400).json({
                success: false,
                message: 'department_id, amount, and period are required',
            });
            return;
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
            return;
        }

        // Validate period format
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            res.status(400).json({
                success: false,
                message: 'Invalid period format. Use YYYY-MM',
            });
            return;
        }

        const result = await budgetAllocationService.deductBudget(
            { department_id, amount, period, notes },
            userId
        );

        res.json({
            success: true,
            message: 'Budget deducted successfully',
            data: result,
        });
    } catch (error: any) {
        logger.error('[BudgetAllocationController] deductBudget error:', error);

        // Handle specific errors
        if (error.message.includes('Cannot deduct more than')) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Failed to deduct budget',
            error: error.message,
        });
    }
}

/**
 * GET /api/v1/admin/budget-allocation/:departmentId/history
 * Get allocation history for a department
 */
export async function getAllocationHistory(req: Request, res: Response): Promise<void> {
    try {
        const { departmentId } = req.params;
        const { type, dateFrom, dateTo, page, limit } = req.query;

        if (!departmentId) {
            res.status(400).json({
                success: false,
                message: 'Department ID is required',
            });
            return;
        }

        const filters = {
            type: type as 'Allocation' | 'Deduction' | undefined,
            dateFrom: dateFrom as string | undefined,
            dateTo: dateTo as string | undefined,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        };

        const result = await budgetAllocationService.getAllocationHistory(departmentId, filters);

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: result.total,
                totalPages: Math.ceil(result.total / filters.limit),
            },
        });
    } catch (error: any) {
        logger.error('[BudgetAllocationController] getAllocationHistory error:', error);

        if (error.message.includes('not found')) {
            res.status(404).json({
                success: false,
                message: error.message,
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Failed to fetch allocation history',
            error: error.message,
        });
    }
}
