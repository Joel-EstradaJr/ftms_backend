import { Router } from 'express';
import { PayrollController } from '../../controllers/payroll.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new PayrollController();

router.use(authenticate);
router.use(authorize('admin'));

/**
 * Admin Payroll Routes - Full Access
 * 
 * Permissions:
 * - View all payroll records
 * - Create payroll records
 * - Edit payroll records (before finalization)
 * - Delete payroll records (before disbursement)
 * - Approve/Reject payroll
 * - Disburse payroll to employees
 * - Finalize payroll (lock for editing)
 * - View payroll statistics
 */

router.get('/stats', controller.getPayrollStats);
router.get('/', controller.listPayrolls);
router.post('/', controller.createPayroll);
router.get('/:id', controller.getPayrollById);
router.put('/:id', controller.updatePayroll);
router.delete('/:id', controller.deletePayroll);
router.post('/:id/approve', controller.approvePayroll);
router.post('/:id/reject', controller.rejectPayroll);
router.post('/:id/disburse', controller.disbursePayroll);
router.post('/:id/finalize', controller.finalizePayroll);

export default router;
