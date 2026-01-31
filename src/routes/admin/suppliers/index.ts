/**
 * SUPPLIER ROUTES
 * Handles supplier synchronization, webhook, and vendor management
 */

import { Router, Request, Response } from 'express';
import { supplierSyncService } from '../../../services/supplierSync.service';

const router = Router();

/**
 * GET /
 * Get all suppliers
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const suppliers = await supplierSyncService.getSuppliers();
        res.json({
            success: true,
            data: suppliers,
        });
    } catch (error: any) {
        console.error('[Suppliers] Error fetching suppliers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch suppliers',
            error: error.message,
        });
    }
});

/**
 * GET /vendors
 * Get unified vendor list for dropdown
 */
router.get('/vendors', async (req: Request, res: Response) => {
    try {
        const vendors = await supplierSyncService.getVendorList();
        res.json({
            success: true,
            data: vendors,
        });
    } catch (error: any) {
        console.error('[Suppliers] Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendors',
            error: error.message,
        });
    }
});

/**
 * POST /sync
 * Sync suppliers from Inventory API
 */
router.post('/sync', async (req: Request, res: Response) => {
    try {
        const result = await supplierSyncService.syncFromInventory();
        res.json({
            success: true,
            message: `Synced ${result.synced} suppliers`,
            data: result,
        });
    } catch (error: any) {
        console.error('[Suppliers] Sync error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync suppliers',
            error: error.message,
        });
    }
});

/**
 * POST /
 * Webhook: Create/update supplier from Inventory
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const supplierData = req.body;

        // Validate required fields
        if (!supplierData.supplier_id || !supplierData.supplier_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: supplier_id and supplier_name',
            });
        }

        const result = await supplierSyncService.handleWebhook(supplierData);
        res.json({
            success: true,
            message: 'Supplier created/updated successfully',
            data: result,
        });
    } catch (error: any) {
        console.error('[Suppliers] Webhook error:', error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /vendors
 * Create a standalone vendor (not linked to supplier)
 */
router.post('/vendors', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const createdBy = req.body.created_by || 'admin';

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Vendor name is required',
            });
        }

        const vendor = await supplierSyncService.createStandaloneVendor(name, createdBy);
        res.json({
            success: true,
            message: 'Vendor created successfully',
            data: vendor,
        });
    } catch (error: any) {
        console.error('[Suppliers] Create vendor error:', error);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
