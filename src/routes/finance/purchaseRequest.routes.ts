/**
 * Purchase Request Routes
 * 
 * Proxy routes for purchase request management microservice.
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import * as purchaseRequestService from '../../services/purchaseRequest.proxy.service';
import { logger } from '../../config/logger';

const router = Router();
console.log('Loading purchase request routes...');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[PurchaseRequestRouter] Received request: ${req.method} ${req.path}`);
    next();
});

/**
 * @route   GET /api/finance/purchase-requests
 * @desc    Get finance purchase requests
 * @access  Private
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const filters = {
            status: req.query.status as string,
            page: req.query.page ? parseInt(req.query.page as string) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        };

        const result = await purchaseRequestService.getFinancePurchaseRequests(token, filters);
        res.json(result);
    } catch (error: any) {
        logger.error('Error in GET /purchase-requests:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchase requests',
        });
    }
});

/**
 * @route   GET /api/finance/purchase-requests/:id
 * @desc    Get single purchase request
 * @access  Private
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;

        const result = await purchaseRequestService.getPurchaseRequestForFinance(token, id);
        res.json(result);
    } catch (error: any) {
        logger.error('Error in GET /purchase-requests/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch purchase request',
        });
    }
});

/**
 * @route   PATCH /api/finance/purchase-requests/:id
 * @desc    Update purchase request (status, remarks)
 * @access  Private
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;
        const body = req.body;

        const result = await purchaseRequestService.updatePurchaseRequestForFinance(token, id, body);
        res.json(result);
    } catch (error: any) {
        logger.error('Error in PATCH /purchase-requests/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update purchase request',
        });
    }
});

/**
 * @route   PATCH /api/finance/purchase-requests/items/bulk
 * @desc    Bulk update purchase request items
 * @access  Private
 */
router.patch('/items/bulk', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const body = req.body;

        const result = await purchaseRequestService.bulkUpdatePurchaseRequestItemsForFinance(token, body);
        res.json(result);
    } catch (error: any) {
        logger.error('Error in PATCH /purchase-requests/items/bulk:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to bulk update items',
        });
    }
});

/**
 * @route   PATCH /api/finance/purchase-requests/items/:id
 * @desc    Update single purchase request item
 * @access  Private
 */
router.patch('/items/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const token = req.headers.authorization?.substring(7) || '';
        const { id } = req.params;
        const body = req.body;

        const result = await purchaseRequestService.updatePurchaseRequestItemForFinance(token, id, body);
        res.json(result);
    } catch (error: any) {
        logger.error('Error in PATCH /purchase-requests/items/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update item',
        });
    }
});

export default router;
