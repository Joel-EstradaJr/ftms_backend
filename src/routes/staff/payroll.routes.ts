import { Router } from 'express';
import { PayrollController } from '../../controllers/payroll.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new PayrollController();

router.use(authenticate);
router.use(authorize('staff'));

/**
 * Staff Payroll Routes - View Only
 * 
 * Permissions:
 * - View their own payroll records only
 * 
 * Restrictions:
 * - Cannot create payroll
 * - Cannot edit payroll
 * - Cannot delete payroll
 * - Cannot approve/reject
 * - Cannot disburse
 * - Cannot finalize
 * - Cannot view statistics
 */

// Staff can view payroll list (filtered to their own records in controller)
router.get('/', controller.listPayrolls);

// Staff can view their payroll details
router.get('/:id', controller.getPayrollById);

export default router;
