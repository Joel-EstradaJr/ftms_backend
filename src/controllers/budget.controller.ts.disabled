import { Response, NextFunction } from 'express';
import { BudgetService } from '../services/budget.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class BudgetController {
  private service = new BudgetService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { department, fiscalYear, fiscalPeriod, allocatedAmount, periodStart, periodEnd } = req.body;
      
      // Validation
      if (!department || !fiscalYear || !fiscalPeriod || !allocatedAmount || !periodStart || !periodEnd) {
        throw new ValidationError('Missing required fields: department, fiscalYear, fiscalPeriod, allocatedAmount, periodStart, periodEnd');
      }

      const result = await this.service.createBudget(
        { department, fiscalYear, fiscalPeriod, allocatedAmount, periodStart, periodEnd },
        req.user!.sub,
        req.user,
        req
      );
      
      res.status(201).json({ success: true, message: 'Budget created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.service.listBudgets(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid budget ID');
      
      const result = await this.service.getBudgetById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid budget ID');
      
      const result = await this.service.updateBudget(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Budget updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (isNaN(id)) throw new ValidationError('Invalid budget ID');
      if (!reason) throw new ValidationError('Deletion reason is required');
      
      await this.service.deleteBudget(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Budget deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid budget ID');
      
      const result = await this.service.approveBudget(id, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Budget approved successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (isNaN(id)) throw new ValidationError('Invalid budget ID');
      if (!reason) throw new ValidationError('Rejection reason is required');
      
      const result = await this.service.rejectBudget(id, reason, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Budget rejected successfully', data: result });
    } catch (error) {
      next(error);
    }
  };
}
