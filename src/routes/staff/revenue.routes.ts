/**
 * Revenue Routes (Staff/Non-Admin)
 * Limited API endpoints for revenue management
 * Staff can view and create records but cannot edit or delete
 * 
 * Allowed Actions (per your requirements):
 * - View Main Table
 * - View Detailed Modal
 * - Add New Record
 * - Filter (limited parameters)
 * - Search (limited parameters)
 * - Sort (by date, amount)
 * - Pagination
 * 
 * Restrictions:
 * - Cannot edit records
 * - Cannot delete records
 * - Cannot export data
 * - Cannot mark as verified/unverified
 * - Cannot approve/reject
 */

import { Router } from 'express';
import { revenueController } from '../../controllers/revenue.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes require authentication and staff role
router.use(authenticate);
router.use(authorize('staff'));

/**
 * @route   GET /api/v1/staff/revenues
 * @desc    List revenues with limited filters (staff view)
 * @access  Staff
 * @filters Limited to: date range, revenueType, search, sort, pagination
 */
router.get('/', revenueController.listRevenues.bind(revenueController));

/**
 * @route   POST /api/v1/staff/revenues
 * @desc    Create a new revenue (staff can add records)
 * @access  Staff
 */
router.post('/', revenueController.createRevenue.bind(revenueController));

/**
 * @route   GET /api/v1/staff/revenues/:id
 * @desc    Get a single revenue by ID (view detailed modal)
 * @access  Staff
 */
router.get('/:id', revenueController.getRevenueById.bind(revenueController));

// Note: PUT (edit) and DELETE routes are NOT available for staff
// Staff cannot:
// - Edit existing records (PUT /:id)
// - Delete records (DELETE /:id)
// - Export data
// - Mark as verified/unverified
// - Approve/reject records
// These actions are admin-only

export default router;
