// ============================================================
// Payment Calculation Utilities
// ============================================================

import { 
  PaymentScheduleType, 
  PaymentEntry, 
  PaymentMode,
  PaymentStatus 
} from '../types/loanPaymentTypes';

/**
 * Generate payment schedule based on frequency
 */
export const generatePaymentSchedule = (
  scheduleType: PaymentScheduleType,
  startDate: string,
  duration: number,
  amount: number,
  mode: PaymentMode
): PaymentEntry[] => {
  const payments: PaymentEntry[] = [];
  const start = new Date(startDate);
  
  for (let i = 0; i < duration; i++) {
    const paymentDate = new Date(start);
    
    switch (scheduleType) {
      case PaymentScheduleType.DAILY:
        paymentDate.setDate(start.getDate() + i);
        break;
      case PaymentScheduleType.WEEKLY:
        paymentDate.setDate(start.getDate() + (i * 7));
        break;
      case PaymentScheduleType.MONTHLY:
        paymentDate.setMonth(start.getMonth() + i);
        break;
    }
    
    payments.push({
      id: `payment-${i + 1}-${Date.now()}`,
      payment_date: paymentDate.toISOString().split('T')[0],
      amount,
      mode,
      status: PaymentStatus.PENDING
    });
  }
  
  return payments;
};

/**
 * Convert percentage to peso amount
 */
export const convertPercentageToPeso = (
  percentage: number,
  principal: number
): number => {
  return (percentage / 100) * principal;
};

/**
 * Convert peso to percentage
 */
export const convertPesoToPercentage = (
  amount: number,
  principal: number
): number => {
  if (principal === 0) return 0;
  return (amount / principal) * 100;
};

/**
 * Calculate total payment in pesos
 */
export const calculateTotalPeso = (
  payments: PaymentEntry[],
  principal: number
): number => {
  return payments.reduce((total, payment) => {
    if (payment.mode === PaymentMode.PERCENTAGE) {
      return total + convertPercentageToPeso(payment.amount, principal);
    }
    return total + payment.amount;
  }, 0);
};

/**
 * Calculate total percentage
 */
export const calculateTotalPercentage = (
  payments: PaymentEntry[],
  principal: number
): number => {
  return payments.reduce((total, payment) => {
    if (payment.mode === PaymentMode.PESO) {
      return total + convertPesoToPercentage(payment.amount, principal);
    }
    return total + payment.amount;
  }, 0);
};

/**
 * Validate payment configuration
 */
export const validatePayments = (
  payments: PaymentEntry[],
  principal: number,
  currentBalance: number
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const totalPeso = calculateTotalPeso(payments, principal);
  
  if (totalPeso > currentBalance) {
    errors.push(`Total payment (₱${totalPeso.toLocaleString()}) exceeds remaining balance (₱${currentBalance.toLocaleString()})`);
  }
  
  if (payments.length === 0) {
    errors.push('At least one payment is required');
  }
  
  // Check for duplicate dates
  const dates = payments.map(p => p.payment_date);
  const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate payment dates found: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  // Check for invalid amounts
  const invalidAmounts = payments.filter(p => p.amount <= 0);
  if (invalidAmounts.length > 0) {
    errors.push('All payment amounts must be greater than zero');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};

// ============================================================
// Loan Payment Management Functions
// ============================================================

/**
 * Calculate remaining balance on a loan
 */
export function calculateRemainingBalance(
  approvedAmount: number,
  totalPaid: number = 0
): number {
  return Math.max(0, approvedAmount - totalPaid);
}

/**
 * Calculate the next payment date based on disbursement date and payment cycle
 */
export function calculateNextPaymentDate(
  disbursementDate: string,
  repaymentTerms: number,
  paymentsMade: number
): string | null {
  if (paymentsMade >= repaymentTerms) {
    return null; // Loan fully paid
  }

  const disbursed = new Date(disbursementDate);
  const nextMonth = paymentsMade + 1;
  
  const nextPayment = new Date(disbursed);
  nextPayment.setMonth(disbursed.getMonth() + nextMonth);
  
  return nextPayment.toISOString().split('T')[0];
}

/**
 * Calculate monthly payment amount
 */
export function calculateMonthlyPayment(
  approvedAmount: number,
  repaymentTerms: number,
  interestRate: number = 0,
  processingFee: number = 0
): number {
  const totalAmount = approvedAmount + processingFee;
  const monthlyInterest = interestRate / 100 / 12;
  
  if (monthlyInterest === 0) {
    return totalAmount / repaymentTerms;
  }
  
  // Using standard loan payment formula
  const monthlyPayment = 
    (totalAmount * monthlyInterest * Math.pow(1 + monthlyInterest, repaymentTerms)) /
    (Math.pow(1 + monthlyInterest, repaymentTerms) - 1);
  
  return monthlyPayment;
}

/**
 * Check if a payment is overdue
 */
export function isPaymentOverdue(nextPaymentDate: string | null): boolean {
  if (!nextPaymentDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const paymentDate = new Date(nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);
  
  return paymentDate < today;
}

/**
 * Calculate days overdue
 */
export function calculateDaysOverdue(nextPaymentDate: string | null): number {
  if (!nextPaymentDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const paymentDate = new Date(nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);
  
  if (paymentDate >= today) return 0;
  
  const diffTime = today.getTime() - paymentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Calculate payment progress percentage
 */
export function calculatePaymentProgress(
  paymentsMade: number,
  totalPayments: number
): number {
  if (totalPayments === 0) return 0;
  return Math.round((paymentsMade / totalPayments) * 100);
}

/**
 * Determine payment status category
 */
export function getPaymentStatus(
  nextPaymentDate: string | null,
  isFullyPaid: boolean
): 'completed' | 'overdue' | 'due_today' | 'due_this_week' | 'due_this_month' | 'active' {
  if (isFullyPaid) return 'completed';
  if (!nextPaymentDate) return 'active';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const paymentDate = new Date(nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);
  
  // Check if overdue
  if (paymentDate < today) return 'overdue';
  
  // Check if due today
  if (paymentDate.getTime() === today.getTime()) return 'due_today';
  
  // Check if due this week (within 7 days)
  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(today.getDate() + 7);
  if (paymentDate <= oneWeekFromNow) return 'due_this_week';
  
  // Check if due this month (within 30 days)
  const oneMonthFromNow = new Date(today);
  oneMonthFromNow.setDate(today.getDate() + 30);
  if (paymentDate <= oneMonthFromNow) return 'due_this_month';
  
  return 'active';
}

/**
 * Calculate total interest paid
 */
export function calculateTotalInterest(
  approvedAmount: number,
  repaymentTerms: number,
  interestRate: number
): number {
  if (interestRate === 0) return 0;
  
  const monthlyPayment = calculateMonthlyPayment(approvedAmount, repaymentTerms, interestRate);
  const totalPaid = monthlyPayment * repaymentTerms;
  
  return totalPaid - approvedAmount;
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(
  paymentAmount: number,
  remainingBalance: number,
  monthlyDeduction: number
): { isValid: boolean; message: string } {
  if (paymentAmount <= 0) {
    return { isValid: false, message: "Payment amount must be greater than zero" };
  }
  
  if (paymentAmount > remainingBalance) {
    return { isValid: false, message: `Payment amount cannot exceed remaining balance of ₱${remainingBalance.toFixed(2)}` };
  }
  
  return { isValid: true, message: "Valid payment amount" };
}

/**
 * Payment schedule item interface
 */
export interface PaymentScheduleItem {
  payment_number: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  status: 'paid' | 'pending' | 'overdue';
}

/**
 * Generate payment schedule
 */
export function generateLoanPaymentSchedule(
  disbursementDate: string,
  approvedAmount: number,
  repaymentTerms: number,
  interestRate: number = 0,
  processingFee: number = 0,
  paymentsMade: number = 0
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  const monthlyPayment = calculateMonthlyPayment(approvedAmount, repaymentTerms, interestRate, processingFee);
  const monthlyInterestRate = interestRate / 100 / 12;
  
  let remainingBalance = approvedAmount + processingFee;
  const disbursed = new Date(disbursementDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 1; i <= repaymentTerms; i++) {
    const dueDate = new Date(disbursed);
    dueDate.setMonth(disbursed.getMonth() + i);
    
    const interestPayment = remainingBalance * monthlyInterestRate;
    const principalPayment = monthlyPayment - interestPayment;
    
    remainingBalance -= principalPayment;
    
    // Determine status
    let status: 'paid' | 'pending' | 'overdue' = 'pending';
    if (i <= paymentsMade) {
      status = 'paid';
    } else if (dueDate < today) {
      status = 'overdue';
    }
    
    schedule.push({
      payment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      amount: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance),
      status
    });
  }
  
  return schedule;
}

/**
 * Filter payment schedule by status category
 */
export function filterPaymentsBySchedule(
  schedule: PaymentScheduleItem[],
  filter: 'missing' | 'today' | 'week' | 'month' | 'all'
): PaymentScheduleItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return schedule.filter(payment => {
    if (payment.status === 'paid') return false;
    
    const dueDate = new Date(payment.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case 'missing':
        return payment.status === 'overdue';
      
      case 'today':
        return dueDate.getTime() === today.getTime();
      
      case 'week':
        const oneWeekFromNow = new Date(today);
        oneWeekFromNow.setDate(today.getDate() + 7);
        return dueDate >= today && dueDate <= oneWeekFromNow;
      
      case 'month':
        const oneMonthFromNow = new Date(today);
        oneMonthFromNow.setDate(today.getDate() + 30);
        return dueDate >= today && dueDate <= oneMonthFromNow;
      
      case 'all':
      default:
        return payment.status === 'pending' || payment.status === 'overdue';
    }
  });
}
