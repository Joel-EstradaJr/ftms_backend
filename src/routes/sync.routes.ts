/**
 * SYNC ROUTES
 * 
 * Routes for external data synchronization
 * 
 * Full Swagger documentation is in: src/docs/sync.docs.ts
 */

import { Router } from 'express';
import { triggerExternalDataSync, getSyncStatus, getDepartments } from '../controllers/sync.controller';

const router = Router();

// GET /api/sync/status - Get sync status of local data tables
router.get('/status', getSyncStatus);

// GET /api/sync/departments - Get all active departments for dropdowns
router.get('/departments', getDepartments);

// POST /api/sync/external - Trigger external data synchronization
router.post('/external', triggerExternalDataSync);

export default router;
