import { Router } from 'express';
import { ReimbursementController } from '../../controllers/reimbursement.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new ReimbursementController();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', controller.getReimbursementStats);
router.get('/', controller.listReimbursements);
router.post('/', controller.createReimbursement);
router.get('/:id', controller.getReimbursementById);
router.put('/:id', controller.updateReimbursement);
router.delete('/:id', controller.deleteReimbursement);
router.post('/:id/approve', controller.approveReimbursement);
router.post('/:id/reject', controller.rejectReimbursement);

export default router;
