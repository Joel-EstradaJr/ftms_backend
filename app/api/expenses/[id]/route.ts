// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLogger';
import { fetchEmployeesForReimbursement } from '@/lib/supabase/employees';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const expense = await prisma.expenseRecord.findUnique({
    where: { expense_id: id },
    include: {
      category: true,
      payment_method: true,
      source: true,
      reimbursements: {
        where: {
          is_deleted: false
        },
        include: {
          status: true
        }
      }
    }
  });

  if (!expense || expense.is_deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Transform the data to match frontend expectations
  const transformedExpense = {
    ...expense,
    total_amount: Number(expense.total_amount),
    category_name: expense.category?.name || null,
    payment_method_name: expense.payment_method?.name || null,
    source_name: expense.source?.name || null,
    // Transform reimbursements data
    reimbursements: expense.reimbursements.map(reimb => ({
      ...reimb,
      amount: Number(reimb.amount)
    }))
  };

  return NextResponse.json(transformedExpense);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payment_method, reimbursable_amount, employee_id } = body;

    // Validate the expense record exists
    const originalRecord = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: { reimbursements: true }
    });

    if (!originalRecord) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    // Get payment methods
    const [cashMethod, reimbMethod, pendingStatus] = await Promise.all([
      prisma.globalPaymentMethod.findFirst({ where: { name: 'Company Cash' } }),
      prisma.globalPaymentMethod.findFirst({ where: { name: 'Reimbursement' } }),
      prisma.globalReimbursementStatus.findFirst({ where: { name: 'PENDING' } })
    ]);

    if (!cashMethod || !reimbMethod || !pendingStatus) {
      return NextResponse.json({ error: 'Required payment methods or status not found' }, { status: 500 });
    }

    // Fetch all employees from HR API for validation
    const allEmployees = await fetchEmployeesForReimbursement();

    // Operations-sourced: assignment_id present
    if (originalRecord.assignment_id) {
      if (payment_method === 'Reimbursement') {
        if (!reimbursable_amount || !employee_id) {
          return NextResponse.json({ error: 'reimbursable_amount and employee_id are required for reimbursement.' }, { status: 400 });
        }
        // Find employee from HR API data
        const employee = allEmployees.find(emp => emp.employee_id === employee_id);
        if (!employee) {
          return NextResponse.json({ error: 'Invalid employee_id' }, { status: 400 });
        }
        // Remove any existing reimbursements for this expense (enforce only one per expense for operations)
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        // Create reimbursement record
        await prisma.reimbursement.create({
          data: {
            expense_id: id,
            employee_id,
            employee_name: employee.name,
            job_title: employee.job_title,
            amount: reimbursable_amount,
            status_id: pendingStatus.id,
            created_by: originalRecord.created_by,
            is_deleted: false,
          }
        });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: reimbMethod.id,
            updated_at: new Date(),
          },
          include: {
            payment_method: true,
            reimbursements: true,
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as Reimbursement for employee ${employee.name} (₱${reimbursable_amount})`,
        });
        // Attach payment_method_name for frontend
        return NextResponse.json({
          ...updatedExpense,
          payment_method_name: updatedExpense.payment_method?.name || null,
        });
      } else if (payment_method === 'Company Cash') {
        // Remove reimbursement record(s)
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        // Update expense record
        const updatedExpense = await prisma.expenseRecord.update({
          where: { expense_id: id },
          data: {
            payment_method_id: cashMethod.id,
            updated_at: new Date(),
          },
          include: {
            payment_method: true,
            reimbursements: true,
          }
        });
        await logAudit({
          action: 'UPDATE',
          table_affected: 'ExpenseRecord',
          record_id: id,
          performed_by: 'ftms_user',
          details: `Set as Company Cash, removed reimbursement`,
        });
        // Attach payment_method_name for frontend
        return NextResponse.json({
          ...updatedExpense,
          payment_method_name: updatedExpense.payment_method?.name || null,
        });
      }
    }
    // Receipt linkage removed: only operations-based updates are supported
    
    // If no valid update was performed
    return NextResponse.json(
      { error: 'No valid update data provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the record before deletion for audit details
    const expenseToDelete = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: { category: true } // Include category for logging
    });

    if (!expenseToDelete || expenseToDelete.is_deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Reset is_expense_recorded flags
    if (expenseToDelete.assignment_id) {
      try {
        // Update Supabase
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/op_bus_assignments?assignment_id=eq.${expenseToDelete.assignment_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ is_expense_recorded: false })
        });

        // Update AssignmentCache - use upsert to handle cases where record might not exist
        await prisma.assignmentCache.upsert({
          where: { assignment_id: expenseToDelete.assignment_id },
          update: { 
            is_expense_recorded: false,
            last_updated: new Date()
          },
          create: {
            assignment_id: expenseToDelete.assignment_id,
            bus_route: 'Unknown', // Default values for required fields
            bus_type: 'Unknown',
            date_assigned: new Date(),
            trip_fuel_expense: 0,
            trip_revenue: 0,
            assignment_type: 'Unknown',
            assignment_value: 0,
            bus_plate_number: 'Unknown',
            payment_method: 'Unknown',
            conductor_id: 'Unknown',
            driver_id: 'Unknown',
            is_expense_recorded: false,
            is_revenue_recorded: false,
            last_updated: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to update assignment status:', error);
        // Continue with deletion even if assignment status update fails
      }
    }

    // Receipt linkage removed: no update needed

    await prisma.expenseRecord.update({
      where: { expense_id: id },
      data: { 
        is_deleted: true,
        updated_at: new Date()
      }
    });

    await logAudit({
      action: 'DELETE',
      table_affected: 'ExpenseRecord',
      record_id: id,
      performed_by: 'ftms_user',
      details: `Soft-deleted expense record. Details: ${JSON.stringify({
        category: expenseToDelete.category.name, // Use included category name
        amount: expenseToDelete.total_amount,
        date: expenseToDelete.expense_date
      })}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}