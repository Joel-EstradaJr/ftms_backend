import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { approval_status, payment_method, payment_status, installment_status, receivable_frequency, Prisma } from '@prisma/client';
import { operationalExpenseService } from '../../../services/operationalExpense.service';
import { AuditLogClient, AuditEntityTypes } from '../../../integrations/audit/audit.client';
import { JournalEntryAutoService, CreateAutoJournalEntryInput } from '../../../services/journalEntryAuto.service';
import {
    EXPENSE_TYPE_TO_EXPENSE_COA,
    EXPENSE_TYPE_TO_PAYABLE_COA,
    PAYMENT_METHOD_TO_ASSET_COA
} from '../../../lib/coaMapping';

// Journal entry service for payment JE creation
const journalEntryService = new JournalEntryAutoService();

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
        employees: {
          include: {
            employee: {
              select: {
                employee_number: true,
                first_name: true,
                last_name: true,
              }
            }
          }
        }
      },
      orderBy: {
        date_assigned: 'desc',
      },
      take: 100,
    });

    res.json({
      success: true,
      data: trips.map((t) => {
        const driver = t.employees.find((e: any) => e.role === 'DRIVER')?.employee;
        const conductor = t.employees.find((e: any) => e.role === 'CONDUCTOR')?.employee;

        return {
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
          // Crew details
          driver_id: driver?.employee_number || null,
          driver_name: driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : null,
          conductor_id: conductor?.employee_number || null,
          conductor_name: conductor ? `${conductor.first_name || ''} ${conductor.last_name || ''}`.trim() : null,
        };
      }),
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
        payment_status = exp.payment_status || 'PENDING';
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
 * GET /chart-of-accounts
 * Returns list of chart of accounts (expense accounts)
 */
router.get('/chart-of-accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.chart_of_account.findMany({
      where: {
        is_deleted: false,
        // Typically expenses are expense accounts, but schema might vary. 
        // Assuming we fetch all active non-deleted accounts.
      },
      select: {
        id: true,
        account_code: true,
        account_name: true,
      },
      orderBy: {
        account_code: 'asc',
      },
    });

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    logger.error('Error fetching chart of accounts:', error);
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

    // Validate ID is numeric
    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID',
      });
    }

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
            employees: {
              include: {
                employee: {
                  select: {
                    employee_number: true,
                    first_name: true,
                    last_name: true,
                  }
                }
              }
            }
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

    // Extract crew details if bus trip
    const driver = expense.bus_trip?.employees?.find((e: any) => e.role === 'DRIVER')?.employee;
    const conductor = expense.bus_trip?.employees?.find((e: any) => e.role === 'CONDUCTOR')?.employee;

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

        // Crew details
        driver_id: driver?.employee_number || null,
        driver_name: driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : null,
        conductor_id: conductor?.employee_number || null,
        conductor_name: conductor ? `${conductor.first_name || ''} ${conductor.last_name || ''}`.trim() : null,

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
        // accounting_status remains NULL until approval creates JE
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

    // Audit log - CREATE action
    await AuditLogClient.logCreate(
      AuditEntityTypes.EXPENSE,
      { id: expense.id, code: expense.code },
      expense,
      {
        id: userId,
        name: req.user?.username || userId,
        role: req.user?.role || 'admin',
      },
      req
    );

    logger.info(`[OPERATIONAL_EXPENSE] Created expense ${expense.code} by ${userId}`);

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
      include: { expense_type: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    const isPending = existing.approval_status === 'PENDING';
    const isApprovedEditable = existing.approval_status === 'APPROVED' &&
      ['PENDING', 'PARTIALLY_PAID'].includes(existing.payment_status);

    if (!isPending && !isApprovedEditable) {
      return res.status(400).json({
        success: false,
        message: 'Expense cannot be edited. Only PENDING or unpaid/partially paid APPROVED expenses can be edited.',
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

    // Audit log - UPDATE action
    await AuditLogClient.logUpdate(
      AuditEntityTypes.EXPENSE,
      { id: expense.id, code: expense.code },
      existing,
      expense,
      {
        id: userId,
        name: req.user?.username || userId,
        role: req.user?.role || 'admin',
      },
      req
    );

    logger.info(`[OPERATIONAL_EXPENSE] Updated expense ${expense.code} by ${userId}`);

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
 * Soft delete expense (only PENDING status)
 */
router.patch('/:id/soft-delete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.sub || 'system';

    // Check if expense exists and is deletable
    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: { expense_type: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Only allow deletion for PENDING approval status
    if (existing.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only PENDING expenses can be deleted',
      });
    }

    await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date(),
        deletion_remarks: reason || null,
      },
    });

    // Audit log - ARCHIVE action for soft delete
    await AuditLogClient.logArchive(
      AuditEntityTypes.EXPENSE,
      { id: existing.id, code: existing.code },
      {
        id: userId,
        name: req.user?.username || userId,
        role: req.user?.role || 'admin',
      },
      {
        deletion_reason: reason || 'No reason provided',
        expense_type: existing.expense_type?.name || 'Unknown',
        amount: existing.amount?.toString(),
      },
      req
    );

    logger.info(`[OPERATIONAL_EXPENSE] Deleted expense ${existing.code} by ${userId}. Reason: ${reason || 'N/A'}`);

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
          accounting_status: 'DRAFT', // Match JE status - will be POSTED when JE is posted
          approved_by: userId,
          approved_at: new Date(),
          approval_remarks: remarks || null,
          journal_entry_id: journalEntry.id,
        },
      });

      return { expense, journalEntry, jeCode };
    });

    // Audit log - APPROVE action
    await AuditLogClient.logApprove(
      AuditEntityTypes.EXPENSE,
      { id: result.expense.id, code: result.expense.code },
      {
        id: userId,
        name: req.user?.username || userId,
        role: req.user?.role || 'admin',
      },
      { ...existing, approval_status: existing.approval_status },
      { ...result.expense, approval_status: 'APPROVED' },
      req
    );

    logger.info(`[OPERATIONAL_EXPENSE] Approved expense ${result.expense.code} by ${userId}`);

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
      include: { expense_type: true },
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
      include: { expense_type: true },
    });

    // Audit log - REJECT action
    await AuditLogClient.logReject(
      AuditEntityTypes.EXPENSE,
      { id: expense.id, code: expense.code },
      {
        id: userId,
        name: req.user?.username || userId,
        role: req.user?.role || 'admin',
      },
      reason || 'No reason provided',
      { ...existing, approval_status: existing.approval_status },
      { ...expense, approval_status: 'REJECTED', rejection_remarks: reason },
      req
    );

    logger.info(`[OPERATIONAL_EXPENSE] Rejected expense ${expense.code} by ${userId}. Reason: ${reason || 'N/A'}`);

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
 * Creates Journal Entry: DR Accounts Payable, CR Cash/Bank
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
        expense_type: true,
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

    // =========================================================================
    // STEP 1: Create Journal Entry FIRST (before transaction)
    // BUSINESS RULE: Each payment creates its own JE with status = DRAFT
    // JE: DR Accounts Payable, CR Cash/Bank
    // =========================================================================
    let journalEntryId: number | null = null;
    
    try {
      // Get asset account based on payment method
      const paymentMethod = paymentMethodInput || 'CASH';
      const assetAccountCode = PAYMENT_METHOD_TO_ASSET_COA[paymentMethod] || PAYMENT_METHOD_TO_ASSET_COA['CASH'];
      const payableAccountCode = EXPENSE_TYPE_TO_PAYABLE_COA['EXPT-001'] || '2100'; // Operational AP
      const paymentDateStr = paymentDateValue.toISOString().split('T')[0];

      const journalEntryInput: CreateAutoJournalEntryInput = {
        module: 'OPERATIONAL_EXPENSE_PAYMENT',
        reference_id: `Payment for ${expense.code}`,
        description: `Reimbursement payment for ${expense.expense_type?.name || 'Operational Expense'} - ${expense.code}`,
        date: paymentDateStr,
        entries: [
          {
            account_code: payableAccountCode,
            debit: amount_paid,
            credit: 0,
            description: `Reduce AP - Reimbursement payment`
          },
          {
            account_code: assetAccountCode,
            debit: 0,
            credit: amount_paid,
            description: `Payment made - ${paymentMethod}`
          }
        ]
      };

      // Create JE with DRAFT status
      const journalEntry = await journalEntryService.createAutoJournalEntry(
        journalEntryInput,
        userId
      );
      journalEntryId = journalEntry.id;

      logger.info(`[OPERATIONAL_EXPENSE] Created payment journal entry ${journalEntry.code} with DRAFT status`);
    } catch (jeError) {
      logger.error(`[OPERATIONAL_EXPENSE] Failed to create payment journal entry:`, jeError);
      // Continue with payment recording even if JE creation fails
    }

    // =========================================================================
    // STEP 2: Execute cascade payment in transaction (with JE link)
    // =========================================================================
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

        // Create payment record with JE link
        // BUSINESS RULE: Payment accounting_status = DRAFT
        // It becomes POSTED only when the linked JE is posted
        const payment = await tx.expense_installment_payment.create({
          data: {
            installment_id: installment.id,
            expense_id: expense.id,
            amount_paid: amountToApply,
            payment_date: paymentDateValue,
            payment_method: paymentMethodInput || 'CASH',
            payment_reference: payment_reference || null,
            journal_entry_id: journalEntryId,
            accounting_status: 'DRAFT', // Will be POSTED when JE is posted
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

    // Audit log - PAYMENT action (use UPDATE since payment modifies expense payment status)
    try {
      const previousPaymentStatus = payable.status || 'PENDING';
      const previousBalance = Number(payable.balance);

      await AuditLogClient.logUpdate(
        AuditEntityTypes.EXPENSE,
        { id: expense.id, code: expense.code },
        // Previous state (before payment)
        {
          code: expense.code,
          category: expense.expense_type?.name || 'Operational',
          amount: Number(expense.amount),
          status: previousPaymentStatus,
          description: expense.description || `${expense.expense_type?.name || 'Operational'} expense`,
          remarks: `Balance: ₱${previousBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        },
        // New state (after payment)
        {
          code: expense.code,
          category: expense.expense_type?.name || 'Operational',
          amount: Number(expense.amount),
          status: result.updatedPayable.status,
          description: expense.description || `${expense.expense_type?.name || 'Operational'} expense`,
          payment_method: paymentMethodInput || 'CASH',
          payment_reference: journalEntryId ? `JE-${journalEntryId.toString().padStart(6, '0')}` : payment_reference || undefined,
          remarks: `Payment: ₱${Number(amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Balance: ₱${Number(result.updatedPayable.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        },
        {
          id: userId,
          name: req.user?.username || userId,
          role: req.user?.role || 'admin',
          department: 'Finance',
        },
        req
      );
    } catch (auditError) {
      logger.error(`[OPERATIONAL_EXPENSE] Failed to create audit log for payment:`, auditError);
    }

    logger.info(`[OPERATIONAL_EXPENSE] Recorded cascade payment for ${result.updatedInstallments.length} installment(s), total: ${amountPaid}, JE: ${journalEntryId || 'N/A'}`);

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
        journal_entry_id: journalEntryId,
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

/**
 * GET /:id/reimbursement
 * Get reimbursement details for an expense including driver/conductor shares
 */
router.get('/:id/reimbursement', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get expense with payable and linked bus trip (including employees via junction table)
    const expense = await prisma.expense.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
      include: {
        expense_type: true,
        payable: {
          include: {
            installment_schedule: {
              where: { is_deleted: false },
              orderBy: { installment_number: 'asc' },
              include: {
                payments: true,
              },
            },
          },
        },
        bus_trip: {
          include: {
            bus: true,
            employees: {
              where: { is_deleted: false },
              include: {
                employee: true,
              },
            },
          },
        },
      },
    }) as any;

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (expense.payment_method !== 'REIMBURSEMENT') {
      return res.status(400).json({
        success: false,
        message: 'This expense is not a reimbursable expense',
      });
    }

    // Get driver and conductor from employees junction table by role
    const driverJunction = expense.bus_trip?.employees?.find((e: any) => e.role === 'DRIVER');
    const conductorJunction = expense.bus_trip?.employees?.find((e: any) => e.role === 'CONDUCTOR');
    const driver = driverJunction?.employee;
    const conductor = conductorJunction?.employee;

    // Calculate 50:50 split
    const totalAmount = Number(expense.amount);
    const hasConductor = !!conductor;
    const driverShare = hasConductor ? totalAmount / 2 : totalAmount;
    const conductorShare = hasConductor ? totalAmount / 2 : 0;

    // Get payable and installments
    const payable = expense.payable;
    const installments = payable?.installment_schedule || [];

    // Calculate paid amounts by filtering payments (tagged by role)
    let driverPaid = 0;
    let conductorPaid = 0;

    if (payable) {
      payable.installment_schedule.forEach((inst: any) => {
        inst.payments?.forEach((pay: any) => {
          const amount = Number(pay.amount_paid);
          const ref = pay.payment_reference || '';

          if (ref.includes('{{DRIVER}}')) {
            driverPaid += amount;
          } else if (ref.includes('{{CONDUCTOR}}')) {
            conductorPaid += amount;
          } else {
            // Untagged payments: split proportionally
            if (hasConductor) {
              driverPaid += amount / 2;
              conductorPaid += amount / 2;
            } else {
              driverPaid += amount;
            }
          }
        });
      });
    }

    // Prepare response data
    const mapInstallments = (shareAmount: number, personPaid: number) => {
      // Calculate person's balance and status
      const personBalance = shareAmount - personPaid;
      // Determine status based on this person's payment
      let personStatus = 'PENDING';
      if (shareAmount > 0) {
        if (personBalance <= 0) personStatus = 'COMPLETED';
        else if (personPaid > 0) personStatus = 'PARTIALLY_PAID';
      }

      if (installments.length === 0) {
        return [{
          id: `synthetic-${id}`,
          installment_number: 1,
          due_date: new Date().toISOString(),
          amount_due: shareAmount,
          amount_paid: personPaid,
          balance: personBalance > 0 ? personBalance : 0,
          status: personStatus,
        }];
      }

      // Map installments - logic to distribute personPaid across installments
      // For simplicity, we apply personPaid to installments in order
      let remainingPaid = personPaid;

      return installments.map((inst: any) => {
        const instTotalAmount = Number(inst.amount_due);
        // Calculate this person's share of this installment
        const instShare = instTotalAmount * (shareAmount / totalAmount);

        // Calculate how much of person's paid amount applies to this installment
        let paidForInst = 0;
        if (remainingPaid > 0) {
          paidForInst = Math.min(remainingPaid, instShare);
          remainingPaid -= paidForInst;
        }

        const bal = instShare - paidForInst;

        let instStatus = 'PENDING';
        if (instShare > 0) {
          if (bal <= 0) instStatus = 'COMPLETED';
          else if (paidForInst > 0) instStatus = 'PARTIALLY_PAID';
        }

        return {
          id: inst.id,
          installment_number: inst.installment_number,
          due_date: inst.due_date.toISOString(),
          amount_due: instShare,
          amount_paid: paidForInst,
          balance: bal > 0 ? bal : 0,
          status: instStatus,
        };
      });
    };

    // Determine status
    const getEmployeeStatus = (paid: number, share: number) => {
      if (paid >= share) return 'COMPLETED';
      if (paid > 0) return 'PARTIALLY_REIMBURSED';
      return 'PENDING_REIMBURSEMENT';
    };

    const responseData: any = {
      expense_id: expense.id,
      expense_code: expense.code,
      total_amount: totalAmount,
      payment_status: expense.payment_status || (payable?.status || 'PENDING_REIMBURSEMENT'),
      date_recorded: expense.date_recorded.toISOString(),
      body_number: expense.bus_trip?.bus?.body_number || null,
      expense_type_name: expense.expense_type?.name || null,
    };

    // Add driver details
    responseData.driver = driver ? {
      employee_number: driver.employee_number,
      employee_name: `${driver.first_name} ${driver.last_name}`.trim(),
      share_amount: driverShare,
      paid_amount: driverPaid,
      balance: driverShare - driverPaid,
      status: getEmployeeStatus(driverPaid, driverShare),
      installments: mapInstallments(driverShare, driverPaid),
    } : null;

    // Add conductor details if exists
    responseData.conductor = conductor ? {
      employee_number: conductor.employee_number,
      employee_name: `${conductor.first_name} ${conductor.last_name}`.trim(),
      share_amount: conductorShare,
      paid_amount: conductorPaid,
      balance: conductorShare - conductorPaid,
      status: getEmployeeStatus(conductorPaid, conductorShare),
      installments: mapInstallments(conductorShare, conductorPaid),
    } : null;

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Error fetching reimbursement details:', error);
    next(error);
  }
});

/**
 * POST /:id/reimbursement/payment
 * Record a reimbursement payment for driver or conductor
 */
router.post('/:id/reimbursement/payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      employee_type,
      installment_id,
      amount_paid,
      payment_date,
      payment_method: paymentMethodInput,
      payment_reference,
    } = req.body;
    const userId = req.user?.sub || 'system';

    logger.info(`[OperationalExpenses] Recording reimbursement payment for expense ${id}, employee type: ${employee_type}, amount: ${amount_paid}`);

    // Validate amount
    if (!amount_paid || amount_paid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    // Get expense with payable and expense_type
    const expense = await prisma.expense.findFirst({
      where: {
        id: parseInt(id),
        is_deleted: false,
      },
      include: {
        expense_type: true,
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

    const payable = expense.payable;

    // If no payable exists, create one
    let payableId = payable?.id;
    if (!payable) {
      const newPayable = await prisma.payable.create({
        data: {
          code: `PAY-${expense.code}`,
          creditor_name: 'Employee Reimbursement',
          total_amount: expense.amount,
          paid_amount: 0,
          balance: expense.amount,
          status: 'PENDING',
          due_date: new Date(),
          created_by: userId,
        },
      });
      payableId = newPayable.id;

      // Update expense with payable reference
      await prisma.expense.update({
        where: { id: expense.id },
        data: { payable_id: newPayable.id },
      });
    }

    const amountPaid = new Prisma.Decimal(amount_paid);
    const paymentDateValue = payment_date ? new Date(payment_date) : new Date();

    // Record the payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get the current payable state
      const currentPayable = await tx.payable.findUnique({
        where: { id: payableId },
        include: {
          installment_schedule: {
            where: { is_deleted: false },
            orderBy: { installment_number: 'asc' },
          },
        },
      });

      if (!currentPayable) {
        throw new Error('Payable not found');
      }

      // Check if there's an installment to apply payment to
      let targetInstallment = currentPayable.installment_schedule.find(
        inst => inst.status !== 'PAID' && inst.status !== 'CANCELLED' && inst.status !== 'WRITTEN_OFF'
      );

      // If no installment exists, create one
      if (!targetInstallment) {
        targetInstallment = await tx.expense_installment_schedule.create({
          data: {
            payable_id: currentPayable.id,
            installment_number: 1,
            amount_due: currentPayable.balance,
            amount_paid: 0,
            balance: currentPayable.balance,
            due_date: new Date(),
            status: 'PENDING',
            created_by: userId,
          },
        });
      }

      // Create payment record
      const payment = await tx.expense_installment_payment.create({
        data: {
          installment_id: targetInstallment.id,
          expense_id: expense.id,
          amount_paid: amountPaid,
          payment_date: paymentDateValue,
          payment_method: paymentMethodInput || 'CASH',
          payment_reference: req.body.employee_role
            ? `{{${req.body.employee_role}}} ${payment_reference || ''}`.trim()
            : payment_reference || null,
          created_by: userId,
        },
      });

      // Update installment
      const newInstallmentPaid = new Prisma.Decimal(targetInstallment.amount_paid).add(amountPaid);
      const newInstallmentBalance = new Prisma.Decimal(targetInstallment.balance).sub(amountPaid);
      const newInstallmentStatus: installment_status = newInstallmentBalance.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIALLY_PAID';

      await tx.expense_installment_schedule.update({
        where: { id: targetInstallment.id },
        data: {
          amount_paid: newInstallmentPaid,
          balance: newInstallmentBalance.lessThan(0) ? 0 : newInstallmentBalance,
          status: newInstallmentStatus,
          updated_by: userId,
        },
      });

      // Update payable totals
      const newPayablePaid = new Prisma.Decimal(currentPayable.paid_amount).add(amountPaid);
      const newPayableBalance = new Prisma.Decimal(currentPayable.balance).sub(amountPaid);
      const newPayableStatus: payment_status = newPayableBalance.lessThanOrEqualTo(0)
        ? 'COMPLETED'
        : 'PARTIALLY_PAID';

      const updatedPayable = await tx.payable.update({
        where: { id: currentPayable.id },
        data: {
          paid_amount: newPayablePaid,
          balance: newPayableBalance.lessThan(0) ? 0 : newPayableBalance,
          status: newPayableStatus,
          last_payment_date: paymentDateValue,
          last_payment_amount: amountPaid,
          updated_by: userId,
        },
      });

      // Update expense payment_status
      const expensePaymentStatus = newPayableBalance.lessThanOrEqualTo(0)
        ? 'COMPLETED'
        : 'PARTIALLY_PAID';

      await tx.expense.update({
        where: { id: expense.id },
        data: {
          payment_status: expensePaymentStatus,
          updated_by: userId,
        },
      });

      return { payment, updatedPayable };
    });

    // Create Journal Entry for the reimbursement payment
    const paymentMethod = paymentMethodInput || 'CASH';
    const paymentDateStr = paymentDateValue.toISOString().split('T')[0];
    const expenseTypeName = expense.expense_type?.name || 'General';
    const payableAccountCode = EXPENSE_TYPE_TO_PAYABLE_COA[expenseTypeName] || '2100'; // Default to A/P - Trade
    const assetAccountCode = PAYMENT_METHOD_TO_ASSET_COA[paymentMethod] || '1001'; // Default to Cash on Hand

    const journalEntryInput: CreateAutoJournalEntryInput = {
      module: 'OPERATIONAL_EXPENSE_REIMBURSEMENT',
      reference_id: `Reimbursement for ${expense.code}`,
      description: `Reimbursement payment to employee for ${expenseTypeName} - ${expense.code}`,
      date: paymentDateStr,
      entries: [
        {
          account_code: payableAccountCode,
          debit: Number(amountPaid),
          credit: 0,
          description: `Reduce A/P - Reimbursement payment to employee`,
        },
        {
          account_code: assetAccountCode,
          debit: 0,
          credit: Number(amountPaid),
          description: `Payment made - ${paymentMethod}`,
        },
      ],
    };

    let journalEntryId: number | null = null;
    try {
      const journalEntry = await journalEntryService.createAutoJournalEntry(journalEntryInput);
      journalEntryId = journalEntry.id;
      logger.info(`[OperationalExpenses] Created JE ${journalEntry.id} for reimbursement payment on expense ${id}`);
      
      // Update the payment record with the journal entry id
      await prisma.expense_installment_payment.update({
        where: { id: result.payment.id },
        data: {
          journal_entry_id: journalEntry.id,
          accounting_status: 'DRAFT',
        },
      });
    } catch (jeError) {
      logger.error(`[OperationalExpenses] Failed to create JE for reimbursement payment on expense ${id}:`, jeError);
      // Don't fail the payment, just log the error
    }

    // Audit Log for payment (use UPDATE since payment modifies expense payment status)
    try {
      const previousPaymentStatus = payable?.status || 'PENDING';
      const previousBalance = payable ? Number(payable.balance) : Number(expense.amount);

      await AuditLogClient.logUpdate(
        AuditEntityTypes.EXPENSE,
        { id: expense.id, code: expense.code },
        // Previous state (before payment)
        {
          code: expense.code,
          category: expense.expense_type?.name || 'Operational',
          amount: Number(expense.amount),
          status: previousPaymentStatus,
          description: expense.description || `${expense.expense_type?.name || 'Operational'} expense`,
          remarks: `Balance: ₱${previousBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        },
        // New state (after payment)
        {
          code: expense.code,
          category: expense.expense_type?.name || 'Operational',
          amount: Number(expense.amount),
          status: result.updatedPayable.status,
          description: expense.description || `${expense.expense_type?.name || 'Operational'} expense`,
          payment_method: paymentMethod,
          payment_reference: journalEntryId ? `JE-${journalEntryId.toString().padStart(6, '0')}` : payment_reference || undefined,
          remarks: `Payment: ₱${Number(amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2 })} | Balance: ₱${Number(result.updatedPayable.balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        },
        {
          id: userId,
          name: req.user?.username || userId,
          role: req.user?.role || 'admin',
          department: 'Finance',
        },
        req
      );
    } catch (auditError) {
      logger.error('Audit log failed:', auditError);
    }

    logger.info(`[OperationalExpenses] Recorded reimbursement payment for expense ${id}, amount: ${amountPaid}`);

    res.json({
      success: true,
      message: 'Reimbursement payment recorded successfully',
      data: {
        payment_id: result.payment.id,
        payable: {
          id: result.updatedPayable.id,
          code: result.updatedPayable.code,
          total_amount: Number(result.updatedPayable.total_amount),
          paid_amount: Number(result.updatedPayable.paid_amount),
          balance: Number(result.updatedPayable.balance),
          status: result.updatedPayable.status,
        },
      },
    });
  } catch (error) {
    logger.error('Error recording reimbursement payment:', error);
    next(error);
  }
});

export default router;
