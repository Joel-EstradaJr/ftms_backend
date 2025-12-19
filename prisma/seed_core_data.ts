/**
 * Core Data Seeder for Finance Management System
 * 
 * This file seeds essential reference data including:
 * - Account Types (Assets, Liabilities, Equity, Revenue, Expenses)
 * - Chart of Accounts with auto-generated account codes
 * 
 * Account Code Generation Rules:
 * - Account Type Prefix: Assets=1, Liabilities=2, Equity=3, Revenue=4, Expenses=5
 * - Auto-increment last 3 digits by 5 (e.g., 1000, 1005, 1010)
 * - Ensures uniqueness excluding soft-deleted records
 * - Handles overflow by finding the lowest available code within the type prefix
 */

import { PrismaClient, normal_balance } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Account type configuration mapping
 * Maps account type names to their numeric prefixes and default normal balance
 */
const ACCOUNT_TYPE_CONFIG = {
  Asset: { prefix: '1', normalBalance: 'DEBIT' as normal_balance },
  Liability: { prefix: '2', normalBalance: 'CREDIT' as normal_balance },
  Equity: { prefix: '3', normalBalance: 'CREDIT' as normal_balance },
  Revenue: { prefix: '4', normalBalance: 'CREDIT' as normal_balance },
  Expense: { prefix: '5', normalBalance: 'DEBIT' as normal_balance },
};

/**
 * Chart of Accounts data organized by account type
 * Each entry includes name, optional description, and optional custom code suffix
 */
const COA_DATA: Record<string, Array<{ name: string; description?: string; customSuffix?: string }>> = {
  Asset: [
    { name: 'Cash on Hand', description: 'Physical cash held in the office' },
    { name: 'Petty Cash Fund', description: 'Small amounts for minor expenses' },
    { name: 'BDO Bank - Current Account', description: 'Primary checking account' },
    { name: 'BDO Bank - Savings Account', description: 'Savings account for reserves' },
    { name: 'Accounts Receivable - Customers', description: 'Amounts owed by customers' },
    { name: 'Accounts Receivable - Employees (Loans)', description: 'Employee loans receivable' },
    { name: 'Accounts Receivable - Others', description: 'Other receivables' },
    { name: 'Accounts Receivable - Insurance', description: 'Insurance claims receivable' },
    { name: 'Advances to Suppliers', description: 'Prepayments to suppliers' },
    { name: 'Accounts Receivable - Suppliers', description: 'Refunds or credits from suppliers' },
    { name: 'Inventory - Spare Parts/Tires', description: 'Parts and tire inventory' },
    { name: 'Prepaid Insurance', description: 'Insurance paid in advance' },
    { name: 'Buses', description: 'Fleet of buses (fixed asset)' },
    { name: 'Office Equipment', description: 'Computers, printers, etc.' },
    { name: 'Furniture & Fixtures', description: 'Office furniture' },
    { name: 'Accumulated Depreciation - Buses', description: 'Contra-asset for bus depreciation' },
    { name: 'Accumulated Depreciation - Equipment', description: 'Contra-asset for equipment depreciation' },
  ],
  Liability: [
    { name: 'Accounts Payable - Suppliers', description: 'Amounts owed to suppliers' },
    { name: 'Accounts Payable - Employees', description: 'Salaries and wages payable' },
    { name: 'Accrued Expenses Payable', description: 'Expenses incurred but not yet paid' },
    { name: 'Dividends Payable', description: 'Dividends declared but not paid' },
    { name: 'Loans Payable - Banks', description: 'Bank loans and financing' },
    { name: 'Loans Payable - Others', description: 'Other loans payable' },
    { name: 'Unearned Revenue - Rental Deposits', description: 'Advance payments for rentals' },
  ],
  Equity: [
    { name: "Owner's Capital", description: 'Owner equity investment' },
    { name: 'Retained Earnings', description: 'Accumulated profits retained in business' },
    { name: 'Current Year Profit/Loss', description: 'Net income for current period' },
  ],
  Revenue: [
    { name: 'Trip Revenue - Boundary', description: 'Fixed daily rental from drivers' },
    { name: 'Trip Revenue - Percentage', description: 'Percentage-based trip revenue' },
    { name: 'Rental Revenue', description: 'Bus rental income' },
    { name: 'Advertising Revenue', description: 'Income from bus advertising' },
    { name: 'Asset Sale Gain', description: 'Gain on sale of assets' },
    { name: 'Loan Interest Income', description: 'Interest from employee loans' },
    { name: 'Interest Income', description: 'Bank interest and other interest' },
    { name: 'Penalty Income', description: 'Late payment penalties collected' },
    { name: 'Donation Income', description: 'Donations received' },
    { name: 'Insurance Recovery', description: 'Insurance claim proceeds' },
    { name: 'Sales Discounts', description: 'Discounts given to customers (contra-revenue)' },
    { name: 'Miscellaneous Income', description: 'Other income' },
  ],
  Expense: [
    { name: 'Fuel Expense', description: 'Diesel and other fuel costs' },
    { name: 'Toll Expense', description: 'Highway and bridge tolls' },
    { name: 'Parking Expense', description: 'Parking fees' },
    { name: 'Driver/Conductor Allowance', description: 'Daily allowances for staff' },
    { name: 'Driver - Conductor Boundary Share Expense', description: 'Driver share under boundary system' },
    { name: 'Driver-Conductor Percentage Expense', description: 'Driver share under percentage system' },
    { name: 'Wage Adjustment Expense', description: 'Wage adjustments and corrections' },
    { name: 'Violation/Penalty Expense', description: 'Traffic violations and fines' },
    { name: 'Terminal Fees', description: 'Bus terminal and station fees' },
    { name: 'Maintenance & Repairs', description: 'Vehicle maintenance and repairs' },
    { name: 'Salaries & Wages', description: 'Employee salaries and wages' },
    { name: 'Office Supplies', description: 'Stationery and office supplies' },
    { name: 'Utilities Expense', description: 'Electricity, water, etc.' },
    { name: 'Insurance Expense', description: 'Vehicle and business insurance' },
    { name: 'Internet Subscription', description: 'Internet service costs' },
    { name: 'Professional Fees', description: 'Accounting, legal, consulting fees' },
    { name: 'Rent Expense', description: 'Office or garage rent' },
    { name: 'Permits & Licenses', description: 'Business permits and vehicle registrations' },
    { name: 'Bad Debt Expense', description: 'Uncollectible accounts written off' },
    { name: 'Miscellaneous Expense', description: 'Other expenses' },
    { name: 'Purchase Expense - Inventory', description: 'Cost of parts and supplies purchased' },
    { name: 'Depreciation Expense', description: 'Depreciation of fixed assets' },
    { name: 'Asset Loss/Write-off', description: 'Loss on disposal or write-off of assets' },
    { name: 'Bank Charges', description: 'Bank fees and charges' },
    { name: 'Interest Expense', description: 'Interest on loans and financing' },
  ],
};

/**
 * Generates the next available account code for a given account type
 * 
 * Algorithm:
 * 1. Query existing non-deleted codes with the same prefix
 * 2. Extract numeric suffixes and find the maximum
 * 3. Increment by 5 (default step)
 * 4. If overflow (>999) or conflict, find lowest available code
 * 
 * @param accountTypePrefix - The account type prefix (1-5)
 * @param customSuffix - Optional custom 3-digit suffix
 * @returns Generated account code (e.g., "1000", "2005")
 */
async function generateAccountCode(
  accountTypePrefix: string,
  customSuffix?: string
): Promise<string> {
  if (customSuffix) {
    const customCode = `${accountTypePrefix}${customSuffix.padStart(3, '0')}`;
    // Check if custom code is available
    const existing = await prisma.chart_of_account.findFirst({
      where: { account_code: customCode, is_deleted: false },
    });
    if (!existing) return customCode;
    // If custom code conflicts, fall through to auto-generation
  }

  // Get all existing codes with this prefix (excluding soft-deleted)
  const existingCodes = await prisma.chart_of_account.findMany({
    where: {
      account_code: { startsWith: accountTypePrefix },
      is_deleted: false,
    },
    select: { account_code: true },
    orderBy: { account_code: 'asc' },
  });

  // Extract numeric suffixes
  const suffixes = existingCodes
    .map((c) => parseInt(c.account_code.slice(1), 10))
    .filter((n) => !isNaN(n));

  if (suffixes.length === 0) {
    // First account of this type: start at X000
    return `${accountTypePrefix}000`;
  }

  // Find the maximum suffix
  const maxSuffix = Math.max(...suffixes);

  // Try incrementing by 5
  let nextSuffix = maxSuffix + 5;

  // Check for overflow (suffix must be ≤ 999)
  if (nextSuffix > 999) {
    // Find the lowest available code within range
    nextSuffix = findLowestAvailableSuffix(suffixes);
  }

  // Ensure uniqueness
  const proposedCode = `${accountTypePrefix}${nextSuffix.toString().padStart(3, '0')}`;
  const conflict = await prisma.chart_of_account.findFirst({
    where: { account_code: proposedCode, is_deleted: false },
  });

  if (conflict) {
    // Should rarely happen, but find next available
    nextSuffix = findLowestAvailableSuffix(suffixes);
  }

  return `${accountTypePrefix}${nextSuffix.toString().padStart(3, '0')}`;
}

/**
 * Finds the lowest available suffix in the range [0, 999]
 * that is not already used
 * 
 * @param usedSuffixes - Array of already used numeric suffixes
 * @returns The lowest available suffix
 */
function findLowestAvailableSuffix(usedSuffixes: number[]): number {
  const sortedSuffixes = [...new Set(usedSuffixes)].sort((a, b) => a - b);
  
  for (let i = 0; i <= 999; i += 5) {
    if (!sortedSuffixes.includes(i)) {
      return i;
    }
  }

  // If all multiples of 5 are taken, find any available number
  for (let i = 0; i <= 999; i++) {
    if (!sortedSuffixes.includes(i)) {
      return i;
    }
  }

  // Should never reach here unless 1000 codes exist
  throw new Error('Account code range exhausted for this account type');
}

/**
 * Seeds account types into the database
 * Skips creation if account type already exists
 */
async function seedAccountTypes() {
  console.log('🌱 Seeding Account Types...');

  for (const [name, config] of Object.entries(ACCOUNT_TYPE_CONFIG)) {
    // Check if account type exists by name OR code
    const existing = await prisma.account_type.findFirst({
      where: { 
        OR: [
          { name, is_deleted: false },
          { code: config.prefix, is_deleted: false }
        ]
      },
    });

    if (existing) {
      console.log(`  ⏭️  Account Type "${name}" already exists (ID: ${existing.id}, Code: ${existing.code})`);
      continue;
    }

    const accountType = await prisma.account_type.create({
      data: {
        code: config.prefix,
        name,
        description: `${name} account type`,
        created_by: 'system',
        updated_by: 'system',
      },
    });

    console.log(`  ✅ Created Account Type: ${name} (ID: ${accountType.id}, Code: ${config.prefix})`);
  }

  console.log('');
}

/**
 * Seeds Chart of Accounts with auto-generated account codes
 * 
 * Process:
 * 1. Iterate through each account type
 * 2. For each COA entry, generate unique account code
 * 3. Skip if account already exists (by name and type)
 * 4. Create new COA record with proper audit fields
 */
async function seedChartOfAccounts() {
  console.log('🌱 Seeding Chart of Accounts...');

  for (const [accountTypeName, accounts] of Object.entries(COA_DATA)) {
    console.log(`\n  📊 ${accountTypeName}:`);

    // Get account type ID and config
    const accountType = await prisma.account_type.findFirst({
      where: { name: accountTypeName, is_deleted: false },
    });

    if (!accountType) {
      console.error(`  ❌ Account Type "${accountTypeName}" not found. Skipping...`);
      continue;
    }

    const config = ACCOUNT_TYPE_CONFIG[accountTypeName as keyof typeof ACCOUNT_TYPE_CONFIG];

    // Seed each account
    for (const account of accounts) {
      // Check if account already exists
      const existing = await prisma.chart_of_account.findFirst({
        where: {
          account_name: account.name,
          account_type_id: accountType.id,
          is_deleted: false,
        },
      });

      if (existing) {
        console.log(`    ⏭️  "${account.name}" already exists (Code: ${existing.account_code})`);
        continue;
      }

      // Generate account code
      const accountCode = await generateAccountCode(config.prefix, account.customSuffix);

      // Create chart of account record
      const coa = await prisma.chart_of_account.create({
        data: {
          account_code: accountCode,
          account_name: account.name,
          account_type_id: accountType.id,
          normal_balance: config.normalBalance,
          description: account.description || null,
          created_by: 'system',
          updated_by: 'system',
        },
      });

      console.log(`    ✅ ${accountCode} - ${coa.account_name}`);
    }
  }

  console.log('\n');
}

/**
 * Main seeder function
 * Executes all seeding operations in sequence
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Finance Management System - Core Data Seeder            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await seedAccountTypes();
    await seedChartOfAccounts();

    console.log('✨ Seeding completed successfully!\n');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

/**
 * Execute seeder and handle cleanup
 */
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
