/**
 * APPROVAL ROUTES
 * Integration endpoints for cash advance approval workflow
 */

import { Router } from 'express';
import approvalController from '../../controllers/integration/approval.controller';

const router = Router();

/**
 * POST /api/integration/approval/cash-advance
 * Receive cash advance request from EMS webhook
 * 
 * Body: CreateCashAdvanceDto from EMS
 */
router.post('/cash-advance', approvalController.receiveCashAdvance.bind(approvalController));

/**
 * GET /api/integration/approval/cash-advance
 * Get all cash advance requests
 * 
 * Query:
 * - status: Filter by status (PENDING, APPROVED, REJECTED, DISBURSED)
 */
router.get('/cash-advance', approvalController.getAllCashAdvances.bind(approvalController));

/**
 * GET /api/integration/approval/cash-advance/:id
 * Get single cash advance request by ID
 */
router.get('/cash-advance/:id', approvalController.getCashAdvanceById.bind(approvalController));

/**
 * PUT /api/integration/approval/cash-advance/:id/status
 * Update cash advance status (APPROVED/REJECTED)
 * This triggers a webhook back to EMS Gateway
 * 
 * Body:
 * - status: 'APPROVED' | 'REJECTED' (required)
 * - approvedAmount: number (required if APPROVED)
 * - rejectionReason: string (required if REJECTED)
 * - reviewedBy: string (optional)
 * - effectiveDate: string ISO date (optional, for deduction)
 * - endDate: string ISO date (optional, for deduction)
 */
router.put('/cash-advance/:id/status', approvalController.updateStatus.bind(approvalController));

/**
 * PUT /api/integration/approval/cash-advance/sync/:requestNumber
 * Update cash advance request from EMS webhook (by request number)
 * 
 * Body:
 * - amount: number (optional)
 * - purpose: string (optional)
 * - repaymentMethod: string (optional)
 * - repaymentFrequency: string (optional)
 * - numberOfRepaymentPeriods: number (optional)
 */
router.put('/cash-advance/sync/:requestNumber', approvalController.updateCashAdvance.bind(approvalController));

/**
 * DELETE /api/integration/approval/cash-advance/sync/:requestNumber
 * Delete cash advance request from EMS webhook (by request number)
 */
router.delete('/cash-advance/sync/:requestNumber', approvalController.deleteCashAdvance.bind(approvalController));

export default router;

