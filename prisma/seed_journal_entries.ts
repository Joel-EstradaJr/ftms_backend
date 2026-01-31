/**
 * Journal Entry Seeder for Finance Management System
 * 
 * This file seeds journal entries and journal entry lines with realistic data
 * suitable for UI testing. It integrates with the existing Chart of Accounts seeder.
 * 
 * Journal Entry Types:
 * - AUTO_GENERATED: System-generated entries from modules
 * - MANUAL: User-created entries
 * 
 * Status Types:
 * - DRAFT: Entry is being created
 * - APPROVED: Entry has been approved
 * - REJECTED: Entry has been rejected
 */

import { PrismaClient, journal_status, entry_type } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Journal Entry data with balanced debit/credit lines
 */
const JOURNAL_ENTRIES = [
  {
    code: 'JE-2024-001',
    date: new Date('2024-01-15'),
    reference: 'REV-001',
    description: 'Daily revenue collection from operational trips',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-15T10:30:00'),
    lines: [
      {
        account_code: '1000', // Cash on Hand
        description: 'Cash collection from fare revenue',
        debit: 75000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '3000', // Trip Revenue - Boundary
        description: 'Daily boundary collections',
        debit: 0,
        credit: 75000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-002',
    date: new Date('2024-01-16'),
    reference: 'REV-002',
    description: 'Rental revenue from charter service',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-16T14:00:00'),
    lines: [
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Bank deposit - charter payment',
        debit: 120000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '3010', // Rental Revenue
        description: 'Charter service - Company XYZ',
        debit: 0,
        credit: 120000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-003',
    date: new Date('2024-01-17'),
    reference: 'EXP-001',
    description: 'Fuel expense for fleet operations',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-17T16:00:00'),
    lines: [
      {
        account_code: '4000', // Fuel Expense
        description: 'Diesel purchase for buses',
        debit: 45000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1000', // Cash on Hand
        description: 'Cash payment to fuel supplier',
        debit: 0,
        credit: 45000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-004',
    date: new Date('2024-01-18'),
    reference: 'EXP-002',
    description: 'Maintenance and repairs for Bus 101',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-18T11:00:00'),
    lines: [
      {
        account_code: '4050', // Maintenance & Repairs
        description: 'Parts and labor for Bus 101',
        debit: 28000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '2000', // Accounts Payable - Suppliers
        description: 'Payable to ABC Auto Parts',
        debit: 0,
        credit: 28000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-005',
    date: new Date('2024-01-20'),
    reference: 'PAY-001',
    description: 'Payroll processing for January 1-15',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-20T09:00:00'),
    lines: [
      {
        account_code: '4060', // Salaries & Wages
        description: 'Employee salaries and wages',
        debit: 180000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Net payroll disbursement',
        debit: 0,
        credit: 165000.00,
        line_number: 2,
      },
      {
        account_code: '2010', // Accounts Payable - Employees
        description: 'Withheld taxes and contributions',
        debit: 0,
        credit: 15000.00,
        line_number: 3,
      },
    ],
  },
  {
    code: 'JE-2024-006',
    date: new Date('2024-01-22'),
    reference: 'ADJ-001',
    description: 'Correction of revenue entry from Jan 15',
    entry_type: entry_type.MANUAL,
    status: journal_status.DRAFT,
    lines: [
      {
        account_code: '3000', // Trip Revenue - Boundary
        description: 'Correction of overstated revenue',
        debit: 5000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1000', // Cash on Hand
        description: 'Adjust cash balance',
        debit: 0,
        credit: 5000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-007',
    date: new Date('2024-01-23'),
    reference: 'EXP-003',
    description: 'Office utilities and internet expense',
    entry_type: entry_type.MANUAL,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-23T13:00:00'),
    lines: [
      {
        account_code: '4065', // Utilities Expense
        description: 'Electricity and water bills',
        debit: 8500.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '4070', // Internet Subscription
        description: 'Monthly internet service',
        debit: 2500.00,
        credit: 0,
        line_number: 2,
      },
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Payment via bank transfer',
        debit: 0,
        credit: 11000.00,
        line_number: 3,
      },
    ],
  },
  {
    code: 'JE-2024-008',
    date: new Date('2024-01-25'),
    reference: 'REV-003',
    description: 'Advertising revenue from bus ads',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-25T15:30:00'),
    lines: [
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Bank deposit from advertiser',
        debit: 35000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '3015', // Advertising Revenue
        description: 'Monthly ad revenue',
        debit: 0,
        credit: 35000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-009',
    date: new Date('2024-01-26'),
    reference: 'EXP-004',
    description: 'Insurance premium payment',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-26T10:00:00'),
    lines: [
      {
        account_code: '4070', // Insurance Expense
        description: 'Quarterly vehicle insurance',
        debit: 95000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Insurance payment',
        debit: 0,
        credit: 95000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-010',
    date: new Date('2024-01-28'),
    reference: 'ADJ-002',
    description: 'Accounts receivable collection',
    entry_type: entry_type.MANUAL,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-28T14:00:00'),
    lines: [
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Customer payment received',
        debit: 50000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1020', // Accounts Receivable - Customers
        description: 'Clear outstanding receivable',
        debit: 0,
        credit: 50000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-011',
    date: new Date('2024-01-29'),
    reference: 'EXP-005',
    description: 'Office supplies and miscellaneous',
    entry_type: entry_type.MANUAL,
    status: journal_status.DRAFT,
    lines: [
      {
        account_code: '4065', // Office Supplies
        description: 'Stationery and printing supplies',
        debit: 6500.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1000', // Cash on Hand
        description: 'Petty cash payment',
        debit: 0,
        credit: 6500.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-012',
    date: new Date('2024-01-30'),
    reference: 'DEP-001',
    description: 'Monthly depreciation expense',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-01-30T16:00:00'),
    lines: [
      {
        account_code: '4115', // Depreciation Expense
        description: 'Monthly depreciation - buses and equipment',
        debit: 125000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1060', // Accumulated Depreciation - Buses
        description: 'Bus fleet depreciation',
        debit: 0,
        credit: 100000.00,
        line_number: 2,
      },
      {
        account_code: '1065', // Accumulated Depreciation - Equipment
        description: 'Equipment depreciation',
        debit: 0,
        credit: 25000.00,
        line_number: 3,
      },
    ],
  },
  {
    code: 'JE-2024-013',
    date: new Date('2024-02-01'),
    reference: 'REV-004',
    description: 'Daily revenue - operational trips',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-02-01T11:00:00'),
    lines: [
      {
        account_code: '1000', // Cash on Hand
        description: 'Cash collections',
        debit: 82000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '3000', // Trip Revenue - Boundary
        description: 'Boundary collections',
        debit: 0,
        credit: 82000.00,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-014',
    date: new Date('2024-02-02'),
    reference: 'EXP-006',
    description: 'Toll and parking fees',
    entry_type: entry_type.AUTO_GENERATED,
    status: journal_status.POSTED,
    approved_by: 'admin',
    approved_at: new Date('2024-02-02T10:00:00'),
    lines: [
      {
        account_code: '4005', // Toll Expense
        description: 'Highway toll fees',
        debit: 3500.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '4010', // Parking Expense
        description: 'Terminal parking fees',
        debit: 1200.00,
        credit: 0,
        line_number: 2,
      },
      {
        account_code: '1000', // Cash on Hand
        description: 'Cash payment',
        debit: 0,
        credit: 4700.00,
        line_number: 3,
      },
    ],
  },
  {
    code: 'JE-2024-015',
    date: new Date('2024-02-03'),
    reference: 'ADJ-003',
    description: 'Bank reconciliation adjustment - Pending approval',
    entry_type: entry_type.MANUAL,
    status: journal_status.DRAFT,
    lines: [
      {
        account_code: '1010', // BDO Bank - Current Account
        description: 'Bank charges adjustment',
        debit: 0,
        credit: 500.00,
        line_number: 1,
      },
      {
        account_code: '4120', // Bank Charges
        description: 'Monthly bank service fee',
        debit: 500.00,
        credit: 0,
        line_number: 2,
      },
    ],
  },
  {
    code: 'JE-2024-016',
    date: new Date('2024-02-05'),
    reference: 'REV-001',
    description: 'Reversal of daily revenue collection - Error correction',
    entry_type: entry_type.MANUAL,
    status: journal_status.REVERSED,
    approved_by: 'admin',
    approved_at: new Date('2024-02-05T14:00:00'),
    lines: [
      {
        account_code: '3000', // Trip Revenue - Boundary
        description: 'Reversal: Daily boundary collections',
        debit: 75000.00,
        credit: 0,
        line_number: 1,
      },
      {
        account_code: '1000', // Cash on Hand
        description: 'Reversal: Cash collection from fare revenue',
        debit: 0,
        credit: 75000.00,
        line_number: 2,
      },
    ],
  },
];

/**
 * Calculate total debit and credit for a journal entry
 */
function calculateTotals(lines: Array<{ debit: number; credit: number }>) {
  const total_debit = lines.reduce((sum, line) => sum + line.debit, 0);
  const total_credit = lines.reduce((sum, line) => sum + line.credit, 0);
  return { total_debit, total_credit };
}

/**
 * Seeds journal entries and their lines
 */
async function seedJournalEntries() {
  console.log('🌱 Seeding Journal Entries...');

  let createdCount = 0;
  let skippedCount = 0;

  for (const entry of JOURNAL_ENTRIES) {
    // Check if journal entry already exists
    const existing = await prisma.journal_entry.findFirst({
      where: { code: entry.code, is_deleted: false },
    });

    if (existing) {
      console.log(`  ⏭️  Journal Entry "${entry.code}" already exists`);
      skippedCount++;
      continue;
    }

    // Calculate totals
    const { total_debit, total_credit } = calculateTotals(entry.lines);

    // Validate balanced entry
    if (Math.abs(total_debit - total_credit) > 0.01) {
      console.error(`  ❌ Journal Entry "${entry.code}" is not balanced! Debit: ${total_debit}, Credit: ${total_credit}`);
      continue;
    }

    // Create journal entry with lines
    try {
      const journalEntry = await prisma.journal_entry.create({
        data: {
          code: entry.code,
          date: entry.date,
          reference: entry.reference,
          description: entry.description,
          total_debit,
          total_credit,
          entry_type: entry.entry_type,
          status: entry.status,
          approved_by: entry.approved_by,
          approved_at: entry.approved_at,
          rejected_by: entry.rejected_by,
          rejected_at: entry.rejected_at,
          rejection_reason: entry.rejection_reason,
          created_by: 'system',
          updated_by: 'system',
          lines: {
            create: await Promise.all(
              entry.lines.map(async (line) => {
                // Find the account by account_code
                const account = await prisma.chart_of_account.findFirst({
                  where: { account_code: line.account_code, is_deleted: false },
                });

                if (!account) {
                  throw new Error(`Account with code "${line.account_code}" not found`);
                }

                return {
                  account_id: account.id,
                  description: line.description,
                  debit: line.debit,
                  credit: line.credit,
                  line_number: line.line_number,
                  created_by: 'system',
                  updated_by: 'system',
                };
              })
            ),
          },
        },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });

      console.log(`  ✅ ${journalEntry.code} - ${journalEntry.description} (${journalEntry.lines.length} lines, Status: ${journalEntry.status})`);
      createdCount++;
    } catch (error: any) {
      console.error(`  ❌ Error creating "${entry.code}": ${error.message}`);
    }
  }

  console.log(`\n📊 Summary: ${createdCount} created, ${skippedCount} skipped\n`);
}

/**
 * Main seeder function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Finance Management System - Journal Entry Seeder        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await seedJournalEntries();
    console.log('✨ Journal Entry seeding completed successfully!\n');
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

