import { Router } from 'express';
import { ReceivableController } from '../../controllers/receivable.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new ReceivableController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Admin routes - Full CRUD + payment recording
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/payment', controller.recordPayment);

export default router;
