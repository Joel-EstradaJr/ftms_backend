import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { approval_status, payment_method, payment_status, installment_status, receivable_frequency, Prisma } from '@prisma/client';
import { operationalExpenseService } from '../../../services/operationalExpense.service';

const router = Router();

// Apply authentication middleware (can be disabled via ENABLE_AUTH=false)
router.use(authenticate);

/**
 * Operational Expense Routes
 * 
 * Unified module for managing operational expenses for both
 * Bus Trip and Rental Trip operations using local tables.
 * 
 * Schema source of truth:
 * - expense model with relations to bus_trip_local (via bus_trip) and rental_local (via rental)
 * - Uses payment_method enum: CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT
 * - Uses approval_status enum: PENDING, APPROVED, REJECTED
 * - Uses accounting_status enum: DRAFT, POSTED, ADJUSTED, REVERSED
 */

// ===========================
// Reference Data Endpoints
// ===========================

/**
 * GET /expense-types
 * Returns list of expense types for dropdown filters
 */
router.get('/expense-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expenseTypes = await prisma.expense_type.findMany({
      where: {
        is_deleted: false,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      success: true,
      data: expenseTypes,
    });
  } catch (error) {
    logger.error('Error fetching expense types:', error);
    next(error);
  }
});

/**
 * GET /payment-methods
 * Returns list of payment methods based on schema enum
 */
router.get('/payment-methods', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Based on schema payment_method enum
    const paymentMethods = [
      { id: 1, code: 'CASH', name: 'Cash' },
      { id: 2, code: 'BANK_TRANSFER', name: 'Bank Transfer' },
      { id: 3, code: 'E_WALLET', name: 'E-Wallet' },
      { id: 4, code: 'REIMBURSEMENT', name: 'Reimbursement' },
    ];

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /employees
 * Returns list of employees (for reimbursement selection)
 */
router.get('/employees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;

    const whereClause: any = {
      is_deleted: false,
    };

    if (search) {
      whereClause.OR = [
        { first_name: { contains: search as string, mode: 'insensitive' } },
        { last_name: { contains: search as string, mode: 'insensitive' } },
        { employee_number: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee_local.findMany({
      where: whereClause,
      select: {
        employee_number: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        position: true,
        department: true,
      },
      take: 50,
      orderBy: {
        last_name: 'asc',
      },
    });

    res.json({
      success: true,
      data: employees.map((e: { employee_number: string; first_name: string | null; middle_name: string | null; last_name: string | null; position: string | null; department: string | null }) => ({
        id: e.employee_number,
        employee_number: e.employee_number,
        name: `${e.first_name || ''} ${e.middle_name ? e.middle_name + ' ' : ''}${e.last_name || ''}`.trim(),
        position: e.position,
        department: e.department,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ===========================
// Trip Reference Endpoints
// ===========================

/**
 * GET /operational-trips
 * Returns list of operational trips (bus_trip_local) that can have expenses recorded
 */
router.get('/operational-trips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.bus_trip_local.findMany({
      where: {
        is_deleted: false,
        is_expense_recorded: false,
      },
      include: {
        bus: {
          select: {
            bus_id: true,
            license_plate: true,
            body_number: true,
            type: true,
          },
        },
      },
      orderBy: {
        date_assigned: 'desc',
      },
      take: 100,
    });

    res.json({
      success: true,
      data: trips.map((t) => ({
        assignment_id: t.assignment_id,
        bus_trip_id: t.bus_trip_id,
        bus_route: t.bus_route,
        date_assigned: t.date_assigned?.toISOString(),
        trip_fuel_expense: t.trip_fuel_expense ? parseFloat(t.trip_fuel_expense.toString()) : null,
        payment_method: t.payment_method,
        // Bus details from relation
        body_number: t.bus?.body_number || null,
        bus_plate_number: t.bus?.license_plate || null,
        bus_type: t.bus?.type || null,
      })),
    });
  } catch (error) {
    logger.error('Error fetching operational trips:', error);
    next(error);
  }
});

/**
 * GET /rental-trips
 * Returns list of rental trips (rental_local) that can have expenses recorded
 */
router.get('/rental-trips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.rental_local.findMany({
      where: {
        is_deleted: false,
        is_expense_recorded: false,
      },
      include: {
        bus: {
          select: {
            bus_id: true,
            license_plate: true,
            body_number: true,
            type: true,
          },
        },
      },
      orderBy: {
        rental_start_date: 'desc',
      },
      take: 100,
    });

    res.json({
      success: true,
      data: trips.map((t) => ({
        assignment_id: t.assignment_id,
        rental_package: t.rental_package,
        rental_status: t.rental_status,
        rental_start_date: t.rental_start_date?.toISOString(),
        rental_end_date: t.rental_end_date?.toISOString(),
        // Bus details from relation
        body_number: t.bus?.body_number || null,
        bus_plate_number: t.bus?.license_plate || null,
        bus_type: t.bus?.type || null,
      })),
    });
  } catch (error) {
    logger.error('Error fetching rental trips:', error);
    next(error);
  }
});

// ===========================
// CRUD Operations
// ===========================

/**
 * GET /
 * List operational expenses with pagination and filters
 * Filters: date_from, date_to, status, expense_name (based on table headings)
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      date_from,
      date_to,
      status,
      expense_name,
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      is_deleted: false,
      // Only show expenses linked to trips (operational expenses)
      OR: [
        { bus_trip_assignment_id: { not: null } },
        { rental_assignment_id: { not: null } },
      ],
    };

    // Search filter - search in code and description
    if (search) {
      where.AND = [
        {
          OR: [
            { code: { contains: String(search), mode: 'insensitive' } },
            { description: { contains: String(search), mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Date range filter
    if (date_from || date_to) {
      where.date_recorded = {};
      if (date_from) where.date_recorded.gte = new Date(date_from as string);
      if (date_to) where.date_recorded.lte = new Date(date_to as string);
    }

    // Status filter (approval_status - schema-defined values only)
    if (status) {
      const statuses = (status as string).split(',');
      where.approval_status = { in: statuses };
    }

    // Expense name/type filter
    if (expense_name) {
      where.expense_type = { name: { contains: expense_name as string, mode: 'insensitive' } };
    }

    // Get total count
    const total = await prisma.expense.count({ where });

    // Get expenses with relations (using schema-defined relation names)
    const expenses = await prisma.expense.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { updated_at: 'desc' },
      include: {
        expense_type: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        bus_trip: {
          include: {
            bus: {
              select: {
                body_number: true,
                license_plate: true,
                type: true,
              },
            },
          },
        },
        rental: {
          include: {
            bus: {
              select: {
                body_number: true,
                license_plate: true,
                type: true,
              },
            },
          },
        },
        payable: {
          select: {
            id: true,
            employee_reference: true,
            creditor_name: true,
            description: true,
          },
        },
      },
    });

    // Get summary counts
    const baseWhere = {
      is_deleted: false,
      OR: [
        { bus_trip_assignment_id: { not: null } },
        { rental_assignment_id: { not: null } },
      ],
    };

    const pendingCount = await prisma.expense.count({
      where: { ...baseWhere, approval_status: 'PENDING' },
    });

    const approvedCount = await prisma.expense.count({
      where: { ...baseWhere, approval_status: 'APPROVED' },
    });

    const approvedAmount = await prisma.expense.aggregate({
      where: { ...baseWhere, approval_status: 'APPROVED' },
      _sum: { amount: true },
    });

    // Transform to match frontend expectations
    const transformedExpenses = expenses.map(exp => {
      // Determine trip type and get body_number
      const isBusTrip = !!exp.bus_trip_assignment_id;
      const isRentalTrip = !!exp.rental_assignment_id;
      const body_number = isBusTrip
        ? exp.bus_trip?.bus?.body_number
        : isRentalTrip
          ? exp.rental?.bus?.body_number
          : null;

      // Determine payment_status based on business rules:
      // - If REJECTED → CANCELLED
      // - If REIMBURSEMENT payment method → PARTIALLY_PAID (payable exists)
      // - Otherwise → COMPLETED
      let payment_status = exp.payment_status;
      if (exp.approval_status === 'REJECTED') {
        payment_status = 'CANCELLED';
      } else if (exp.payment_method === 'REIMBURSEMENT') {
        payment_status = 'PARTIALLY_PAID';
      } else if (exp.approval_status === 'APPROVED') {
        payment_status = 'COMPLETED';
      } else {
        payment_status = 'PENDING';
      }

      return {
        id: exp.id,
        code: exp.code,
        date_recorded: exp.date_recorded?.toISOString().split('T')[0] || null,
        expense_name: exp.expense_type?.name || 'Unknown',
        expense_type_id: exp.expense_type_id,
        body_number,
        amount: parseFloat(exp.amount?.toString() || '0'),
        is_reimbursable: exp.payment_method === 'REIMBURSEMENT',
        payment_status,
        approval_status: exp.approval_status,
        accounting_status: exp.accounting_status,
        payment_method: exp.payment_method,
        description: exp.description,

        // Trip assignment info
        trip_type: isBusTrip ? 'operational' : (isRentalTrip ? 'rental' : null),
        bus_trip_assignment_id: exp.bus_trip_assignment_id,
        bus_trip_id: exp.bus_trip_id,
        rental_assignment_id: exp.rental_assignment_id,

        // Bus trip details
        bus_trip: exp.bus_trip ? {
          assignment_id: exp.bus_trip.assignment_id,
          bus_trip_id: exp.bus_trip.bus_trip_id,
          bus_route: exp.bus_trip.bus_route,
          date_assigned: exp.bus_trip.date_assigned?.toISOString(),
          body_number: exp.bus_trip.bus?.body_number,
          plate_number: exp.bus_trip.bus?.license_plate,
          bus_type: exp.bus_trip.bus?.type,
        } : null,

        // Rental details
        rental: exp.rental ? {
          assignment_id: exp.rental.assignment_id,
          rental_package: exp.rental.rental_package,
          rental_start_date: exp.rental.rental_start_date?.toISOString(),
          rental_end_date: exp.rental.rental_end_date?.toISOString(),
          body_number: exp.rental.bus?.body_number,
          plate_number: exp.rental.bus?.license_plate,
          bus_type: exp.rental.bus?.type,
        } : null,

        // Reimbursement info
        payable_id: exp.payable_id,
        employee_reference: exp.payable?.employee_reference,
        creditor_name: exp.payable?.creditor_name,
        payable_description: exp.payable?.description,

        // Audit trail
        created_by: exp.created_by,
        created_at: exp.created_at?.toISOString(),
        approved_by: exp.approved_by,
        approved_at: exp.approved_at?.toISOString(),
      };
    });

    res.json({
      success: true,
      data: {
        expenses: transformedExpenses,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: Math.ceil(total / limitNum),
        },
        summary: {
          pending_count: pendingCount,
          approved_count: approvedCount,
          total_approved_amount: parseFloat(approvedAmount._sum.amount?.toString() || '0'),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching operational expenses:', error);
    next(error);
  }
});

/**
 * GET /:id
 * Get single expense by ID with full details
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
      include: {
        expense_type: true,
        bus_trip: {
          include: {
            bus: true,
          },
        },
        rental: {
          include: {
            bus: true,
          },
        },
        payable: {
          include: {
            installment_schedule: {
              where: { is_deleted: false },
              orderBy: { installment_number: 'asc' },
              include: {
                payments: {
                  where: { is_deleted: false },
                  orderBy: { payment_date: 'desc' },
                },
              },
            },
          },
        },
        journal_entry: true,
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    const isBusTrip = !!expense.bus_trip_assignment_id;

    // Transform installment schedule for frontend
    const scheduleItems = expense.payable?.installment_schedule?.map(inst => ({
      id: inst.id,
      payable_id: inst.payable_id,
      installment_number: inst.installment_number,
      due_date: inst.due_date.toISOString().split('T')[0],
      amount_due: parseFloat(inst.amount_due.toString()),
      amount_paid: parseFloat(inst.amount_paid.toString()),
      balance: parseFloat(inst.balance.toString()),
      status: inst.status,
      isPastDue: new Date(inst.due_date) < new Date() && inst.status !== 'PAID',
      isEditable: inst.status === 'PENDING',
      payments: inst.payments.map(p => ({
        id: p.id,
        amount_paid: parseFloat(p.amount_paid.toString()),
        payment_date: p.payment_date.toISOString(),
        payment_method: p.payment_method,
        payment_reference: p.payment_reference,
      })),
    })) || [];

    res.json({
      success: true,
      data: {
        id: expense.id,
        code: expense.code,
        date_recorded: expense.date_recorded?.toISOString().split('T')[0],
        expense_type_id: expense.expense_type_id,
        expense_type_name: expense.expense_type?.name,
        expense_type_code: expense.expense_type?.code,
        amount: parseFloat(expense.amount?.toString() || '0'),
        description: expense.description,
        approval_status: expense.approval_status,
        accounting_status: expense.accounting_status,
        payment_status: expense.payment_status,
        payment_method: expense.payment_method,

        // Trip info
        trip_type: isBusTrip ? 'operational' : (expense.rental_assignment_id ? 'rental' : null),
        bus_trip_assignment_id: expense.bus_trip_assignment_id,
        bus_trip_id: expense.bus_trip_id,
        rental_assignment_id: expense.rental_assignment_id,

        // Bus trip details
        bus_route: expense.bus_trip?.bus_route,
        date_assigned: expense.bus_trip?.date_assigned?.toISOString(),
        plate_number: isBusTrip ? expense.bus_trip?.bus?.license_plate : expense.rental?.bus?.license_plate,
        body_number: isBusTrip ? expense.bus_trip?.bus?.body_number : expense.rental?.bus?.body_number,
        bus_type: isBusTrip ? expense.bus_trip?.bus?.type : expense.rental?.bus?.type,

        // Reimbursement / Payable
        is_reimbursable: expense.payment_method === 'REIMBURSEMENT',
        payable_id: expense.payable_id,
        employee_reference: expense.payable?.employee_reference,
        creditor_name: expense.payable?.creditor_name,
        payable_description: expense.payable?.description,

        // Payable details (for reimbursements)
        payable: expense.payable ? {
          id: expense.payable.id,
          code: expense.payable.code,
          creditor_name: expense.payable.creditor_name,
          employee_reference: expense.payable.employee_reference,
          total_amount: parseFloat(expense.payable.total_amount.toString()),
          paid_amount: parseFloat(expense.payable.paid_amount.toString()),
          balance: parseFloat(expense.payable.balance.toString()),
          status: expense.payable.status,
          frequency: expense.payable.frequency,
          due_date: expense.payable.due_date?.toISOString().split('T')[0],
        } : null,

        // Installment schedule (for reimbursements)
        scheduleItems,

        // Journal entry
        journal_entry_id: expense.journal_entry_id,
        journal_entry_code: expense.journal_entry?.code,

        // Audit trail
        created_by: expense.created_by,
        created_at: expense.created_at?.toISOString(),
        updated_by: expense.updated_by,
        updated_at: expense.updated_at?.toISOString(),
        approved_by: expense.approved_by,
        approved_at: expense.approved_at?.toISOString(),
        rejected_by: expense.rejected_by,
        rejected_at: expense.rejected_at?.toISOString(),

        // Remarks
        approval_remarks: expense.approval_remarks,
        rejection_remarks: expense.rejection_remarks,
        deletion_remarks: expense.deletion_remarks,
      },
    });
  } catch (error) {
    logger.error('Error fetching expense:', error);
    next(error);
  }
});

/**
 * POST /
 * Create new operational expense
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      expense_information,
      trip_assignment,
      accounting_details,
      is_reimbursable,
      reimbursable_details,
      remarks,
    } = req.body;

    const userId = req.user?.sub || 'system';

    // Generate expense code
    const lastExpense = await prisma.expense.findFirst({
      orderBy: { id: 'desc' },
      select: { code: true },
    });
    const nextNum = lastExpense
      ? parseInt(lastExpense.code.replace('EXP-', '')) + 1
      : 1;
    const expenseCode = `EXP-${nextNum.toString().padStart(6, '0')}`;

    // Determine payment method
    const paymentMethod: payment_method = is_reimbursable
      ? 'REIMBURSEMENT'
      : (expense_information.payment_method as payment_method) || 'CASH';

    // Create payable with installment schedule if reimbursement
    let payableId: number | null = null;
    if (is_reimbursable && reimbursable_details) {
      // Get system config for defaults
      const config = await prisma.system_configuration.findFirst({
        where: { is_active: true, is_deleted: false },
      });

      const frequency = (reimbursable_details.frequency as receivable_frequency) || config?.default_frequency || 'WEEKLY';
      const numberOfPayments = reimbursable_details.number_of_payments || config?.default_number_of_payments || 3;
      const startDate = reimbursable_details.start_date 
        ? new Date(reimbursable_details.start_date) 
        : new Date();
      const dueDate = reimbursable_details.due_date 
        ? new Date(reimbursable_details.due_date) 
        : null;

      // Create payable with installment schedule in transaction
      const payableResult = await prisma.$transaction(async (tx) => {
        const payable = await tx.payable.create({
          data: {
            code: `PAY-${expenseCode}`,
            creditor_name: reimbursable_details.employee_name,
            employee_reference: reimbursable_details.employee_number,
            description: `Reimbursement for ${expenseCode}`,
            total_amount: expense_information.amount,
            balance: expense_information.amount,
            due_date: dueDate,
            frequency: frequency,
            status: 'PENDING',
            created_by: userId,
          },
        });

        // Generate installment schedule
        const amountPerInstallment = Number(expense_information.amount) / numberOfPayments;
        for (let i = 0; i < numberOfPayments; i++) {
          const installmentDueDate = new Date(startDate);
          
          switch (frequency) {
            case 'DAILY':
              installmentDueDate.setDate(installmentDueDate.getDate() + i);
              break;
            case 'WEEKLY':
              installmentDueDate.setDate(installmentDueDate.getDate() + (i * 7));
              break;
            case 'BIWEEKLY':
              installmentDueDate.setDate(installmentDueDate.getDate() + (i * 14));
              break;
            case 'MONTHLY':
              installmentDueDate.setMonth(installmentDueDate.getMonth() + i);
              break;
            case 'ANNUALLY':
              installmentDueDate.setFullYear(installmentDueDate.getFullYear() + i);
              break;
          }

          await tx.expense_installment_schedule.create({
            data: {
              payable_id: payable.id,
              installment_number: i + 1,
              due_date: installmentDueDate,
              amount_due: amountPerInstallment,
              amount_paid: 0,
              balance: amountPerInstallment,
              status: 'PENDING',
              created_by: userId,
            },
          });
        }

        return payable;
      });

      payableId = payableResult.id;
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        code: expenseCode,
        expense_type_id: expense_information.expense_type_id,
        amount: expense_information.amount,
        date_recorded: expense_information.date_recorded ? new Date(expense_information.date_recorded) : new Date(),
        description: remarks,
        approval_status: 'PENDING',
        accounting_status: 'DRAFT',
        payment_status: 'PENDING',
        payment_method: paymentMethod,

        // Trip assignment
        bus_trip_assignment_id: trip_assignment?.operational_trip_assignment_id || null,
        bus_trip_id: trip_assignment?.operational_trip_bus_trip_id || null,
        rental_assignment_id: trip_assignment?.rental_trip_assignment_id || null,

        // Reimbursement
        payable_id: payableId,
        updated_at: new Date(),

        created_by: userId,
      },
      include: {
        expense_type: true,
      },
    });

    // Mark trip as expense recorded
    if (trip_assignment?.operational_trip_assignment_id && trip_assignment?.operational_trip_bus_trip_id) {
      await prisma.bus_trip_local.update({
        where: {
          assignment_id_bus_trip_id: {
            assignment_id: trip_assignment.operational_trip_assignment_id,
            bus_trip_id: trip_assignment.operational_trip_bus_trip_id,
          },
        },
        data: {
          is_expense_recorded: true,
        },
      });
    } else if (trip_assignment?.rental_trip_assignment_id) {
      await prisma.rental_local.update({
        where: {
          assignment_id: trip_assignment.rental_trip_assignment_id,
        },
        data: {
          is_expense_recorded: true,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: {
        id: expense.id,
        code: expense.code,
        expense_type_name: (expense as any).expense_type?.name,
        amount: parseFloat(expense.amount.toString()),
        approval_status: expense.approval_status,
      },
    });
  } catch (error) {
    logger.error('Error creating expense:', error);
    next(error);
  }
});

/**
 * PUT /:id
 * Update expense (only allowed for PENDING status)
 */
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub || 'system';

    // Check if expense exists and is editable
    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), is_deleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (existing.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be edited',
      });
    }

    const {
      expense_information,
      accounting_details,
      remarks,
    } = req.body;

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        expense_type_id: expense_information?.expense_type_id,
        amount: expense_information?.amount,
        date_recorded: expense_information?.date_recorded ? new Date(expense_information.date_recorded) : undefined,
        payment_method: expense_information?.payment_method,
        description: remarks,
        updated_by: userId,
      },
      include: {
        expense_type: true,
      },
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: {
        id: expense.id,
        code: expense.code,
      },
    });
  } catch (error) {
    logger.error('Error updating expense:', error);
    next(error);
  }
});

/**
 * PATCH /:id/soft-delete
 * Soft delete expense
 */
router.patch('/:id/soft-delete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.sub || 'system';

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
        deletion_remarks: reason || null,
      },
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting expense:', error);
    next(error);
  }
});

/**
 * POST /:id/approve
 * Approve expense and create journal entry with proper lines
 */
router.post('/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.sub || 'system';

    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: {
        expense_type: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (existing.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be approved',
      });
    }

    // COA account codes
    const ACCOUNT_CODES = {
      CASH: '1000',
      BANK_TRANSFER: '1005',
      E_WALLET: '1010',
      ACCOUNTS_PAYABLE: '2000',
      FUEL_EXPENSE: '4000',
    };

    // Determine credit account based on payment method
    const getCreditAccountCode = (paymentMethod: string | null): string => {
      switch (paymentMethod) {
        case 'BANK_TRANSFER':
          return ACCOUNT_CODES.BANK_TRANSFER;
        case 'E_WALLET':
          return ACCOUNT_CODES.E_WALLET;
        case 'REIMBURSEMENT':
          return ACCOUNT_CODES.ACCOUNTS_PAYABLE;
        default:
          return ACCOUNT_CODES.CASH;
      }
    };

    // Determine journal entry status - ALL auto-generated entries start as DRAFT
    const getJournalStatus = (): 'DRAFT' => {
      // Auto-generated entries must be reviewed before posting
      return 'DRAFT';
    };

    // Get expense amount
    const expenseAmount = existing.amount;

    // Get debit and credit accounts
    const debitAccountCode = ACCOUNT_CODES.FUEL_EXPENSE;
    const creditAccountCode = getCreditAccountCode(existing.payment_method);

    const [debitAccount, creditAccount] = await Promise.all([
      prisma.chart_of_account.findFirst({ where: { account_code: debitAccountCode, is_deleted: false } }),
      prisma.chart_of_account.findFirst({ where: { account_code: creditAccountCode, is_deleted: false } }),
    ]);

    if (!debitAccount || !creditAccount) {
      return res.status(400).json({
        success: false,
        message: `Chart of accounts not found. Debit: ${debitAccountCode}, Credit: ${creditAccountCode}. Please ensure these accounts exist.`,
      });
    }

    // Determine journal status - always DRAFT for auto-generated entries
    const journalStatus = getJournalStatus();

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create journal entry with proper totals
      const timestamp = Date.now().toString(36).toUpperCase();
      const jeCode = `JE-${existing.code}-${timestamp}`;

      const journalEntry = await tx.journal_entry.create({
        data: {
          code: jeCode,
          date: new Date(),
          reference: existing.code,
          description: `Journal entry for expense: ${existing.expense_type?.name || 'Operational'} - ${existing.code}`,
          total_debit: expenseAmount,
          total_credit: expenseAmount,
          status: journalStatus,
          entry_type: 'AUTO_GENERATED',
          created_by: userId,
        },
      });

      // Create journal entry lines
      await tx.journal_entry_line.createMany({
        data: [
          {
            journal_entry_id: journalEntry.id,
            account_id: debitAccount.id,
            line_number: 1,
            description: `Debit - ${debitAccount.account_name}`,
            debit: expenseAmount,
            credit: 0,
            created_by: userId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccount.id,
            line_number: 2,
            description: `Credit - ${creditAccount.account_name}`,
            debit: 0,
            credit: expenseAmount,
            created_by: userId,
          },
        ],
      });

      // Update expense to approved
      const expense = await tx.expense.update({
        where: { id: parseInt(id) },
        data: {
          approval_status: 'APPROVED',
          accounting_status: 'POSTED',
          approved_by: userId,
          approved_at: new Date(),
          approval_remarks: remarks || null,
          journal_entry_id: journalEntry.id,
        },
      });

      return { expense, journalEntry, jeCode };
    });

    res.json({
      success: true,
      message: `Expense approved successfully. Journal entry created with status: ${journalStatus}`,
      data: {
        id: result.expense.id,
        code: result.expense.code,
        approval_status: result.expense.approval_status,
        journal_entry_id: result.journalEntry.id,
        journal_entry_code: result.jeCode,
        journal_entry_status: journalStatus,
        total_debit: expenseAmount.toString(),
        total_credit: expenseAmount.toString(),
      },
    });
  } catch (error) {
    logger.error('Error approving expense:', error);
    next(error);
  }
});

/**
 * POST /:id/reject
 * Reject expense
 */
router.post('/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.sub || 'system';

    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), is_deleted: false },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (existing.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be rejected',
      });
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        approval_status: 'REJECTED',
        rejected_by: userId,
        rejected_at: new Date(),
        rejection_remarks: reason || null,
        updated_by: userId,
      },
    });

    res.json({
      success: true,
      message: 'Expense rejected successfully',
      data: {
        id: expense.id,
        code: expense.code,
        approval_status: expense.approval_status,
      },
    });
  } catch (error) {
    logger.error('Error rejecting expense:', error);
    next(error);
  }
});

/**
 * POST /:id/payment
 * Record payment for a reimbursable expense installment
 * Supports cascade payments across multiple installments
 */
router.post('/:id/payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      installment_id,
      amount_paid,
      payment_date,
      payment_method: paymentMethodInput,
      payment_reference,
    } = req.body;
    const userId = req.user?.sub || 'system';

    logger.info(`[OperationalExpenses] Recording payment for expense ${id}, installment ${installment_id}, amount: ${amount_paid}`);

    // Validate amount
    if (!amount_paid || amount_paid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    // Get expense with payable and installments
    const expense = await prisma.expense.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
      include: {
        payable: {
          include: {
            installment_schedule: {
              where: { is_deleted: false },
              orderBy: { installment_number: 'asc' },
            },
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (expense.payment_method !== 'REIMBURSEMENT') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be recorded for reimbursable expenses',
      });
    }

    if (expense.approval_status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be recorded for approved expenses',
      });
    }

    if (!expense.payable) {
      return res.status(400).json({
        success: false,
        message: 'No payable found for this expense',
      });
    }

    const payable = expense.payable;
    const allInstallments = payable.installment_schedule.filter(
      inst => inst.status !== 'PAID' && inst.status !== 'CANCELLED' && inst.status !== 'WRITTEN_OFF'
    );

    // Find starting installment
    const startingInstallment = payable.installment_schedule.find(inst => inst.id === installment_id);
    if (!startingInstallment) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found',
      });
    }

    if (startingInstallment.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This installment has already been fully paid',
      });
    }

    const amountPaid = new Prisma.Decimal(amount_paid);

    // Validate against total payable balance
    if (amountPaid.greaterThan(payable.balance)) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount_paid}) exceeds total payable balance (${payable.balance})`,
      });
    }

    const paymentDateValue = payment_date ? new Date(payment_date) : new Date();

    // Find starting installment index in unpaid installments
    const startIndex = allInstallments.findIndex(inst => inst.id === installment_id);

    // Execute cascade payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      let remainingAmount = amountPaid;
      const updatedInstallments: Array<{
        id: number;
        installment_number: number;
        amount_applied: number;
        amount_due: number;
        amount_paid: number;
        balance: number;
        status: string;
      }> = [];
      const paymentRecords: any[] = [];

      // Start from the selected installment and cascade forward
      for (let i = startIndex; i < allInstallments.length && remainingAmount.greaterThan(0); i++) {
        const installment = allInstallments[i];
        const installmentBalance = installment.balance;

        // Calculate amount to apply to this installment
        const amountToApply = remainingAmount.greaterThan(installmentBalance)
          ? installmentBalance
          : remainingAmount;

        if (amountToApply.lessThanOrEqualTo(0)) continue;

        // Create payment record
        const payment = await tx.expense_installment_payment.create({
          data: {
            installment_id: installment.id,
            expense_id: expense.id,
            amount_paid: amountToApply,
            payment_date: paymentDateValue,
            payment_method: paymentMethodInput || 'CASH',
            payment_reference: payment_reference || null,
            created_by: userId,
          },
        });
        paymentRecords.push(payment);

        // Update installment
        const newInstallmentPaid = installment.amount_paid.add(amountToApply);
        const newInstallmentBalance = installment.balance.sub(amountToApply);
        const newInstallmentStatus: installment_status = newInstallmentBalance.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIALLY_PAID';

        const updatedInstallment = await tx.expense_installment_schedule.update({
          where: { id: installment.id },
          data: {
            amount_paid: newInstallmentPaid,
            balance: newInstallmentBalance,
            status: newInstallmentStatus,
            updated_by: userId,
          },
        });

        updatedInstallments.push({
          id: updatedInstallment.id,
          installment_number: updatedInstallment.installment_number,
          amount_applied: Number(amountToApply),
          amount_due: Number(updatedInstallment.amount_due),
          amount_paid: Number(updatedInstallment.amount_paid),
          balance: Number(updatedInstallment.balance),
          status: updatedInstallment.status,
        });

        // Reduce remaining amount
        remainingAmount = remainingAmount.sub(amountToApply);
      }

      // Update payable totals
      const newPayablePaid = payable.paid_amount.add(amountPaid);
      const newPayableBalance = payable.balance.sub(amountPaid);
      const newPayableStatus: payment_status = newPayableBalance.lessThanOrEqualTo(0)
        ? 'COMPLETED'
        : 'PARTIALLY_PAID';

      const updatedPayable = await tx.payable.update({
        where: { id: payable.id },
        data: {
          paid_amount: newPayablePaid,
          balance: newPayableBalance,
          status: newPayableStatus,
          last_payment_date: paymentDateValue,
          last_payment_amount: amountPaid,
          updated_by: userId,
        },
      });

      // Update expense payment_status
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          payment_status: newPayableStatus,
          updated_by: userId,
        },
      });

      return { paymentRecords, updatedInstallments, updatedPayable };
    });

    logger.info(`[OperationalExpenses] Recorded cascade payment for ${result.updatedInstallments.length} installment(s), total: ${amountPaid}`);

    res.json({
      success: true,
      message: result.updatedInstallments.length > 1
        ? `Payment of ${amount_paid} applied across ${result.updatedInstallments.length} installments`
        : 'Payment recorded successfully',
      data: {
        installments_updated: result.updatedInstallments,
        payable: {
          id: result.updatedPayable.id,
          code: result.updatedPayable.code,
          total_amount: Number(result.updatedPayable.total_amount),
          paid_amount: Number(result.updatedPayable.paid_amount),
          balance: Number(result.updatedPayable.balance),
          status: result.updatedPayable.status,
        },
        total_applied: Number(amountPaid),
      },
    });
  } catch (error) {
    logger.error('Error recording expense payment:', error);
    next(error);
  }
});

/**
 * POST /sync
 * Trigger auto-generation of expenses from unprocessed trips
 */
router.post('/sync', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub || 'system';

    logger.info('[OperationalExpenses] Sync triggered by user:', userId);

    const result = await operationalExpenseService.syncAllExpenses(userId);

    res.json({
      success: true,
      message: 'Expense sync completed',
      data: {
        bus_trips: {
          processed: result.busTripResult.processed,
          created: result.busTripResult.created,
          errors: result.busTripResult.errors.length,
        },
        rentals: {
          processed: result.rentalResult.processed,
          created: result.rentalResult.created,
          errors: result.rentalResult.errors.length,
        },
      },
    });
  } catch (error) {
    logger.error('[OperationalExpenses] Sync error:', error);
    next(error);
  }
});

export default router;
