import { Router } from 'express';
import { LoanController } from '../../controllers/loan.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new LoanController();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(authorize('staff'));

// Staff routes - Request loans + view own loans
router.get('/', controller.list); // Filter by entityId on backend based on user
router.post('/', controller.create); // Submit loan request
router.get('/:id', controller.getById); // View loan details
router.get('/:id/repayments', controller.getRepaymentSchedule); // View repayment schedule

export default router;
