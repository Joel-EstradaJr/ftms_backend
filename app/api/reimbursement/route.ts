import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/auditLogger';

// GET: List all reimbursements (for finance dashboard)
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl || req.url;
    const searchParams = (typeof url === 'string' ? new URL(url, 'http://localhost') : url).searchParams;
    const status = searchParams.get('status');
    const where: Record<string, unknown> = { is_deleted: false };
  if (status) where.status = status as any;
    const reimbursements = await prisma.reimbursement.findMany({
      where,
      include: {
        expense: {
          include: {
            category: true,
            payment_method: true,
            source: true,
          }
        }
      },
      orderBy: { requested_date: 'asc' }
    });
  const mapped = (reimbursements as any[]).map((r: any) => ({
    ...r,
    // Map enum status to legacy shape for frontend compatibility
    status: { id: r.status, name: r.status },
    status_name: r.status,
    // Map date fields to match frontend expectations
    submitted_date: r.requested_date,
    // Convert Decimal to number for frontend
    amount: r.amount ? parseFloat(r.amount.toString()) : null,
    total_amount: r.expense?.total_amount ? parseFloat(r.expense.total_amount.toString()) : 0,
  }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    return NextResponse.json({ error: 'Failed to fetch reimbursements' }, { status: 500 });
  }
}

// PATCH: Approve, pay, reject, or cancel a reimbursement
export async function PATCH(req: NextRequest) {
  try {
    const { reimbursement_id, action, performed_by, payment_reference, payment_method, rejection_reason, remarks } = await req.json();
    
    console.log('PATCH /api/reimbursement called with:', {
      reimbursement_id,
      action,
      performed_by,
      payment_reference,
      payment_method,
      rejection_reason,
      remarks
    });

    if (!reimbursement_id) {
      return NextResponse.json({ error: 'reimbursement_id is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (!performed_by) {
      return NextResponse.json({ error: 'performed_by is required' }, { status: 400 });
    }

    const reimbursement = await prisma.reimbursement.findUnique({ 
      where: { reimbursement_id }
    });
    
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 });
    }

    console.log('Found reimbursement:', {
      reimbursement_id: reimbursement.reimbursement_id,
      current_status: (reimbursement as any).status
    });

  const currentStatus = (reimbursement as any).status as string;
    const updateData: Record<string, unknown> = { updated_at: new Date(), updated_by: performed_by };
    let auditAction = '';
    let auditDetails = '';

    if (action === 'APPROVE') {
  if (currentStatus !== 'PENDING') {
        console.log(`Cannot approve: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only approve from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
  updateData.status = 'APPROVED';
      updateData.approved_by = performed_by;
      updateData.approved_date = new Date();
      auditAction = 'APPROVE';
      auditDetails = 'Reimbursement approved.';
    } else if (action === 'PAY') {
  if (currentStatus !== 'APPROVED') {
        console.log(`Cannot pay: current status is '${currentStatus}', expected 'APPROVED'`);
        return NextResponse.json({ 
          error: `Can only pay from APPROVED status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
  updateData.status = 'PAID';
      updateData.paid_by = performed_by;
      updateData.paid_date = new Date();
      updateData.payment_reference = payment_reference;
      // Map payment method name to id if provided
      if (payment_method) {
        const pmName = (payment_method as string).trim();
        const pm = await prisma.globalPaymentMethod.findFirst({ 
          where: { 
            name: { equals: pmName, mode: 'insensitive' },
            is_deleted: false
          } 
        });
        if (!pm) return NextResponse.json({ error: `Payment method not found: ${payment_method}` }, { status: 400 });
        updateData.payment_method_id = pm.id;
      }
      // Add remarks to the update data
      if (remarks) {
        updateData.remarks = remarks;
      }
      auditAction = 'PAY';
      auditDetails = `Reimbursement paid. Reference: ${payment_reference}${remarks ? `. Remarks: ${remarks}` : ''}`;
    } else if (action === 'REJECT') {
  if (currentStatus !== 'PENDING') {
        console.log(`Cannot reject: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only reject from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
      if (!rejection_reason) {
        return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
      }
  updateData.status = 'REJECTED';
      updateData.rejection_reason = rejection_reason;
      updateData.approved_by = performed_by;
      updateData.approved_date = new Date();
      auditAction = 'REJECT';
      auditDetails = `Reimbursement rejected. Reason: ${rejection_reason}`;
    } else if (action === 'CANCEL') {
  if (currentStatus !== 'PENDING') {
        console.log(`Cannot cancel: current status is '${currentStatus}', expected 'PENDING'`);
        return NextResponse.json({ 
          error: `Can only cancel from PENDING status. Current status: ${currentStatus}` 
        }, { status: 400 });
      }
  updateData.status = 'CANCELLED';
      updateData.cancelled_by = performed_by;
      updateData.cancelled_date = new Date();
      auditAction = 'CANCEL';
      auditDetails = 'Reimbursement cancelled.';
    } else {
      console.log(`Invalid action: ${action}`);
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    console.log('Updating reimbursement with data:', updateData);

    const updated = await prisma.reimbursement.update({
      where: { reimbursement_id },
      data: updateData
    });

    console.log('Reimbursement updated successfully:', {
      reimbursement_id: updated.reimbursement_id,
      new_status: (updated as any).status
    });

    await logAudit({
      action: auditAction,
      table_affected: 'Reimbursement',
      record_id: reimbursement_id,
      performed_by,
      details: auditDetails
    });

    return NextResponse.json({
      ...(updated as any),
      status_name: (updated as any).status,
    });
  } catch (error) {
    console.error('Error updating reimbursement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to update reimbursement',
      details: errorMessage 
    }, { status: 500 });
  }
}