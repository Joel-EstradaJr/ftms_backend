// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
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
      total_amount,
      expense_date,
      created_by,
      payment_method,
      payment_method_id,
      reimbursements
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Validate required fields
      if (!total_amount || !expense_date || !created_by) {
        throw new Error('Missing required fields: total_amount, expense_date, or created_by');
      }

      // Handle category - convert name to ID if needed
      let finalCategoryId = category_id;
      if (!finalCategoryId && category) {
        const categoryRecord = await tx.globalCategory.findFirst({ 
          where: { name: category, is_deleted: false } 
        });
        if (!categoryRecord) {
          throw new Error(`Category '${category}' not found`);
        }
        finalCategoryId = (categoryRecord as any).category_id ?? (categoryRecord as any).id;
      }
      if (!finalCategoryId) {
        throw new Error('Missing category_id or valid category name');
      }

      // Handle payment method - convert name to ID if needed
      let finalPaymentMethodId = payment_method_id;
      if (!finalPaymentMethodId && payment_method) {
        const paymentMethodRecord = await tx.globalPaymentMethod.findFirst({ 
          where: { name: payment_method, is_deleted: false } 
        });
        if (!paymentMethodRecord) {
          throw new Error(`Payment method '${payment_method}' not found`);
        }
        finalPaymentMethodId = paymentMethodRecord.id;
      }
      if (!finalPaymentMethodId) {
        throw new Error('Missing payment_method_id or valid payment_method name');
      }

      // Get category and payment method
  const categoryRecord = await tx.globalCategory.findUnique({ where: { category_id: finalCategoryId } as any });
      const paymentMethodRecord = await tx.globalPaymentMethod.findUnique({ where: { id: finalPaymentMethodId } });

      if (!categoryRecord || !paymentMethodRecord) {
        throw new Error('Invalid category or payment method');
      }

      // Create expense record
      const expense = await tx.expenseRecord.create({
        data: {
          expense_id: await generateId('EXP'),
          category_id: finalCategoryId,
          assignment_id: assignment_id || null,
          total_amount,
          expense_date: new Date(expense_date),
          created_by,
          payment_method_id: paymentMethodRecord.id,
          is_deleted: false,
        }
      });

      // Create reimbursements if provided (legacy status_id flow)
      const pendingStatus = await (tx as any).globalReimbursementStatus?.findFirst?.({ where: { name: 'PENDING' } });
      if (pendingStatus) {
        if (Array.isArray(reimbursements) && reimbursements.length > 0) {
          const allEmployees = await fetchEmployeesForReimbursement();
          for (const entry of reimbursements) {
            if (!entry.employee_id || !entry.amount) {
              throw new Error('Missing employee_id or amount in reimbursement entry');
            }
            const employee = allEmployees.find(emp => emp.employee_id === entry.employee_id);
            if (!employee) {
              throw new Error('Invalid employee_id for reimbursement');
            }
            await tx.reimbursement.create({
              data: {
                expense_id: expense.expense_id,
                employee_id: employee.employee_id,
                employee_name: employee.name,
                job_title: employee.job_title,
                amount: entry.amount,
                status_id: (pendingStatus as any).id,
                created_by,
                is_deleted: false,
              } as any
            });
          }
        } else if (body.employee_id && total_amount) {
          const allEmployees = await fetchEmployeesForReimbursement();
          const employee = allEmployees.find(emp => emp.employee_id === body.employee_id);
          if (!employee) {
            throw new Error('Invalid employee_id for reimbursement');
          }
          await tx.reimbursement.create({
            data: {
              expense_id: expense.expense_id,
              employee_id: employee.employee_id,
              employee_name: employee.name,
              job_title: employee.job_title,
              amount: total_amount,
              status_id: (pendingStatus as any).id,
              created_by,
              is_deleted: false,
            } as any
          });
        }
      }

      await logAudit({
        action: 'CREATE',
        table_affected: 'ExpenseRecord',
        record_id: expense.expense_id,
        performed_by: created_by,
        details: `Created expense record with amount ₱${total_amount}${assignment_id ? ' from assignment' : ''}`
      });

      // Fetch the complete expense record with all relationships for the response
      const completeExpense = await tx.expenseRecord.findUnique({
        where: { expense_id: expense.expense_id },
        include: {
          category: true,
          payment_method: true,
          source: true,
          reimbursements: {
            where: {
              is_deleted: false
            }
          }
        }
      });

      // Fix: Add null check for completeExpense
      if (!completeExpense) {
        throw new Error('Failed to retrieve created expense record');
      }

      // Transform the data to match frontend expectations
      const expenseWithDetails = {
        ...completeExpense,
        total_amount: Number(completeExpense.total_amount),
        category_name: completeExpense.category?.name || null,
        payment_method_name: completeExpense.payment_method?.name || null,
        source_name: completeExpense.source?.name || null,
        // Transform reimbursements data
        reimbursements: completeExpense.reimbursements.map(reimb => ({
          ...reimb,
          amount: Number(reimb.amount)
        }))
      };

      return expenseWithDetails;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
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