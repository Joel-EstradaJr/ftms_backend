import { Response, NextFunction } from 'express';
import { ReimbursementService } from '../services/reimbursement.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class ReimbursementController {
  private service = new ReimbursementService();

  createReimbursement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { employeeId, amount, purpose, receiptUrl } = req.body;

      if (!employeeId || !amount || !purpose) {
        throw new ValidationError('Missing required fields: employeeId, amount, purpose');
      }

      const reimbursement = await this.service.createReimbursement(
        { employeeId, amount, purpose, receiptUrl },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Reimbursement created successfully',
        data: reimbursement,
      });
    } catch (error) {
      next(error);
    }
  };

  listReimbursements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { employeeId, status, isDeleted, page, limit } = req.query;

      const filters = {
        employeeId: employeeId ? parseInt(employeeId as string) : undefined,
        status: status as any,
        isDeleted: isDeleted === 'true',
      };

      const result = await this.service.listReimbursements(
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

  getReimbursementById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid reimbursement ID');
      }

      const reimbursement = await this.service.getReimbursementById(id);

      res.json({
        success: true,
        data: reimbursement,
      });
    } catch (error) {
      next(error);
    }
  };

  updateReimbursement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid reimbursement ID');
      }

      const reimbursement = await this.service.updateReimbursement(id, req.body, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Reimbursement updated successfully',
        data: reimbursement,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteReimbursement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid reimbursement ID');
      }
      if (!reason) {
        throw new ValidationError('Deletion reason is required');
      }

      await this.service.deleteReimbursement(id, req.user!.sub, reason, req.user, req);

      res.json({
        success: true,
        message: 'Reimbursement deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  approveReimbursement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError('Invalid reimbursement ID');
      }

      const reimbursement = await this.service.approveReimbursement(id, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Reimbursement approved successfully',
        data: reimbursement,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectReimbursement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid reimbursement ID');
      }
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      const reimbursement = await this.service.rejectReimbursement(id, req.user!.sub, reason, req.user, req);

      res.json({
        success: true,
        message: 'Reimbursement rejected successfully',
        data: reimbursement,
      });
    } catch (error) {
      next(error);
    }
  };

  getReimbursementStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, employeeId } = req.query;

      const filters = {
        status: status as any,
        employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      };

      const stats = await this.service.getReimbursementStats(filters);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
