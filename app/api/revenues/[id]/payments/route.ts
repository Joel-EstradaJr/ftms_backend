import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPositiveDecimal, enforceLoanDoesNotExceedOutstanding } from '@/lib/validators/revenue';

async function updateInstallmentAndRevenue({ revenue_id, installment_id }: { revenue_id: string; installment_id?: string | null }) {
  // Recalc installment amount_paid and status from payments
  if (installment_id) {
    const payments = await (prisma as any).revenuePayment.findMany({ where: { installment_id } });
    const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const inst = await (prisma as any).revenueInstallment.findUnique({ where: { id: installment_id } });
    if (inst) {
      const due = Number(inst.amount_due || 0);
      let status: 'PENDING'|'PARTIAL'|'PAID'|'OVERPAID'|'LATE' = 'PENDING';
      if (totalPaid === 0) status = 'PENDING';
      else if (totalPaid < due) status = 'PARTIAL';
      else if (totalPaid === due) status = 'PAID';
      else status = 'OVERPAID';

      // Map enum-like status to GlobalInstallmentStatus FK (keep enum for now for compatibility)
      const instStatuses = await (prisma as any).globalInstallmentStatus.findMany({ select: { id: true, name: true } });
      const instStatusId = instStatuses.find((s: any) => s.name.toLowerCase() === status.toLowerCase())?.id || null;
      await (prisma as any).revenueInstallment.update({ where: { id: installment_id }, data: { amount_paid: totalPaid, status } });
      if (instStatusId) {
        await (prisma as any).revenueInstallment.update({ where: { id: installment_id }, data: { installment_status_id: instStatusId } });
      }
    }
  }

  // Recalc revenue outstanding and set payment status
  const insts = await (prisma as any).revenueInstallment.findMany({ where: { revenue_id } });
  const totalPaid = insts.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
  const totalAmount = Number((await (prisma as any).revenueRecord.findUnique({ where: { revenue_id }, select: { total_amount: true } }))?.total_amount || 0);
  const outstanding = Math.max(0, Number((totalAmount - totalPaid).toFixed(4)));
  await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { outstanding_balance: outstanding } });

  // Update revenue payment_status when possible
  const statusTable = await prisma.globalPaymentStatus.findMany({ where: { applicable_modules: { has: 'revenue' } } });
  const byName = (n: string) => statusTable.find(s => s.name.toLowerCase() === n.toLowerCase());
  const paid = outstanding === 0 && totalAmount > 0;
  const partial = outstanding > 0 && totalPaid > 0 && totalPaid < totalAmount;
  let nextStatusId: string | undefined;
  if (paid) nextStatusId = byName('Paid')?.id;
  else if (partial) nextStatusId = byName('Partially Paid')?.id || byName('Partial')?.id;
  if (nextStatusId) {
    await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { payment_status_id: nextStatusId } });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payments = await (prisma as any).revenuePayment.findMany({
    where: { revenue_id: id },
    orderBy: { created_at: 'desc' },
    include: { payment_method: true, payment_status: true }
  });
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contentType = req.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await req.json() : {};
    const { payments } = body as { payments: Array<{ amount: number; payment_method_id: string; payment_status_id: string; paid_date?: string; reference_number?: string; remarks?: string; installment_id?: string | null; }>; };
    if (!Array.isArray(payments) || payments.length === 0) return NextResponse.json({ error: 'No payments provided' }, { status: 400 });

    // Basic validation and sum
    const sum = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (!(sum > 0)) return NextResponse.json({ error: 'Total payment amount must be > 0' }, { status: 400 });

    // Validate each payment line must have payment_method_id when amount > 0
    for (const p of payments) {
      if (isPositiveDecimal(p.amount) && !p.payment_method_id) {
        return NextResponse.json({ error: 'payment_method_id is required for each payment with amount > 0' }, { status: 400 });
      }
    }

    // Optional: enforce outstanding check unless explicitly overpaid
    const revenue = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id: id } });
    if (!revenue) return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    const outstanding = Number(revenue.outstanding_balance || 0);
    const willOverpay = sum > outstanding;
    if (willOverpay) {
      // Allow only if any line status is "Overpaid"
      const statuses = await prisma.globalPaymentStatus.findMany({ where: { applicable_modules: { has: 'revenue' } } });
      const overpaidId = statuses.find(s => s.name.toLowerCase() === 'overpaid')?.id;
      const hasOverpaid = !!overpaidId && payments.some(p => p.payment_status_id === overpaidId);
      if (!hasOverpaid) return NextResponse.json({ error: 'Payment exceeds outstanding balance; mark as Overpaid to continue.' }, { status: 400 });
    }

    // Create all payments and recalc in a single transaction-like flow
    const created: any[] = [];
    for (const p of payments) {
      const amt = Number(p.amount);
      if (!(amt > 0)) return NextResponse.json({ error: 'Each payment amount must be > 0' }, { status: 400 });
      const pay = await (prisma as any).revenuePayment.create({
        data: {
          revenue_id: id,
          installment_id: p.installment_id || null,
          amount: amt,
          payment_method_id: p.payment_method_id,
          payment_status_id: p.payment_status_id,
          paid_date: p.paid_date ? new Date(p.paid_date) : new Date(),
          reference_number: p.reference_number || null,
          remarks: p.remarks || null,
        },
        include: { payment_method: true, payment_status: true }
      });
      created.push(pay);
      await updateInstallmentAndRevenue({ revenue_id: id, installment_id: p.installment_id || null });
    }

    // Ensure existing loans do not exceed new outstanding balance
    await enforceLoanDoesNotExceedOutstanding(id);

    return NextResponse.json({ payments: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add payments' }, { status: 500 });
  }
}
