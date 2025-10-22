import { Router } from 'express';
import { PayableController } from '../../controllers/payable.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new PayableController();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(authorize('staff'));

// Staff routes - Read-only access to payables
router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;
