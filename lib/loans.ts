import { prisma } from '@/lib/prisma';
import { computeBoundaryOption2Loan, splitBoundaryLoan } from '@/app/utils/revenueCalc';

export async function upsertBoundaryLoanForRevenue(params: {
  revenue_id: string;
  assignment_value: number; // quota
  trip_revenue: number;     // actual
  total_amount: number;     // company remitted (UI)
}) {
  const { revenue_id, assignment_value, trip_revenue, total_amount } = params;
  const calc = computeBoundaryOption2Loan({ assignment_value, trip_revenue, total_amount });
  const loanClient = (prisma as any).loan;
  if (calc.loan_amount > 0) {
    const parts = splitBoundaryLoan(Number(calc.loan_amount));
    await loanClient.upsert({
      where: { revenue_id_employee_type: { revenue_id, employee_type: 'driver' } },
      update: { amount: parts.driver },
      create: { revenue_id, employee_type: 'driver', amount: parts.driver },
    });
    await loanClient.upsert({
      where: { revenue_id_employee_type: { revenue_id, employee_type: 'conductor' } },
      update: { amount: parts.conductor },
      create: { revenue_id, employee_type: 'conductor', amount: parts.conductor },
    });
  } else {
    await loanClient.deleteMany({ where: { revenue_id } });
  }

  console.log('[LOAN][Option2] revenue:', revenue_id, 'trip_revenue:', trip_revenue, 'quota:', assignment_value, 'company:', total_amount, 'loan_amount:', calc.loan_amount);

  return calc;
}