import { Router } from 'express';
import { getPayrollIntegrationData } from '../../controllers/finance.controller';
import budgetRequestRoutes from './budgetRequest.routes';
import purchaseRequestRoutes from './purchaseRequest.routes';

const router = Router();

// Debug middleware
router.use((req, res, next) => {
    console.log(`[FinanceRouter] Received request: ${req.method} ${req.path} (Original: ${req.originalUrl})`);
    next();
});

router.get('/ping', (req, res) => {
    res.json({ message: 'Finance router is working' });
});

/**
 * Finance Integration Routes
 * These routes are for external finance system integration
 */

// Payroll integration endpoint
router.get('/v2/payroll-integration', getPayrollIntegrationData);

// Budget request management (proxied to microservice)
router.use('/budget-requests', budgetRequestRoutes);

// Purchase request management (proxied to microservice)
router.use('/purchase-requests', purchaseRequestRoutes);

export default router;
