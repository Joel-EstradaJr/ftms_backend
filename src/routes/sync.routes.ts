/**
 * SYNC ROUTES
 * 
 * Routes for external data synchronization
 * 
 * Full Swagger documentation is in: src/docs/sync.docs.ts
 */

import { Router } from 'express';
import { triggerExternalDataSync, getSyncStatus } from '../controllers/sync.controller';

const router = Router();

// GET /api/sync/status - Get sync status of local data tables
router.get('/status', getSyncStatus);

// POST /api/sync/external - Trigger external data synchronization
router.post('/external', triggerExternalDataSync);

export default router;
