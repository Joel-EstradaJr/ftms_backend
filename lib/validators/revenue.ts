import { prisma } from '@/lib/prisma';

export type EmployeeType = 'driver' | 'conductor';

export function requirePaymentMethodWhenRemitted(opts: {
  total_amount: number;
  is_receivable: boolean;
  payment_method_id?: string | null;
  payment_status_name?: string | null;
}): { ok: true } | { ok: false; message: string } {
  const total = Number(opts.total_amount) || 0;
  const isAR = !!opts.is_receivable;
  const pm = (opts.payment_method_id || '').trim();
  const statusName = (opts.payment_status_name || '').toLowerCase();
  // If status is Paid, require pm (existing behavior)
  if (statusName === 'paid' && !pm) {
    return { ok: false, message: 'payment_method_id is required when status is Paid' };
  }
  // If a non-AR revenue has remitted amount (> 0), require pm regardless of status
  if (!isAR && total > 0 && !pm) {
    return { ok: false, message: 'payment_method_id is required when remitted total_amount > 0' };
  }
  return { ok: true };
}

export function validateScheduleTypeRequirement(opts: {
  installments?: Array<unknown> | null;
  schedule_type?: string | null;
  schedule_type_id?: string | null;
}): { ok: true } | { ok: false; message: string } {
  const count = Array.isArray(opts.installments) ? opts.installments.length : 0;
  if (count > 1) {
    if (!opts.schedule_type && !opts.schedule_type_id) {
      return { ok: false, message: 'schedule_type is required when installment_count > 1' };
    }
  }
  return { ok: true };
}

export function validateARAndDates(opts: {
  is_receivable: boolean;
  collection_date: Date;
  due_date?: Date | null;
}): { ok: true } | { ok: false; message: string } {
  const { is_receivable, collection_date } = opts;
  const due = opts.due_date ? new Date(opts.due_date) : null;
  const now = new Date();
  if (!is_receivable && collection_date > now) {
    return { ok: false, message: 'collection_date cannot be in the future unless is_receivable is true' };
  }
  if (is_receivable) {
    if (!due) return { ok: false, message: 'due_date is required when is_receivable is true' };
    if (due < collection_date) return { ok: false, message: 'due_date must be on or after collection_date' };
  }
  return { ok: true };
}

export async function enforceLoanDoesNotExceedOutstanding(revenue_id: string) {
  const revenue = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id }, select: { outstanding_balance: true } });
  if (!revenue) return;
  const outstanding = Number(revenue.outstanding_balance || 0);
  const loans = await (prisma as any).loan.findMany({ where: { revenue_id } });
  const totalLoans = loans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0);
  if (totalLoans <= outstanding) return;
  if (outstanding <= 0) {
    await (prisma as any).loan.deleteMany({ where: { revenue_id } });
    return;
  }
  // Proportionally scale down existing loans to fit outstanding
  const factor = outstanding / totalLoans;
  for (const l of loans) {
    const newAmt = Number((Number(l.amount || 0) * factor).toFixed(2));
    await (prisma as any).loan.update({ where: { id: l.id }, data: { amount: newAmt } });
  }
}

export async function recomputeOutstandingFromPayments(revenue_id: string) {
  const sums = await (prisma as any).revenuePayment.aggregate({ _sum: { amount: true }, where: { revenue_id } });
  const totalPaid = Number(sums?._sum?.amount || 0);
  const rec = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id }, select: { total_amount: true } });
  if (!rec) return;
  const totalAmount = Number(rec.total_amount || 0);
  const outstanding = Math.max(0, Number((totalAmount - totalPaid).toFixed(4)));
  await (prisma as any).revenueRecord.update({ where: { revenue_id }, data: { outstanding_balance: outstanding } });
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isPositiveDecimal(v: unknown): v is number | string {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && !Number.isNaN(n) && n > 0;
}
