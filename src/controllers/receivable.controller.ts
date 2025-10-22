import { Response, NextFunction } from 'express';
import { ReceivableService } from '../services/receivable.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class ReceivableController {
  private service = new ReceivableService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { referenceCode, entityName, entityType, description, amountDue, dueDate, frequency, interestRate } =
        req.body;

      // Validation
      if (!referenceCode || !entityName || !amountDue || !dueDate) {
        throw new ValidationError('Missing required fields: referenceCode, entityName, amountDue, dueDate');
      }

      const result = await this.service.createReceivable(
        { referenceCode, entityName, entityType, description, amountDue, dueDate, frequency, interestRate },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({ success: true, message: 'Receivable created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.listReceivables(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid receivable ID');

      const result = await this.service.getReceivableById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid receivable ID');

      const result = await this.service.updateReceivable(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Receivable updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid receivable ID');
      if (!reason) throw new ValidationError('Deletion reason is required');

      await this.service.deleteReceivable(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Receivable deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  recordPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentAmount } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid receivable ID');
      if (!paymentAmount || paymentAmount <= 0) {
        throw new ValidationError('Valid payment amount is required');
      }

      const result = await this.service.recordPayment(id, paymentAmount, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Payment recorded successfully', data: result });
    } catch (error) {
      next(error);
    }
  };
}
