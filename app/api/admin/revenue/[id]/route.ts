/**
 * Admin Single Revenue API Route
 * Handles GET, PUT, and DELETE operations for individual revenue records
 * Path: /api/admin/revenue/[id]
 * Admin-only access - full CRUD permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRevenueData } from '@/lib/admin/revenues/validation';
import type { RevenueFormData } from '@/app/types/revenue';
import { getClientIp } from '@/lib/shared/auditLogger';

/**
 * GET /api/admin/revenue/[id]
 * Fetch a single revenue record by ID with all relations
 * Admin-only: Can view any revenue record
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid revenue ID' },
        { status: 400 }
      );
    }

    const revenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        source: true,
        paymentMethod: true,
        busTripCache: true,
        loanPayment: {
          include: {
            loan: true,
          },
        },
        accountsReceivable: true,
        installmentSchedule: {
          include: {
            installments: true,
          },
        },
        journalEntry: {
          include: {
            lineItems: {
              include: {
                account: {
                  include: {
                    accountType: true,
                  },
                },
              },
            },
          },
        },
        auditLogs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 50, // Limit to recent 50 audit logs
        },
      },
    });

    if (!revenue) {
      return NextResponse.json(
        { error: 'Revenue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ revenue });
  } catch (error) {
    console.error('[Admin] Error fetching revenue:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch revenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/revenue/[id]
 * Update an existing revenue record
 * Prevents editing if revenue is already posted to GL
 * Admin-only: Can update any revenue record (with restrictions)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid revenue ID' },
        { status: 400 }
      );
    }

    // Fetch existing revenue
    const existingRevenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        journalEntry: true,
      },
    });

    if (!existingRevenue) {
      return NextResponse.json(
        { error: 'Revenue not found' },
        { status: 404 }
      );
    }

    // Check if revenue is posted
    if (existingRevenue.journalEntry) {
      const jeStatus = existingRevenue.journalEntry.status;
      if (jeStatus === 'POSTED' || jeStatus === 'APPROVED') {
        return NextResponse.json(
          {
            error: 'Cannot edit posted revenue',
            details: 'This revenue has been posted to the General Ledger and cannot be modified. Please create a reversal entry instead.',
          },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const data: RevenueFormData = body;

    // Validate the updated revenue data
    const validation = await validateRevenueData(data, id);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      sourceId: data.sourceId,
      description: data.description,
      amount: data.amount,
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
      paymentMethodId: data.paymentMethodId,
    };

    // Optional fields
    if (data.busTripCacheId !== undefined) updateData.busTripCacheId = data.busTripCacheId;
    if (data.externalRefId !== undefined) updateData.externalRefId = data.externalRefId;
    if (data.externalRefType !== undefined) updateData.externalRefType = data.externalRefType;
    if (data.loanPaymentId !== undefined) updateData.loanPaymentId = data.loanPaymentId;
    if (data.documentIds !== undefined) updateData.documentIds = data.documentIds;

    // Accounts Receivable fields
    if (data.isAccountsReceivable !== undefined) {
      updateData.isAccountsReceivable = data.isAccountsReceivable;
      if (data.isAccountsReceivable) {
        updateData.arDueDate = data.arDueDate ? new Date(data.arDueDate) : null;
        updateData.arStatus = data.arStatus || 'PENDING';
        if (data.arPaidDate) updateData.arPaidDate = new Date(data.arPaidDate);
        if (data.arId) updateData.arId = data.arId;
      }
    }

    // Installment fields
    if (data.isInstallment !== undefined) {
      updateData.isInstallment = data.isInstallment;
      if (data.installmentScheduleId) {
        updateData.installmentScheduleId = data.installmentScheduleId;
      }
    }

    // Capture before data for audit
    const beforeData = existingRevenue;

    // Update the revenue
    const updatedRevenue = await prisma.revenue.update({
      where: { id },
      data: updateData,
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

    // Create audit log
    const ipAddress = await getClientIp(req);
    await prisma.auditLog.create({
      data: {
        userId: data.createdBy,
        userName: data.createdBy,
        action: 'UPDATE',
        module: 'REVENUE',
        recordId: updatedRevenue.id,
        recordType: 'Revenue',
        beforeData: beforeData as any,
        afterData: updatedRevenue as any,
        description: `[Admin] Updated revenue: ${updatedRevenue.revenueCode}`,
        ipAddress,
        revenueId: updatedRevenue.id,
      },
    });

    return NextResponse.json({
      message: 'Revenue updated successfully',
      revenue: updatedRevenue,
    });
  } catch (error) {
    console.error('[Admin] Error updating revenue:', error);
    return NextResponse.json(
      {
        error: 'Failed to update revenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/revenue/[id]
 * Delete a revenue record
 * Prevents deletion if revenue is posted or has dependencies
 * Admin-only: Can delete any revenue record (with safeguards)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid revenue ID' },
        { status: 400 }
      );
    }

    // Get user info from query params or headers
    const userId = req.nextUrl.searchParams.get('userId') || 'system';

    // Fetch existing revenue
    const existingRevenue = await prisma.revenue.findUnique({
      where: { id },
      include: {
        journalEntry: true,
        installmentSchedule: {
          include: {
            installments: true,
          },
        },
      },
    });

    if (!existingRevenue) {
      return NextResponse.json(
        { error: 'Revenue not found' },
        { status: 404 }
      );
    }

    // Check if revenue is posted
    if (existingRevenue.journalEntry) {
      const jeStatus = existingRevenue.journalEntry.status;
      if (jeStatus === 'POSTED' || jeStatus === 'APPROVED') {
        return NextResponse.json(
          {
            error: 'Cannot delete posted revenue',
            details: 'This revenue has been posted to the General Ledger and cannot be deleted. Please create a reversal entry instead.',
          },
          { status: 400 }
        );
      }
    }

    // Check for installment payments
    if (existingRevenue.installmentSchedule?.installments?.length > 0) {
      const hasPayments = existingRevenue.installmentSchedule.installments.some(
        (inst: any) => inst.paidAmount > 0
      );

      if (hasPayments) {
        return NextResponse.json(
          {
            error: 'Cannot delete revenue with installment payments',
            details: 'This revenue has installment payments recorded. Please handle those first.',
          },
          { status: 400 }
        );
      }
    }

    // Delete the revenue (cascade will handle related records based on schema)
    await prisma.revenue.delete({
      where: { id },
    });

    // Update bus trip cache if applicable
    if (existingRevenue.busTripCacheId) {
      await prisma.busTripCache.update({
        where: { id: existingRevenue.busTripCacheId },
        data: { isRevenueRecorded: false },
      });
    }

    // Create audit log
    const ipAddress = await getClientIp(req);
    await prisma.auditLog.create({
      data: {
        userId,
        userName: userId,
        action: 'DELETE',
        module: 'REVENUE',
        recordId: id,
        recordType: 'Revenue',
        beforeData: existingRevenue as any,
        description: `[Admin] Deleted revenue: ${existingRevenue.revenueCode}`,
        ipAddress,
      },
    });

    return NextResponse.json({
      message: 'Revenue deleted successfully',
      deletedRevenueCode: existingRevenue.revenueCode,
    });
  } catch (error) {
    console.error('[Admin] Error deleting revenue:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete revenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
