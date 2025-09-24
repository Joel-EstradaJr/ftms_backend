// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLogger';
import { fetchEmployeesForReimbursement } from '@/lib/supabase/employees';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const expense: any = await (prisma as any).expenseRecord.findUnique({
    where: { expense_id: id },
    include: {
      category: true,
      payment_method: true,
      payment_status: true,
      source: true,
      reimbursements: {
        where: {
          is_deleted: false
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
    payment_status_name: expense.payment_status?.name || null,
    source_name: expense.source?.name || null,
    // Transform reimbursements data
    reimbursements: expense.reimbursements.map((reimb: any) => ({
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
  const { payment_method, reimbursable_amount, employee_id, total_amount, expense_date, payment_method_id, payment_status_id, reimbursements, driver_reimbursement, conductor_reimbursement } = body;

    // Validate the expense record exists
    const originalRecord = await prisma.expenseRecord.findUnique({
      where: { expense_id: id },
      include: { reimbursements: true }
    });

    if (!originalRecord) {
      return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    // Note: Only fetch methods/status/employees when needed to avoid unnecessary failures

  // Operations-sourced: assignment_id present
  if (originalRecord.assignment_id) {
      if (payment_method === 'Reimbursement') {
        // Fetch dependencies only for reimbursement flow
        const [reimbMethod, pendingStatus] = await Promise.all([
          prisma.globalPaymentMethod.findFirst({ where: { name: { equals: 'Reimbursement', mode: 'insensitive' }, is_deleted: false } }),
          prisma.globalPaymentStatus.findFirst({ where: { name: { equals: 'PENDING', mode: 'insensitive' }, is_deleted: false } })
        ]);
        if (!reimbMethod || !pendingStatus) {
          return NextResponse.json({ error: 'Required payment method (Reimbursement) or status (PENDING) not found' }, { status: 500 });
        }

        if (!reimbursable_amount || !employee_id) {
          return NextResponse.json({ error: 'reimbursable_amount and employee_id are required for reimbursement.' }, { status: 400 });
        }
        // Fetch employees from HR API and validate
        const allEmployees = await fetchEmployeesForReimbursement();
        const employee = allEmployees.find(emp => emp.employee_id === employee_id);
        if (!employee) {
          return NextResponse.json({ error: 'Invalid employee_id' }, { status: 400 });
        }
        // Remove any existing reimbursements for this expense (enforce only one per expense for operations)
        try {
          await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
          // Create reimbursement record
          await prisma.reimbursement.create({
            data: ({
              expense_id: id,
              employee_id,
              employee_name: employee.name,
              job_title: employee.job_title,
              amount: reimbursable_amount,
              status: 'PENDING' as any,
              created_by: originalRecord.created_by,
              is_deleted: false,
            } as any)
          });
        } catch (err) {
          const e = err as unknown;
          if (e && typeof e === 'object' && 'code' in (e as any) && (e as any).code === 'P2002') {
            return NextResponse.json({ error: 'Duplicate reimbursement for this expense and employee', code: 'P2002' }, { status: 409 });
          }
          throw err;
        }
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
      } else if (payment_method === 'Cash') {
        // Fetch cash method only if setting to Cash
        const cashMethod = await prisma.globalPaymentMethod.findFirst({ where: { name: { equals: 'Cash', mode: 'insensitive' }, is_deleted: false } });
        if (!cashMethod) {
          return NextResponse.json({ error: 'Required payment method (Cash) not found' }, { status: 500 });
        }
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
          details: `Set as Cash, removed reimbursement`,
        });
        // Attach payment_method_name for frontend
        return NextResponse.json({
          ...updatedExpense,
          payment_method_name: updatedExpense.payment_method?.name || null,
        });
      }
    }
    // General updates (amount/date/method/status) without toggling Cash/Reimbursement
    const updateData: any = { updated_at: new Date() };
    if (typeof total_amount !== 'undefined') {
      const num = Number(total_amount);
      if (!num || Number.isNaN(num) || num <= 0) {
        return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 });
      }
      updateData.total_amount = num;
    }
    if (typeof expense_date === 'string' && expense_date) {
      const d = new Date(expense_date);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid expense_date' }, { status: 400 });
      }
      updateData.expense_date = d;
    }
    let setToCash = false;
    if (payment_method_id) {
      const pm = await prisma.globalPaymentMethod.findUnique({ where: { id: payment_method_id } });
      if (!pm) return NextResponse.json({ error: 'Invalid payment_method_id' }, { status: 400 });
      updateData.payment_method_id = pm.id;
      setToCash = (pm.name || '').toLowerCase() === 'cash';
    }
    if (payment_status_id) {
      const ps = await prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } });
      if (!ps) return NextResponse.json({ error: 'Invalid payment_status_id' }, { status: 400 });
      updateData.payment_status_id = ps.id;
    }

    // Reimbursement updates for Operations:
    // Normalize reimbursements from body
    let normalizedReimbursements: Array<{ employee_id: string; amount: number }> | null = null;
    if (Array.isArray(reimbursements) && reimbursements.length > 0) {
      normalizedReimbursements = reimbursements.map((r: any) => ({ employee_id: r.employee_id, amount: Number(r.amount) }));
    } else if (
      typeof driver_reimbursement !== 'undefined' || typeof conductor_reimbursement !== 'undefined'
    ) {
      const opAssignment = originalRecord.assignment_id ? await prisma.assignmentCache.findUnique({ where: { assignment_id: originalRecord.assignment_id } }) : null;
      if (opAssignment) {
        const drvAmt = Number(driver_reimbursement) || 0;
        const cndAmt = Number(conductor_reimbursement) || 0;
        normalizedReimbursements = [];
        if (drvAmt > 0 && opAssignment.driver_id) normalizedReimbursements.push({ employee_id: opAssignment.driver_id, amount: drvAmt });
        if (cndAmt > 0 && opAssignment.conductor_id) normalizedReimbursements.push({ employee_id: opAssignment.conductor_id, amount: cndAmt });
      }
    }

    // Validate amount vs reimbursements sum if both present
    if (normalizedReimbursements && normalizedReimbursements.length > 0 && (updateData.total_amount ?? originalRecord.total_amount)) {
      const sum = normalizedReimbursements.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const amt = Number(updateData.total_amount ?? originalRecord.total_amount);
      if (sum > amt) {
        return NextResponse.json({ error: 'Expense amount must be greater than total reimbursements' }, { status: 400 });
      }
    }

    if (Object.keys(updateData).length > 1) {
      let updated;
      try {
        updated = await (prisma as any).expenseRecord.update({
          where: { expense_id: id },
          data: updateData,
          include: {
            category: true,
            payment_method: true,
            payment_status: true,
            source: true,
            reimbursements: true,
          }
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return NextResponse.json({ error: 'Duplicate expense detected (unique constraint)', code: 'P2002', meta: err.meta }, { status: 409 });
        }
        throw err;
      }

      // If reimbursements are provided on update, replace existing reimbursements
      if (normalizedReimbursements && normalizedReimbursements.length > 0) {
        const allEmployees = await fetchEmployeesForReimbursement();
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        for (const entry of normalizedReimbursements) {
          const emp = allEmployees.find(e => e.employee_id === entry.employee_id);
          if (!emp) {
            return NextResponse.json({ error: 'Invalid employee_id for reimbursement' }, { status: 400 });
          }
          await prisma.reimbursement.create({
            data: ({
              expense_id: id,
              employee_id: emp.employee_id,
              employee_name: emp.name,
              job_title: emp.job_title,
              amount: entry.amount,
              status: 'PENDING' as any,
              created_by: originalRecord.created_by,
              is_deleted: false,
            } as any)
          });
        }
        // Re-fetch with reimbursements
        updated = await (prisma as any).expenseRecord.findUnique({
          where: { expense_id: id },
          include: { category: true, payment_method: true, payment_status: true, source: true, reimbursements: true }
        });
      } else if (setToCash) {
        // If switching to Cash, remove existing reimbursements
        await prisma.reimbursement.deleteMany({ where: { expense_id: id } });
        updated = await (prisma as any).expenseRecord.findUnique({
          where: { expense_id: id },
          include: { category: true, payment_method: true, payment_status: true, source: true, reimbursements: true }
        });
      }

      await logAudit({
        action: 'UPDATE',
        table_affected: 'ExpenseRecord',
        record_id: id,
        performed_by: 'ftms_user',
        details: 'Updated expense fields (general update)'
      });

      return NextResponse.json({
        ...updated,
        total_amount: Number(updated.total_amount),
        payment_method_name: updated.payment_method?.name || null,
        payment_status_name: updated.payment_status?.name || null,
        category_name: updated.category?.name || null,
        source_name: updated.source?.name || null,
      });
    }

    // If no supported update was performed
    return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating expense:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update expense', details: message }, { status: 500 });
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