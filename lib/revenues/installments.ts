// lib/revenues/installments.ts
// Business logic for creating and managing installment schedules

import { prisma } from '@/lib/prisma';
import type { InstallmentStatus } from '@prisma/client';

export interface CreateInstallmentScheduleParams {
  type: 'REVENUE' | 'EXPENSE';
  totalAmount: number;
  numberOfPayments: number;
  paymentAmount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  startDate: Date;
  interestRate?: number;
  createdBy: string;
}

/**
 * Create a new installment schedule
 * 
 * @param params - Schedule parameters
 * @returns The created installment schedule
 */
export async function createInstallmentSchedule(params: CreateInstallmentScheduleParams) {
  const {
    type,
    totalAmount,
    numberOfPayments,
    paymentAmount,
    frequency,
    startDate,
    interestRate,
    createdBy,
  } = params;

  // Validate installment amount
  const validation = validateInstallmentAmount(totalAmount, paymentAmount, numberOfPayments);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Calculate end date based on frequency and number of payments
  const endDate = calculateEndDate(startDate, frequency, numberOfPayments);

  // Calculate total interest if interest rate provided
  let totalInterest = undefined;
  if (interestRate && interestRate > 0) {
    // Simple interest calculation: Principal * Rate * Time (in years)
    // Assuming monthly payments for time calculation
    const timeInYears = numberOfPayments / 12; // Approximate
    totalInterest = totalAmount * (interestRate / 100) * timeInYears;
  }

  // Create the installment schedule
  const schedule = await prisma.installmentSchedule.create({
    data: {
      type,
      totalAmount,
      numberOfPayments,
      paymentAmount,
      frequency,
      startDate,
      endDate,
      status: 'ACTIVE',
      interestRate: interestRate ?? 0,
      totalInterest,
      createdBy,
    },
  });

  return schedule;
}

/**
 * Calculate the end date of an installment schedule
 * 
 * @param startDate - Schedule start date
 * @param frequency - Payment frequency
 * @param numberOfPayments - Total number of payments
 * @returns Calculated end date
 */
export function calculateEndDate(
  startDate: Date,
  frequency: string,
  numberOfPayments: number
): Date {
  // Frequency to days mapping
  const frequencyToDays: Record<string, number> = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 90,
    SEMI_ANNUAL: 180,
    ANNUAL: 365,
  };

  const daysInterval = frequencyToDays[frequency] || 30; // Default to monthly
  const totalDays = daysInterval * numberOfPayments;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays);

  return endDate;
}

/**
 * Generate individual installment payment records for a schedule
 * This creates the actual installment entries that track individual payments
 * 
 * @param scheduleId - ID of the installment schedule
 * @returns Array of created installment records
 */
export async function generateInstallmentRecords(scheduleId: number) {
  // Fetch the schedule
  const schedule = await prisma.installmentSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw new Error('Installment schedule not found');
  }

  // Frequency to days mapping (same as calculateEndDate)
  const frequencyToDays: Record<string, number> = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 90,
    SEMI_ANNUAL: 180,
    ANNUAL: 365,
  };

  const daysInterval = frequencyToDays[schedule.frequency] || 30;

  const installments = [];

  // Generate installment records
  for (let i = 0; i < schedule.numberOfPayments; i++) {
    const dueDate = new Date(schedule.startDate);
    dueDate.setDate(dueDate.getDate() + daysInterval * i);

    const installment = await prisma.installment.create({
      data: {
        installmentScheduleId: schedule.id,
        installmentNumber: i + 1,
        dueDate,
        amount: schedule.paymentAmount,
        status: 'PENDING',
        outstandingBalance: schedule.paymentAmount,
      },
    });

    installments.push(installment);
  }

  return installments;
}

/**
 * Validate that payment amount × number of payments equals total amount
 * 
 * @param totalAmount - Total amount to be paid
 * @param paymentAmount - Amount per payment
 * @param numberOfPayments - Number of payments
 * @returns Validation result
 */
export function validateInstallmentAmount(
  totalAmount: number,
  paymentAmount: number,
  numberOfPayments: number
): { isValid: boolean; error?: string } {
  const calculatedTotal = paymentAmount * numberOfPayments;

  // Allow small floating point differences (0.01)
  if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
    return {
      isValid: false,
      error: `Payment amount mismatch: ${paymentAmount} × ${numberOfPayments} = ${calculatedTotal}, but total amount is ${totalAmount}`,
    };
  }

  return { isValid: true };
}

/**
 * Update installment schedule status
 * 
 * @param scheduleId - ID of the schedule
 * @param status - New status
 * @returns Updated schedule
 */
export async function updateInstallmentScheduleStatus(
  scheduleId: number,
  status: InstallmentStatus
) {
  return prisma.installmentSchedule.update({
    where: { id: scheduleId },
    data: { status },
  });
}

/**
 * Get installment schedule with all installments
 * 
 * @param scheduleId - ID of the schedule
 * @returns Schedule with installments
 */
export async function getInstallmentScheduleWithPayments(scheduleId: number) {
  return prisma.installmentSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      installments: {
        orderBy: { installmentNumber: 'asc' },
      },
      revenues: true,
      expenses: true,
    },
  });
}

/**
 * Record an installment payment
 * 
 * @param installmentId - ID of the installment
 * @param paidAmount - Amount paid
 * @param paidDate - Payment date
 * @param paymentMethod - Payment method used
 * @returns Updated installment
 */
export async function recordInstallmentPayment(
  installmentId: number,
  paidAmount: number,
  paidDate: Date,
  paymentMethod?: string
) {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
  });

  if (!installment) {
    throw new Error('Installment not found');
  }

  const totalPaid = parseFloat(installment.paidAmount.toString()) + paidAmount;
  const outstanding = parseFloat(installment.amount.toString()) - totalPaid;

  let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';
  if (totalPaid >= parseFloat(installment.amount.toString())) {
    status = 'PAID';
  } else if (totalPaid > 0) {
    status = 'PARTIAL';
  } else if (new Date() > installment.dueDate) {
    status = 'OVERDUE';
  }

  return prisma.installment.update({
    where: { id: installmentId },
    data: {
      paidAmount: totalPaid,
      outstandingBalance: Math.max(0, outstanding),
      status,
      paidDate: status === 'PAID' ? paidDate : installment.paidDate,
      paymentMethod,
    },
  });
}
