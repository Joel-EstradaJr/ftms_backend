import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REVENUE_TYPES = [
  {
    code: 'TRIP',
    name: 'Bus Trip Revenue',
    description: 'Bus trip fare collection from regular operations',
  },
  {
    code: 'RENTAL',
    name: 'Bus Rental Revenue',
    description: 'Bus rental income from charter services',
  },
  {
    code: 'SPONSORSHIP',
    name: 'Sponsorship Revenue',
    description: 'Corporate sponsorship and partnerships',
  },
  {
    code: 'ASSET_SALE',
    name: 'Asset Sale Revenue',
    description: 'Revenue from sale of company assets (vehicles, equipment)',
  },
  {
    code: 'COMMERCIAL_VENTURE',
    name: 'Commercial Venture Revenue',
    description: 'Commercial ventures and business partnerships',
  },
  {
    code: 'ADVERTISING',
    name: 'Advertising Revenue',
    description: 'Bus body advertising and signage income',
  },
  {
    code: 'INTEREST_INCOME',
    name: 'Interest Income',
    description: 'Bank interest and investment returns',
  },
  {
    code: 'PENALTY_FEE',
    name: 'Penalty Fee Revenue',
    description: 'Penalty fees collected from late payments',
  },
  {
    code: 'INSURANCE_CLAIM',
    name: 'Insurance Claim Revenue',
    description: 'Insurance claim payouts and reimbursements',
  },
  {
    code: 'SCRAP_SALE',
    name: 'Scrap Sale Revenue',
    description: 'Sale of scrap metal and spare parts',
  },
  {
    code: 'PARKING_FEE',
    name: 'Parking Fee Revenue',
    description: 'Parking revenue from terminal facilities',
  },
  {
    code: 'TERMINAL_RENTAL',
    name: 'Terminal Rental Revenue',
    description: 'Rental income from terminal stalls and spaces',
  },
  {
    code: 'MISCELLANEOUS',
    name: 'Miscellaneous Revenue',
    description: 'Other revenue sources not classified elsewhere',
  },
];

async function main() {
  console.log('Seeding revenue types...');

  for (const type of REVENUE_TYPES) {
    const existing = await prisma.revenue_type.findUnique({
      where: { code: type.code },
    });

    if (existing) {
      console.log(`  [SKIP] ${type.code} - Already exists`);
    } else {
      await prisma.revenue_type.create({
        data: {
          code: type.code,
          name: type.name,
          description: type.description,
          created_by: 'system',
        },
      });
      console.log(`  [CREATE] ${type.code} - ${type.name}`);
    }
  }

  console.log('\nRevenue types seeding complete!');

  // Display summary
  const count = await prisma.revenue_type.count({
    where: { is_deleted: false },
  });
  console.log(`Total active revenue types: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding revenue types:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
