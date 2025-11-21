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

  /** POST /chart-of-accounts */
  createChartOfAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { account_type_id, account_type_code, account_name, normal_balance, description, custom_suffix } = req.body;
      if (!account_name || !normal_balance) throw new ValidationError('account_name and normal_balance are required');
      const record = await this.service.create({ account_type_id, account_type_code, account_name, normal_balance, description, custom_suffix }, req.user?.sub);
      res.status(201).json({ success: true, data: record, message: 'Chart of account created' });
    } catch (err) { next(err); }
  };
}
