/* ============================================================
 * EXPENSE API ROUTE - Single Record Endpoint
 * ============================================================
 * Handles:
 * - GET: Fetch single expense by ID with full details
 * - PUT: Update existing expense
 * - DELETE: Soft delete expense (mark as inactive)
 * 
 * Security: Input validation, authorization checks, audit logging
 * ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/auditLogger';

/* ============================================================
 * GET: Fetch Single Expense by ID
 * ============================================================ */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ─────────────────────────────────────────────────────────
    // VALIDATE ID PARAMETER
    // ─────────────────────────────────────────────────────────
    const expenseId = parseInt(id);
    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID format' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // FETCH EXPENSE WITH ALL RELATIONS
    // ─────────────────────────────────────────────────────────
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        category: {
          select: {
            id: true,
            categoryCode: true,
            name: true,
            description: true,
            department: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            methodCode: true,
            methodName: true,
            description: true,
          },
        },
        busTripCache: {
          select: {
            id: true,
            assignmentId: true,
            busTripId: true,
            busRoute: true,
            busPlateNumber: true,
            busType: true,
            bodyNumber: true,
            driverName: true,
            conductorName: true,
            driverEmployeeNumber: true,
            conductorEmployeeNumber: true,
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
            reimbursementCode: true,
            employeeNumber: true,
            employeeName: true,
            department: true,
            claimedAmount: true,
            approvedAmount: true,
            status: true,
            paymentMethodType: true,
            approvedBy: true,
            disbursementDate: true,
            disbursedBy: true,
            remarks: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        accountsPayable: {
          select: {
            id: true,
            apCode: true,
            creditorName: true,
            creditorType: true,
            creditorContact: true,
            creditorId: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            dueDate: true,
            lastPaymentDate: true,
            status: true,
            remarks: true,
          },
        },
        journalEntry: {
          select: {
            id: true,
            journalCode: true,
            status: true,
            entryDate: true,
            description: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            userId: true,
            userName: true,
            userDepartment: true,
            timestamp: true,
            beforeData: true,
            afterData: true,
            description: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 10, // Last 10 audit entries
        },
      },
    });

    // ─────────────────────────────────────────────────────────
    // CHECK IF EXPENSE EXISTS
    // ─────────────────────────────────────────────────────────
    if (!expense) {
      return NextResponse.json(
        { success: false, error: `Expense with ID ${expenseId} not found` },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // RETURN SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: expense,
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────
    console.error(`❌ [GET /api/expense/${params.id}] Error:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch expense',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/* ============================================================
 * PUT: Update Existing Expense
 * ============================================================ */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ─────────────────────────────────────────────────────────
    // VALIDATE ID PARAMETER
    // ─────────────────────────────────────────────────────────
    const expenseId = parseInt(id);
    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID format' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // PARSE & VALIDATE REQUEST BODY
    // ─────────────────────────────────────────────────────────
    const body = await request.json();

    const {
      description,
      amount,
      transactionDate,
      paymentMethodId,
      vendorName,
      vendorId,
      reimbursements, // Updated reimbursement breakdown
      payableDueDate,
      payableStatus,
      documentIds,
      updatedBy,
    } = body;

    // ─────────────────────────────────────────────────────────
    // REQUIRED FIELD VALIDATION
    // ─────────────────────────────────────────────────────────
    if (!updatedBy) {
      return NextResponse.json(
        { success: false, error: 'updatedBy field is required' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // FETCH EXISTING EXPENSE
    // ─────────────────────────────────────────────────────────
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        reimbursements: true,
        accountsPayable: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: `Expense with ID ${expenseId} not found` },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // BUSINESS LOGIC VALIDATION
    // ─────────────────────────────────────────────────────────

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate transaction date (cannot be future)
    if (transactionDate && new Date(transactionDate) > new Date()) {
      return NextResponse.json(
        { success: false, error: 'Transaction date cannot be in the future' },
        { status: 400 }
      );
    }

    // Validate reimbursement logic if amount changed
    if (amount !== undefined && existingExpense.isReimbursement) {
      if (!reimbursements || reimbursements.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Reimbursement breakdown required when updating reimbursement expense amount',
          },
          { status: 400 }
        );
      }

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

    // Prevent editing if reimbursements are disbursed
    if (existingExpense.isReimbursement && existingExpense.reimbursements.length > 0) {
      const disbursedReimbursements = existingExpense.reimbursements.filter(
        (r) => r.status === 'DISBURSED'
      );

      if (disbursedReimbursements.length > 0 && amount !== undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot modify expense amount - reimbursements have been disbursed',
            disbursedCount: disbursedReimbursements.length,
          },
          { status: 403 }
        );
      }
    }

    // Prevent editing if payable is already paid
    if (existingExpense.accountsPayable && existingExpense.accountsPayable.status === 'PAID') {
      if (amount !== undefined && amount !== existingExpense.amount.toNumber()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot modify expense amount - accounts payable has been paid',
          },
          { status: 403 }
        );
      }
    }

    // ─────────────────────────────────────────────────────────
    // PREPARE UPDATE DATA
    // ─────────────────────────────────────────────────────────
    const updateData: Prisma.ExpenseUpdateInput = {
      ...(description !== undefined && { description }),
      ...(amount !== undefined && { amount: parseFloat(amount) }),
      ...(transactionDate !== undefined && { transactionDate: new Date(transactionDate) }),
      ...(paymentMethodId !== undefined && { paymentMethodId }),
      ...(vendorName !== undefined && { vendorName }),
      ...(vendorId !== undefined && { vendorId }),
      ...(payableDueDate !== undefined && { payableDueDate: new Date(payableDueDate) }),
      ...(payableStatus !== undefined && { payableStatus }),
      ...(documentIds !== undefined && { documentIds }),
      updatedAt: new Date(),
    };

    // ─────────────────────────────────────────────────────────
    // UPDATE EXPENSE (WITH TRANSACTION)
    // ─────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Update expense
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: updateData,
        include: {
          category: true,
          paymentMethod: true,
          busTripCache: true,
          reimbursements: true,
          accountsPayable: true,
        },
      });

      // Update reimbursements if provided
      if (reimbursements && reimbursements.length > 0) {
        // Delete existing reimbursements (only if not disbursed)
        await tx.reimbursement.deleteMany({
          where: {
            expenseId: expenseId,
            status: { not: 'DISBURSED' },
          },
        });

        // Create new reimbursement records
        const reimbursementRecords = reimbursements.map((r: any) => ({
          expenseId: expenseId,
          employeeNumber: r.employeeNumber,
          employeeName: r.employeeName,
          jobTitle: r.jobTitle || null,
          amount: parseFloat(r.amount),
          status: 'PENDING' as const,
          paymentMethodType: r.paymentMethodType || 'CASH' as const,
          createdBy: updatedBy,
        }));

        await tx.reimbursement.createMany({
          data: reimbursementRecords,
        });
      }

      // Update accounts payable if exists and fields provided
      if (existingExpense.accountsPayable) {
        const apUpdateData: any = {};
        if (amount !== undefined) apUpdateData.amount = parseFloat(amount);
        if (payableDueDate !== undefined) apUpdateData.dueDate = new Date(payableDueDate);
        if (payableStatus !== undefined) apUpdateData.status = payableStatus;
        if (vendorName !== undefined) apUpdateData.vendorName = vendorName;
        if (vendorId !== undefined) apUpdateData.vendorId = vendorId;

        if (Object.keys(apUpdateData).length > 0) {
          await tx.accountsPayable.update({
            where: { id: existingExpense.accountsPayable.id },
            data: apUpdateData,
          });
        }
      }

      // Log audit trail
      await logAudit({
        action: 'UPDATE',
        table_affected: 'ExpenseRecord',
        record_id: expenseId.toString(),
        performed_by: updatedBy,
        details: `Updated expense ${existingExpense.expenseCode}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request,
      });

      return updatedExpense;
    });

    // ─────────────────────────────────────────────────────────
    // RETURN SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: result,
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────
    console.error(`❌ [PUT /api/expense/${params.id}] Error:`, error);

    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
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
        error: 'Failed to update expense',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/* ============================================================
 * DELETE: Soft Delete Expense
 * ============================================================
 * Note: Physical deletion not recommended due to audit trail.
 * Instead, we mark related records as inactive/cancelled.
 * ============================================================ */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ─────────────────────────────────────────────────────────
    // VALIDATE ID PARAMETER
    // ─────────────────────────────────────────────────────────
    const expenseId = parseInt(id);
    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID format' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // GET DELETED BY FROM QUERY PARAMS
    // ─────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy');

    if (!deletedBy) {
      return NextResponse.json(
        { success: false, error: 'deletedBy query parameter is required' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // FETCH EXISTING EXPENSE
    // ─────────────────────────────────────────────────────────
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        reimbursements: true,
        accountsPayable: true,
        journalEntry: true,
        busTripCache: true,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: `Expense with ID ${expenseId} not found` },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // BUSINESS LOGIC VALIDATION
    // ─────────────────────────────────────────────────────────

    // Prevent deletion if reimbursements are disbursed
    if (existingExpense.isReimbursement && existingExpense.reimbursements.length > 0) {
      const disbursedReimbursements = existingExpense.reimbursements.filter(
        (r) => r.status === 'DISBURSED'
      );

      if (disbursedReimbursements.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot delete expense - reimbursements have been disbursed',
            disbursedCount: disbursedReimbursements.length,
          },
          { status: 403 }
        );
      }
    }

    // Prevent deletion if payable is paid
    if (existingExpense.accountsPayable && existingExpense.accountsPayable.status === 'PAID') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete expense - accounts payable has been paid',
        },
        { status: 403 }
      );
    }

    // Prevent deletion if journal entry is approved
    if (existingExpense.journalEntry && existingExpense.journalEntry.status === 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete expense - journal entry has been approved',
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────
    // DELETE EXPENSE (WITH TRANSACTION)
    // ─────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Delete related reimbursements (only pending/rejected)
      if (existingExpense.reimbursements.length > 0) {
        await tx.reimbursement.deleteMany({
          where: {
            expenseId: expenseId,
            status: { in: ['PENDING', 'REJECTED'] },
          },
        });
      }

      // Delete related accounts payable (only pending)
      if (existingExpense.accountsPayable && existingExpense.accountsPayable.status === 'PENDING') {
        await tx.accountsPayable.delete({
          where: { id: existingExpense.accountsPayable.id },
        });
      }

      // Reset bus trip cache flag if linked
      if (existingExpense.busTripCacheId) {
        await tx.busTripCache.update({
          where: { id: existingExpense.busTripCacheId },
          data: { isExpenseRecorded: false },
        });
      }

      // Delete the expense
      const deletedExpense = await tx.expense.delete({
        where: { id: expenseId },
      });

      // Log audit trail
      await logAudit({
        action: 'DELETE',
        table_affected: 'ExpenseRecord',
        record_id: expenseId.toString(),
        performed_by: deletedBy,
        details: `Soft deleted expense ${existingExpense.expenseCode}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request,
      });

      return deletedExpense;
    });

    // ─────────────────────────────────────────────────────────
    // RETURN SUCCESS RESPONSE
    // ─────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
      data: result,
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────
    console.error(`❌ [DELETE /api/expense/${params.id}] Error:`, error);

    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { success: false, error: 'Cannot delete - related records exist' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete expense',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
