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
