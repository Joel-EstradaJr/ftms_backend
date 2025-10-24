// ============================================================================
// INTEGRATION SERVICE - Business logic for cross-service integration
// ============================================================================

import { prisma } from '../config/database';

export interface BudgetReservationRequest {
  budgetRequestId: number;
  department: string;
  fiscalYear: number;
  fiscalPeriod: string;
  amount: number;
  requestCode: string;
  expiresAt: string;
  idempotencyKey: string;
}

export interface BudgetReservationResponse {
  reserved: boolean;
  reservationId: number;
  reservedAmount: number;
  reservedAt: string;
  message?: string;
}

export interface DepartmentBudgetInfo {
  id: number;
  department: string;
  fiscalYear: number;
  fiscalPeriod: string;
  allocatedAmount: number;
  usedAmount: number;
  reservedAmount: number;
  remainingAmount: number;
  periodStart: Date;
  periodEnd: Date;
}

class IntegrationService {
  /**
   * Reserve budget funds for a budget request
   * Implements idempotency and fund availability checks
   */
  async reserveBudgetFunds(
    request: BudgetReservationRequest
  ): Promise<BudgetReservationResponse> {
    try {
      // Check for existing reservation with same idempotency key
      const existingReservation = await this.checkIdempotency(request.idempotencyKey);
      if (existingReservation) {
        return existingReservation;
      }

      // Find the department budget
      const budget = await this.findDepartmentBudget(
        request.department,
        request.fiscalYear,
        request.fiscalPeriod
      );

      if (!budget) {
        throw new Error('BUDGET_NOT_FOUND: No budget allocation found for department');
      }

      // Calculate reservation amount (5% buffer)
      const reservationAmount = request.amount * 1.05;

      // Check if sufficient funds are available
      const availableFunds = budget.allocatedAmount - budget.usedAmount - budget.reservedAmount;
      if (availableFunds < reservationAmount) {
        throw new Error(
          `INSUFFICIENT_FUNDS: Available: ${availableFunds}, Required: ${reservationAmount}`
        );
      }

      // Create reservation record (you'll need to create this table in your schema)
      const reservation = await prisma.$executeRaw`
        INSERT INTO budget_reservations (
          budget_id, budget_request_id, request_code, reserved_amount,
          expires_at, idempotency_key, created_at
        ) VALUES (
          ${budget.id}, ${request.budgetRequestId}, ${request.requestCode},
          ${reservationAmount}, ${new Date(request.expiresAt)},
          ${request.idempotencyKey}, NOW()
        )
        RETURNING id, reserved_amount, created_at
      ` as any;

      // Update budget reserved amount
      await prisma.$executeRaw`
        UPDATE budgets
        SET reserved_amount = reserved_amount + ${reservationAmount},
            updated_at = NOW()
        WHERE id = ${budget.id}
      `;

      return {
        reserved: true,
        reservationId: reservation[0]?.id || 0,
        reservedAmount: reservationAmount,
        reservedAt: new Date().toISOString(),
        message: 'Budget successfully reserved',
      };
    } catch (error: any) {
      console.error('[IntegrationService] Reserve funds error:', error);
      throw error;
    }
  }

  /**
   * Get department budget information
   */
  async getDepartmentBudget(
    department: string,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<DepartmentBudgetInfo | null> {
    try {
      const budget = await this.findDepartmentBudget(department, fiscalYear, fiscalPeriod);
      return budget;
    } catch (error: any) {
      console.error('[IntegrationService] Get budget error:', error);
      throw error;
    }
  }

  /**
   * Helper: Find department budget
   */
  private async findDepartmentBudget(
    department: string,
    fiscalYear: number,
    fiscalPeriod: string
  ): Promise<DepartmentBudgetInfo | null> {
    // This is a placeholder - adjust based on your actual schema
    const result = await prisma.$queryRaw<DepartmentBudgetInfo[]>`
      SELECT 
        id, department, fiscal_year as "fiscalYear", fiscal_period as "fiscalPeriod",
        allocated_amount as "allocatedAmount", used_amount as "usedAmount",
        reserved_amount as "reservedAmount",
        (allocated_amount - used_amount - reserved_amount) as "remainingAmount",
        period_start as "periodStart", period_end as "periodEnd"
      FROM budgets
      WHERE department = ${department}
        AND fiscal_year = ${fiscalYear}
        AND fiscal_period = ${fiscalPeriod}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Helper: Check idempotency
   */
  private async checkIdempotency(
    idempotencyKey: string
  ): Promise<BudgetReservationResponse | null> {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id, reserved_amount, created_at
      FROM budget_reservations
      WHERE idempotency_key = ${idempotencyKey}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return {
        reserved: true,
        reservationId: existing[0].id,
        reservedAmount: existing[0].reserved_amount,
        reservedAt: existing[0].created_at.toISOString(),
        message: 'Idempotent request - returning existing reservation',
      };
    }

    return null;
  }
}

export default new IntegrationService();
