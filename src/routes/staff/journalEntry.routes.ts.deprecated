import { Router } from 'express';
import { JournalEntryController } from '../../controllers/journalEntry.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new JournalEntryController();

// Apply authentication and staff authorization to all routes
router.use(authenticate);
router.use(authorize('staff'));

// Staff routes - Read-only access to journal entries
router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;
