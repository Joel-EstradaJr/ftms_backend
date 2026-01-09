import { Router } from 'express';
import { BudgetController } from '../../controllers/budget.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new BudgetController();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(authorize('staff'));

// Staff routes - View department budgets only (read-only)
router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;
