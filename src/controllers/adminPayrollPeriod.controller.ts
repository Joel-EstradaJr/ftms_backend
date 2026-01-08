/**
 * Admin Payroll Period Controller
 * CONTROLLER LAYER: Thin HTTP handlers, validate requests, call services, format responses
 * 
 * Responsibilities:
 * - Handle HTTP requests/responses
 * - Validate request data
 * - Call service layer methods
 * - Format responses with proper status codes
 * - Handle errors and pass to error middleware
 * 
 * Does NOT:
 * - Contain business logic (services do this)
 * - Make direct database calls (services do this)
 * - Call external APIs (integrations do this)
 */

import { Response, NextFunction } from 'express';
import { PayrollPeriodService } from '../services/payrollPeriod.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class AdminPayrollPeriodController {
  private service = new PayrollPeriodService();

  /**
   * POST /api/v1/admin/payroll-periods
   * Create new payroll period
   */
  createPayrollPeriod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { payroll_period_code, period_start, period_end } = req.body;

      if (!payroll_period_code || !period_start || !period_end) {
        throw new ValidationError('Missing required fields: payroll_period_code, period_start, period_end');
      }

      const period = await this.service.createPayrollPeriod(
        { payroll_period_code, period_start, period_end },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Payroll period created successfully',
        data: period,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/payroll-periods
   * List all payroll periods with filters and search
   */
  listPayrollPeriods = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        period_start,
        period_end,
        status,
        is_deleted,
        search,
        page,
        limit,
      } = req.query;

      const result = await this.service.listPayrollPeriods({
        period_start: period_start as string,
        period_end: period_end as string,
        status: status as any,
        is_deleted: is_deleted === 'true',
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/payroll-periods/:id
   * Get payroll period by ID with all employee payroll details
   */
  getPayrollPeriodById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll period ID');
      }

      const period = await this.service.getPayrollPeriodById(id);

      res.json({
        success: true,
        data: period,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/payroll-periods/:id
   * Update payroll period
   */
  updatePayrollPeriod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll period ID');
      }

      const period = await this.service.updatePayrollPeriod(
        id,
        req.body,
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Payroll period updated successfully',
        data: period,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/admin/payroll-periods/:id
   * Delete payroll period (soft delete)
   */
  deletePayrollPeriod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll period ID');
      }
      if (!reason) {
        throw new ValidationError('Deletion reason is required');
      }

      await this.service.deletePayrollPeriod(id, req.user!.sub, reason, req.user, req);

      res.json({
        success: true,
        message: 'Payroll period deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/payroll-periods/:id/process
   * Process payroll - fetch employees from HR and create payroll records
   */
  processPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll period ID');
      }

      const { period_start, period_end, employee_numbers } = req.body;

      if (!period_start || !period_end) {
        throw new ValidationError('Missing required fields: period_start, period_end');
      }

      const result = await this.service.processPayroll(
        {
          payroll_period_id: id,
          period_start,
          period_end,
          employee_numbers,
        },
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: `Payroll processed: ${result.total_processed}/${result.total_employees} employees`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/payroll-periods/:id/release
   * Release payroll period
   */
  releasePayrollPeriod = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll period ID');
      }

      const period = await this.service.releasePayrollPeriod(id, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Payroll period released successfully',
        data: period,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/payroll-periods/stats
   * Get payroll statistics
   */
  getPayrollStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getPayrollStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/payroll-periods/:id/payrolls/:payrollId/payslip
   * Get payslip for specific employee payroll
   */
  getPayslip = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payrollId = parseInt(req.params.payrollId);
      if (isNaN(payrollId)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payslip = await this.service.getPayslip(payrollId);

      res.json({
        success: true,
        data: payslip,
      });
    } catch (error) {
      next(error);
    }
  };
}
