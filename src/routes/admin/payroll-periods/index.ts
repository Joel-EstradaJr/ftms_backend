/**
 * Admin Payroll Period Routes
 * ROUTES LAYER: Define endpoints, mount middlewares → controllers, no business logic
 * 
 * Responsibilities:
 * - Define endpoint paths and HTTP methods
 * - Mount middleware (authentication, authorization, validation)
 * - Map routes to controller methods
 * - Route organization and documentation
 * 
 * Does NOT:
 * - Contain business logic (services do this)
 * - Handle requests directly (controllers do this)
 * - Process data (use services/lib for this)
 */

import { Router } from 'express';
import { AdminPayrollPeriodController } from '../../../controllers/adminPayrollPeriod.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/authorize';

const router = Router();
const controller = new AdminPayrollPeriodController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

/**
 * CRUD Operations
 */

// Create new payroll period
router.post('/', controller.createPayrollPeriod);

// List all payroll periods with filters and search
router.get('/', controller.listPayrollPeriods);

// Get payroll statistics (must be before /:id to avoid matching 'stats' as id)
router.get('/stats', controller.getPayrollStats);

// Get payroll period by ID with all employee details
router.get('/:id', controller.getPayrollPeriodById);

// Update payroll period
router.patch('/:id', controller.updatePayrollPeriod);

// Delete payroll period (soft delete)
router.delete('/:id', controller.deletePayrollPeriod);

/**
 * Workflow Operations
 */

// Process payroll - fetch employees from HR and create payroll records
router.post('/:id/process', controller.processPayroll);

// Release payroll period
router.post('/:id/release', controller.releasePayrollPeriod);

/**
 * Payslip Operations
 */

// Get payslip for specific employee payroll
router.get('/:id/payrolls/:payrollId/payslip', controller.getPayslip);

/**
 * Archive / Restore / Hard Delete Operations
 */

// Archive payroll period (soft delete with archive semantics)
router.patch('/:id/archive', controller.archivePayrollPeriod);

// Restore archived payroll period
router.patch('/:id/restore', controller.restorePayrollPeriod);

// Permanently delete archived payroll period
router.delete('/:id/permanent', controller.hardDeletePayrollPeriod);

export default router;
