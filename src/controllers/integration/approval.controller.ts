/**
 * APPROVAL CONTROLLER
 * Handles cash advance request approval endpoints
 */

import { Request, Response } from 'express';
import approvalService, { CreateCashAdvanceDto, UpdateStatusDto } from '../../services/approval.service';

export class ApprovalController {
    /**
     * POST /api/integration/approval/cash-advance
     * Receive cash advance request from EMS webhook
     */
    async receiveCashAdvance(req: Request, res: Response): Promise<void> {
        try {
            const dto: CreateCashAdvanceDto = req.body;

            if (!dto.cashAdvanceRequestNumber || !dto.employeeNumber || !dto.amount) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: cashAdvanceRequestNumber, employeeNumber, amount',
                });
                return;
            }

            const result = await approvalService.receiveCashAdvance(dto);

            if (!result.success) {
                res.status(409).json(result);
                return;
            }

            res.status(201).json(result);
        } catch (error: any) {
            console.error('❌ Error receiving cash advance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to receive cash advance request',
                error: error.message,
            });
        }
    }

    /**
     * GET /api/integration/approval/cash-advance
     * Get all cash advance requests
     */
    async getAllCashAdvances(req: Request, res: Response): Promise<void> {
        try {
            const { status } = req.query;
            const requests = await approvalService.getAllCashAdvances(status as string);

            res.json({
                success: true,
                count: requests.length,
                data: requests,
            });
        } catch (error: any) {
            console.error('❌ Error fetching cash advances:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cash advance requests',
                error: error.message,
            });
        }
    }

    /**
     * GET /api/integration/approval/cash-advance/:id
     * Get single cash advance request by ID
     */
    async getCashAdvanceById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ success: false, message: 'Invalid ID' });
                return;
            }

            const request = await approvalService.getCashAdvanceById(id);

            if (!request) {
                res.status(404).json({ success: false, message: 'Cash advance request not found' });
                return;
            }

            res.json({ success: true, data: request });
        } catch (error: any) {
            console.error('❌ Error fetching cash advance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cash advance request',
                error: error.message,
            });
        }
    }

    /**
     * PUT /api/integration/approval/cash-advance/:id/status
     * Update cash advance status (APPROVED/REJECTED)
     * This triggers a webhook to EMS Gateway
     */
    async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const dto: UpdateStatusDto = req.body;

            if (isNaN(id)) {
                res.status(400).json({ success: false, message: 'Invalid ID' });
                return;
            }

            if (!dto.status || !['APPROVED', 'REJECTED'].includes(dto.status)) {
                res.status(400).json({
                    success: false,
                    message: 'Status must be APPROVED or REJECTED',
                });
                return;
            }

            if (dto.status === 'APPROVED' && !dto.approvedAmount) {
                res.status(400).json({
                    success: false,
                    message: 'Approved amount is required when approving',
                });
                return;
            }

            if (dto.status === 'REJECTED' && !dto.rejectionReason) {
                res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required when rejecting',
                });
                return;
            }

            const updated = await approvalService.updateStatus(id, dto);

            res.json({
                success: true,
                message: `Cash advance ${dto.status.toLowerCase()} successfully`,
                data: updated,
            });
        } catch (error: any) {
            console.error('❌ Error updating cash advance status:', error);

            if (error.message.includes('not found')) {
                res.status(404).json({ success: false, message: error.message });
                return;
            }

            if (error.message.includes('Cannot update status')) {
                res.status(400).json({ success: false, message: error.message });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update cash advance status',
                error: error.message,
            });
        }
    }

    /**
     * PUT /api/integration/approval/cash-advance/:requestNumber
     * Update cash advance request from EMS webhook (by request number)
     */
    async updateCashAdvance(req: Request, res: Response): Promise<void> {
        try {
            const requestNumber = req.params.requestNumber;

            if (!requestNumber) {
                res.status(400).json({ success: false, message: 'Request number is required' });
                return;
            }

            const result = await approvalService.updateByRequestNumber(requestNumber, req.body);

            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('❌ Error updating cash advance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update cash advance request',
                error: error.message,
            });
        }
    }

    /**
     * DELETE /api/integration/approval/cash-advance/:requestNumber
     * Delete cash advance request from EMS webhook (by request number)
     */
    async deleteCashAdvance(req: Request, res: Response): Promise<void> {
        try {
            const requestNumber = req.params.requestNumber;

            if (!requestNumber) {
                res.status(400).json({ success: false, message: 'Request number is required' });
                return;
            }

            const result = await approvalService.deleteByRequestNumber(requestNumber);

            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('❌ Error deleting cash advance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete cash advance request',
                error: error.message,
            });
        }
    }
}

export default new ApprovalController();
