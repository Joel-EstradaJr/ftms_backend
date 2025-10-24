// ============================================================================
// BUDGET INTEGRATION CONTROLLER - Handles Budget microservice requests
// ============================================================================

import { Request, Response } from 'express';
import integrationService from '../../services/integration.service';
import {
  successResponse,
  errorResponse,
  isValidFiscalPeriod,
} from '../../lib/integration.helpers';

/**
 * POST /api/integration/budgets/reserve
 * Reserve budget funds for a budget request
 */
export async function reserveBudgetFunds(req: Request, res: Response): Promise<void> {
  try {
    const {
      budgetRequestId,
      department,
      fiscalYear,
      fiscalPeriod,
      amount,
      requestCode,
      expiresAt,
      idempotencyKey,
    } = req.body;

    // Validate required fields
    if (
      !budgetRequestId ||
      !department ||
      !fiscalYear ||
      !fiscalPeriod ||
      !amount ||
      !requestCode ||
      !expiresAt ||
      !idempotencyKey
    ) {
      res.status(400).json(
        errorResponse(
          'VALIDATION_ERROR',
          'Missing required fields',
          { required: ['budgetRequestId', 'department', 'fiscalYear', 'fiscalPeriod', 'amount', 'requestCode', 'expiresAt', 'idempotencyKey'] }
        )
      );
      return;
    }

    // Validate fiscal period format
    if (!isValidFiscalPeriod(fiscalPeriod)) {
      res.status(400).json(
        errorResponse('INVALID_FISCAL_PERIOD', 'Fiscal period must be in format YYYY-MM')
      );
      return;
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json(
        errorResponse('INVALID_AMOUNT', 'Amount must be a positive number')
      );
      return;
    }

    // Reserve funds
    const result = await integrationService.reserveBudgetFunds({
      budgetRequestId,
      department,
      fiscalYear,
      fiscalPeriod,
      amount,
      requestCode,
      expiresAt,
      idempotencyKey,
    });

    res.status(200).json(successResponse(result));
  } catch (error: any) {
    console.error('[BudgetIntegrationController] Reserve error:', error);

    if (error.message.startsWith('INSUFFICIENT_FUNDS')) {
      res.status(409).json(errorResponse('INSUFFICIENT_FUNDS', error.message));
    } else if (error.message.startsWith('BUDGET_NOT_FOUND')) {
      res.status(404).json(errorResponse('BUDGET_NOT_FOUND', error.message));
    } else {
      res.status(500).json(
        errorResponse('RESERVATION_FAILED', 'Failed to reserve budget funds', {
          error: error.message,
        })
      );
    }
  }
}

/**
 * GET /api/integration/budgets/department/:department
 * Get department budget information
 */
export async function getDepartmentBudget(req: Request, res: Response): Promise<void> {
  try {
    const { department } = req.params;
    const { fiscalYear, fiscalPeriod } = req.query;

    // Validate required query params
    if (!fiscalYear || !fiscalPeriod) {
      res.status(400).json(
        errorResponse('MISSING_PARAMETERS', 'fiscalYear and fiscalPeriod are required')
      );
      return;
    }

    // Validate fiscal period format
    if (!isValidFiscalPeriod(fiscalPeriod as string)) {
      res.status(400).json(
        errorResponse('INVALID_FISCAL_PERIOD', 'Fiscal period must be in format YYYY-MM')
      );
      return;
    }

    const budget = await integrationService.getDepartmentBudget(
      department,
      parseInt(fiscalYear as string, 10),
      fiscalPeriod as string
    );

    if (!budget) {
      res.status(404).json(
        errorResponse('BUDGET_NOT_FOUND', 'No budget found for specified criteria')
      );
      return;
    }

    res.status(200).json(successResponse(budget));
  } catch (error: any) {
    console.error('[BudgetIntegrationController] Get budget error:', error);
    res.status(500).json(
      errorResponse('FETCH_FAILED', 'Failed to fetch department budget', {
        error: error.message,
      })
    );
  }
}
