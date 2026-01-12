import { Router, Request, Response, NextFunction } from 'express';
import { ExpenseController } from '../../../controllers/expense.controller';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';

const router = Router();
const controller = new ExpenseController();

// Apply authentication middleware (can be disabled via ENABLE_AUTH=false)
router.use(authenticate);

/**
 * Operational Trip Expense Routes
 * 
 * These routes are specifically for managing operational trip expenses
 * from the external BOMS system.
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
    // Get expense types from expense_type table
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
      data: expenseTypes.length > 0 ? expenseTypes : [
        { id: 1, code: 'FUEL', name: 'Fuel Expense', description: 'Fuel costs for trips' },
        { id: 2, code: 'MAINT', name: 'Maintenance', description: 'Vehicle maintenance' },
        { id: 3, code: 'TOLL', name: 'Toll Fee', description: 'Toll fees' },
        { id: 4, code: 'DRIVER_ALW', name: 'Driver Allowance', description: 'Driver allowances' },
        { id: 5, code: 'COND_ALW', name: 'Conductor Allowance', description: 'Conductor allowances' },
      ],
    });
  } catch (error) {
    logger.error('Error fetching expense types:', error);
    next(error);
  }
});

/**
 * GET /payment-methods
 * Returns list of payment methods for dropdown
 */
router.get('/payment-methods', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paymentMethods = [
      { id: 1, name: 'Cash', code: 'CASH' },
      { id: 2, name: 'Reimbursement', code: 'REIMBURSEMENT' },
      { id: 3, name: 'Company Account', code: 'COMPANY_ACCOUNT' },
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
 * GET /chart-of-accounts
 * Returns chart of accounts for expense categorization
 */
router.get('/chart-of-accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.chart_of_account.findMany({
      where: {
        is_deleted: false,
        account_type: {
          name: {
            in: ['Expenses', 'Assets', 'Liabilities'],
          },
        },
      },
      select: {
        id: true,
        account_code: true,
        account_name: true,
        account_type: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        account_code: 'asc',
      },
    });

    res.json({
      success: true,
      data: accounts.map(a => ({
        id: a.id,
        code: a.account_code,
        name: a.account_name,
        type: a.account_type?.name,
      })),
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

    const employees = await prisma.employees_cache.findMany({
      where: whereClause,
      select: {
        employee_number: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        position_name: true,
        department_name: true,
      },
      take: 50,
      orderBy: {
        last_name: 'asc',
      },
    });

    res.json({
      success: true,
      data: employees.map((e) => ({
        id: e.employee_number,
        employee_number: e.employee_number,
        name: `${e.first_name || ''} ${e.middle_name ? e.middle_name + ' ' : ''}${e.last_name || ''}`.trim(),
        position: e.position_name,
        department: e.department_name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ===========================
// Operational Trips Reference
// ===========================

/**
 * GET /operational-trips
 * Returns list of operational trips that can have expenses recorded
 */
router.get('/operational-trips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.operational_trip.findMany({
      where: {
        is_expense_recorded: false,
      },
      select: {
        assignment_id: true,
        bus_trip_id: true,
        bus_route: true,
        body_number: true,
        bus_plate_number: true,
        bus_type: true,
        date_assigned: true,
        trip_fuel_expense: true,
        payment_method: true,
      },
      orderBy: {
        date_assigned: 'desc',
      },
      take: 100,
    });

    res.json({
      success: true,
      data: trips.map((t, index) => ({
        id: index + 1,
        ...t,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rental-trips
 * Returns list of rental trips that can have expenses recorded
 */
router.get('/rental-trips', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await prisma.rental_trip.findMany({
      where: {
        is_expense_recorded: false,
      },
      select: {
        assignment_id: true,
        body_number: true,
        bus_plate_number: true,
        bus_type: true,
        rental_status: true,
        rental_destination: true,
        rental_start_date: true,
        rental_end_date: true,
      },
      orderBy: {
        rental_start_date: 'desc',
      },
      take: 100,
    });

    res.json({
      success: true,
      data: trips.map((t, index) => ({
        id: index + 1,
        rental_package: t.rental_destination,
        ...t,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ===========================
// CRUD Operations
// ===========================

/**
 * GET /
 * List operational expenses with pagination and filters
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
      body_number,
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      is_deleted: false,
    };

    // Search filter - search in code and description
    if (search) {
      where.OR = [
        { code: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    // Date range filter
    if (date_from || date_to) {
      where.date_recorded = {};
      if (date_from) where.date_recorded.gte = new Date(date_from as string);
      if (date_to) where.date_recorded.lte = new Date(date_to as string);
    }

    // Status filter
    if (status) {
      const statuses = (status as string).split(',');
      where.status = { in: statuses };
    }

    // Expense name/type filter
    if (expense_name) {
      where.expense_type = { name: expense_name as string };
    }

    // Get total count
    const total = await prisma.expense.count({ where });

    // Get expenses with relations
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
        operational_trip: {
          select: {
            assignment_id: true,
            bus_trip_id: true,
            body_number: true,
            bus_plate_number: true,
            bus_route: true,
            bus_type: true,
            date_assigned: true,
          },
        },
        rental_trip: {
          select: {
            assignment_id: true,
            body_number: true,
            bus_plate_number: true,
            rental_destination: true,
            bus_type: true,
            rental_start_date: true,
          },
        },
      },
    });

    // Get summary
    const pendingCount = await prisma.expense.count({
      where: { is_deleted: false, status: 'PENDING' },
    });

    const approvedCount = await prisma.expense.count({
      where: { is_deleted: false, status: 'APPROVED' },
    });

    const approvedAmount = await prisma.expense.aggregate({
      where: { is_deleted: false, status: 'APPROVED' },
      _sum: { amount: true },
    });

    // Transform to match frontend expectations
    const transformedExpenses = expenses.map(exp => ({
      id: exp.id,
      code: exp.code,
      date_recorded: exp.date_recorded?.toISOString().split('T')[0],
      expense_name: exp.expense_type?.name || 'Unknown',
      expense_type_id: exp.expense_type_id,
      body_number: exp.operational_trip?.body_number || exp.rental_trip?.body_number || null,
      amount: parseFloat(exp.amount?.toString() || '0'),
      is_reimbursable: exp.payment_method === 'Reimbursement',
      status: exp.status || 'PENDING',
      payment_method: exp.payment_method,
      trip_type: exp.operational_trip_assignment_id ? 'operational' : (exp.rental_trip_assignment_id ? 'rental' : null),
      operational_trip: exp.operational_trip ? {
        assignment_id: exp.operational_trip.assignment_id,
        bus_trip_id: exp.operational_trip.bus_trip_id,
        body_number: exp.operational_trip.body_number,
        bus_plate_number: exp.operational_trip.bus_plate_number,
        bus_route: exp.operational_trip.bus_route,
        bus_type: exp.operational_trip.bus_type,
        date_assigned: exp.operational_trip.date_assigned?.toISOString(),
      } : null,
      rental_trip: exp.rental_trip ? {
        assignment_id: exp.rental_trip.assignment_id,
        body_number: exp.rental_trip.body_number,
        bus_plate_number: exp.rental_trip.bus_plate_number,
        rental_destination: exp.rental_trip.rental_destination,
        bus_type: exp.rental_trip.bus_type,
        rental_start_date: exp.rental_trip.rental_start_date?.toISOString(),
      } : null,
      created_by: exp.created_by,
      created_at: exp.created_at?.toISOString(),
      approved_by: exp.approved_by,
      approved_at: exp.approved_at?.toISOString(),
    }));

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
 * Get single expense by ID
 */
router.get('/:id', controller.getExpenseById);

/**
 * POST /
 * Create new expense
 */
router.post('/', controller.createExpense);

/**
 * PUT /:id
 * Update expense
 */
router.put('/:id', controller.updateExpense);

/**
 * PATCH /:id/soft-delete
 * Soft delete expense
 */
router.patch('/:id/soft-delete', controller.deleteExpense);

/**
 * POST /:id/approve
 * Approve expense
 */
router.post('/:id/approve', controller.approveExpense);

/**
 * POST /:id/reject
 * Reject expense
 */
router.post('/:id/reject', controller.rejectExpense);

/**
 * POST /sync
 * Sync expenses from external BOMS system
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This would typically fetch from external BOMS API and sync
    // For now, return a mock response
    res.json({
      success: true,
      message: 'Sync completed',
      operational: {
        new_expenses_created: 0,
        expenses_updated: 0,
        errors: [],
      },
      rental: {
        new_expenses_created: 0,
        expenses_updated: 0,
        errors: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /sync-status
 * Get sync status
 */
router.get('/sync-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        last_sync: null,
        status: 'idle',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
