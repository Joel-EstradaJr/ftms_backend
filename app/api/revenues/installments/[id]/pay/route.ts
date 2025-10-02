import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Recalculate a single installment from its payments and update revenue balances
async function updateInstallmentAndRevenue({ revenue_id, installment_id }: { revenue_id: string; installment_id: string }) {
  // Sum payments for this installment
  const pays = await (prisma as any).revenuePayment.findMany({ where: { installment_id } });
  const totalPaid = pays.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const inst = await (prisma as any).revenueInstallment.findUnique({ where: { id: installment_id } });
  if (inst) {
    const due = Number(inst.amount_due || 0);
    let status: 'PENDING'|'PARTIAL'|'PAID'|'OVERPAID'|'LATE' = 'PENDING';
    if (totalPaid === 0) status = 'PENDING';
    else if (totalPaid < due) status = 'PARTIAL';
    else if (totalPaid === due) status = 'PAID';
    else status = 'OVERPAID';
    await (prisma as any).revenueInstallment.update({ where: { id: installment_id }, data: { amount_paid: totalPaid, status } });
    const instStatuses = await (prisma as any).globalInstallmentStatus.findMany({ select: { id: true, name: true } });
    const instStatusId = instStatuses.find((s: any) => s.name.toLowerCase() === status.toLowerCase())?.id || null;
    if (instStatusId) {
      await (prisma as any).revenueInstallment.update({ where: { id: installment_id }, data: { installment_status_id: instStatusId } });
    }
  }

  // Recalc revenue outstanding and set payment status when possible
  const insts = await (prisma as any).revenueInstallment.findMany({ where: { revenue_id } });
  const paidAgg = insts.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
  const totalAmount = Number((await (prisma as any).revenueRecord.findUnique({ where: { revenue_id }, select: { total_amount: true } }))?.total_amount || 0);
  const outstanding = Math.max(0, Number((totalAmount - paidAgg).toFixed(4)));
  await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { outstanding_balance: outstanding } });

  const statusTable = await prisma.globalPaymentStatus.findMany({ where: { applicable_modules: { has: 'revenue' } } });
  const byName = (n: string) => statusTable.find(s => s.name.toLowerCase() === n.toLowerCase());
  const paid = outstanding === 0 && totalAmount > 0;
  const partial = outstanding > 0 && paidAgg > 0 && paidAgg < totalAmount;
  let nextStatusId: string | undefined;
  if (paid) nextStatusId = byName('Paid')?.id;
  else if (partial) nextStatusId = byName('Partially Paid')?.id || byName('Partial')?.id;
  if (nextStatusId) {
    await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { payment_status_id: nextStatusId } });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { pay_amount, payment_method_id, payment_status_id, paid_date, reference_number, remarks } = body as any;
    const amount = Number(pay_amount);
    if (!(amount > 0)) return NextResponse.json({ error: 'pay_amount must be > 0' }, { status: 400 });

    // Fetch installment and revenue
    const inst = await (prisma as any).revenueInstallment.findUnique({ where: { id } });
    if (!inst) return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    const revenue_id: string = inst.revenue_id;

    // Resolve payment method (required for RevenuePayment)
    const methodId: string | undefined = payment_method_id || inst.payment_method_id || undefined;
    if (!methodId) return NextResponse.json({ error: 'payment_method_id is required' }, { status: 400 });
    const method = await prisma.globalPaymentMethod.findUnique({ where: { id: methodId } });
    if (!method) return NextResponse.json({ error: 'Invalid payment_method_id' }, { status: 400 });

    // Resolve payment status (required for RevenuePayment)
    let statusId: string | undefined = payment_status_id || inst.payment_status_id || undefined;
    if (!statusId) {
      // Default to Partial if not provided and no installment status set
      const statuses = await prisma.globalPaymentStatus.findMany({ where: { applicable_modules: { has: 'revenue' } } });
      statusId = (statuses.find(s => /partially paid|partial/i.test(s.name)) || statuses[0])?.id;
    }
    if (!statusId) return NextResponse.json({ error: 'payment_status_id is required' }, { status: 400 });

    // Overpay guard: ensure proper status if exceeding outstanding
    const instsNow = await (prisma as any).revenueInstallment.findMany({ where: { revenue_id } });
    const paidSoFar = instsNow.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
    const totalAmount = Number((await (prisma as any).revenueRecord.findUnique({ where: { revenue_id }, select: { total_amount: true } }))?.total_amount || 0);
    const outstandingBefore = Math.max(0, Number((totalAmount - paidSoFar).toFixed(4)));
    if (amount > outstandingBefore) {
      const statuses = await prisma.globalPaymentStatus.findMany({ where: { applicable_modules: { has: 'revenue' } } });
      const overpaidId = statuses.find(s => s.name.toLowerCase() === 'overpaid')?.id;
      if (!overpaidId || statusId !== overpaidId) {
        return NextResponse.json({ error: 'Payment exceeds outstanding balance; mark as Overpaid to continue.' }, { status: 400 });
      }
    }

    // Create RevenuePayment line
    const payment = await (prisma as any).revenuePayment.create({
      data: {
        revenue_id,
        installment_id: id,
        amount,
        payment_method_id: methodId,
        payment_status_id: statusId,
        paid_date: paid_date ? new Date(paid_date) : new Date(),
        reference_number: reference_number || null,
        remarks: remarks || null,
      },
      include: { payment_method: true, payment_status: true }
    });

    // Recalculate installment and revenue totals/status
    await updateInstallmentAndRevenue({ revenue_id, installment_id: id });

    // Return the updated installment snapshot and the created payment
    const updatedInst = await (prisma as any).revenueInstallment.findUnique({ where: { id } });
    return NextResponse.json({ installment: updatedInst, payment });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
