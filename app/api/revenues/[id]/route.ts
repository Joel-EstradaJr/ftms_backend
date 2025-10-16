// api\revenues\[id]\route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/operations/assignments'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'
import { upsertBoundaryLoanForRevenue } from '@/lib/loans'
import { deleteFromDrive } from '@/lib/google/drive'
import { isValidCollectionDateForEdit, validateAmountAgainstTrip } from '@/app/utils/revenueCalc'
import { requirePaymentMethodWhenRemitted, validateARAndDates, enforceLoanDoesNotExceedOutstanding } from '@/lib/validators/revenue'


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const revenue = await (prisma as any).revenueRecord.findUnique({
    where: { revenue_id: id },
    include: { 
      category: true, 
      source: true, 
      payment_method: true, 
      payment_status: true, 
      scheduleType: true,
      installments: { include: { payment_status: true, payment_method: true, installmentStatus: true }, orderBy: { installment_number: 'asc' } },
    },
  });
  if (!revenue || revenue.is_deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Attach generic attachments and payments
  const [attachments, payments] = await Promise.all([
    (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: id, is_deleted: false }, orderBy: { uploaded_at: 'desc' } }),
    (prisma as any).revenuePayment.findMany({ where: { revenue_id: id }, orderBy: { created_at: 'desc' }, include: { payment_method: true, payment_status: true, installment: true } })
  ]);
  const enriched = {
    ...revenue,
    schedule_type_name: (revenue as any)?.scheduleType?.name ?? (revenue as any)?.schedule_type ?? null,
    installments: Array.isArray((revenue as any)?.installments)
      ? (revenue as any).installments.map((inst: any) => ({
          ...inst,
          installment_status_name: inst?.installmentStatus?.name ?? inst?.status ?? null,
        }))
      : (revenue as any)?.installments,
    attachments,
    payments,
  };
  return NextResponse.json(enriched);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
  const { total_amount, collection_date, payment_method_id, payment_status_id, remarks, is_receivable, due_date, payer_name, interest_rate, schedule_type } = data;
    const revenue_id = id;

    // Convert collection_date string to Date object
    const collectionDateTime = new Date(collection_date);
    
  // Validate date against original created_at
    const now = new Date();

    // Get the original record for comparison and validation
    const originalRecord = await (prisma as any).revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!originalRecord || originalRecord.is_deleted) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    if (!isValidCollectionDateForEdit(collectionDateTime, (originalRecord as any).created_at, now)) {
      return NextResponse.json({ error: 'Collection date must be within 3 months before the record creation date and not in the future.' }, { status: 400 });
    }

    // Due date must be >= collection date if AR
    if ((typeof is_receivable === 'boolean' ? is_receivable : (originalRecord as any).is_receivable) && due_date) {
      const due = new Date(due_date);
      if (due < collectionDateTime) {
        return NextResponse.json({ error: 'due_date must be on or after collection_date' }, { status: 400 });
      }
    }

  // Validate payment status/method if provided
    if (payment_status_id) {
      const status = await prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } });
      if (!status || !status.applicable_modules.includes('revenue')) {
        return NextResponse.json({ error: 'Invalid payment_status_id for revenue' }, { status: 400 });
      }
      if (/^paid$/i.test(status.name)) {
        const hasMethod = !!payment_method_id || !!(originalRecord as any).payment_method_id;
        if (!hasMethod) return NextResponse.json({ error: 'payment_method_id is required when status is Paid' }, { status: 400 });
      }
    }
    if (payment_method_id) {
      const pm = await prisma.globalPaymentMethod.findUnique({ where: { id: payment_method_id } });
      if (!pm) return NextResponse.json({ error: 'Invalid payment_method_id' }, { status: 400 });
    }
    // Enforce payment method rule if remitted
    if (typeof total_amount === 'number') {
      const recStatus = payment_status_id ? (await prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } }))?.name : (await prisma.revenueRecord.findUnique({ where: { revenue_id } , select: { payment_status: true } }))?.payment_status?.name;
      const check = requirePaymentMethodWhenRemitted({ total_amount, is_receivable: Boolean(is_receivable ?? (originalRecord as any).is_receivable), payment_method_id: payment_method_id ?? (originalRecord as any).payment_method_id, payment_status_name: recStatus || null });
      if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
    }
    if (typeof remarks === 'string') {
      const trimmed = remarks.trim();
      if (trimmed.length < 5 || trimmed.length > 500) return NextResponse.json({ error: 'Remarks must be 5-500 characters' }, { status: 400 });
    }

    // If linked to an assignment, get the original trip_revenue for comparison
    let originalTripRevenue = null;
    if (originalRecord.assignment_id) {
      const assignmentData = await getAssignmentById(originalRecord.assignment_id);
      originalTripRevenue = assignmentData?.trip_revenue;
      // Enforce amount cap for bus-trip linked categories
      const withCategory = await prisma.revenueRecord.findUnique({ where: { revenue_id }, include: { category: true } });
      const catName = withCategory?.category?.name;
      if (!validateAmountAgainstTrip(catName, Number(total_amount) || 0, Number(assignmentData?.trip_revenue) || 0)) {
        return NextResponse.json({ error: `total_amount must be between 1 and ${(assignmentData?.trip_revenue as any) || 0}` }, { status: 400 });
      }
    }

    // Calculate deviation percentage if there's an original trip revenue
    let deviationPercentage = null;
    if (originalTripRevenue !== null && originalTripRevenue !== undefined) {
      deviationPercentage = Math.abs((total_amount - originalTripRevenue) / originalTripRevenue * 100);
    }

    // Update the record with DateTime and payment/remarks
    const updatedRevenue = await (prisma as any).revenueRecord.update({
      where: { revenue_id },
      data: {
        total_amount,
        collection_date: collectionDateTime, // Store as DateTime
  // keep source as-is; no source_id column in schema
        ...(payment_status_id ? { payment_status: { connect: { id: payment_status_id } } } : {}),
        ...(payment_method_id ? { payment_method: { connect: { id: payment_method_id } } } : {}),
        ...(typeof remarks === 'string' ? { remarks: remarks.trim() } : {}),
        ...(typeof is_receivable === 'boolean' ? { is_receivable } : {}),
        ...(due_date ? { due_date: new Date(due_date) } : {}),
        ...(typeof payer_name === 'string' ? { payer_name: payer_name.trim() } : {}),
        ...(interest_rate !== undefined ? { interest_rate: Number(interest_rate) || 0 } : {}),
        ...(schedule_type ? { schedule_type } : {}),
      },
      include: {
        category: true,
        source: true,
        payment_method: true,
        payment_status: true,
        installments: { include: { payment_status: true, payment_method: true }, orderBy: { installment_number: 'asc' } },
      }
    });

    // If AR, update outstanding balance based on installments
    if ((updatedRevenue as any).is_receivable) {
      const inst = await (prisma as any).revenueInstallment.findMany({ where: { revenue_id } });
      const paid = inst.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      const outstanding = Math.max(0, Number((Number((updatedRevenue as any).total_amount) - paid).toFixed(4)));
      await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { outstanding_balance: outstanding } });
    }

  // Ensure loans fit within outstanding balance after update
  await enforceLoanDoesNotExceedOutstanding(revenue_id);

    // Recompute Option2 loan for Boundary category if applicable
    try {
      const updatedWithCategory = await prisma.revenueRecord.findUnique({
        where: { revenue_id },
        include: { category: true },
      });
      if (updatedWithCategory?.category?.name && /boundary/i.test(updatedWithCategory.category.name) && originalRecord.assignment_id) {
        const assignmentData = await getAssignmentById(originalRecord.assignment_id);
        if (assignmentData) {
          await upsertBoundaryLoanForRevenue({
            revenue_id,
            assignment_value: Number(assignmentData.assignment_value) || 0,
            trip_revenue: Number(assignmentData.trip_revenue) || 0,
            total_amount: Number(total_amount) || 0,
          });
        }
      }
    } catch (e) {
      console.warn('Loan upsert (PUT) failed (non-fatal):', e);
    }

    // Log the audit trail, including deviation information if applicable
    let auditDetails = `Updated revenue record. Amount changed from ₱${originalRecord.total_amount} to ₱${total_amount}. Collection date changed to ${collectionDateTime.toISOString()}.`;
    if (deviationPercentage !== null) {
      auditDetails += ` Deviation from original trip revenue: ${deviationPercentage.toFixed(2)}%`;
    }

    await logAudit({
      action: 'UPDATE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: 'ftms_user',
      details: auditDetails,
    });

    return NextResponse.json(updatedRevenue);
  } catch (error) {
    console.error('Failed to update revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed to use Promise
) {
  try {
    const { id } = await params; // Await the params promise
    const revenue_id = id; // Use the awaited id

    // Get the record before deletion for audit purposes
    const record = await prisma.revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting is_deleted flag
    const deletedRevenue = await prisma.revenueRecord.update({
      where: { revenue_id },
      data: { 
        is_deleted: true,
      }
    });

    // Cascade: mark related attachments as deleted
    const attachments = await (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: revenue_id, is_deleted: false } });
    await (prisma as any).attachment.updateMany({
      where: { id: { in: attachments.map((a: any) => a.id) } },
      data: { is_deleted: true }
    });
    // If env flag enabled, attempt Drive hard-delete
    if (process.env.REVENUE_ATTACHMENTS_HARD_DELETE === 'true') {
      for (const att of attachments) {
        if (att.file_id) {
          try { await deleteFromDrive(att.file_id); } catch { /* ignore */ }
        }
      }
    }

    // Log the deletion in audit trail
    await logAudit({
      action: 'DELETE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: 'ftms_user',
      details: `Soft deleted revenue record with amount ₱${record.total_amount}`,
    });

    return NextResponse.json(deletedRevenue);
  } catch (error) {
    console.error('Failed to delete revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}