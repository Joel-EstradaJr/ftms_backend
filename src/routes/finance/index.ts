import { Router } from 'express';
import { getPayrollIntegrationData } from '../../controllers/finance.controller';

const router = Router();

/**
 * Finance Integration Routes
 * These routes are for external finance system integration
 */

// Payroll integration endpoint
router.get('/v2/payroll-integration', getPayrollIntegrationData);

export default router;
