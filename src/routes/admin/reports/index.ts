/**
 * Report Routes
 * 
 * Provides endpoints for financial reports:
 * - GET /journal-entry - Journal Entry Report with transactions and lines
 * - GET /income-statement - Income Statement with revenue, expenses, and computed totals
 * - GET /financial-position - Statement of Financial Position (Balance Sheet)
 * - GET /configuration - System configuration for report headers
 * - GET /scenarios - Available scenario filter options
 */

import { Router } from 'express';
import { ReportController } from '../../../controllers/report.controller';

const router = Router();

/**
 * @route GET /api/v1/reports/journal-entry
 * @desc Get Journal Entry Report with grouped transactions
 * @access Public (add authentication as needed)
 */
router.get('/journal-entry', ReportController.getJournalEntryReport);

/**
 * @route GET /api/v1/reports/income-statement
 * @desc Get Income Statement Report
 * @access Public (add authentication as needed)
 */
router.get('/income-statement', ReportController.getIncomeStatementReport);

/**
 * @route GET /api/v1/reports/financial-position
 * @desc Get Financial Position (Balance Sheet) Report
 * @access Public (add authentication as needed)
 */
router.get('/financial-position', ReportController.getFinancialPositionReport);

/**
 * @route GET /api/v1/reports/configuration
 * @desc Get system configuration for report headers
 * @access Public (add authentication as needed)
 */
router.get('/configuration', ReportController.getSystemConfiguration);

/**
 * @route GET /api/v1/reports/scenarios
 * @desc Get available scenario options for filtering
 * @access Public (add authentication as needed)
 */
router.get('/scenarios', ReportController.getScenarioOptions);

export default router;
