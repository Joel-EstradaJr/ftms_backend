/**
 * INTEGRATION PAYROLL ROUTES
 * External API endpoints for payroll data
 */

import { Router } from 'express';
import { IntegrationPayrollController } from '../../controllers/integration/payroll.controller';

const router = Router();
const controller = new IntegrationPayrollController();

/**
 * GET /api/integration/hr_payroll
 * Returns payroll data for all employees (excluding Driver and PAO)
 * 
 * Query Parameters:
 * - payroll_period_start: Filter by period start date (optional)
 * - payroll_period_end: Filter by period end date (optional)
 * - employee_number: Filter by specific employee (optional)
 * - grouped: Return data grouped by period (optional, default: false)
 */
router.get('/hr_payroll', controller.getHrPayroll);

/**
 * GET /api/integration/hr_payroll/periods
 * Returns weekly payroll periods (Monday → Saturday)
 * 
 * Query Parameters:
 * - year: Target year (optional, default: current year)
 * - month: Target month 0-11 (optional, default: current month)
 */
router.get('/hr_payroll/periods', controller.getPayrollPeriods);

/**
 * POST /api/integration/hr_payroll/fetch-and-sync
 * Fetch payroll data from HR API and sync to database
 * 
 * Body:
 * - period_start: string (YYYY-MM-DD) - required
 * - period_end: string (YYYY-MM-DD) - required
 * - employee_number: string - optional
 */
router.post('/hr_payroll/fetch-and-sync', controller.fetchAndSyncPayroll.bind(controller));

/**
 * POST /api/integration/hr_payroll/refetch
 * Re-fetch payroll data from HR API (manual trigger)
 * Overwrites existing staging data and recalculates deterministically
 * 
 * Body:
 * - period_start: string (YYYY-MM-DD) - required
 * - period_end: string (YYYY-MM-DD) - required
 */
router.post('/hr_payroll/refetch', controller.refetchFromHR.bind(controller));

/**
 * POST /api/integration/hr_payroll/sync-period/:id
 * Recalculate totals for existing payroll period
 */
router.post('/hr_payroll/sync-period/:id', controller.syncPeriod.bind(controller));

/**
 * GET /api/integration/hr_payroll/by-period
 * Get payroll data for a specific period
 * 
 * Query:
 * - period_start: string (YYYY-MM-DD) - required
 * - period_end: string (YYYY-MM-DD) - required
 */
router.get('/hr_payroll/by-period', controller.getByPeriod.bind(controller));

/**
 * GET /api/integration/hr_payroll/by-employee/:employeeNumber
 * Get payroll history for specific employee
 */
router.get('/hr_payroll/by-employee/:employeeNumber', controller.getByEmployee.bind(controller));

export default router;
