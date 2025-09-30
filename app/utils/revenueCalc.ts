import type { Assignment } from '@/lib/operations/assignments';

function normalizeCategoryName(name?: string): string {
  return (name || '').replace(/_/g, ' ').trim();
}

export function computeAutoAmount(categoryName: string | undefined, assignment: Assignment): number {
  const name = normalizeCategoryName(categoryName);
  const revenue = Number(assignment.trip_revenue) || 0;
  const value = Number(assignment.assignment_value) || 0;
  if (name === 'Boundary') {
    return revenue - value; // can be negative
  }
  if (name === 'Percentage') {
    return revenue * value;
  }
  // Default fallback: use trip_revenue
  return revenue;
}

export function getBoundaryLossInfo(categoryName: string | undefined, assignment: Assignment): { isLoss: boolean; lossAmount: number } {
  const name = normalizeCategoryName(categoryName);
  if (name !== 'Boundary') return { isLoss: false, lossAmount: 0 };
  const auto = computeAutoAmount(categoryName, assignment);
  if (auto < 0) return { isLoss: true, lossAmount: Math.abs(auto) };
  return { isLoss: false, lossAmount: 0 };
}

export function formatPeso(n: number): string {
  return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Option 2 loan calculation for Boundary category
// Inputs:
//  - trip_revenue: actual collected revenue
//  - assignment_value: quota / expected revenue
//  - total_amount: company remitted amount (editable in UI)
// Derived:
//  - driver_salary = trip_revenue - total_amount
//  - loan_amount = max(0, (assignment_value - trip_revenue) - driver_salary)
// Returns company_revenue (total_amount), driver_salary, loan_amount
export function computeBoundaryOption2Loan(args: {
  trip_revenue: number;
  assignment_value: number;
  total_amount: number;
}): { company_revenue: number; driver_salary: number; loan_amount: number } {
  const trip_revenue = Number(args.trip_revenue) || 0;
  const assignment_value = Number(args.assignment_value) || 0;
  const total_amount = Number(args.total_amount) || 0;
  const driver_salary = trip_revenue - total_amount;
  const shortfall = assignment_value - trip_revenue;
  const rawLoan = shortfall - driver_salary;
  const loan_amount = Math.max(0, rawLoan);
  return { company_revenue: total_amount, driver_salary, loan_amount };
}

// Requirement: Shortage (Loan) for Boundary only
// Formula: (assignment_value - trip_revenue) - (trip_revenue - total_amount)
export function computeBoundaryShortage(args: {
  trip_revenue: number;
  assignment_value: number;
  total_amount: number;
}): number {
  const trip_revenue = Number(args.trip_revenue) || 0;
  const assignment_value = Number(args.assignment_value) || 0;
  const total_amount = Number(args.total_amount) || 0;
  return (assignment_value - trip_revenue) - (trip_revenue - total_amount);
}

// Split loan 50/50 between driver and conductor (non-negative values only)
export function splitBoundaryLoan(totalLoan: number): { driver: number; conductor: number } {
  const amt = Math.max(0, Number(totalLoan) || 0);
  // If odd cents occur, give remainder centavo to driver
  const half = Math.floor(amt * 50_00) / 100_00 / 2; // keep precision, but JS can't do decimals well
  const driver = Number((amt / 2).toFixed(2));
  const conductor = Number((amt - driver).toFixed(2));
  return { driver, conductor };
}

// Date validation helpers
export function isValidCollectionDateForAdd(collectionISO: string | Date, now = new Date()): boolean {
  const d = new Date(collectionISO);
  if (Number.isNaN(d.getTime())) return false;
  if (d > now) return false; // no future dates
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return d >= threeMonthsAgo;
}

export function isValidCollectionDateForEdit(collectionISO: string | Date, recordCreatedAt: string | Date, now = new Date()): boolean {
  const d = new Date(collectionISO);
  const created = new Date(recordCreatedAt);
  if (Number.isNaN(d.getTime()) || Number.isNaN(created.getTime())) return false;
  if (d > now) return false;
  const threeMonthsBeforeCreated = new Date(created);
  threeMonthsBeforeCreated.setMonth(threeMonthsBeforeCreated.getMonth() - 3);
  return d >= threeMonthsBeforeCreated;
}

// Amount validators
export function validateTotalAmountBase(n: unknown): n is number {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  return typeof v === 'number' && !Number.isNaN(v) && v >= 1;
}

export function validateAmountAgainstTrip(categoryName: string | undefined, amount: number, trip_revenue?: number): boolean {
  const name = normalizeCategoryName(categoryName);
  if (name === 'Boundary' || name === 'Percentage' || name === 'Bus Rental') {
    const cap = Number(trip_revenue) || 0;
    return amount >= 1 && amount <= cap;
  }
  return validateTotalAmountBase(amount);
}
