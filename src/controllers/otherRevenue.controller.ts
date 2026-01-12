/**
 * Other Revenue Controller
 * Handles HTTP requests for other revenue management (non-trip, non-rental revenues)
 */

import { Response, NextFunction } from 'express';
import { OtherRevenueService } from '../services/otherRevenue.service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import {
  CreateOtherRevenueDTO,
  UpdateOtherRevenueDTO,
  RecordInstallmentPaymentDTO,
  OtherRevenueListQuery,
} from '../types/otherRevenue.types';

export class OtherRevenueController {
  private service = new OtherRevenueService();

  // ==========================================================================
  // REVENUE TYPES
  // ==========================================================================

  /**
   * Get all available revenue types (excluding TRIP and RENTAL)
   * GET /api/v1/admin/other-revenues/types
   */
  getRevenueTypes = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const types = await this.service.getRevenueTypes();

      res.json({
        success: true,
        data: types,
        message: `Retrieved ${types.length} revenue types`,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================================================
  // LIST & GET
  // ==========================================================================

  /**
   * List other revenue records with filtering and pagination
   * GET /api/v1/admin/other-revenues
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query: OtherRevenueListQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as OtherRevenueListQuery['sortBy']) || 'created_at',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        amountFrom: req.query.amountFrom ? parseFloat(req.query.amountFrom as string) : undefined,
        amountTo: req.query.amountTo ? parseFloat(req.query.amountTo as string) : undefined,
        status: req.query.status as OtherRevenueListQuery['status'],
        revenue_type_id: req.query.revenue_type_id
          ? parseInt(req.query.revenue_type_id as string)
          : undefined,
      };

      const result = await this.service.list(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single other revenue record by ID
   * GET /api/v1/admin/other-revenues/:id
   */
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid revenue ID');
      }

      const revenue = await this.service.getById(id);

      res.json({
        success: true,
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new other revenue record
   * POST /api/v1/admin/other-revenues
   *
   * Body:
   * - revenue_type_id (required): ID of the revenue type
   * - amount (required): Revenue amount
   * - date_recorded (required): Date the revenue was recorded
   * - description: Optional description
   * - payment_method: Payment method used
   * - payment_reference: Payment reference number
   * - is_unearned_revenue: If true, creates receivable and schedule
   * - debtor_ref: Employee number for HR API lookup
   * - debtor_name: Manual debtor name (fallback)
   * - installment_plan: WEEKLY, SEMI_MONTHLY, MONTHLY, QUARTERLY, ONE_TIME
   * - due_date: Final due date for receivable
   * - schedule_items: Array of installment schedule items
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dto = this.validateCreateDTO(req.body);

      const revenue = await this.service.create(dto, req.user!.sub, req.user, req);

      res.status(201).json({
        success: true,
        message: 'Revenue created successfully',
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate and transform create request body to DTO
   */
  private validateCreateDTO(body: any): CreateOtherRevenueDTO {
    // Required fields
    if (!body.revenue_type_id) {
      throw new ValidationError('revenue_type_id is required');
    }
    if (body.amount === undefined || body.amount === null) {
      throw new ValidationError('amount is required');
    }
    if (!body.date_recorded) {
      throw new ValidationError('date_recorded is required');
    }

    // Validate amount
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('amount must be a positive number');
    }

    // Validate date
    const dateRecorded = new Date(body.date_recorded);
    if (isNaN(dateRecorded.getTime())) {
      throw new ValidationError('date_recorded must be a valid date');
    }

    // Build DTO
    const dto: CreateOtherRevenueDTO = {
      revenue_type_id: parseInt(body.revenue_type_id),
      amount,
      date_recorded: body.date_recorded,
      description: body.description || undefined,
      payment_method: body.payment_method || undefined,
      payment_reference: body.payment_reference || undefined,
    };

    // Unearned revenue fields
    if (body.is_unearned_revenue) {
      dto.is_unearned_revenue = true;
      dto.debtor_ref = body.debtor_ref || undefined;
      dto.debtor_name = body.debtor_name || undefined;

      // Validate installment plan
      const validPlans = ['WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ONE_TIME'];
      if (body.installment_plan && !validPlans.includes(body.installment_plan)) {
        throw new ValidationError(`installment_plan must be one of: ${validPlans.join(', ')}`);
      }
      dto.installment_plan = body.installment_plan || 'ONE_TIME';

      // Due date required for unearned revenue
      if (!body.due_date) {
        throw new ValidationError('due_date is required for unearned revenue');
      }
      const dueDate = new Date(body.due_date);
      if (isNaN(dueDate.getTime())) {
        throw new ValidationError('due_date must be a valid date');
      }
      dto.due_date = body.due_date;

      // Validate schedule items if provided
      if (body.schedule_items && Array.isArray(body.schedule_items)) {
        dto.schedule_items = body.schedule_items.map((item: any, index: number) => {
          if (!item.installment_number) {
            throw new ValidationError(`schedule_items[${index}].installment_number is required`);
          }
          if (!item.due_date) {
            throw new ValidationError(`schedule_items[${index}].due_date is required`);
          }
          if (item.amount_due === undefined || item.amount_due === null) {
            throw new ValidationError(`schedule_items[${index}].amount_due is required`);
          }

          const itemDueDate = new Date(item.due_date);
          if (isNaN(itemDueDate.getTime())) {
            throw new ValidationError(`schedule_items[${index}].due_date must be a valid date`);
          }

          const itemAmount = parseFloat(item.amount_due);
          if (isNaN(itemAmount) || itemAmount <= 0) {
            throw new ValidationError(`schedule_items[${index}].amount_due must be a positive number`);
          }

          return {
            installment_number: parseInt(item.installment_number),
            due_date: item.due_date,
            amount_due: itemAmount,
          };
        });
      }
    }

    return dto;
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update an other revenue record
   * PUT /api/v1/admin/other-revenues/:id
   *
   * Note: Amount and schedule can only be updated if no payments have been made
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid revenue ID');
      }

      const dto = this.validateUpdateDTO(req.body);

      const revenue = await this.service.update(id, dto, req.user!.sub, req.user, req);

      res.json({
        success: true,
        message: 'Revenue updated successfully',
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate and transform update request body to DTO
   */
  private validateUpdateDTO(body: any): UpdateOtherRevenueDTO {
    const dto: UpdateOtherRevenueDTO = {};

    // Log the incoming body for debugging
    console.log('[OtherRevenue] Update request body:', JSON.stringify(body, null, 2));

    if (body.description !== undefined) {
      dto.description = body.description;
    }

    if (body.payment_method !== undefined) {
      dto.payment_method = body.payment_method;
    }

    if (body.payment_reference !== undefined) {
      dto.payment_reference = body.payment_reference;
    }

    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new ValidationError('amount must be a positive number');
      }
      dto.amount = amount;
    }

    if (body.installment_plan !== undefined) {
      const validPlans = ['WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ONE_TIME'];
      if (!validPlans.includes(body.installment_plan)) {
        throw new ValidationError(`installment_plan must be one of: ${validPlans.join(', ')}`);
      }
      dto.installment_plan = body.installment_plan;
    }

    if (body.schedule_items !== undefined && Array.isArray(body.schedule_items)) {
      dto.schedule_items = body.schedule_items.map((item: any, index: number) => {
        if (!item.installment_number) {
          throw new ValidationError(`schedule_items[${index}].installment_number is required`);
        }
        if (!item.due_date) {
          throw new ValidationError(`schedule_items[${index}].due_date is required`);
        }
        if (item.amount_due === undefined || item.amount_due === null) {
          throw new ValidationError(`schedule_items[${index}].amount_due is required`);
        }

        return {
          installment_number: parseInt(item.installment_number),
          due_date: item.due_date,
          amount_due: parseFloat(item.amount_due),
        };
      });
    }

    // Log the resulting DTO for debugging
    console.log('[OtherRevenue] Validated update DTO:', JSON.stringify(dto, null, 2));

    // Warn if DTO is empty (no fields will be updated)
    if (Object.keys(dto).length === 0) {
      console.warn('[OtherRevenue] Warning: Update DTO is empty - no fields will be updated');
    }

    return dto;
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Soft delete an other revenue record
   * DELETE /api/v1/admin/other-revenues/:id
   *
   * Body:
   * - reason (required): Reason for deletion
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid revenue ID');
      }

      // No longer require or validate deletion reason
      const result = await this.service.softDelete(id, req.user!.sub, req.user, req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ==========================================================================
  // INSTALLMENT PAYMENTS
  // ==========================================================================

  /**
   * Record an installment payment with cascade overflow logic
   * POST /api/v1/admin/other-revenues/installments/:installmentId/payments
   *
   * Body:
   * - amount_paid (required): Payment amount
   * - payment_date (required): Date of payment
   * - payment_method: Payment method used
   * - payment_reference: Payment reference number
   */
  recordInstallmentPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const installmentId = parseInt(req.params.installmentId);

      if (isNaN(installmentId)) {
        throw new ValidationError('Invalid installment ID');
      }

      const dto = this.validatePaymentDTO(installmentId, req.body);

      const result = await this.service.recordInstallmentPayment(dto, req.user!.sub, req.user, req);

      res.status(201).json({
        success: true,
        message: `Payment of ${dto.amount_paid} recorded successfully across ${result.allocations.length} installment(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate and transform payment request body to DTO
   */
  private validatePaymentDTO(installmentId: number, body: any): RecordInstallmentPaymentDTO {
    if (body.amount_paid === undefined || body.amount_paid === null) {
      throw new ValidationError('amount_paid is required');
    }

    const amountPaid = parseFloat(body.amount_paid);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new ValidationError('amount_paid must be a positive number');
    }

    if (!body.payment_date) {
      throw new ValidationError('payment_date is required');
    }

    const paymentDate = new Date(body.payment_date);
    if (isNaN(paymentDate.getTime())) {
      throw new ValidationError('payment_date must be a valid date');
    }

    return {
      installment_id: installmentId,
      amount_paid: amountPaid,
      payment_date: body.payment_date,
      payment_method: body.payment_method || undefined,
      payment_reference: body.payment_reference || undefined,
    };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get installment schedule for a revenue record
   * GET /api/v1/admin/other-revenues/:id/schedule
   */
  getInstallmentSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw new ValidationError('Invalid revenue ID');
      }

      const schedule = await this.service.getInstallmentSchedule(id);

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get receivable details
   * GET /api/v1/admin/other-revenues/receivables/:receivableId
   */
  getReceivableDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const receivableId = parseInt(req.params.receivableId);

      if (isNaN(receivableId)) {
        throw new ValidationError('Invalid receivable ID');
      }

      const receivable = await this.service.getReceivableDetails(receivableId);

      res.json({
        success: true,
        data: receivable,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Record an installment payment with cascade overflow logic (installment_id in body)
   * POST /api/admin/revenue/installment-payment
   *
   * Body:
   * - installment_id (required): ID of the installment to pay
   * - amount_paid (required): Payment amount
   * - payment_date (required): Date of payment
   * - payment_method: Payment method used
   * - payment_reference: Payment reference number
   * - recorded_by: User recording the payment
   */
  recordInstallmentPaymentByBody = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { installment_id } = req.body;

      if (!installment_id) {
        throw new ValidationError('installment_id is required');
      }

      const installmentId = parseInt(installment_id);
      if (isNaN(installmentId)) {
        throw new ValidationError('Invalid installment_id');
      }

      const dto = this.validatePaymentDTO(installmentId, req.body);

      const result = await this.service.recordInstallmentPayment(dto, req.user!.sub, req.user, req);

      res.status(201).json({
        success: true,
        message: `Payment of ${dto.amount_paid} recorded successfully across ${result.allocations.length} installment(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
