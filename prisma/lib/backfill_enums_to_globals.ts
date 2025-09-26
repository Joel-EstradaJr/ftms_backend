import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillRevenue() {
  // ScheduleType: map enum name to GlobalScheduleType.name (case-insensitive)
  const scheduleTypes = await (prisma as any).globalScheduleType.findMany({ select: { id: true, name: true } });
  const stMap = new Map<string, string>(scheduleTypes.map((r: any) => [r.name.toLowerCase(), r.id]));

  const revenues = await (prisma as any).revenueRecord.findMany({ select: { revenue_id: true, schedule_type: true, schedule_type_id: true } });
  for (const r of revenues) {
    if (!r.schedule_type_id && r.schedule_type) {
      const key = String(r.schedule_type).replace(/_/g, '-').toLowerCase(); // e.g., SEMI_MONTHLY -> semi-monthly
      const id = stMap.get(key) || stMap.get(String(r.schedule_type).toLowerCase());
      if (id) {
        await (prisma as any).revenueRecord.update({ where: { revenue_id: r.revenue_id }, data: { schedule_type_id: id } });
      }
    }
  }
}

async function backfillInstallments() {
  const statuses = await (prisma as any).globalInstallmentStatus.findMany({ select: { id: true, name: true } });
  const sMap = new Map<string, string>(statuses.map((r: any) => [r.name.toLowerCase(), r.id]));
  const rows = await (prisma as any).revenueInstallment.findMany({ select: { id: true, status: true, installment_status_id: true } });
  for (const row of rows) {
    if (!row.installment_status_id && row.status) {
      const id = sMap.get(String(row.status).toLowerCase());
      if (id) await (prisma as any).revenueInstallment.update({ where: { id: row.id }, data: { installment_status_id: id } });
    }
  }
}

async function backfillReimbursements() {
  const statuses = await (prisma as any).globalReimbursementStatus.findMany({ select: { id: true, name: true } });
  const sMap = new Map<string, string>(statuses.map((r: any) => [r.name.toLowerCase(), r.id]));
  const rows = await (prisma as any).reimbursement.findMany({ select: { reimbursement_id: true, status: true, reimbursement_status_id: true } });
  for (const row of rows) {
    if (!row.reimbursement_status_id && row.status) {
      const id = sMap.get(String(row.status).toLowerCase());
      if (id) await (prisma as any).reimbursement.update({ where: { reimbursement_id: row.reimbursement_id }, data: { reimbursement_status_id: id } });
    }
  }
}

async function backfillPayroll() {
  const freqs = await (prisma as any).globalFrequency.findMany({ select: { id: true, name: true } });
  const fMap = new Map<string, string>(freqs.map((r: any) => [r.name.toLowerCase(), r.id]));
  const pStatuses = await (prisma as any).globalPayrollStatus.findMany({ select: { id: true, name: true } });
  const psMap = new Map<string, string>(pStatuses.map((r: any) => [r.name.toLowerCase(), r.id]));

  const pfc = await (prisma as any).payrollFrequencyConfig.findMany({ select: { id: true, payroll_frequency: true, frequency_id: true } });
  for (const row of pfc) {
    if (!row.frequency_id && row.payroll_frequency) {
      const key = String(row.payroll_frequency).replace(/_/g, '-').toLowerCase();
      const id = fMap.get(key) || fMap.get(String(row.payroll_frequency).toLowerCase());
      if (id) await (prisma as any).payrollFrequencyConfig.update({ where: { id: row.id }, data: { frequency_id: id } });
    }
  }

  const pr = await (prisma as any).payrollRecord.findMany({ select: { payroll_id: true, payroll_period: true, payroll_period_id: true, status: true, payroll_status_id: true } });
  for (const row of pr) {
    if (!row.payroll_period_id && row.payroll_period) {
      const key = String(row.payroll_period).replace(/_/g, '-').toLowerCase();
      const id = fMap.get(key) || fMap.get(String(row.payroll_period).toLowerCase());
      if (id) await (prisma as any).payrollRecord.update({ where: { payroll_id: row.payroll_id }, data: { payroll_period_id: id } });
    }
    if (!row.payroll_status_id && row.status) {
      const id = psMap.get(String(row.status).toLowerCase());
      if (id) await (prisma as any).payrollRecord.update({ where: { payroll_id: row.payroll_id }, data: { payroll_status_id: id } });
    }
  }
}

async function main() {
  await backfillRevenue();
  await backfillInstallments();
  await backfillReimbursements();
  await backfillPayroll();
  console.log('Backfill complete.');
}

main().catch((e) => {
  console.error('Backfill error:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
