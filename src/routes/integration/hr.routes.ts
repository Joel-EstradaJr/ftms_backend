/**
 * HR INTEGRATION ROUTES
 * Handles employee data synchronization from external HR system
 */

import { Router } from 'express';
import { HRIntegrationController } from '@/controllers/integration/hr.controller';

const router = Router();
const controller = new HRIntegrationController();

// Employee Synchronization
router.post('/sync-employees', (req, res) => controller.syncEmployees(req, res));
router.post('/fetch-and-sync', (req, res) => controller.fetchAndSync(req, res));

// Employee Queries
router.get('/employees/by-department/:departmentId', (req, res) => controller.getByDepartment(req, res));
router.get('/employees/by-position', (req, res) => controller.getByPosition(req, res));

export default router;
