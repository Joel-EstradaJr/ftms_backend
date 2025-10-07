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
