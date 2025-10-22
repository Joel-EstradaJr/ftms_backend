import { Response, NextFunction } from 'express';
import { PayableService } from '../services/payable.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class PayableController {
  private service = new PayableService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { referenceCode, entityName, entityType, description, amountDue, dueDate, frequency, interestRate } =
        req.body;

      // Validation
      if (!referenceCode || !entityName || !amountDue || !dueDate) {
        throw new ValidationError('Missing required fields: referenceCode, entityName, amountDue, dueDate');
      }

      const result = await this.service.createPayable(
        { referenceCode, entityName, entityType, description, amountDue, dueDate, frequency, interestRate },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({ success: true, message: 'Payable created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.listPayables(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid payable ID');

      const result = await this.service.getPayableById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid payable ID');

      const result = await this.service.updatePayable(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Payable updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid payable ID');
      if (!reason) throw new ValidationError('Deletion reason is required');

      await this.service.deletePayable(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Payable deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  recordPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentAmount } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid payable ID');
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
