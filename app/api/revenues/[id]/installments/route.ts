import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

async function recalcRevenue(revenue_id: string) {
  const revenue = await (prisma as any).revenueRecord.findUnique({
    where: { revenue_id },
    include: { installments: true },
  });
  if (!revenue) return;
  const total = Number(revenue.total_amount || 0);
  const paid = revenue.installments.reduce((sum: number, r: any) => sum + Number(r.amount_paid || 0), 0);
  const outstanding = Math.max(0, Number((total - paid).toFixed(4)));
  await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { outstanding_balance: outstanding } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const revenue = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id: id } });
    if (!revenue || revenue.is_deleted) return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    const body = await req.json();
    const lines = (body.installments || []) as Array<{ installment_number: number; due_date: string; amount_due: number; }>;
    if (!Array.isArray(lines) || lines.length === 0) return NextResponse.json({ error: 'installments array required' }, { status: 400 });
    const pending = await (prisma as any).globalPaymentStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, applicable_modules: { has: 'revenue' } } });
    if (!pending) return NextResponse.json({ error: 'Pending payment status not found' }, { status: 400 });
    const created = [] as any[];
    for (const line of lines) {
      if (!line.due_date || !(typeof line.amount_due === 'number')) return NextResponse.json({ error: 'Each installment requires due_date and amount_due' }, { status: 400 });
      const inst = await (prisma as any).revenueInstallment.create({
        data: {
          revenue_id: id,
          installment_number: Number(line.installment_number || 0),
          due_date: new Date(line.due_date),
          amount_due: Number(line.amount_due),
          amount_paid: 0,
          status: 'PENDING',
          payment_status_id: pending.id,
        }
      });
      created.push(inst);
    }
    await recalcRevenue(id);
    return NextResponse.json({ installments: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add installments' }, { status: 500 });
  }
}
