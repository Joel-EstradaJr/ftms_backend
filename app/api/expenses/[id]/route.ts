// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { logAudit } from '@/lib/auditLogger';
import { fetchEmployeesForReimbursement } from '@/lib/hr/employees';
import { updateAssignmentIsRecorded } from '@/lib/operations/assignments';

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
        // Upsert reimbursement for the given employee without removing others
        try {
          const existing = await prisma.reimbursement.findFirst({ where: { expense_id: id, employee_id } });
          if (existing) {
            await prisma.reimbursement.updateMany({
              where: { expense_id: id, employee_id },
              data: {
                amount: reimbursable_amount,
                employee_name: employee.name,
                job_title: employee.job_title as any,
                is_deleted: false,
              }
            });
          } else {
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
          }
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
  // Remove reimbursement record(s) when switching to Cash
  await prisma.reimbursement.updateMany({ where: { expense_id: id }, data: { is_deleted: true } });
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
      normalizedReimbursements = reimbursements
        .map((r: any) => {
          const empId = r.employee_id ?? r.employee_number ?? r.id ?? r.employee_name;
          const rawAmt = r.amount ?? r.reimbursable_amount ?? r.reimbursement_amount ?? r.value;
          const amt = Number(rawAmt);
          return empId && !Number.isNaN(amt) ? { employee_id: String(empId), amount: amt } : null;
        })
        .filter((x: any) => x && x.amount >= 0) as Array<{ employee_id: string; amount: number }>;
    } else if (
      typeof driver_reimbursement !== 'undefined' || typeof conductor_reimbursement !== 'undefined'
    ) {
      const opAssignment = originalRecord.assignment_id ? await prisma.assignmentCache.findUnique({ where: { assignment_id: originalRecord.assignment_id } }) : null;
      const drvAmtRaw = Number(driver_reimbursement);
      const cndAmtRaw = Number(conductor_reimbursement);
      const drvAmt = !Number.isNaN(drvAmtRaw) ? drvAmtRaw : 0;
      const cndAmt = !Number.isNaN(cndAmtRaw) ? cndAmtRaw : 0;
      if (opAssignment) {
        normalizedReimbursements = [];
        if (drvAmt > 0 && opAssignment.driver_id) normalizedReimbursements.push({ employee_id: opAssignment.driver_id, amount: drvAmt });
        if (cndAmt > 0 && opAssignment.conductor_id) normalizedReimbursements.push({ employee_id: opAssignment.conductor_id, amount: cndAmt });
      } else if (originalRecord.reimbursements && originalRecord.reimbursements.length > 0) {
        const driverRow = originalRecord.reimbursements.find((r: any) => (r.job_title || '').toLowerCase() === 'driver');
        const conductorRow = originalRecord.reimbursements.find((r: any) => (r.job_title || '').toLowerCase() === 'conductor');
        normalizedReimbursements = [];
        if (drvAmt > 0 && driverRow) normalizedReimbursements.push({ employee_id: driverRow.employee_id, amount: drvAmt });
        if (cndAmt > 0 && conductorRow) normalizedReimbursements.push({ employee_id: conductorRow.employee_id, amount: cndAmt });
      }
    } else if (employee_id && typeof reimbursable_amount !== 'undefined') {
      const amt = Number(reimbursable_amount);
      if (!Number.isNaN(amt) && amt >= 0) {
        normalizedReimbursements = [{ employee_id, amount: amt }];
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

    // Proceed with general updates and/or reimbursement sync
    const hasFieldUpdates = Object.keys(updateData).length > 1; // updated_at is always present
    let updated: any;
    if (hasFieldUpdates) {
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
    } else {
      // No expense field changes; load current for response composition
      updated = await (prisma as any).expenseRecord.findUnique({
        where: { expense_id: id },
        include: { category: true, payment_method: true, payment_status: true, source: true, reimbursements: true }
      });
      if (!updated) return NextResponse.json({ error: 'Expense record not found' }, { status: 404 });
    }

    // If switching to Cash via payment_method_id, handle reimbursements safely
    if (setToCash) {
      // If the client is trying to update reimbursements while switching to Cash,
      // block the operation to prevent accidental data loss.
      if (normalizedReimbursements && normalizedReimbursements.length > 0) {
        return NextResponse.json({
          error: 'Cannot switch payment method to Cash while providing reimbursement updates. Save reimbursements with a non-Cash method or remove reimbursements first.'
        }, { status: 400 });
      }

      // Soft-delete reimbursements instead of hard-deleting to preserve history
      await prisma.reimbursement.updateMany({ where: { expense_id: id }, data: { is_deleted: true } });

      updated = await (prisma as any).expenseRecord.findUnique({
        where: { expense_id: id },
        include: { category: true, payment_method: true, payment_status: true, source: true, reimbursements: true }
      });
      await logAudit({
        action: 'UPDATE',
        table_affected: 'ExpenseRecord',
        record_id: id,
        performed_by: 'ftms_user',
        details: 'Switched to Cash; soft-deleted linked reimbursements.' 
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

    // Sync reimbursements if provided (upsert per employee, remove omitted)
    if (normalizedReimbursements && normalizedReimbursements.length > 0) {
      const allEmployees = await fetchEmployeesForReimbursement();
      const existing = await prisma.reimbursement.findMany({ where: { expense_id: id } });
      const existingByEmp = new Map(existing.map(r => [r.employee_id, r]));
      const incomingEmpIds = new Set<string>();

      for (const entry of normalizedReimbursements) {
        const emp = allEmployees.find(e => e.employee_id === entry.employee_id);
        const existingRow = existingByEmp.get(entry.employee_id);
        const effectiveEmpId = emp?.employee_id || existingRow?.employee_id || entry.employee_id;
        const effectiveName = emp?.name || existingRow?.employee_name || entry.employee_id;
        const effectiveJob = emp?.job_title || existingRow?.job_title || null;
        incomingEmpIds.add(effectiveEmpId);
        if (existingRow) {
          await prisma.reimbursement.updateMany({
            where: { expense_id: id, employee_id: effectiveEmpId },
            data: {
              amount: entry.amount,
              employee_name: effectiveName,
              job_title: effectiveJob as any,
              is_deleted: false,
            }
          });
        } else {
          await prisma.reimbursement.create({
            data: ({
              expense_id: id,
              employee_id: effectiveEmpId,
              employee_name: effectiveName,
              job_title: effectiveJob as any,
              amount: entry.amount,
              status: 'PENDING' as any,
              created_by: originalRecord.created_by,
              is_deleted: false,
            } as any)
          });
        }
      }
      // Re-fetch with reimbursements
      updated = await (prisma as any).expenseRecord.findUnique({
        where: { expense_id: id },
        include: { category: true, payment_method: true, payment_status: true, source: true, reimbursements: true }
      });
    }

    // If nothing changed and no reimbursements provided, return 400
    const didSomething = hasFieldUpdates || (normalizedReimbursements && normalizedReimbursements.length > 0);
    if (!didSomething) {
      return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
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

    // Reset is_expense_recorded flags in local cache (Operations API doesn't support updates)
    if (expenseToDelete.assignment_id) {
      try {
        // Inform Operations layer (placeholder; no real update endpoint)
        await updateAssignmentIsRecorded();
        await prisma.assignmentCache.upsert({
          where: { assignment_id: expenseToDelete.assignment_id },
          update: { 
            is_expense_recorded: false,
            last_updated: new Date()
          },
          create: {
            assignment_id: expenseToDelete.assignment_id,
            bus_route: 'Unknown',
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
        console.error('Failed to update assignment status (cache only):', error);
        // Continue with deletion even if cache update fails
      }
    }

    // Receipt linkage removed: no update needed

    // Soft-delete linked reimbursements first
    await prisma.reimbursement.updateMany({ where: { expense_id: id }, data: { is_deleted: true } });

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