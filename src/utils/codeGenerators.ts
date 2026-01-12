/**
 * Code Generator Utilities for Other Revenue Module
 * Generates unique codes for revenue, receivable, and payment records
 * Uses count-based sequence generation (no separate sequence table needed)
 */

import { prisma } from '../config/database';

/**
 * Generate Other Revenue Code: REV-OTH-{YYYYMM}-{SEQ}
 * Example: REV-OTH-202601-0001
 */
export async function generateOtherRevenueCode(date?: Date): Promise<string> {
  const targetDate = date || new Date();
  const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
  const prefix = `REV-OTH-${yearMonth}`;
  
  // Count existing records with this prefix
  const count = await prisma.revenue.count({
    where: {
      code: { startsWith: prefix }
    }
  });
  
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Generate Receivable Code: RCV-{YYYYMM}-{SEQ}
 * Example: RCV-202601-0001
 */
export async function generateReceivableCode(date?: Date): Promise<string> {
  const targetDate = date || new Date();
  const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
  const prefix = `RCV-${yearMonth}`;
  
  // Count existing records with this prefix
  const count = await prisma.receivable.count({
    where: {
      code: { startsWith: prefix }
    }
  });
  
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Generate Payment Revenue Code: REV-PAY-{YYYYMM}-{SEQ}
 * For revenue records created from installment payments
 * Example: REV-PAY-202601-0001
 */
export async function generatePaymentRevenueCode(date?: Date): Promise<string> {
  const targetDate = date || new Date();
  const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
  const prefix = `REV-PAY-${yearMonth}`;
  
  // Count existing records with this prefix
  const count = await prisma.revenue.count({
    where: {
      code: { startsWith: prefix }
    }
  });
  
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Generate codes within a transaction context
 * Use these when you need to generate codes as part of a larger transaction
 */
export const transactionalCodeGenerators = {
  async generateOtherRevenueCode(tx: any, date?: Date): Promise<string> {
    const targetDate = date || new Date();
    const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
    const prefix = `REV-OTH-${yearMonth}`;
    
    // Count existing records with this prefix within the transaction
    const count = await tx.revenue.count({
      where: {
        code: { startsWith: prefix }
      }
    });
    
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  },

  async generateReceivableCode(tx: any, date?: Date): Promise<string> {
    const targetDate = date || new Date();
    const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
    const prefix = `RCV-${yearMonth}`;
    
    // Count existing records with this prefix within the transaction
    const count = await tx.receivable.count({
      where: {
        code: { startsWith: prefix }
      }
    });
    
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  },

  async generatePaymentRevenueCode(tx: any, date?: Date): Promise<string> {
    const targetDate = date || new Date();
    const yearMonth = targetDate.toISOString().slice(0, 7).replace('-', '');
    const prefix = `REV-PAY-${yearMonth}`;
    
    // Count existing records with this prefix within the transaction
    const count = await tx.revenue.count({
      where: {
        code: { startsWith: prefix }
      }
    });
    
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  },
};

