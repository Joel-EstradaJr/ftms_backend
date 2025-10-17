/**
 * Admin Revenue API Route
 * Handles listing (GET) and creation (POST) of revenue records
 * Admin-only access - full CRUD permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRevenueData } from '@/lib/admin/revenues/validation';
import { generateRevenueCode } from '@/lib/idGenerator';
import type { RevenueFormData } from '@/app/types/revenue';
import { getClientIp } from '@/lib/shared/auditLogger';

/**
 * GET /api/admin/revenue
 * List revenues with pagination, filtering, and sorting
 * Admin-only: Can view all revenue records
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build WHERE clause
    const where: any = {};

    // Filter by sourceId
    const sourceId = searchParams.get('sourceId');
    if (sourceId) {
      where.sourceId = parseInt(sourceId, 10);
    }

    // Filter by externalRefType
    const externalRefType = searchParams.get('externalRefType');
    if (externalRefType) {
      where.externalRefType = externalRefType;
    }

    // Filter by isAccountsReceivable
    const isAccountsReceivable = searchParams.get('isAccountsReceivable');
    if (isAccountsReceivable !== null) {
      where.isAccountsReceivable = isAccountsReceivable === 'true';
    }

    // Filter by isInstallment
    const isInstallment = searchParams.get('isInstallment');
    if (isInstallment !== null) {
      where.isInstallment = isInstallment === 'true';
    }

    // Filter by arStatus
    const arStatus = searchParams.get('arStatus');
    if (arStatus) {
      where.arStatus = arStatus;
    }

    // Date range filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    // Search by revenueCode, description, source name, or payment method name
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { revenueCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { 
          source: { 
            name: { contains: search, mode: 'insensitive' } 
          } 
        },
        { 
          paymentMethod: { 
            methodName: { contains: search, mode: 'insensitive' } 
          } 
        },
      ];
    }

    // Sorting - support multiple columns with default to transactionDate desc
    const sortBy = searchParams.get('sortBy') || 'transactionDate';
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    
    // Build orderBy based on sortBy parameter
    let orderBy: any = {};
    
    switch (sortBy) {
      case 'revenueCode':
        orderBy = { revenueCode: sortOrder };
        break;
      case 'amount':
        orderBy = { amount: sortOrder };
        break;
      case 'transactionDate':
      default:
        orderBy = { transactionDate: sortOrder };
        break;
    }

    // Fetch revenues with relations
    const [revenues, totalCount] = await Promise.all([
      prisma.revenue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          source: true,
          paymentMethod: true,
          busTripCache: true,
          loanPayment: true,
          accountsReceivable: true,
          installmentSchedule: true,
          journalEntry: {
            include: {
              lineItems: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      }),
      prisma.revenue.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: revenues,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching revenues:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch revenues',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/revenue
 * Create a new revenue record with comprehensive validation
 * Admin-only: Can create revenue records for any source
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data: RevenueFormData = body;

    // Validate the revenue data
    const validation = await validateRevenueData(data);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Additional validations specific to revenue type

    // BUS_TRIP: validate busTripCacheId
    if (data.externalRefType === 'BUS_TRIP') {
      if (!data.busTripCacheId) {
        return NextResponse.json(
          { error: 'Bus trip cache ID is required for BUS_TRIP revenue' },
          { status: 400 }
        );
      }

      // Verify bus trip exists and revenue amount matches
      const busTrip = await prisma.busTripCache.findUnique({
        where: { id: data.busTripCacheId },
      });

      if (!busTrip) {
        return NextResponse.json(
          { error: 'Bus trip not found' },
          { status: 404 }
        );
      }

      const tripRevenue = parseFloat(busTrip.tripRevenue.toString());
      if (Math.abs(data.amount - tripRevenue) > 0.01) {
        return NextResponse.json(
          {
            error: 'Amount validation failed',
            details: `Revenue amount (${data.amount}) must match bus trip revenue (${tripRevenue})`,
          },
          { status: 400 }
        );
      }

      // Check if trip already has revenue recorded
      if (busTrip.isRevenueRecorded) {
        return NextResponse.json(
          { error: 'This bus trip already has revenue recorded' },
          { status: 400 }
        );
      }
    }

    // LOAN_REPAYMENT: validate loanPaymentId
    if (data.externalRefType === 'LOAN_REPAYMENT') {
      if (!data.loanPaymentId) {
        return NextResponse.json(
          { error: 'Loan payment ID is required for LOAN_REPAYMENT revenue' },
          { status: 400 }
        );
      }

      // Verify loan payment exists and is not already linked
      const loanPayment = await prisma.loanPayment.findUnique({
        where: { id: data.loanPaymentId },
        include: { revenue: true },
      });

      if (!loanPayment) {
        return NextResponse.json(
          { error: 'Loan payment not found' },
          { status: 404 }
        );
      }

      if (loanPayment.revenue) {
        return NextResponse.json(
          { error: 'This loan payment is already linked to a revenue record' },
          { status: 400 }
        );
      }
    }

    // RENTAL, DISPOSAL, FORFEITED_DEPOSIT, RENTER_DAMAGE: validate externalRefId
    if (['RENTAL', 'DISPOSAL', 'FORFEITED_DEPOSIT', 'RENTER_DAMAGE'].includes(data.externalRefType || '')) {
      if (!data.externalRefId) {
        return NextResponse.json(
          { error: `External reference ID is required for ${data.externalRefType} revenue` },
          { status: 400 }
        );
      }
    }

    // Prepare revenue data for creation
    const revenueData: any = {
      sourceId: data.sourceId,
      description: data.description,
      amount: data.amount,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      paymentMethodId: data.paymentMethodId,
      createdBy: data.createdBy,
    };

    // Optional fields
    if (data.busTripCacheId) revenueData.busTripCacheId = data.busTripCacheId;
    if (data.externalRefId) revenueData.externalRefId = data.externalRefId;
    if (data.externalRefType) revenueData.externalRefType = data.externalRefType;
    if (data.loanPaymentId) revenueData.loanPaymentId = data.loanPaymentId;
    if (data.documentIds) revenueData.documentIds = data.documentIds;

    // Accounts Receivable fields
    if (data.isAccountsReceivable) {
      revenueData.isAccountsReceivable = true;
      revenueData.arDueDate = data.arDueDate ? new Date(data.arDueDate) : null;
      revenueData.arStatus = data.arStatus || 'PENDING';
      if (data.arPaidDate) revenueData.arPaidDate = new Date(data.arPaidDate);
      if (data.arId) revenueData.arId = data.arId;
    }

    // Installment fields
    if (data.isInstallment) {
      revenueData.isInstallment = true;

      // If creating a new installment schedule
      if (data.installmentSchedule) {
        const schedule = data.installmentSchedule;
        
        // Calculate end date based on frequency and number of payments
        const startDate = new Date(schedule.startDate);
        let daysInterval = 30; // Default to monthly
        
        switch (schedule.frequency) {
          case 'DAILY':
            daysInterval = 1;
            break;
          case 'WEEKLY':
            daysInterval = 7;
            break;
          case 'BI_WEEKLY':
            daysInterval = 14;
            break;
          case 'MONTHLY':
            daysInterval = 30;
            break;
          case 'QUARTERLY':
            daysInterval = 90;
            break;
          case 'SEMI_ANNUAL':
            daysInterval = 180;
            break;
          case 'ANNUAL':
            daysInterval = 365;
            break;
        }
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (daysInterval * schedule.numberOfPayments));

        // Create installment schedule
        const createdSchedule = await prisma.installmentSchedule.create({
          data: {
            type: 'REVENUE',
            totalAmount: data.amount,
            numberOfPayments: schedule.numberOfPayments,
            paymentAmount: schedule.paymentAmount,
            frequency: schedule.frequency,
            startDate: startDate,
            endDate: endDate,
            status: 'ACTIVE',
            interestRate: schedule.interestRate || null,
            createdBy: data.createdBy,
          },
        });

        revenueData.installmentScheduleId = createdSchedule.id;
      } else if (data.installmentScheduleId) {
        revenueData.installmentScheduleId = data.installmentScheduleId;
      }
    }

    // Generate revenue code based on transaction date
    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
    const revenueCode = await generateRevenueCode(transactionDate);
    revenueData.revenueCode = revenueCode;

    // Create the revenue record
    const revenue = await prisma.revenue.create({
      data: revenueData,
      include: {
        source: true,
        paymentMethod: true,
        busTripCache: true,
        loanPayment: true,
        accountsReceivable: true,
        installmentSchedule: true,
        journalEntry: true,
      },
    });

    // Update bus trip cache if applicable
    if (data.busTripCacheId) {
      await prisma.busTripCache.update({
        where: { id: data.busTripCacheId },
        data: { isRevenueRecorded: true },
      });
    }

    // Create audit log
    const ipAddress = await getClientIp(req);
    await prisma.auditLog.create({
      data: {
        userId: data.createdBy,
        userName: data.createdBy,
        action: 'CREATE',
        module: 'REVENUE',
        recordId: revenue.id,
        recordType: 'Revenue',
        afterData: revenue as any,
        description: `[Admin] Created revenue: ${revenue.revenueCode}`,
        ipAddress,
        revenueId: revenue.id,
      },
    });

    return NextResponse.json(
      {
        message: 'Revenue created successfully',
        revenue,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin] Error creating revenue:', error);
    return NextResponse.json(
      {
        error: 'Failed to create revenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
