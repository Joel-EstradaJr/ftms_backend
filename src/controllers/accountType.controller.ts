// Controller layer for Account Type POST endpoint.
// Controllers translate HTTP (req/res) into service calls; keep them thin.
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AccountTypeService } from '../services/accountType.service';
import { ValidationError } from '../utils/errors';

export class AccountTypeController {
  private service = new AccountTypeService();

  /** POST /account-types */
  createAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, name, description } = req.body;
      if (!code || !name) throw new ValidationError('code and name are required');
      const record = await this.service.create({ code, name, description }, req.user?.sub);
      res.status(201).json({ success: true, data: record, message: 'Account type created' });
    } catch (err) { next(err); }
  };
}
