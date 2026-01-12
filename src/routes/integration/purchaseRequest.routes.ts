/**
 * PURCHASE REQUEST ROUTES
 * Integration endpoints for purchase request approval workflow
 */

import { Router } from 'express';
import purchaseRequestController from '../../controllers/integration/purchaseRequest.controller';

const router = Router();

/**
 * GET /api/integration/purchase-request
 * Get all purchase requests from external API
 * 
 * Query:
 * - status: Filter by status (PENDING, APPROVED, REJECTED, etc.)
 */
router.get('/', purchaseRequestController.getAllPurchaseRequests.bind(purchaseRequestController));

/**
 * GET /api/integration/purchase-request/status/:requestCode
 * Get purchase request status by request code (for external system to check)
 */
router.get('/status/:requestCode', purchaseRequestController.getStatusByRequestCode.bind(purchaseRequestController));

/**
 * GET /api/integration/purchase-request/:id
 * Get single purchase request by ID
 */
router.get('/:id', purchaseRequestController.getPurchaseRequestById.bind(purchaseRequestController));

/**
 * PUT /api/integration/purchase-request/:id/approve
 * Approve a purchase request
 * 
 * Body:
 * - financeRemarks: string (optional)
 * - approvedBy: string (required)
 * - itemApprovals: Array<{ itemId, approvedQuantity, adjustmentReason }> (optional)
 */
router.put('/:id/approve', purchaseRequestController.approveRequest.bind(purchaseRequestController));

/**
 * PUT /api/integration/purchase-request/:id/reject
 * Reject a purchase request
 * 
 * Body:
 * - financeRemarks: string (optional)
 * - rejectionReason: string (required)
 * - rejectedBy: string (required)
 */
router.put('/:id/reject', purchaseRequestController.rejectRequest.bind(purchaseRequestController));

/**
 * PUT /api/integration/purchase-request-item/:id
 * Update a purchase request item
 * 
 * Body:
 * - status: string (optional)
 * - quantity: number (optional)
 * - adjustmentReason: string (optional)
 */
router.put('/item/:id', purchaseRequestController.updateItem.bind(purchaseRequestController));

export default router;
