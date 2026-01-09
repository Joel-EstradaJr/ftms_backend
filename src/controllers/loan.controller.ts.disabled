import { Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class LoanController {
  private service = new LoanService();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        loanType,
        entityId,
        entityName,
        principalAmount,
        interestRate,
        dueDate,
        installmentFrequency,
        installmentAmount,
        remarks,
        tripDeficitRefNo,
        driverShare,
        conductorShare,
        driverId,
        conductorId,
      } = req.body;

      // Validation
      if (!loanType || !entityId || !principalAmount) {
        throw new ValidationError('Missing required fields: loanType, entityId, principalAmount');
      }

      const result = await this.service.createLoan(
        {
          loanType,
          entityId,
          entityName,
          principalAmount,
          interestRate,
          dueDate,
          installmentFrequency,
          installmentAmount,
          remarks,
          tripDeficitRefNo,
          driverShare,
          conductorShare,
          driverId,
          conductorId,
        },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({ success: true, message: 'Loan request created successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.service.listLoans(req.query, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid loan ID');

      const result = await this.service.getLoanById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid loan ID');

      const result = await this.service.updateLoan(id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Loan updated successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid loan ID');
      if (!reason) throw new ValidationError('Deletion reason is required');

      await this.service.deleteLoan(id, req.user!.sub, reason, req.user, req);
      res.json({ success: true, message: 'Loan deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid loan ID');

      const result = await this.service.approveLoan(id, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Loan approved successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid loan ID');
      if (!reason) throw new ValidationError('Rejection reason is required');

      const result = await this.service.rejectLoan(id, reason, req.user!.sub, req.user, req);
      res.json({ success: true, message: 'Loan rejected successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  recordRepayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { installmentNumber, amountDue, amountPaid, dueDate, paymentMethod, remarks } = req.body;

      if (isNaN(id)) throw new ValidationError('Invalid loan ID');
      if (!installmentNumber || !amountDue || !amountPaid || !dueDate) {
        throw new ValidationError('Missing required fields: installmentNumber, amountDue, amountPaid, dueDate');
      }

      const result = await this.service.recordRepayment(
        id,
        { installmentNumber, amountDue, amountPaid, dueDate, paymentMethod, remarks },
        req.user!.sub,
        req.user,
        req
      );

      res.json({ success: true, message: 'Repayment recorded successfully', data: result });
    } catch (error) {
      next(error);
    }
  };

  getRepaymentSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid loan ID');

      const result = await this.service.getRepaymentSchedule(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getLoanStats(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
