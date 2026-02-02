/**
 * Core Data Seeder for Finance Management System
 * 
 * This file seeds essential reference data including:
 * - Account Types (Asset, Liability, Revenue, Expense)
 * - Chart of Accounts with auto-generated account codes
 * 
 * Account Code Generation Rules:
 * - Account Type Prefix: Asset=1, Liability=2, Revenue=3, Expense=4
 * - Auto-increment last 3 digits by 5 (e.g., 1000, 1005, 1010)
 * - Ensures uniqueness excluding soft-deleted records
 * - Handles overflow by finding the lowest available code within the type prefix
 */

import { PrismaClient, normal_balance, receivable_frequency } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Account type configuration mapping
 * Maps account type names to their numeric prefixes and default normal balance
 */
const ACCOUNT_TYPE_CONFIG = {
  Asset: { prefix: '1', normalBalance: 'DEBIT' as normal_balance },
  Liability: { prefix: '2', normalBalance: 'CREDIT' as normal_balance },
  Revenue: { prefix: '3', normalBalance: 'CREDIT' as normal_balance },
  Expense: { prefix: '4', normalBalance: 'DEBIT' as normal_balance },
};

/**
 * Revenue Type seed data - COMPREHENSIVE SET
 * Covers bus trip, rental, and specific other revenue categories
 */
const REVENUE_TYPE_DATA = [
  // Bus Trip Revenue
  {
    code: 'REVT-001',
    name: 'Bus Trip Revenue - Boundary',
    description: 'Fixed daily rental income from drivers under the boundary system arrangement'
  },
  {
    code: 'REVT-002',
    name: 'Bus Trip Revenue - Percentage',
    description: 'Commission-based income calculated as a percentage of trip earnings'
  },
  // Rental Revenue
  {
    code: 'REVT-003',
    name: 'Rental Revenue',
    description: 'Rental service income from bus unit rentals'
  },
  // Other Revenue - Specific Categories (10 types)
  {
    code: 'REVT-004',
    name: 'Advertising Revenue',
    description: 'Income from bus wrap advertising, terminal signage, and promotional placements'
  },
  {
    code: 'REVT-005',
    name: 'Insurance Commission',
    description: 'Commission income from passenger insurance partnerships and travel protection fees'
  },
  {
    code: 'REVT-006',
    name: 'Terminal Fee Income',
    description: 'Revenue from terminal operations, boarding fees, and station usage charges'
  },
  {
    code: 'REVT-007',
    name: 'Parking Fee Income',
    description: 'Parking fees collected from vehicles at terminals and company premises'
  },
  {
    code: 'REVT-008',
    name: 'Charter Add-on Revenue',
    description: 'Additional services on charter trips such as tour guide, meals, and special accommodations'
  },
  {
    code: 'REVT-009',
    name: 'Cargo Handling Fee',
    description: 'Freight handling, baggage fees, and cargo transportation income'
  },
  {
    code: 'REVT-010',
    name: 'Penalty Income',
    description: 'Late fees, violation penalties, cancellation charges, and contractual penalties'
  },
  {
    code: 'REVT-011',
    name: 'Franchise Income',
    description: 'Royalties and fees from franchise agreements and route partnerships'
  },
  {
    code: 'REVT-012',
    name: 'Maintenance Service Income',
    description: 'Income from providing maintenance services to third-party vehicles'
  },
  {
    code: 'REVT-013',
    name: 'Miscellaneous Income',
    description: 'Other minor income sources not classified elsewhere'
  },
];

/**
 * Expense Type seed data - MINIMAL SET
 */
const EXPENSE_TYPE_DATA = [
  {
    code: 'EXPT-001',
    name: 'Operational',
    description: 'Day-to-day operational expenses (fuel, toll, parking, terminal fees)'
  },
  {
    code: 'EXPT-002',
    name: 'Personnel',
    description: 'Salaries, wages, allowances, and other employee-related expenses'
  },
  // ADMINISTRATIVE & OTHER EXPENSES (10 types)
  {
    code: 'EXPT-003',
    name: 'Bad Debt Expense',
    description: 'Uncollectible accounts written off'
  },
  {
    code: 'EXPT-004',
    name: 'Office Supplies',
    description: 'Stationery and office supplies'
  },
  {
    code: 'EXPT-005',
    name: 'Utilities Expense',
    description: 'Electricity, water, etc.'
  },
  {
    code: 'EXPT-006',
    name: 'Rent Expense',
    description: 'Office or garage rent'
  },
  {
    code: 'EXPT-007',
    name: 'Internet Subscription',
    description: 'Internet service costs'
  },
  {
    code: 'EXPT-008',
    name: 'Professional Fees',
    description: 'Legal, accounting, consulting fees'
  },
  {
    code: 'EXPT-009',
    name: 'Insurance Expense',
    description: 'Insurance premiums'
  },
  {
    code: 'EXPT-010',
    name: 'License & Permits',
    description: 'Business licenses and permits'
  },
  {
    code: 'EXPT-011',
    name: 'Communication Expense',
    description: 'Phone and communication costs'
  },
  {
    code: 'EXPT-012',
    name: 'Miscellaneous Expense',
    description: 'Other administrative expenses'
  },
];

/**
 * COMPREHENSIVE Chart of Accounts
 * 
 * ACCOUNTING RULE (NON-NEGOTIABLE):
 * - Each Revenue Type has its own dedicated Accounts Receivable COA (1100-1199)
 * - Each Expense Type has its own dedicated Accounts Payable COA (2100-2199)
 * - NO shared or generic AR/AP accounts for transactions
 * 
 * This ensures:
 * - Clear audit trail for each revenue/expense category
 * - Accurate financial reporting per category
 * - Compliance with accounting best practices
 */
const COA_DATA: Record<string, Array<{ name: string; description?: string; customSuffix?: string }>> = {
  Asset: [
    // CASH & BANK ACCOUNTS (1000-1099)
    { name: 'Cash on Hand', description: 'Physical cash held in the office', customSuffix: '000' },
    { name: 'Bank Account', description: 'Primary checking account', customSuffix: '005' },
    { name: 'E-Wallet', description: 'Digital wallet for online transactions', customSuffix: '010' },

    // DEDICATED RECEIVABLES PER REVENUE TYPE (1100-1199)
    // Each revenue type has its own AR account for installment/deferred payments
    { name: 'AR - Bus Trip Boundary', description: 'Receivables from Bus Trip Revenue - Boundary (REVT-001)', customSuffix: '100' },
    { name: 'AR - Bus Trip Percentage', description: 'Receivables from Bus Trip Revenue - Percentage (REVT-002)', customSuffix: '105' },
    { name: 'AR - Rental Revenue', description: 'Receivables from Rental Revenue (REVT-003)', customSuffix: '110' },
    { name: 'AR - Advertising Revenue', description: 'Receivables from Advertising Revenue (REVT-004)', customSuffix: '115' },
    { name: 'AR - Insurance Commission', description: 'Receivables from Insurance Commission (REVT-005)', customSuffix: '120' },
    { name: 'AR - Terminal Fee Income', description: 'Receivables from Terminal Fee Income (REVT-006)', customSuffix: '125' },
    { name: 'AR - Parking Fee Income', description: 'Receivables from Parking Fee Income (REVT-007)', customSuffix: '130' },
    { name: 'AR - Charter Add-on Revenue', description: 'Receivables from Charter Add-on Revenue (REVT-008)', customSuffix: '135' },
    { name: 'AR - Cargo Handling Fee', description: 'Receivables from Cargo Handling Fee (REVT-009)', customSuffix: '140' },
    { name: 'AR - Penalty Income', description: 'Receivables from Penalty Income (REVT-010)', customSuffix: '145' },
    { name: 'AR - Franchise Income', description: 'Receivables from Franchise Income (REVT-011)', customSuffix: '150' },
    { name: 'AR - Maintenance Service Income', description: 'Receivables from Maintenance Service Income (REVT-012)', customSuffix: '155' },
    { name: 'AR - Miscellaneous Income', description: 'Receivables from Miscellaneous Income (REVT-013)', customSuffix: '160' },
  ],

  Liability: [
    // GENERAL PAYABLES (2000-2099) - Legacy/General Use
    { name: 'Accounts Payable - General', description: 'General amounts owed to others', customSuffix: '000' },

    // DEDICATED PAYABLES PER EXPENSE TYPE (2100-2199)
    // Each expense type has its own AP account for unpaid/accrued expenses
    { name: 'AP - Operational Expenses', description: 'Payables for Operational Expenses (EXPT-001)', customSuffix: '100' },
    { name: 'AP - Personnel/Salaries', description: 'Payables for Personnel Expenses (EXPT-002)', customSuffix: '105' },
    { name: 'AP - Bad Debt', description: 'Payables for Bad Debt adjustments (EXPT-003)', customSuffix: '110' },
    { name: 'AP - Office Supplies', description: 'Payables for Office Supplies (EXPT-004)', customSuffix: '115' },
    { name: 'AP - Utilities', description: 'Payables for Utilities Expense (EXPT-005)', customSuffix: '120' },
    { name: 'AP - Rent', description: 'Payables for Rent Expense (EXPT-006)', customSuffix: '125' },
    { name: 'AP - Internet Subscription', description: 'Payables for Internet Subscription (EXPT-007)', customSuffix: '130' },
    { name: 'AP - Professional Fees', description: 'Payables for Professional Fees (EXPT-008)', customSuffix: '135' },
    { name: 'AP - Insurance', description: 'Payables for Insurance Expense (EXPT-009)', customSuffix: '140' },
    { name: 'AP - License & Permits', description: 'Payables for License & Permits (EXPT-010)', customSuffix: '145' },
    { name: 'AP - Communication', description: 'Payables for Communication Expense (EXPT-011)', customSuffix: '150' },
    { name: 'AP - Miscellaneous', description: 'Payables for Miscellaneous Expense (EXPT-012)', customSuffix: '155' },
  ],

  Revenue: [
    // BUS TRIP REVENUE
    { name: 'Trip Revenue - Boundary', description: 'Fixed daily rental from drivers under boundary system', customSuffix: '000' },
    { name: 'Trip Revenue - Percentage', description: 'Percentage-based trip revenue', customSuffix: '005' },

    // RENTAL REVENUE
    { name: 'Rental Service Revenue', description: 'Rental services of bus unit income', customSuffix: '010' },

    // OTHER REVENUE - SPECIFIC ACCOUNTS (10 accounts, matching revenue types)
    { name: 'Advertising Revenue', description: 'Income from bus wrap advertising, terminal signage, and promotional placements', customSuffix: '020' },
    { name: 'Insurance Commission Income', description: 'Commission income from passenger insurance partnerships', customSuffix: '025' },
    { name: 'Terminal Fee Income', description: 'Revenue from terminal operations, boarding fees, and station usage', customSuffix: '030' },
    { name: 'Parking Fee Income', description: 'Parking fees collected at terminals and company premises', customSuffix: '035' },
    { name: 'Charter Add-on Revenue', description: 'Additional services on charter trips', customSuffix: '040' },
    { name: 'Cargo Handling Fee Income', description: 'Freight handling, baggage fees, and cargo transportation', customSuffix: '045' },
    { name: 'Penalty & Violation Income', description: 'Late fees, violation penalties, and cancellation charges', customSuffix: '050' },
    { name: 'Franchise & Partnership Income', description: 'Royalties and fees from franchise agreements', customSuffix: '055' },
    { name: 'Maintenance Service Income', description: 'Income from providing maintenance services to third-party vehicles', customSuffix: '060' },
    { name: 'Miscellaneous Income', description: 'Other minor income sources not classified elsewhere', customSuffix: '065' },
  ],

  Expense: [
    // OPERATIONAL EXPENSES
    { name: 'Fuel Expense', description: 'Diesel and other fuel costs for buses', customSuffix: '000' },
    { name: 'Toll Expense', description: 'Highway and bridge tolls', customSuffix: '005' },
    { name: 'Parking Expense', description: 'Parking fees', customSuffix: '010' },
    { name: 'Terminal Fees', description: 'Bus terminal and station fees', customSuffix: '015' },
    { name: 'Maintenance & Repairs', description: 'Vehicle maintenance and repairs', customSuffix: '020' },

    // PERSONNEL EXPENSES
    { name: 'Driver - Conductor Boundary Share Expense', description: 'Payment to drivers/conductors under boundary system', customSuffix: '100' },
    { name: 'Driver - Conductor Percentage Expense', description: 'Payment to drivers/conductors under percentage system', customSuffix: '105' },
    { name: 'Driver/Conductor Allowance', description: 'Daily allowances for staff', customSuffix: '110' },
    { name: 'Salaries & Wages', description: 'Regular employee salaries', customSuffix: '115' },

    // ADMINISTRATIVE & OTHER EXPENSES (COA - 10 accounts matching expense types)
    { name: 'Bad Debt Expense', description: 'Uncollectible accounts written off', customSuffix: '200' },
    { name: 'Office Supplies Expense', description: 'Stationery and office supplies', customSuffix: '205' },
    { name: 'Utilities Expense', description: 'Electricity, water, etc.', customSuffix: '210' },
    { name: 'Rent Expense', description: 'Office or garage rent', customSuffix: '215' },
    { name: 'Internet Expense', description: 'Internet service costs', customSuffix: '220' },
    { name: 'Professional Fees Expense', description: 'Legal, accounting, consulting', customSuffix: '225' },
    { name: 'Insurance Expense', description: 'Insurance premiums', customSuffix: '230' },
    { name: 'License & Permit Expense', description: 'Business licenses and permits', customSuffix: '235' },
    { name: 'Communication Expense', description: 'Phone and communication costs', customSuffix: '240' },
    { name: 'Miscellaneous Expense', description: 'Other administrative expenses', customSuffix: '245' },
  ],
};

/**
 * Generates the next available account code for a given account type
 */
async function generateAccountCode(
  accountTypePrefix: string,
  customSuffix?: string
): Promise<string> {
  if (customSuffix) {
    const customCode = `${accountTypePrefix}${customSuffix.padStart(3, '0')}`;
    const existing = await prisma.chart_of_account.findFirst({
      where: { account_code: customCode, is_deleted: false },
    });
    if (!existing) return customCode;
  }

  const existingCodes = await prisma.chart_of_account.findMany({
    where: {
      account_code: { startsWith: accountTypePrefix },
      is_deleted: false,
    },
    select: { account_code: true },
    orderBy: { account_code: 'asc' },
  });

  const suffixes = existingCodes
    .map((c) => parseInt(c.account_code.slice(1), 10))
    .filter((n) => !isNaN(n));

  if (suffixes.length === 0) {
    return `${accountTypePrefix}000`;
  }

  const maxSuffix = Math.max(...suffixes);
  let nextSuffix = maxSuffix + 5;

  if (nextSuffix > 999) {
    nextSuffix = findLowestAvailableSuffix(suffixes);
  }

  const proposedCode = `${accountTypePrefix}${nextSuffix.toString().padStart(3, '0')}`;
  const conflict = await prisma.chart_of_account.findFirst({
    where: { account_code: proposedCode, is_deleted: false },
  });

  if (conflict) {
    nextSuffix = findLowestAvailableSuffix(suffixes);
  }

  return `${accountTypePrefix}${nextSuffix.toString().padStart(3, '0')}`;
}

/**
 * Finds the lowest available suffix
 */
function findLowestAvailableSuffix(usedSuffixes: number[]): number {
  const sortedSuffixes = [...new Set(usedSuffixes)].sort((a, b) => a - b);

  for (let i = 0; i <= 999; i += 5) {
    if (!sortedSuffixes.includes(i)) {
      return i;
    }
  }

  for (let i = 0; i <= 999; i++) {
    if (!sortedSuffixes.includes(i)) {
      return i;
    }
  }

  throw new Error('Account code range exhausted for this account type');
}

/**
 * Seeds account types into the database
 */
async function seedAccountTypes() {
  console.log('🌱 Seeding Account Types...');

  for (const [name, config] of Object.entries(ACCOUNT_TYPE_CONFIG)) {
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
 * Seeds expense types into the database
 */
async function seedExpenseTypes() {
  console.log('🌱 Seeding Expense Types...');

  for (const expenseType of EXPENSE_TYPE_DATA) {
    const existing = await prisma.expense_type.findFirst({
      where: {
        OR: [
          { code: expenseType.code, is_deleted: false },
          { name: expenseType.name, is_deleted: false }
        ]
      },
    });

    if (existing) {
      console.log(`  ⏭️  Expense Type "${expenseType.name}" already exists (ID: ${existing.id}, Code: ${existing.code})`);
      continue;
    }

    const created = await prisma.expense_type.create({
      data: {
        code: expenseType.code,
        name: expenseType.name,
        description: expenseType.description,
        created_by: 'system',
        updated_by: 'system',
      },
    });

    console.log(`  ✅ Created Expense Type: ${created.code} - ${created.name}`);
  }

  console.log('');
}

/**
 * Seeds revenue types into the database
 */
async function seedRevenueTypes() {
  console.log('🌱 Seeding Revenue Types...');

  for (const revenueType of REVENUE_TYPE_DATA) {
    const existing = await prisma.revenue_type.findFirst({
      where: {
        OR: [
          { code: revenueType.code, is_deleted: false },
          { name: revenueType.name, is_deleted: false }
        ]
      },
    });

    if (existing) {
      console.log(`  ⏭️  Revenue Type "${revenueType.name}" already exists (ID: ${existing.id}, Code: ${existing.code})`);
      continue;
    }

    const created = await prisma.revenue_type.create({
      data: {
        code: revenueType.code,
        name: revenueType.name,
        description: revenueType.description,
        created_by: 'system',
        updated_by: 'system',
      },
    });

    console.log(`  ✅ Created Revenue Type: ${created.code} - ${created.name}`);
  }

  console.log('');
}

/**
 * Seeds Chart of Accounts with auto-generated account codes
 */
async function seedChartOfAccounts() {
  console.log('🌱 Seeding Chart of Accounts...');

  for (const [accountTypeName, accounts] of Object.entries(COA_DATA)) {
    console.log(`\n  📊 ${accountTypeName}:`);

    const accountType = await prisma.account_type.findFirst({
      where: { name: accountTypeName, is_deleted: false },
    });

    if (!accountType) {
      console.error(`  ❌ Account Type "${accountTypeName}" not found. Skipping...`);
      continue;
    }

    const config = ACCOUNT_TYPE_CONFIG[accountTypeName as keyof typeof ACCOUNT_TYPE_CONFIG];

    for (const account of accounts) {
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

      const accountCode = await generateAccountCode(config.prefix, account.customSuffix);

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
 * Seeds default system configuration into the database
 * Only creates config if no active configuration exists
 */
async function seedSystemConfiguration() {
  console.log('🌱 Seeding System Configuration...');

  // Check if an active config already exists
  const existingConfig = await prisma.system_configuration.findFirst({
    where: { is_active: true, is_deleted: false },
  });

  if (existingConfig) {
    console.log(`  ⏭️  Active system configuration already exists (ID: ${existingConfig.id}, Code: ${existingConfig.config_code})`);
    console.log(`      - Minimum Wage: ₱${existingConfig.minimum_wage}`);
    console.log(`      - Duration to Receivable: ${existingConfig.duration_to_receivable_hours} hours`);
    console.log(`      - Receivable Due Date: ${existingConfig.receivable_due_date_days} days`);
    console.log(`      - Driver Share: ${existingConfig.driver_share_percentage}%`);
    console.log(`      - Conductor Share: ${existingConfig.conductor_share_percentage}%`);
    console.log(`      - Default Frequency: ${existingConfig.default_frequency}`);
    console.log(`      - Default # of Payments: ${existingConfig.default_number_of_payments}`);
    console.log('');
    return;
  }

  // Create default configuration
  const config = await prisma.system_configuration.create({
    data: {
      config_code: 'DEFAULT',
      minimum_wage: 600.00,
      duration_to_receivable_hours: 72,  // 3 days
      receivable_due_date_days: 30,
      driver_share_percentage: 50.00,
      conductor_share_percentage: 50.00,
      default_frequency: 'WEEKLY' as receivable_frequency,
      default_number_of_payments: 3,
      is_active: true,
      created_by: 'system',
    },
  });

  console.log(`  ✅ Created System Configuration: ${config.config_code} (ID: ${config.id})`);
  console.log(`      - Minimum Wage: ₱${config.minimum_wage}`);
  console.log(`      - Duration to Receivable: ${config.duration_to_receivable_hours} hours`);
  console.log(`      - Receivable Due Date: ${config.receivable_due_date_days} days`);
  console.log(`      - Driver Share: ${config.driver_share_percentage}%`);
  console.log(`      - Conductor Share: ${config.conductor_share_percentage}%`);
  console.log(`      - Default Frequency: ${config.default_frequency}`);
  console.log(`      - Default # of Payments: ${config.default_number_of_payments}`);
  console.log('');
}

/**
 * Main seeder function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Finance Management System - Core Data Seeder            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await seedAccountTypes();
    await seedExpenseTypes();
    await seedRevenueTypes();
    await seedChartOfAccounts();
    await seedSystemConfiguration();

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