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

// ========== CHART OF ACCOUNTS ENDPOINTS ==========

// GET endpoints - retrieve Chart of Accounts
router.get('/chart-of-accounts', chartController.getAllChartOfAccounts);
router.get('/chart-of-accounts/suggest-code/:accountTypeId', chartController.getSuggestedAccountCode);
router.get('/chart-of-accounts/:id', chartController.getChartOfAccountById);

// POST endpoints - create new Chart of Account
router.post('/chart-of-accounts', chartController.createChartOfAccount);

// PATCH endpoints - update, archive, and restore
router.patch('/chart-of-accounts/:id', chartController.updateChartOfAccount);
router.patch('/chart-of-accounts/:id/archive', chartController.archiveChartOfAccount);
router.patch('/chart-of-accounts/:id/restore', chartController.restoreChartOfAccount);

// DELETE endpoints - hard delete Chart of Account
router.delete('/chart-of-accounts/:id', chartController.deleteChartOfAccount);

// ========== ACCOUNT TYPES ENDPOINTS ==========

// POST endpoints - create new Account Type
router.post('/account-types', accountTypeController.createAccountType);

export default router;
