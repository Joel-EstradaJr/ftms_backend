// Route definitions for Account Types and Chart of Accounts (Admin scope).
// Routes folder organizes HTTP endpoints; this file wires controllers & middleware.
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/authorize';
import { AccountTypeController } from '../../../controllers/accountType.controller';
import { ChartOfAccountController } from '../../../controllers/chartOfAccount.controller';

const router = Router();
const accountTypeController = new AccountTypeController();
const chartController = new ChartOfAccountController();

// Admin-only access for structural finance data.
// Authentication can be disabled via ENABLE_AUTH=false for testing
router.use(authenticate);
router.use(authorize('admin'));

// GET endpoints - retrieve Chart of Accounts and Account Types
router.get('/chart-of-accounts', chartController.getAllChartOfAccounts);

// POST endpoints - creation
router.post('/account-types', accountTypeController.createAccountType);
router.post('/chart-of-accounts', chartController.createChartOfAccount);

export default router;
