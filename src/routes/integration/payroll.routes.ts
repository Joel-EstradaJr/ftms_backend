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
 * Returns available semi-monthly payroll periods
 * 
 * Query Parameters:
 * - year: Target year (optional, default: current year)
 * - month: Target month 0-11 (optional, default: current month)
 */
router.get('/hr_payroll/periods', controller.getPayrollPeriods);

export default router;
