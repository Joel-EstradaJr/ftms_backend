/* ============================================================
 * EXPENSE API ROUTE - Main Endpoint
 * ============================================================
 * Handles:
 * - GET: Fetch all expenses with filters, pagination, sorting
 * - POST: Create new expense (operations/manual/external)
 * 
 * Security: Input validation, sanitization, error handling
 * ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/auditLogger';

/* ============================================================
 * TYPE DEFINITIONS
 * ============================================================ */

type ExpenseFilters = {
  categoryId?: number;
  paymentMethodId?: number;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  department?: string;
  isReimbursement?: boolean;
  isPayable?: boolean;
  busTripLinked?: boolean;
  vendorName?: string;
};

type PaginationParams = {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

/* ============================================================
 * GET: Fetch Expenses with Filters & Pagination
 * ============================================================ */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ─────────────────────────────────────────────────────────
    // EXTRACT & VALIDATE PAGINATION PARAMETERS
    // ─────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const sortBy = searchParams.get('sortBy') || 'transactionDate';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // ─────────────────────────────────────────────────────────
    // EXTRACT & VALIDATE FILTER PARAMETERS
    // ─────────────────────────────────────────────────────────
    const filters: ExpenseFilters = {
      categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined,
      paymentMethodId: searchParams.get('paymentMethodId') ? parseInt(searchParams.get('paymentMethodId')!) : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      search: searchParams.get('search') || undefined,
      department: searchParams.get('department') || undefined,
      isReimbursement: searchParams.get('isReimbursement') === 'true' ? true : undefined,
      isPayable: searchParams.get('isPayable') === 'true' ? true : undefined,
      busTripLinked: searchParams.get('busTripLinked') === 'true' ? true : undefined,
      vendorName: searchParams.get('vendorName') || undefined,
    };

    // ─────────────────────────────────────────────────────────
    // BUILD DYNAMIC WHERE CLAUSE
    // ─────────────────────────────────────────────────────────
    const whereClause: Prisma.ExpenseWhereInput = {
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.paymentMethodId && { paymentMethodId: filters.paymentMethodId }),
      ...(filters.dateFrom && {
        transactionDate: {
          gte: new Date(filters.dateFrom),
        },
      }),
      ...(filters.dateTo && {
        transactionDate: {
          lte: new Date(filters.dateTo),
        },
      }),
      ...(filters.minAmount !== undefined && {
        amount: {
          gte: filters.minAmount,
        },
      }),
      ...(filters.maxAmount !== undefined && {
        amount: {
          lte: filters.maxAmount,
        },
      }),
      ...(filters.search && {
        OR: [
          { expenseCode: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { vendorName: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.department && {
        category: {
          department: { contains: filters.department, mode: 'insensitive' },
        },
      }),
      ...(filters.isReimbursement !== undefined && { isReimbursement: filters.isReimbursement }),
      ...(filters.isPayable !== undefined && { isPayable: filters.isPayable }),
      ...(filters.busTripLinked !== undefined && {
        busTripCacheId: filters.busTripLinked ? { not: null } : null,
      }),
      ...(filters.vendorName && {
        vendorName: { contains: filters.vendorName, mode: 'insensitive' },
      }),
    };

    // ─────────────────────────────────────────────────────────
    // BUILD DYNAMIC ORDER BY CLAUSE
    // ─────────────────────────────────────────────────────────
    const orderByClause: Prisma.ExpenseOrderByWithRelationInput = {};
    
    // Handle nested sorting (e.g., category.name, paymentMethod.methodName)
    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      if (relation === 'category' && field === 'name') {
        orderByClause.category = { name: sortOrder };
      } else if (relation === 'paymentMethod' && field === 'methodName') {
        orderByClause.paymentMethod = { methodName: sortOrder };
      }
    } else {
      // Direct field sorting
      orderByClause[sortBy as keyof Prisma.ExpenseOrderByWithRelationInput] = sortOrder;
    }

    // ─────────────────────────────────────────────────────────
    // EXECUTE QUERIES (COUNT + FETCH)
    // ─────────────────────────────────────────────────────────
    const [totalCount, expenses] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              categoryCode: true,
              name: true,
              department: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              methodCode: true,
              methodName: true,
            },
          },
          busTripCache: {
            select: {
              assignmentId: true,
              busTripId: true,
              busRoute: true,
              busPlateNumber: true,
              busType: true,
              bodyNumber: true,
              driverName: true,
              conductorName: true,
              dateAssigned: true,
              tripFuelExpense: true,
              tripRevenue: true,
              assignmentType: true,
              assignmentValue: true,
              paymentMethod: true,
            },
          },
          reimbursements: {
            select: {
              id: true,
              employeeName: true,
              department: true,
              claimedAmount: true,
              status: true,
              paymentMethodType: true,
            },
          },
          accountsPayable: {
            select: {
              id: true,
              apCode: true,
              status: true,
              dueDate: true,
              lastPaymentDate: true,
            },
          },
        },
      }),
    ]);

    // ─────────────────────────────────────────────────────────
    // CALCULATE PAGINATION METADATA
    // ─────────────────────────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    // ─────────────────────────────────────────────────────────
    // RETURN SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: filters,
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────
    console.error('❌ [GET /api/expense] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expenses',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/* ============================================================
 * POST: Create New Expense
 * ============================================================
 * Scenarios:
 * 1. Bus Trip Linked (Operations) - with optional reimbursements
 * 2. External Purchase/Vendor Payment
 * 3. Manual/General Expense
 * ============================================================ */

export async function POST(request: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────
    // PARSE & VALIDATE REQUEST BODY
    // ─────────────────────────────────────────────────────────
    const body = await request.json();

    const {
      categoryId,
      description,
      amount,
      transactionDate,
      paymentMethodId,
      busTripCacheId,
      externalRefId,
      externalRefType,
      vendorName,
      vendorId,
      isReimbursement,
      reimbursements, // Array of { employeeNumber, employeeName, department, amount }
      isPayable,
      payableDueDate,
      payableStatus,
      documentIds,
      createdBy,
    } = body;

    // ─────────────────────────────────────────────────────────
    // REQUIRED FIELD VALIDATION
    // ─────────────────────────────────────────────────────────
    if (!categoryId || !description || !amount || !transactionDate || !paymentMethodId || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['categoryId', 'description', 'amount', 'transactionDate', 'paymentMethodId', 'createdBy'],
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // BUSINESS LOGIC VALIDATION
    // ─────────────────────────────────────────────────────────
    
    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate transaction date (cannot be future)
    if (new Date(transactionDate) > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Transaction date cannot be in the future' },
        { status: 400 }
      );
    }

    // Validate reimbursement logic
    if (isReimbursement && (!reimbursements || reimbursements.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Reimbursement expenses require at least one reimbursement entry' },
        { status: 400 }
      );
    }

    if (isReimbursement && reimbursements) {
      const totalReimbursementAmount = reimbursements.reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount || 0),
        0
      );

      if (Math.abs(totalReimbursementAmount - parseFloat(amount)) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sum of reimbursements must equal total expense amount',
            totalReimbursement: totalReimbursementAmount,
            expenseAmount: amount,
          },
          { status: 400 }
        );
      }
    }

    // Validate payable logic
    if (isPayable && !payableDueDate) {
      return NextResponse.json(
        { success: false, error: 'Payable expenses require a due date' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // CHECK FOREIGN KEY CONSTRAINTS
    // ─────────────────────────────────────────────────────────
    
    // Verify category exists
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: `Category with ID ${categoryId} not found` },
        { status: 404 }
      );
    }

    // Verify payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: `Payment method with ID ${paymentMethodId} not found` },
        { status: 404 }
      );
    }

    // Verify bus trip cache if provided
    if (busTripCacheId) {
      const busTripCache = await prisma.busTripCache.findUnique({
        where: { id: busTripCacheId },
      });
      if (!busTripCache) {
        return NextResponse.json(
          { success: false, error: `Bus trip with ID ${busTripCacheId} not found` },
          { status: 404 }
        );
      }

      // Check if expense already recorded for this trip + category
      const existingExpense = await prisma.expense.findFirst({
        where: {
          busTripCacheId,
          categoryId,
        },
      });

      if (existingExpense) {
        return NextResponse.json(
          {
            success: false,
            error: `Expense for this bus trip and category already exists`,
            existingExpenseCode: existingExpense.expenseCode,
          },
          { status: 409 }
        );
      }
    }

    // ─────────────────────────────────────────────────────────
    // CREATE EXPENSE RECORD (WITH TRANSACTION)
    // ─────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expense.create({
        data: {
          categoryId,
          description,
          amount: parseFloat(amount),
          transactionDate: new Date(transactionDate),
          paymentMethodId,
          busTripCacheId: busTripCacheId || null,
          externalRefId: externalRefId || null,
          externalRefType: externalRefType || null,
          vendorName: vendorName || null,
          vendorId: vendorId || null,
          isReimbursement: isReimbursement || false,
          isPayable: isPayable || false,
          payableDueDate: payableDueDate ? new Date(payableDueDate) : null,
          payableStatus: payableStatus || (isPayable ? 'PENDING' : null),
          documentIds: documentIds || null,
          createdBy,
        },
        include: {
          category: true,
          paymentMethod: true,
          busTripCache: true,
        },
      });

      // Create reimbursement records if applicable
      if (isReimbursement && reimbursements && reimbursements.length > 0) {
        const reimbursementRecords = reimbursements.map((r: any) => ({
          expenseId: expense.id,
          employeeNumber: r.employeeNumber,
          employeeName: r.employeeName,
          department: r.department || 'Operations',
          claimedAmount: parseFloat(r.amount),
          status: 'PENDING' as const,
          paymentMethodType: r.paymentMethodType || 'CASH' as const,
          createdBy,
        }));

        await tx.reimbursement.createMany({
          data: reimbursementRecords,
        });
      }

      // Update bus trip cache if linked
      if (busTripCacheId) {
        await tx.busTripCache.update({
          where: { id: busTripCacheId },
          data: { isExpenseRecorded: true },
        });
      }

      // Create accounts payable if marked as payable
      if (isPayable) {
        await tx.accountsPayable.create({
          data: {
            apCode: `AP-${expense.expenseCode}`,
            creditorName: vendorName || 'N/A',
            creditorType: 'VENDOR',
            creditorId: vendorId || null,
            totalAmount: parseFloat(amount),
            balanceAmount: parseFloat(amount),
            invoiceDate: new Date(),
            dueDate: new Date(payableDueDate),
            status: payableStatus || 'PENDING',
            remarks: description,
            recordedBy: createdBy,
          },
        });
      }

      // Log audit trail
      await logAudit({
        action: 'CREATE',
        table_affected: 'ExpenseRecord',
        record_id: expense.id.toString(),
        performed_by: createdBy,
        details: `Created expense ${expense.expenseCode}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request,
      });

      return expense;
    });

    // ─────────────────────────────────────────────────────────
    // RETURN SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: 'Expense created successfully',
        data: result,
      },
      { status: 201 }
    );

  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────
    console.error('❌ [POST /api/expense] Error:', error);

    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Expense with this code already exists' },
          { status: 409 }
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { success: false, error: 'Invalid foreign key reference' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create expense',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
