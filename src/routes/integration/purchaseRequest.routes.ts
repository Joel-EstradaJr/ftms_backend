/**
 * PURCHASE REQUEST ROUTES
 * Integration endpoints for purchase request approval workflow
 * 
 * External API: PURCHASE_REQUEST_API_URL
 * Available endpoints:
 * - GET  /purchase-requests - Get all purchase requests
 * - GET  /purchase-requests/:id - Get single purchase request
 * - PATCH /purchase-requests/:id - Update purchase request (status, finance_remarks)
 * - PATCH /purchase-request-items/:id - Update item (status, quantity, adjustmentReason)
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
 * Get single purchase request by ID for finance
 */
router.get('/:id', purchaseRequestController.getPurchaseRequestById.bind(purchaseRequestController));

/**
 * PATCH /api/integration/purchase-request/:id
 * Update a purchase request (finance can update status and finance_remarks)
 * 
 * Body:
 * - status: string (optional) - PENDING, APPROVED, REJECTED, ADJUSTED, CLOSED
 * - finance_remarks: string (optional)
 * - updated_by: string (optional)
 */
router.patch('/:id', purchaseRequestController.updatePurchaseRequest.bind(purchaseRequestController));

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
 * PATCH /api/integration/purchase-request-item/:id
 * Update a purchase request item (finance can update item status, quantity, adjustmentReason)
 * 
 * Body:
 * - status: string (optional)
 * - quantity: number (optional)
 * - adjustmentReason: string (optional)
 */
router.patch('/item/:id', purchaseRequestController.updateItem.bind(purchaseRequestController));

/**
 * PUT /api/integration/purchase-request-item/:id (legacy - use PATCH instead)
 * Update a purchase request item
 */
router.put('/item/:id', purchaseRequestController.updateItem.bind(purchaseRequestController));

export default router;
