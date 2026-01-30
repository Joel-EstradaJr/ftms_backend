import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { expense_status, payment_method } from '@prisma/client';
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
 * - Uses expense_status enum: PENDING, APPROVED, REJECTED, COMPLETED
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

    // Status filter (schema-defined values only)
    if (status) {
      const statuses = (status as string).split(',');
      where.status = { in: statuses };
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
      orderBy: { date_recorded: 'desc' },
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
      where: { ...baseWhere, status: 'PENDING' },
    });

    const approvedCount = await prisma.expense.count({
      where: { ...baseWhere, status: 'APPROVED' },
    });

    const approvedAmount = await prisma.expense.aggregate({
      where: { ...baseWhere, status: 'APPROVED' },
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

      return {
        id: exp.id,
        code: exp.code,
        date_recorded: exp.date_recorded?.toISOString().split('T')[0] || null,
        expense_name: exp.expense_type?.name || 'Unknown',
        expense_type_id: exp.expense_type_id,
        body_number,
        amount: parseFloat(exp.amount?.toString() || '0'),
        is_reimbursable: exp.payment_method === 'REIMBURSEMENT',
        status: exp.status,
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
        payable: true,
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
        status: expense.status,
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

        // Reimbursement
        is_reimbursable: expense.payment_method === 'REIMBURSEMENT',
        payable_id: expense.payable_id,
        employee_reference: expense.payable?.employee_reference,
        creditor_name: expense.payable?.creditor_name,
        payable_description: expense.payable?.description,

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

    // Create payable if reimbursement
    let payableId: number | null = null;
    if (is_reimbursable && reimbursable_details) {
      const payable = await prisma.payable.create({
        data: {
          code: `PAY-${expenseCode}`,
          creditor_name: reimbursable_details.employee_name,
          employee_reference: reimbursable_details.employee_number,
          description: `Reimbursement for ${expenseCode}`,
          total_amount: expense_information.amount,
          balance: expense_information.amount,
          due_date: reimbursable_details.due_date ? new Date(reimbursable_details.due_date) : null,
          status: 'PENDING',
          created_by: userId,
        },
      });
      payableId = payable.id;
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        code: expenseCode,
        expense_type_id: expense_information.expense_type_id,
        amount: expense_information.amount,
        date_recorded: expense_information.date_recorded ? new Date(expense_information.date_recorded) : new Date(),
        description: remarks,
        status: 'PENDING',
        payment_method: paymentMethod,

        // Trip assignment
        bus_trip_assignment_id: trip_assignment?.operational_trip_assignment_id || null,
        bus_trip_id: trip_assignment?.operational_trip_bus_trip_id || null,
        rental_assignment_id: trip_assignment?.rental_trip_assignment_id || null,

        // Accounting
        account_id: accounting_details?.account_id || null,

        // Reimbursement
        payable_id: payableId,

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
        expense_type_name: expense.expense_type?.name,
        amount: parseFloat(expense.amount.toString()),
        status: expense.status,
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

    if (existing.status !== 'PENDING') {
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
        account_id: accounting_details?.account_id,
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
    const userId = req.user?.sub || 'system';

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
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
 * Approve expense and create journal entry
 */
router.post('/:id/approve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub || 'system';

    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: {
        expense_type: true,
        account: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be approved',
      });
    }

    // Create journal entry for the expense
    const jeCode = `JE-${existing.code}`;
    const journalEntry = await prisma.journal_entry.create({
      data: {
        code: jeCode,
        date: new Date(),
        reference: existing.code,
        description: `Journal entry for expense: ${existing.expense_type?.name || existing.code}`,
        status: 'POSTED',
        created_by: userId,
      },
    });

    // Update expense to approved
    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approved_by: userId,
        approved_at: new Date(),
        journal_entry_id: journalEntry.id,
      },
    });

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: {
        id: expense.id,
        code: expense.code,
        status: expense.status,
        journal_entry_code: jeCode,
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

    if (existing.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be rejected',
      });
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'REJECTED',
        description: reason ? `${existing.description || ''}\n[Rejection Reason: ${reason}]` : existing.description,
        updated_by: userId,
      },
    });

    res.json({
      success: true,
      message: 'Expense rejected successfully',
      data: {
        id: expense.id,
        code: expense.code,
        status: expense.status,
      },
    });
  } catch (error) {
    logger.error('Error rejecting expense:', error);
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
