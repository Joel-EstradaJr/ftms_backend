// Controller for Chart of Account creation endpoint.
// Applies validation and delegates business logic to service.
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ChartOfAccountService } from '../services/chartOfAccount.service';
import { ValidationError } from '../utils/errors';

export class ChartOfAccountController {
  private service = new ChartOfAccountService();

  /** GET /chart-of-accounts - List all Chart of Accounts with filtering */
  getAllChartOfAccounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Parse query parameters
      const includeArchived = req.query.includeArchived === 'true';
      const accountTypeId = req.query.accountTypeId ? parseInt(req.query.accountTypeId as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await this.service.getAllChartOfAccounts({
        includeArchived,
        accountTypeId,
        search,
        page,
        limit,
      });

      res.status(200).json({ 
        success: true, 
        data: result.data,
        pagination: result.pagination,
        message: 'Chart of accounts retrieved successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** GET /chart-of-accounts/:id - Get single Chart of Account by ID */
  getChartOfAccountById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid chart of account ID');
      }

      const record = await this.service.getById(id);

      res.status(200).json({ 
        success: true, 
        data: record,
        message: 'Chart of account retrieved successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** GET /chart-of-accounts/suggest-code/:accountTypeId - Get suggested account code */
  getSuggestedAccountCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const accountTypeId = parseInt(req.params.accountTypeId, 10);
      if (isNaN(accountTypeId)) {
        throw new ValidationError('Invalid account type ID');
      }

      const suggestedCode = await this.service.getSuggestedAccountCode(accountTypeId);

      res.status(200).json({ 
        success: true, 
        data: { suggested_code: suggestedCode },
        message: 'Suggested account code generated successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** POST /chart-of-accounts - Create new Chart of Account */
  createChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { account_type_id, account_type_code, account_name, normal_balance, description, custom_suffix } = req.body;
      if (!account_name || !normal_balance) {
        throw new ValidationError('account_name and normal_balance are required');
      }

      const record = await this.service.create(
        { account_type_id, account_type_code, account_name, normal_balance, description, custom_suffix },
        req.user?.sub
      );

      res.status(201).json({ 
        success: true, 
        data: record, 
        message: 'Chart of account created successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** PATCH /chart-of-accounts/:id - Update Chart of Account */
  updateChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid chart of account ID');
      }

      const { account_code, account_type_id, account_name, normal_balance, description } = req.body;

      const record = await this.service.update(
        id,
        { account_code, account_type_id, account_name, normal_balance, description },
        req.user?.sub
      );

      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Chart of account updated successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** PATCH /chart-of-accounts/:id/archive - Archive Chart of Account (soft delete) */
  archiveChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid chart of account ID');
      }

      const record = await this.service.archive(id, req.user?.sub);

      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Chart of account archived successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** PATCH /chart-of-accounts/:id/restore - Restore archived Chart of Account */
  restoreChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid chart of account ID');
      }

      const record = await this.service.restore(id);

      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Chart of account restored successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** DELETE /chart-of-accounts/:id - Hard delete Chart of Account */
  deleteChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid chart of account ID');
      }

      await this.service.delete(id, req.user?.sub);

      res.status(200).json({ 
        success: true, 
        message: 'Chart of account deleted permanently' 
      });
    } catch (err) { 
      next(err); 
    }
  };
}
