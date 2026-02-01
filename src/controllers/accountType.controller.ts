// Controller layer for Account Type endpoints.
// Controllers translate HTTP (req/res) into service calls; keep them thin.
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AccountTypeService } from '../services/accountType.service';
import { ValidationError } from '../utils/errors';

export class AccountTypeController {
  private service = new AccountTypeService();

  /** GET /account-types - List all account types */
  getAllAccountTypes = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const records = await this.service.getAllAccountTypes(includeArchived);
      res.status(200).json({ 
        success: true, 
        data: records,
        message: 'Account types retrieved successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** GET /account-types/:id - Get single account type by ID */
  getAccountTypeById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new ValidationError('Invalid account type ID');
      }

      const record = await this.service.getById(id);
      res.status(200).json({ 
        success: true, 
        data: record,
        message: 'Account type retrieved successfully' 
      });
    } catch (err) { 
      next(err); 
    }
  };

  /** POST /account-types */
  createAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, name, description } = req.body;
      if (!code || !name) throw new ValidationError('code and name are required');
      const record = await this.service.create({ code, name, description }, req.user?.sub);
      res.status(201).json({ success: true, data: record, message: 'Account type created' });
    } catch (err) { next(err); }
  };

  /** PATCH /account-types/:id - Update account type */
  updateAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new ValidationError('Invalid account type ID');

      const { code, name, description } = req.body;
      const record = await this.service.update(id, { code, name, description }, req.user?.sub);
      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Account type updated successfully' 
      });
    } catch (err) { next(err); }
  };

  /** PATCH /account-types/:id/archive - Archive account type (soft delete) */
  archiveAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new ValidationError('Invalid account type ID');

      const record = await this.service.archive(id, req.user?.sub);
      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Account type archived successfully' 
      });
    } catch (err) { next(err); }
  };

  /** PATCH /account-types/:id/restore - Restore archived account type */
  restoreAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new ValidationError('Invalid account type ID');

      const record = await this.service.restore(id, req.user?.sub);
      res.status(200).json({ 
        success: true, 
        data: record, 
        message: 'Account type restored successfully' 
      });
    } catch (err) { next(err); }
  };

  /** DELETE /account-types/:id - Hard delete account type */
  deleteAccountType = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new ValidationError('Invalid account type ID');

      await this.service.delete(id, req.user?.sub);
      res.status(200).json({ 
        success: true, 
        message: 'Account type deleted permanently' 
      });
    } catch (err) { next(err); }
  };
}
