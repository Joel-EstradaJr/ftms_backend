import { Router } from 'express';
import { LoanController } from '../../controllers/loan.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new LoanController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Admin routes - Full CRUD + approval workflow + repayment management
router.get('/stats', controller.getStats);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.post('/:id/repayment', controller.recordRepayment);
router.get('/:id/repayments', controller.getRepaymentSchedule);

export default router;
