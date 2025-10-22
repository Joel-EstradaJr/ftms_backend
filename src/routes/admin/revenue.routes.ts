/**
 * Revenue Routes (Admin)
 * RESTful API endpoints for revenue management
 * Requires admin authentication and authorization
 */

import { Router } from 'express';
import { revenueController } from '../../controllers/revenue.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/v1/admin/revenues
 * @desc    List all revenues with filters and pagination
 * @access  Admin
 */
router.get('/', revenueController.listRevenues.bind(revenueController));

/**
 * @route   POST /api/v1/admin/revenues
 * @desc    Create a new revenue
 * @access  Admin
 */
router.post('/', revenueController.createRevenue.bind(revenueController));

/**
 * @route   GET /api/v1/admin/revenues/:id
 * @desc    Get a single revenue by ID
 * @access  Admin
 */
router.get('/:id', revenueController.getRevenueById.bind(revenueController));

/**
 * @route   PUT /api/v1/admin/revenues/:id
 * @desc    Update an existing revenue
 * @access  Admin
 */
router.put('/:id', revenueController.updateRevenue.bind(revenueController));

/**
 * @route   DELETE /api/v1/admin/revenues/:id
 * @desc    Delete a revenue
 * @access  Admin
 */
router.delete('/:id', revenueController.deleteRevenue.bind(revenueController));

export default router;
