/**
 * Report Controller
 * 
 * Handles HTTP requests for financial reports:
 * - GET /api/v1/reports/journal-entry - Journal Entry Report
 * - GET /api/v1/reports/income-statement - Income Statement Report
 * - GET /api/v1/reports/financial-position - Financial Position Report
 * - GET /api/v1/reports/configuration - System Configuration for reports
 * - GET /api/v1/reports/scenarios - Available scenario filter options
 */

import { Request, Response, NextFunction } from 'express';
import { ReportService, JournalEntryReportFilters } from '../services/report.service';
import { logger } from '../config/logger';

export class ReportController {
  /**
   * Get Journal Entry Report
   * 
   * Query Parameters:
   * - page (number): Page number for pagination (default: 1)
   * - limit (number): Items per page (default: 10)
   * - dateFrom (string): Start date filter (ISO format)
   * - dateTo (string): End date filter (ISO format)
   * - scenario (string[]): Filter by scenario names
   * - accountType (string[]): Filter by account type (asset, liability, revenue, expense)
   * - amountMin (number): Minimum amount filter
   * - amountMax (number): Maximum amount filter
   * - status (string): Journal entry status filter
   */
  static async getJournalEntryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const filters: JournalEntryReportFilters = {
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as string,
      };

      // Handle array parameters
      if (req.query.scenario) {
        filters.scenario = Array.isArray(req.query.scenario)
          ? (req.query.scenario as string[])
          : [req.query.scenario as string];
      }

      if (req.query.accountType) {
        filters.accountType = Array.isArray(req.query.accountType)
          ? (req.query.accountType as string[])
          : [req.query.accountType as string];
      }

      // Handle numeric parameters
      if (req.query.amountMin) {
        filters.amountMin = parseFloat(req.query.amountMin as string);
      }
      if (req.query.amountMax) {
        filters.amountMax = parseFloat(req.query.amountMax as string);
      }

      const result = await ReportService.getJournalEntryReport(filters, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getJournalEntryReport:', error);
      next(error);
    }
  }

  /**
   * Get Income Statement Report
   * 
   * Query Parameters:
   * - dateFrom (string): Start date filter (ISO format)
   * - dateTo (string): End date filter (ISO format)
   */
  static async getIncomeStatementReport(req: Request, res: Response, next: NextFunction) {
    try {
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const result = await ReportService.getIncomeStatementReport(dateFrom, dateTo);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getIncomeStatementReport:', error);
      next(error);
    }
  }

  /**
   * Get Financial Position (Balance Sheet) Report
   * 
   * Query Parameters:
   * - asOfDate (string): As-of date for the report (ISO format, default: today)
   */
  static async getFinancialPositionReport(req: Request, res: Response, next: NextFunction) {
    try {
      const asOfDate = req.query.asOfDate as string;

      const result = await ReportService.getFinancialPositionReport(asOfDate);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getFinancialPositionReport:', error);
      next(error);
    }
  }

  /**
   * Get System Configuration for report headers
   */
  static async getSystemConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getSystemConfiguration();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getSystemConfiguration:', error);
      next(error);
    }
  }

  /**
   * Get available scenario options for filtering
   */
  static async getScenarioOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const scenarios = await ReportService.getScenarioOptions();

      res.json({
        success: true,
        data: scenarios,
      });
    } catch (error) {
      logger.error('Error in getScenarioOptions:', error);
      next(error);
    }
  }
}
