// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAssignmentById } from '@/lib/operations/assignments'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/idGenerator'
import { logAudit } from '@/lib/auditLogger'
import { fetchEmployeesForReimbursement } from '@/lib/supabase/employees'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category,
      category_id,
      assignment_id,
      bus_trip_id: busTripFromBody,
      total_amount: body_total_amount,
      expense_date,
      created_by,
      payment_method,
      payment_method_id,
      payment_status,
      payment_status_id,
      source,
      source_id,
      reimbursements,
      driver_reimbursement,
      conductor_reimbursement,
    } = body;

    if (!expense_date || !created_by) {
      return NextResponse.json({ error: 'Missing required fields: expense_date or created_by' }, { status: 400 });
    }

    let finalCategoryId: string | undefined = category_id;
    let categoryRecordAny: any = null;
    if (!finalCategoryId && category) {
      const cat: any = await (prisma as any).globalCategory.findFirst({ where: { name: { equals: category, mode: 'insensitive' }, is_deleted: false } });
      if (!cat) return NextResponse.json({ error: `Category '${category}' not found` }, { status: 400 });
      finalCategoryId = cat.id as string;
      categoryRecordAny = cat;
    }
    if (!finalCategoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (!categoryRecordAny) {
      categoryRecordAny = await (prisma as any).globalCategory.findFirst({ where: { id: finalCategoryId, is_deleted: false } });
      if (!categoryRecordAny) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Resolve source id and name
    let finalSourceId: string | undefined = source_id;
    let finalSourceName: string | undefined = undefined;
    if (!finalSourceId && source) {
      const srcRec: any = await (prisma as any).globalSource.findFirst({ where: { name: { equals: source, mode: 'insensitive' }, is_deleted: false } });
      if (!srcRec) return NextResponse.json({ error: `Source '${source}' not found` }, { status: 400 });
      finalSourceId = (srcRec.id || srcRec.source_id) as string;
      finalSourceName = srcRec.name as string;
    } else if (finalSourceId) {
      const srcRec: any = await (prisma as any).globalSource.findFirst({ where: { id: finalSourceId, is_deleted: false } });
      finalSourceName = (srcRec?.name as string) || source;
    }

    // Resolve payment method id and name
    let finalPaymentMethodId: string | undefined = payment_method_id;
    let finalPaymentMethodName: string | undefined = undefined;
    if (!finalPaymentMethodId) {
      const pm = (payment_method || '').trim();
      if (!pm) return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
      const pmRec = await prisma.globalPaymentMethod.findFirst({ where: { name: { equals: pm, mode: 'insensitive' } } });
      if (!pmRec) return NextResponse.json({ error: `Payment method '${pm}' not found` }, { status: 400 });
      finalPaymentMethodId = pmRec.id as string;
      finalPaymentMethodName = pmRec.name as string;
    } else {
      const pmRec = await prisma.globalPaymentMethod.findFirst({ where: { id: finalPaymentMethodId } });
      finalPaymentMethodName = (pmRec?.name as string) || payment_method;
    }
    if (!finalPaymentMethodId) return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });

    let finalPaymentStatusId: string | undefined = payment_status_id;
    if (!finalPaymentStatusId) {
      const psName = (payment_status || 'Pending').trim();
      const ps = await (prisma as any).globalPaymentStatus.findFirst({ where: { name: { equals: psName, mode: 'insensitive' }, is_deleted: false } });
      if (!ps) return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      finalPaymentStatusId = ps.id as string;
    }

    // Derive bus_trip_id and default amount
    let finalBusTripId: string | null = busTripFromBody || null;
    let finalTotalAmount: number = typeof body_total_amount === 'number' ? body_total_amount : Number(body_total_amount) || 0;
    if (assignment_id) {
      const opAssignment = await getAssignmentById(assignment_id);
      if (opAssignment) {
        finalBusTripId = opAssignment.bus_trip_id || finalBusTripId;
        const catName = (categoryRecordAny?.name || category || '').toString().toLowerCase();
        if (catName === 'fuel') finalTotalAmount = Number(opAssignment.trip_fuel_expense) || finalTotalAmount;
        else finalTotalAmount = Number(opAssignment.assignment_value) || finalTotalAmount;
      }
    }
    if (!finalTotalAmount || Number.isNaN(finalTotalAmount) || finalTotalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid or missing total amount' }, { status: 400 });
    }

    // Normalize reimbursements
    let normalizedReimbursements: Array<{ employee_id: string; amount: number; role?: string }> | null = null;
    if (Array.isArray(reimbursements) && reimbursements.length > 0) {
      normalizedReimbursements = reimbursements.map((r: any) => ({ employee_id: r.employee_id, amount: Number(r.amount) }));
    } else if (typeof driver_reimbursement !== 'undefined' || typeof conductor_reimbursement !== 'undefined') {
      if (!assignment_id) return NextResponse.json({ error: 'Assignment is required to create driver/conductor reimbursements' }, { status: 400 });
      const opAssignment = await getAssignmentById(assignment_id);
      if (!opAssignment) return NextResponse.json({ error: 'Invalid assignment for reimbursements' }, { status: 400 });
      const drvAmt = Number(driver_reimbursement) || 0;
      const cndAmt = Number(conductor_reimbursement) || 0;
      normalizedReimbursements = [];
      if (drvAmt > 0 && opAssignment.driver_id) normalizedReimbursements.push({ employee_id: opAssignment.driver_id, amount: drvAmt, role: 'Driver' });
      if (cndAmt > 0 && opAssignment.conductor_id) normalizedReimbursements.push({ employee_id: opAssignment.conductor_id, amount: cndAmt, role: 'Conductor' });
    } else {
      // Auto-create reimbursement(s) whenever source or payment method indicates reimbursement
      const isReimbursementFlow = [finalSourceName, finalPaymentMethodName, source, payment_method]
        .filter(Boolean)
        .some((n) => (n as string).toLowerCase().includes('reimb'));
      if (isReimbursementFlow) {
        if (assignment_id) {
          const opAssignment = await getAssignmentById(assignment_id);
          if (!opAssignment) return NextResponse.json({ error: 'Invalid assignment for reimbursements' }, { status: 400 });
          const drvAmt = Number(driver_reimbursement) || 0;
          const cndAmt = Number(conductor_reimbursement) || 0;
          let useDrv = drvAmt;
          let useCnd = cndAmt;
          if (useDrv <= 0 && useCnd <= 0) {
            // Default: allocate all to driver if available
            if (opAssignment.driver_id) {
              useDrv = finalTotalAmount;
            } else if (opAssignment.conductor_id) {
              useCnd = finalTotalAmount;
            }
          }
          const rows: Array<{ employee_id: string; amount: number; role?: string }> = [];
          if (useDrv > 0 && opAssignment.driver_id) rows.push({ employee_id: opAssignment.driver_id, amount: useDrv, role: 'Driver' });
          if (useCnd > 0 && opAssignment.conductor_id) rows.push({ employee_id: opAssignment.conductor_id, amount: useCnd, role: 'Conductor' });
          normalizedReimbursements = rows.length ? rows : null;
        } else if ((body as any).employee_id) {
          const empId = String((body as any).employee_id);
          normalizedReimbursements = [{ employee_id: empId, amount: finalTotalAmount }];
        }
      }
    }
    if (normalizedReimbursements && normalizedReimbursements.length > 0) {
      const reimbSum = normalizedReimbursements.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      if (reimbSum > finalTotalAmount) return NextResponse.json({ error: 'Expense amount must be greater than total reimbursements' }, { status: 400 });
    }

    const allEmployees = normalizedReimbursements ? await fetchEmployeesForReimbursement() : [];
    // Build fallback lookup from assignment for names if employee directory is missing entries
    const assignmentLookup = new Map<string, { name: string; job_title?: string }>();
    if (assignment_id) {
      try {
        const opAssignment = await getAssignmentById(assignment_id);
        if (opAssignment) {
          if (opAssignment.driver_id) assignmentLookup.set(opAssignment.driver_id, { name: opAssignment.driver_name || 'Driver', job_title: 'Driver' });
          if (opAssignment.conductor_id) assignmentLookup.set(opAssignment.conductor_id, { name: opAssignment.conductor_name || 'Conductor', job_title: 'Conductor' });
        }
      } catch {}
    }
    let pendingReimbStatus: any = null;
    try {
      const model: any = (prisma as any).globalReimbursementStatus;
      if (model && typeof model.findFirst === 'function') {
        pendingReimbStatus = await model.findFirst({ where: { name: { equals: 'PENDING', mode: 'insensitive' }, is_deleted: false } });
      }
    } catch {}

    // Writes in a short transaction
    let createdExpense: any;
    await prisma.$transaction(async (tx) => {
      createdExpense = await (tx as any).expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category_id: finalCategoryId,
          assignment_id: assignment_id || null,
          bus_trip_id: finalBusTripId,
          total_amount: finalTotalAmount,
          expense_date: new Date(expense_date),
          created_by,
          payment_method_id: finalPaymentMethodId,
          payment_status_id: finalPaymentStatusId,
          source_id: finalSourceId || null,
          is_deleted: false,
        }
      });
      if (normalizedReimbursements && normalizedReimbursements.length > 0) {
        for (const entry of normalizedReimbursements) {
          const employee = allEmployees.find(emp => emp.employee_id === entry.employee_id);
          const fallback = assignmentLookup.get(entry.employee_id);
          if (!employee && !fallback) throw new Error('Invalid employee_id for reimbursement');
          await (tx as any).reimbursement.create({
            data: ({
              expense_id: createdExpense.expense_id,
              employee_id: employee?.employee_id || entry.employee_id,
              employee_name: employee?.name || fallback?.name || 'Unknown',
              job_title: employee?.job_title || fallback?.job_title,
              amount: entry.amount,
              status: ('PENDING' as any),
              created_by,
              is_deleted: false,
            } as any)
          });
        }
      }
    }, { timeout: 10000, maxWait: 5000 });

    logAudit({
      action: 'CREATE',
      table_affected: 'ExpenseRecord',
      record_id: createdExpense.expense_id,
      performed_by: created_by,
      details: `Created expense record with amount ₱${finalTotalAmount}${assignment_id ? ' from assignment' : ''}`
    }).catch(() => {});

    const completeExpense: any = await (prisma as any).expenseRecord.findUnique({
      where: { expense_id: createdExpense.expense_id },
      include: {
        category: true,
        payment_method: true,
        payment_status: true,
        source: true,
        reimbursements: { where: { is_deleted: false } }
      }
    });
    if (!completeExpense) return NextResponse.json({ error: 'Failed to retrieve created expense record' }, { status: 500 });

    const expenseWithDetails = {
      ...completeExpense,
      total_amount: Number(completeExpense.total_amount),
      category_name: completeExpense?.category?.name ?? null,
      payment_method_name: completeExpense?.payment_method?.name ?? null,
      payment_status_name: completeExpense?.payment_status?.name ?? null,
      source_name: completeExpense?.source?.name ?? null,
      reimbursements: (completeExpense?.reimbursements || []).map((reimb: any) => ({ ...reimb, amount: Number(reimb.amount) }))
    } as any;

    return NextResponse.json(expenseWithDetails);
  } catch (error) {
    console.error('Error creating expense:', error);
    if (error instanceof Error && error.message === 'DUPLICATE_EXPENSE') {
      return NextResponse.json({ error: 'Duplicate expense detected based on uniqueness rules.' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET function remains the same...
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dateFilter = searchParams.get('dateFilter');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  let dateCondition = {};

  if (dateFilter) {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateCondition = {
          expense_date: {
            gte: startOfDay,
            lt: endOfDay
          }
        };
        break;
      case 'Month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateCondition = {
          expense_date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };
        break;
      case 'Year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        dateCondition = {
          expense_date: {
            gte: startOfYear,
            lte: endOfYear
          }
        };
        break;
    }
  } else if (dateFrom && dateTo) {
    dateCondition = {
      expense_date: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    };
  }

  const expenses = await prisma.expenseRecord.findMany({ 
    where: { 
      is_deleted: false,
      ...dateCondition
    },
    include: {
      category: true,
      payment_method: true,
      source: true,
      reimbursements: {
        where: {
          is_deleted: false
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Transform the data to match frontend expectations
  const expensesWithDetails = expenses.map(exp => ({
    ...exp,
    total_amount: Number(exp.total_amount),
    category_name: exp.category?.name || null,
    payment_method_name: exp.payment_method?.name || null,
    source_name: exp.source?.name || null,
    // Transform reimbursements data
    reimbursements: exp.reimbursements.map(reimb => ({
      ...reimb,
      amount: Number(reimb.amount)
    }))
  }));

  return NextResponse.json(expensesWithDetails);
}