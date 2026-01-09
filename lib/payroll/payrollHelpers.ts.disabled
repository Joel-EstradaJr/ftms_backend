/**
 * Payroll Calculation Helpers
 * LIB LAYER: Shared low-level helpers, reusable across layers
 * 
 * Responsibilities:
 * - Pure calculation functions
 * - Data transformation utilities
 * - No external dependencies (DB, APIs, etc.)
 * - Framework-agnostic, testable in isolation
 * 
 * Why this belongs in lib:
 * - These are reusable utility functions
 * - Can be used by services, controllers, or other layers
 * - Pure functions with no side effects
 * - Business calculations that don't depend on external state
 */

import { HREmployeeData } from '../../src/types/payroll.types';

/**
 * Calculate attendance statistics from HR attendance records
 * @param attendances - Array of attendance records from HR
 * @returns Object with present, absent, late counts and overtime hours
 */
export function calculateAttendanceStats(attendances: HREmployeeData['attendances']) {
  const present = attendances.filter(a => a.status === 'Present').length;
  const absent = attendances.filter(a => a.status === 'Absent').length;
  const late = attendances.filter(a => a.status === 'Late').length;
  
  // Calculate total overtime hours
  const overtimeHours = attendances
    .filter(a => a.status === 'Overtime')
    .reduce((sum, a) => sum + (a.hours || 0), 0);

  return {
    present_count: present,
    absent_count: absent,
    late_count: late,
    overtime_hours: overtimeHours,
  };
}

/**
 * Calculate total benefits for an employee
 * @param benefits - Array of benefit records from HR
 * @returns Total benefit amount
 */
export function calculateTotalBenefits(benefits: HREmployeeData['benefits']): number {
  return benefits
    .filter(b => b.isActive)
    .reduce((sum, b) => sum + parseFloat(b.value || '0'), 0);
}

/**
 * Calculate total deductions for an employee
 * @param deductions - Array of deduction records from HR
 * @returns Total deduction amount
 */
export function calculateTotalDeductions(deductions: HREmployeeData['deductions']): number {
  return deductions
    .filter(d => d.isActive)
    .reduce((sum, d) => sum + parseFloat(d.value || '0'), 0);
}

/**
 * Calculate gross pay from basic rate and benefits
 * @param basicRate - Employee's basic salary/rate
 * @param totalBenefits - Sum of all active benefits
 * @returns Gross pay amount
 */
export function calculateGrossPay(basicRate: number, totalBenefits: number): number {
  return basicRate + totalBenefits;
}

/**
 * Calculate net pay from gross pay and deductions
 * @param grossPay - Calculated gross pay
 * @param totalDeductions - Sum of all active deductions
 * @returns Net pay amount
 */
export function calculateNetPay(grossPay: number, totalDeductions: number): number {
  return grossPay - totalDeductions;
}

/**
 * Format employee full name from HR data
 * @param employee - Employee data from HR
 * @returns Formatted full name
 */
export function formatEmployeeFullName(employee: HREmployeeData): string {
  const parts = [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix,
  ].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format payroll period code from dates
 * @param periodStart - Period start date
 * @param periodEnd - Period end date
 * @returns Formatted period code (e.g., "2024-01-01_2024-01-15")
 */
export function generatePayrollPeriodCode(periodStart: Date, periodEnd: Date): string {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return `${formatDate(periodStart)}_${formatDate(periodEnd)}`;
}

/**
 * Validate if a date range overlaps with another date range
 * @param start1 - First range start
 * @param end1 - First range end
 * @param start2 - Second range start
 * @param end2 - Second range end
 * @returns True if ranges overlap
 */
export function isDateRangeOverlapping(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Calculate number of working days in a period (excluding weekends)
 * @param periodStart - Period start date
 * @param periodEnd - Period end date
 * @returns Number of working days
 */
export function calculateWorkingDays(periodStart: Date, periodEnd: Date): number {
  let count = 0;
  const current = new Date(periodStart);
  
  while (current <= periodEnd) {
    const dayOfWeek = current.getDay();
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
