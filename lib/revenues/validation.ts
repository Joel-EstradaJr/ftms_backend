// Revenue Validation Helpers
import { prisma } from '@/lib/prisma';
import type { RevenueFormData } from '@/app/types/revenue';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate revenue source exists and is active
 */
export async function validateRevenueSource(sourceId: number): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    const source = await prisma.revenueSource.findUnique({
      where: { id: sourceId },
    });
    
    if (!source) {
      errors.push('Revenue source not found');
    } else if (!source.isActive) {
      errors.push('Revenue source is inactive');
    }
  } catch (error) {
    errors.push('Failed to validate revenue source');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate payment method exists and is active
 */
export async function validatePaymentMethod(paymentMethodId: number): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    const method = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    
    if (!method) {
      errors.push('Payment method not found');
    } else if (!method.isActive) {
      errors.push('Payment method is inactive');
    }
  } catch (error) {
    errors.push('Failed to validate payment method');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate bus trip exists and amount matches trip revenue
 */
export async function validateBusTripRevenue(
  busTripCacheId: number,
  amount: number
): Promise<ValidationResult & { busTrip?: any }> {
  const errors: string[] = [];
  let busTrip;
  
  try {
    busTrip = await prisma.busTripCache.findUnique({
      where: { id: busTripCacheId },
    });
    
    if (!busTrip) {
      errors.push('Bus trip not found');
    } else {
      const tripRevenue = parseFloat(busTrip.tripRevenue.toString());
      if (Math.abs(amount - tripRevenue) > 0.01) {
        errors.push(`Amount (${amount}) must match bus trip revenue (${tripRevenue})`);
      }
    }
  } catch (error) {
    errors.push('Failed to validate bus trip');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    busTrip,
  };
}

/**
 * Validate loan payment exists and is not already linked
 */
export async function validateLoanPayment(
  loanPaymentId: number,
  excludeRevenueId?: number
): Promise<ValidationResult & { loanPayment?: any }> {
  const errors: string[] = [];
  let loanPayment;
  
  try {
    loanPayment = await prisma.loanPayment.findUnique({
      where: { id: loanPaymentId },
      include: {
        revenue: true,
      },
    });
    
    if (!loanPayment) {
      errors.push('Loan payment not found');
    } else if (loanPayment.revenue && loanPayment.revenue.id !== excludeRevenueId) {
      errors.push('Loan payment is already linked to another revenue record');
    }
  } catch (error) {
    errors.push('Failed to validate loan payment');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    loanPayment,
  };
}

/**
 * Validate accounts receivable fields
 */
export function validateAccountsReceivable(data: RevenueFormData): ValidationResult {
  const errors: string[] = [];
  
  if (data.isAccountsReceivable) {
    if (!data.arDueDate) {
      errors.push('AR due date is required when accounts receivable is enabled');
    } else {
      const dueDate = new Date(data.arDueDate);
      const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
      
      if (dueDate <= transactionDate) {
        errors.push('AR due date must be after transaction date');
      }
    }
    
    if (!data.arStatus) {
      errors.push('AR status is required when accounts receivable is enabled');
    } else if (!['PENDING', 'PARTIAL', 'PAID'].includes(data.arStatus)) {
      errors.push('Invalid AR status');
    }
    
    if (data.arStatus === 'PAID' && !data.arPaidDate) {
      errors.push('AR paid date is required when status is PAID');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate installment schedule fields
 */
export function validateInstallmentSchedule(data: RevenueFormData): ValidationResult {
  const errors: string[] = [];
  
  if (data.isInstallment) {
    if (!data.installmentScheduleId && !data.installmentSchedule) {
      errors.push('Installment schedule is required when installment is enabled');
    }
    
    if (data.installmentSchedule) {
      const schedule = data.installmentSchedule;
      
      if (!schedule.numberOfPayments || schedule.numberOfPayments < 2) {
        errors.push('Number of payments must be at least 2');
      }
      
      if (!schedule.paymentAmount || schedule.paymentAmount <= 0) {
        errors.push('Payment amount must be greater than 0');
      }
      
      if (!schedule.frequency) {
        errors.push('Frequency is required');
      }
      
      if (!schedule.startDate) {
        errors.push('Start date is required');
      } else {
        const startDate = new Date(schedule.startDate);
        const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
        
        if (startDate < transactionDate) {
          errors.push('Installment start date cannot be before transaction date');
        }
      }
      
      // Validate total matches
      const totalInstallmentAmount = schedule.numberOfPayments * schedule.paymentAmount;
      if (Math.abs(totalInstallmentAmount - data.amount) > 0.01) {
        errors.push(`Total installment amount (${totalInstallmentAmount}) must match revenue amount (${data.amount})`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate external reference fields
 */
export function validateExternalReference(data: RevenueFormData): ValidationResult {
  const errors: string[] = [];
  
  if (data.externalRefType) {
    const validTypes = ['RENTAL', 'DISPOSAL', 'FORFEITED_DEPOSIT', 'LOAN_REPAYMENT', 'RENTER_DAMAGE', 'BUS_TRIP'];
    
    if (!validTypes.includes(data.externalRefType)) {
      errors.push('Invalid external reference type');
    }
    
    // Some types require external ref ID
    if (['RENTAL', 'DISPOSAL', 'FORFEITED_DEPOSIT', 'RENTER_DAMAGE'].includes(data.externalRefType)) {
      if (!data.externalRefId) {
        errors.push(`External reference ID is required for ${data.externalRefType}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive revenue validation
 */
export async function validateRevenueData(data: RevenueFormData, excludeRevenueId?: number): Promise<ValidationResult> {
  const allErrors: string[] = [];
  
  // Required fields
  if (!data.sourceId) allErrors.push('Source is required');
  if (!data.description || data.description.trim().length < 5) {
    allErrors.push('Description must be at least 5 characters');
  }
  if (!data.amount || data.amount <= 0) allErrors.push('Amount must be greater than 0');
  if (!data.paymentMethodId) allErrors.push('Payment method is required');
  if (!data.createdBy) allErrors.push('Created by is required');
  
  // Validate source
  if (data.sourceId) {
    const sourceValidation = await validateRevenueSource(data.sourceId);
    allErrors.push(...sourceValidation.errors);
  }
  
  // Validate payment method
  if (data.paymentMethodId) {
    const methodValidation = await validatePaymentMethod(data.paymentMethodId);
    allErrors.push(...methodValidation.errors);
  }
  
  // Validate bus trip if provided
  if (data.busTripCacheId) {
    const busTripValidation = await validateBusTripRevenue(data.busTripCacheId, data.amount);
    allErrors.push(...busTripValidation.errors);
  }
  
  // Validate loan payment if provided
  if (data.loanPaymentId) {
    const loanPaymentValidation = await validateLoanPayment(data.loanPaymentId, excludeRevenueId);
    allErrors.push(...loanPaymentValidation.errors);
  }
  
  // Validate AR fields
  const arValidation = validateAccountsReceivable(data);
  allErrors.push(...arValidation.errors);
  
  // Validate installment fields
  const installmentValidation = validateInstallmentSchedule(data);
  allErrors.push(...installmentValidation.errors);
  
  // Validate external reference
  const externalRefValidation = validateExternalReference(data);
  allErrors.push(...externalRefValidation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
