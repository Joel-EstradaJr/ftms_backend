import { Response, NextFunction } from 'express';
import { PayrollService } from '../services/payroll.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class PayrollController {
  private service = new PayrollService();

  createPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { employeeId, periodStart, periodEnd, baseSalary, allowances, deductions, netPay, disbursementDate } = req.body;

      if (!employeeId || !periodStart || !periodEnd || !baseSalary || netPay === undefined) {
        throw new ValidationError('Missing required fields');
      }

      const payroll = await this.service.createPayroll(
        { employeeId, periodStart, periodEnd, baseSalary, allowances, deductions, netPay, disbursementDate },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Payroll created successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  listPayrolls = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { employeeId, status, periodStart, periodEnd, isDisbursed, isFinalized, isDeleted, page, limit } = req.query;

      const filters = {
        employeeId: employeeId ? parseInt(employeeId as string) : undefined,
        status: status as any,
        periodStart: periodStart as string,
        periodEnd: periodEnd as string,
        isDisbursed: isDisbursed === 'true',
        isFinalized: isFinalized === 'true',
        isDeleted: isDeleted === 'true',
      };

      const result = await this.service.listPayrolls(
        filters,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 10
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  getPayrollById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payroll = await this.service.getPayrollById(id);

      res.json({
        success: true,
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payroll = await this.service.updatePayroll(id, req.body, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Payroll updated successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  deletePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }
      if (!reason) {
        throw new ValidationError('Deletion reason is required');
      }

      await this.service.deletePayroll(id, req.user!.sub, reason, req.user, req);

      res.json({
        success: true,
        message: 'Payroll deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  approvePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payroll = await this.service.approvePayroll(id, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Payroll approved successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectPayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      const payroll = await this.service.rejectPayroll(id, req.user!.sub, reason, req.user, req);

      res.json({
        success: true,
        message: 'Payroll rejected successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  disbursePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payroll = await this.service.disbursePayroll(id, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Payroll disbursed successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  finalizePayroll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid payroll ID');
      }

      const payroll = await this.service.finalizePayroll(id, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Payroll finalized successfully',
        data: payroll,
      });
    } catch (error) {
      next(error);
    }
  };

  getPayrollStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, periodStart, periodEnd } = req.query;

      const filters = {
        status: status as any,
        periodStart: periodStart as string,
        periodEnd: periodEnd as string,
      };

      const stats = await this.service.getPayrollStats(filters);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
