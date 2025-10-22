import { Router } from 'express';
import { AssetController } from '../../controllers/asset.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new AssetController();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(authorize('staff'));

// Staff routes - Read-only access to assets
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/depreciation', controller.calculateDepreciation);

export default router;
