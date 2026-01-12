/**
 * PURCHASE REQUEST CONTROLLER
 * Handles HTTP endpoints for purchase request approval workflow
 */

import { Request, Response } from 'express';
import purchaseRequestService, { 
  ApproveRequestDto, 
  RejectRequestDto, 
  UpdateItemDto 
} from '../../services/purchaseRequest.service';

export class PurchaseRequestController {
  /**
   * GET /api/integration/purchase-request
   * Get all purchase requests from external API
   */
  async getAllPurchaseRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const requests = await purchaseRequestService.getAllPurchaseRequests(
        status as string | undefined
      );

      res.json({
        success: true,
        message: 'Purchase requests retrieved successfully',
        count: requests.length,
        data: requests,
      });
    } catch (error: any) {
      console.error('❌ Error fetching purchase requests:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase requests',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/integration/purchase-request/:id
   * Get single purchase request by ID
   */
  async getPurchaseRequestById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ID' });
        return;
      }

      const request = await purchaseRequestService.getPurchaseRequestById(id);

      if (!request) {
        res.status(404).json({ 
          success: false, 
          message: 'Purchase request not found' 
        });
        return;
      }

      res.json({ success: true, data: request });
    } catch (error: any) {
      console.error('❌ Error fetching purchase request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase request',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/integration/purchase-request/status/:requestCode
   * Get purchase request status by request code (for external system)
   */
  async getStatusByRequestCode(req: Request, res: Response): Promise<void> {
    try {
      const { requestCode } = req.params;

      if (!requestCode) {
        res.status(400).json({ 
          success: false, 
          message: 'Request code is required' 
        });
        return;
      }

      const status = await purchaseRequestService.getStatusByRequestCode(requestCode);

      if (!status) {
        res.status(404).json({ 
          success: false, 
          message: 'Purchase request not found' 
        });
        return;
      }

      res.json({ success: true, data: status });
    } catch (error: any) {
      console.error('❌ Error getting status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get purchase request status',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/integration/purchase-request/:id/approve
   * Approve a purchase request
   */
  async approveRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dto: ApproveRequestDto = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ID' });
        return;
      }

      if (!dto.approvedBy) {
        res.status(400).json({ 
          success: false, 
          message: 'approvedBy is required' 
        });
        return;
      }

      const updated = await purchaseRequestService.approveRequest(id, dto);

      res.json({
        success: true,
        message: 'Purchase request approved successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('❌ Error approving purchase request:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to approve purchase request',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/integration/purchase-request/:id/reject
   * Reject a purchase request
   */
  async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dto: RejectRequestDto = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ID' });
        return;
      }

      if (!dto.rejectedBy) {
        res.status(400).json({ 
          success: false, 
          message: 'rejectedBy is required' 
        });
        return;
      }

      if (!dto.rejectionReason) {
        res.status(400).json({ 
          success: false, 
          message: 'rejectionReason is required' 
        });
        return;
      }

      const updated = await purchaseRequestService.rejectRequest(id, dto);

      res.json({
        success: true,
        message: 'Purchase request rejected successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('❌ Error rejecting purchase request:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to reject purchase request',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/integration/purchase-request-item/:id
   * Update a purchase request item
   */
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const dto: UpdateItemDto = req.body;

      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ID' });
        return;
      }

      await purchaseRequestService.updateItem(id, dto);

      res.json({
        success: true,
        message: 'Item updated successfully',
      });
    } catch (error: any) {
      console.error('❌ Error updating item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item',
        error: error.message,
      });
    }
  }
}

export default new PurchaseRequestController();
