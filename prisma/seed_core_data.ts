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
 * Revenue Type seed data - MINIMAL SET
 */
const REVENUE_TYPE_DATA = [
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
  {
    code: 'REVT-003',
    name: 'Other Revenue',
    description: 'Other miscellaneous revenue sources'
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
  {
    code: 'EXPT-003',
    name: 'Administrative',
    description: 'Office supplies, utilities, internet, and administrative costs'
  },
];

/**
 * MINIMAL Chart of Accounts - ONLY ESSENTIAL ACCOUNTS
 */
const COA_DATA: Record<string, Array<{ name: string; description?: string; customSuffix?: string }>> = {
  Asset: [
    // CASH & BANK ACCOUNTS
    { name: 'Cash on Hand', description: 'Physical cash held in the office', customSuffix: '000' },
    { name: 'Bank Account', description: 'Primary checking account', customSuffix: '005' },
    { name: 'E-Wallet', description: 'Digital wallet for online transactions', customSuffix: '010' },

    // RECEIVABLES
    { name: 'Accounts Receivable - Drivers', description: 'Amounts owed by drivers for shortages', customSuffix: '100' },
    { name: 'Accounts Receivable - Conductors', description: 'Amounts owed by conductors for shortages', customSuffix: '105' },
    { name: 'Accounts Receivable - Other Employees', description: 'Other employee receivables', customSuffix: '110' },
  ],

  Liability: [
    { name: 'Accounts Payable - Suppliers', description: 'Amounts owed to suppliers', customSuffix: '000' },
    { name: 'Accounts Payable - Employees', description: 'Salaries and wages payable', customSuffix: '005' },
  ],

  Revenue: [
    // BUS TRIP REVENUE
    { name: 'Trip Revenue - Boundary', description: 'Fixed daily rental from drivers under boundary system', customSuffix: '000' },
    { name: 'Trip Revenue - Percentage', description: 'Percentage-based trip revenue', customSuffix: '005' },

    // OTHER REVENUE
    { name: 'Other Revenue', description: 'Miscellaneous income sources', customSuffix: '010' },
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

    // ADMINISTRATIVE & OTHER
    { name: 'Bad Debt Expense', description: 'Uncollectible accounts written off', customSuffix: '200' },
    { name: 'Office Supplies', description: 'Stationery and office supplies', customSuffix: '205' },
    { name: 'Utilities Expense', description: 'Electricity, water, etc.', customSuffix: '210' },
    { name: 'Rent Expense', description: 'Office or garage rent', customSuffix: '215' },
    { name: 'Internet Subscription', description: 'Internet service costs', customSuffix: '220' },
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