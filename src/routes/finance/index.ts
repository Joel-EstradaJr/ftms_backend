import { Router } from 'express';
import { getPayrollIntegrationData } from '../../controllers/finance.controller';
import budgetRequestRoutes from './budgetRequest.routes';

const router = Router();

/**
 * Finance Integration Routes
 * These routes are for external finance system integration
 */

// Payroll integration endpoint
router.get('/v2/payroll-integration', getPayrollIntegrationData);

// Budget request management (proxied to microservice)
router.use('/budget-requests', budgetRequestRoutes);

export default router;
