/**
 * Chart of Accounts (COA) Mapping Utility
 * 
 * This module provides type-driven COA lookups for:
 * - Revenue Types → Revenue COA accounts
 * - Revenue Types → Receivable COA accounts (for installment/deferred revenue)
 * - Expense Types → Expense COA accounts
 * - Expense Types → Payable COA accounts (for unpaid expenses)
 * 
 * ACCOUNTING RULE (NON-NEGOTIABLE):
 * - Each Revenue Type has its own dedicated Accounts Receivable COA
 * - Each Expense Type has its own dedicated Accounts Payable COA
 * - NO shared or generic AR/AP accounts for transactions
 * 
 * Account Code Prefixes:
 * - 1xxx = Asset (includes Receivables: 1100-1199)
 * - 2xxx = Liability (includes Payables: 2100-2199)
 * - 3xxx = Revenue
 * - 4xxx = Expense
 */

import { prisma } from '../config/database';

// ============================================================================
// REVENUE TYPE → COA MAPPINGS
// ============================================================================

/**
 * Revenue Type Code → Revenue COA Code
 * Maps each revenue type to its corresponding revenue account
 */
export const REVENUE_TYPE_TO_REVENUE_COA: Record<string, string> = {
  // Bus Trip Revenue
  'REVT-001': '3000', // Bus Trip Revenue - Boundary → Trip Revenue - Boundary
  'REVT-002': '3005', // Bus Trip Revenue - Percentage → Trip Revenue - Percentage
  
  // Rental Revenue
  'REVT-003': '3010', // Rental Revenue → Rental Service Revenue
  
  // Other Revenue - Specific Categories
  'REVT-004': '3020', // Advertising Revenue
  'REVT-005': '3025', // Insurance Commission → Insurance Commission Income
  'REVT-006': '3030', // Terminal Fee Income
  'REVT-007': '3035', // Parking Fee Income
  'REVT-008': '3040', // Charter Add-on Revenue
  'REVT-009': '3045', // Cargo Handling Fee → Cargo Handling Fee Income
  'REVT-010': '3050', // Penalty Income → Penalty & Violation Income
  'REVT-011': '3055', // Franchise Income → Franchise & Partnership Income
  'REVT-012': '3060', // Maintenance Service Income
  'REVT-013': '3065', // Miscellaneous Income
};

/**
 * Revenue Type Code → Receivable COA Code
 * Each revenue type has its own dedicated receivable account
 * Used for installment-based revenue or deferred payments
 */
export const REVENUE_TYPE_TO_RECEIVABLE_COA: Record<string, string> = {
  // Bus Trip Revenue - Driver/Conductor Receivables
  'REVT-001': '1100', // AR - Bus Trip Boundary
  'REVT-002': '1105', // AR - Bus Trip Percentage
  
  // Rental Revenue
  'REVT-003': '1110', // AR - Rental Revenue
  
  // Other Revenue - Dedicated Receivables
  'REVT-004': '1115', // AR - Advertising Revenue
  'REVT-005': '1120', // AR - Insurance Commission
  'REVT-006': '1125', // AR - Terminal Fee Income
  'REVT-007': '1130', // AR - Parking Fee Income
  'REVT-008': '1135', // AR - Charter Add-on Revenue
  'REVT-009': '1140', // AR - Cargo Handling Fee
  'REVT-010': '1145', // AR - Penalty Income
  'REVT-011': '1150', // AR - Franchise Income
  'REVT-012': '1155', // AR - Maintenance Service Income
  'REVT-013': '1160', // AR - Miscellaneous Income
};

// ============================================================================
// EXPENSE TYPE → COA MAPPINGS
// ============================================================================

/**
 * Expense Type Code → Expense COA Code
 * Maps each expense type to its corresponding expense account
 * Based on seed_core_data.ts COA definitions
 */
export const EXPENSE_TYPE_TO_EXPENSE_COA: Record<string, string> = {
  'EXPT-001': '4000', // Operational → Fuel Expense (primary operational)
  'EXPT-002': '4115', // Personnel → Salaries & Wages
  'EXPT-003': '4200', // Bad Debt Expense
  'EXPT-004': '4205', // Office Supplies Expense
  'EXPT-005': '4210', // Utilities Expense
  'EXPT-006': '4215', // Rent Expense
  'EXPT-007': '4220', // Internet Expense
  'EXPT-008': '4225', // Professional Fees Expense
  'EXPT-009': '4230', // Insurance Expense
  'EXPT-010': '4235', // License & Permit Expense
  'EXPT-011': '4240', // Communication Expense
  'EXPT-012': '4245', // Miscellaneous Expense
};

/**
 * Expense Type Code → Payable COA Code
 * Each expense type has its own dedicated payable account
 * Used for unpaid/accrued expenses
 * Based on seed_core_data.ts COA definitions (Liability prefix 2, suffix 100-155)
 */
export const EXPENSE_TYPE_TO_PAYABLE_COA: Record<string, string> = {
  'EXPT-001': '2100', // AP - Operational Expenses
  'EXPT-002': '2105', // AP - Personnel/Salaries
  'EXPT-003': '2110', // AP - Bad Debt
  'EXPT-004': '2115', // AP - Office Supplies
  'EXPT-005': '2120', // AP - Utilities
  'EXPT-006': '2125', // AP - Rent
  'EXPT-007': '2130', // AP - Internet Subscription
  'EXPT-008': '2135', // AP - Professional Fees
  'EXPT-009': '2140', // AP - Insurance
  'EXPT-010': '2145', // AP - License & Permits
  'EXPT-011': '2150', // AP - Communication
  'EXPT-012': '2155', // AP - Miscellaneous
};

// ============================================================================
// CASH/BANK ACCOUNT MAPPINGS
// ============================================================================

/**
 * Payment method to asset account code mapping
 */
export const PAYMENT_METHOD_TO_ASSET_COA: Record<string, string> = {
  'CASH': '1000',
  'BANK_TRANSFER': '1005',
  'E_WALLET': '1010',
};

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get the Revenue COA code for a given revenue type
 * @param revenueTypeCode - The revenue type code (e.g., 'REVT-004')
 * @returns The corresponding Revenue COA code
 */
export function getRevenueCOACode(revenueTypeCode: string): string {
  return REVENUE_TYPE_TO_REVENUE_COA[revenueTypeCode] || '3065'; // Default to Miscellaneous Income
}

/**
 * Get the Receivable COA code for a given revenue type
 * Used when revenue has installments or deferred payment
 * @param revenueTypeCode - The revenue type code (e.g., 'REVT-004')
 * @returns The corresponding Receivable COA code
 */
export function getReceivableCOACode(revenueTypeCode: string): string {
  return REVENUE_TYPE_TO_RECEIVABLE_COA[revenueTypeCode] || '1160'; // Default to AR - Miscellaneous
}

/**
 * Get the Expense COA code for a given expense type
 * @param expenseTypeCode - The expense type code (e.g., 'EXPT-001')
 * @returns The corresponding Expense COA code
 */
export function getExpenseCOACode(expenseTypeCode: string): string {
  return EXPENSE_TYPE_TO_EXPENSE_COA[expenseTypeCode] || '4245'; // Default to Miscellaneous Expense
}

/**
 * Get the Payable COA code for a given expense type
 * Used when expense is unpaid/accrued
 * @param expenseTypeCode - The expense type code (e.g., 'EXPT-001')
 * @returns The corresponding Payable COA code
 */
export function getPayableCOACode(expenseTypeCode: string): string {
  return EXPENSE_TYPE_TO_PAYABLE_COA[expenseTypeCode] || '2155'; // Default to AP - Miscellaneous
}

/**
 * Get the Asset COA code for a given payment method
 * @param paymentMethod - The payment method (CASH, BANK_TRANSFER, E_WALLET)
 * @returns The corresponding Asset COA code
 */
export function getAssetCOACode(paymentMethod: string | null): string {
  const method = paymentMethod?.toUpperCase() || 'CASH';
  return PAYMENT_METHOD_TO_ASSET_COA[method] || '1000'; // Default to Cash on Hand
}

// ============================================================================
// DATABASE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get Revenue COA code by revenue type ID (database lookup)
 */
export async function getRevenueCOAByTypeId(revenueTypeId: number): Promise<string> {
  const revenueType = await prisma.revenue_type.findUnique({
    where: { id: revenueTypeId },
    select: { code: true }
  });
  
  if (!revenueType) {
    return '3065'; // Default to Miscellaneous Income
  }
  
  return getRevenueCOACode(revenueType.code);
}

/**
 * Get Receivable COA code by revenue type ID (database lookup)
 */
export async function getReceivableCOAByTypeId(revenueTypeId: number): Promise<string> {
  const revenueType = await prisma.revenue_type.findUnique({
    where: { id: revenueTypeId },
    select: { code: true }
  });
  
  if (!revenueType) {
    return '1160'; // Default to AR - Miscellaneous
  }
  
  return getReceivableCOACode(revenueType.code);
}

/**
 * Get Expense COA code by expense type ID (database lookup)
 */
export async function getExpenseCOAByTypeId(expenseTypeId: number): Promise<string> {
  const expenseType = await prisma.expense_type.findUnique({
    where: { id: expenseTypeId },
    select: { code: true }
  });
  
  if (!expenseType) {
    return '4245'; // Default to Miscellaneous Expense
  }
  
  return getExpenseCOACode(expenseType.code);
}

/**
 * Get Payable COA code by expense type ID (database lookup)
 */
export async function getPayableCOAByTypeId(expenseTypeId: number): Promise<string> {
  const expenseType = await prisma.expense_type.findUnique({
    where: { id: expenseTypeId },
    select: { code: true }
  });
  
  if (!expenseType) {
    return '2155'; // Default to AP - Miscellaneous
  }
  
  return getPayableCOACode(expenseType.code);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that a COA code exists in the database
 */
export async function validateCOAExists(accountCode: string): Promise<boolean> {
  const coa = await prisma.chart_of_account.findFirst({
    where: { account_code: accountCode, is_deleted: false }
  });
  return !!coa;
}

/**
 * Get full COA record by account code
 */
export async function getCOAByCode(accountCode: string) {
  return prisma.chart_of_account.findFirst({
    where: { account_code: accountCode, is_deleted: false },
    include: { account_type: true }
  });
}
