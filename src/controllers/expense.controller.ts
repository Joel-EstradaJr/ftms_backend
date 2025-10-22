import { Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expense.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class ExpenseController {
  private service = new ExpenseService();

  /**
   * Create new expense
   * POST /api/v1/{admin|staff}/expenses
   */
  createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, category, subcategory, amount, dateRecorded, remarks, linkedPurchaseId, department, receiptUrl } = req.body;

      // Validation
      if (!code || !category || !amount || !dateRecorded) {
        throw new ValidationError('Missing required fields: code, category, amount, dateRecorded');
      }

      const expense = await this.service.createExpense(
        { code, category, subcategory, amount, dateRecorded, remarks, linkedPurchaseId, department, receiptUrl },
        req.user!.sub,
        req.user,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List expenses with filters
   * GET /api/v1/{admin|staff}/expenses
   */
  listExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        category,
        subcategory,
        department,
        dateFrom,
        dateTo,
        isDeleted,
        page,
        limit,
      } = req.query;

      const filters = {
        category: category as string,
        subcategory: subcategory as string,
        department: department as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        isDeleted: isDeleted === 'true',
      };

      const result = await this.service.listExpenses(
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

  /**
   * Get expense by ID
   * GET /api/v1/{admin|staff}/expenses/:id
   */
  getExpenseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        throw new ValidationError('Invalid expense ID');
      }

      const expense = await this.service.getExpenseById(id);

      res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update expense
   * PUT /api/v1/admin/expenses/:id
   */
  updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        throw new ValidationError('Invalid expense ID');
      }

      const updates = req.body;

      const expense = await this.service.updateExpense(
        id,
        updates,
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Expense updated successfully',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete expense
   * DELETE /api/v1/admin/expenses/:id
   */
  deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid expense ID');
      }

      if (!reason) {
        throw new ValidationError('Deletion reason is required');
      }

      await this.service.deleteExpense(
        id,
        req.user!.sub,
        reason,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Expense deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve expense
   * POST /api/v1/admin/expenses/:id/approve
   */
  approveExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid expense ID');
      }

      const expense = await this.service.approveExpense(
        id,
        req.user!.sub,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Expense approved successfully',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reject expense
   * POST /api/v1/admin/expenses/:id/reject
   */
  rejectExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(id)) {
        throw new ValidationError('Invalid expense ID');
      }

      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      const expense = await this.service.rejectExpense(
        id,
        req.user!.sub,
        reason,
        req.user,
        req
      );

      res.json({
        success: true,
        message: 'Expense rejected successfully',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get expense statistics
   * GET /api/v1/admin/expenses/stats
   */
  getExpenseStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { category, dateFrom, dateTo } = req.query;

      const filters = {
        category: category as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      };

      const stats = await this.service.getExpenseStats(filters);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
