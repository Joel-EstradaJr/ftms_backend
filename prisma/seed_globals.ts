import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDynamicEnums() {
  console.log('Clearing existing dynamic enum data...');
  // Clear all dynamic enum tables in order (respecting foreign key constraints)
  await prisma.budgetRequestStatus.deleteMany();
  await prisma.budgetRequestType.deleteMany();
  await prisma.revenueSource.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.accountType.deleteMany();
  await prisma.loanPaymentFrequencyType.deleteMany();
  await prisma.budgetPeriodType.deleteMany();
  await prisma.paymentMethod.deleteMany();
  console.log('Cleared existing data.');
}

async function seedPaymentMethods() {
  console.log('Seeding PaymentMethod...');
  const methods = [
    { methodCode: 'CASH', methodName: 'Cash', description: 'Physical currency payment' },
    { methodCode: 'GCASH', methodName: 'GCash', description: 'Digital wallet payment via GCash' },
    { methodCode: 'PAYMAYA', methodName: 'PayMaya', description: 'Digital wallet payment via PayMaya' },
    { methodCode: 'BANK_TRANSFER', methodName: 'Bank Transfer', description: 'Direct bank account transfer' },
    { methodCode: 'CHECK', methodName: 'Check', description: 'Payment via cheque' },
    { methodCode: 'CREDIT_CARD', methodName: 'Credit Card', description: 'Credit card payment' },
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { methodCode: method.methodCode },
      update: { ...method, isActive: true },
      create: method,
    });
  }
  console.log(`✓ PaymentMethod: ${methods.length} records`);
  return methods.length;
}

async function seedBudgetPeriodTypes() {
  console.log('Seeding BudgetPeriodType...');
  const periods = [
    { periodCode: 'DAILY', periodName: 'Daily', description: 'Budget allocated per day' },
    { periodCode: 'WEEKLY', periodName: 'Weekly', description: 'Budget allocated per week (7 days)' },
    { periodCode: 'BI_WEEKLY', periodName: 'Bi-Weekly', description: 'Budget allocated per 2 weeks (14 days)' },
    { periodCode: 'SEMI_MONTHLY', periodName: 'Semi-Monthly', description: 'Budget allocated twice per month (15 days)' },
    { periodCode: 'MONTHLY', periodName: 'Monthly', description: 'Budget allocated per month (30 days)' },
    { periodCode: 'QUARTERLY', periodName: 'Quarterly', description: 'Budget allocated per quarter (90 days)' },
    { periodCode: 'YEARLY', periodName: 'Yearly', description: 'Budget allocated per year (365 days)' },
    { periodCode: 'CUSTOM', periodName: 'Custom', description: 'Budget allocated for custom period (user-defined)' },
  ];

  for (const period of periods) {
    await prisma.budgetPeriodType.upsert({
      where: { periodCode: period.periodCode },
      update: { ...period, isActive: true },
      create: period,
    });
  }
  console.log(`✓ BudgetPeriodType: ${periods.length} records`);
  return periods.length;
}

async function seedLoanPaymentFrequencyTypes() {
  console.log('Seeding LoanPaymentFrequencyType...');
  const frequencies = [
    { frequencyCode: 'DAILY', frequencyName: 'Daily', description: 'Payment due every day', daysInterval: 1 },
    { frequencyCode: 'WEEKLY', frequencyName: 'Weekly', description: 'Payment due every week', daysInterval: 7 },
    { frequencyCode: 'BI_WEEKLY', frequencyName: 'Bi-Weekly', description: 'Payment due every 2 weeks', daysInterval: 14 },
    { frequencyCode: 'SEMI_MONTHLY', frequencyName: 'Semi-Monthly', description: 'Payment due twice per month', daysInterval: 15 },
    { frequencyCode: 'MONTHLY', frequencyName: 'Monthly', description: 'Payment due every month', daysInterval: 30 },
  ];

  for (const freq of frequencies) {
    await prisma.loanPaymentFrequencyType.upsert({
      where: { frequencyCode: freq.frequencyCode },
      update: { ...freq, isActive: true },
      create: freq,
    });
  }
  console.log(`✓ LoanPaymentFrequencyType: ${frequencies.length} records`);
  return frequencies.length;
}

async function seedAccountTypes() {
  console.log('Seeding AccountType...');
  const types = [
    { typeCode: 'ASSET', typeName: 'Asset', normalBalance: 'DEBIT', description: 'Balance sheet accounts for company resources' },
    { typeCode: 'LIABILITY', typeName: 'Liability', normalBalance: 'CREDIT', description: 'Balance sheet accounts for company obligations' },
    { typeCode: 'EQUITY', typeName: 'Equity', normalBalance: 'CREDIT', description: 'Balance sheet accounts for owner\'s stake' },
    { typeCode: 'REVENUE', typeName: 'Revenue', normalBalance: 'CREDIT', description: 'Income statement accounts for company income' },
    { typeCode: 'EXPENSE', typeName: 'Expense', normalBalance: 'DEBIT', description: 'Income statement accounts for company costs' },
  ];

  for (const type of types) {
    await prisma.accountType.upsert({
      where: { typeCode: type.typeCode },
      update: { ...type, isActive: true },
      create: type,
    });
  }
  console.log(`✓ AccountType: ${types.length} records`);
  return types.length;
}

async function seedExpenseCategories() {
  console.log('Seeding ExpenseCategory...');
  const categories = [
    { categoryCode: 'PAYROLL', name: 'Payroll', description: 'Employee salaries and wages', department: 'Operations' },
    { categoryCode: 'FUEL', name: 'Fuel', description: 'Bus fuel and diesel expenses', department: 'Operations' },
    { categoryCode: 'MAINTENANCE', name: 'Maintenance', description: 'Bus repair and upkeep', department: 'Operations' },
    { categoryCode: 'UTILITIES', name: 'Utilities', description: 'Electricity, water, communications', department: 'Finance' },
    { categoryCode: 'OFFICE_SUPPLIES', name: 'Office Supplies', description: 'Stationery and office materials', department: 'Finance' },
    { categoryCode: 'RENT', name: 'Rent', description: 'Office and facility rental', department: 'Finance' },
    { categoryCode: 'INSURANCE', name: 'Insurance', description: 'Vehicle and liability insurance', department: 'Finance' },
    { categoryCode: 'TOLL_FEES', name: 'Toll Fees', description: 'Highway and toll charges', department: 'Operations' },
    { categoryCode: 'VEHICLE_PARTS', name: 'Vehicle Parts', description: 'Replacement parts for buses', department: 'Operations' },
    { categoryCode: 'CLEANING', name: 'Cleaning', description: 'Vehicle and facility cleaning', department: 'Operations' },
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { categoryCode: category.categoryCode },
      update: { ...category, isActive: true },
      create: category,
    });
  }
  console.log(`✓ ExpenseCategory: ${categories.length} records`);
  return categories.length;
}

async function seedRevenueSources() {
  console.log('Seeding RevenueSource...');
  const sources = [
    { sourceCode: 'BUS_TRIP', name: 'Bus Trip Revenue', description: 'Revenue from regular bus operations' },
    { sourceCode: 'RENTAL', name: 'Bus Rental', description: 'Revenue from bus rental services' },
    { sourceCode: 'DISPOSAL', name: 'Disposal Sales', description: 'Revenue from asset disposal or scrap sales' },
    { sourceCode: 'LOAN_REPAYMENT', name: 'Employee Loan Repayment', description: 'Repayment from employee loans' },
    { sourceCode: 'RENTER_DAMAGE', name: 'Renter Damage Payment', description: 'Penalty/reimbursement for renter damage' },
    { sourceCode: 'FORFEITED_DEPOSIT', name: 'Forfeited Deposit', description: 'Non-refundable deposits from cancellations' },
    { sourceCode: 'MISCELLANEOUS', name: 'Miscellaneous', description: 'Other income sources' },
  ];

  for (const source of sources) {
    await prisma.revenueSource.upsert({
      where: { sourceCode: source.sourceCode },
      update: { ...source, isActive: true },
      create: source,
    });
  }
  console.log(`✓ RevenueSource: ${sources.length} records`);
  return sources.length;
}

async function seedBudgetRequestTypes() {
  console.log('Seeding BudgetRequestType...');
  const types = [
    { typeCode: 'SHORTAGE', name: 'Budget Shortage', description: 'Request for additional funds due to insufficient budget', priority: 1 },
    { typeCode: 'URGENT', name: 'Urgent Purchase', description: 'Request for immediate budget allocation for urgent needs', priority: 3 },
    { typeCode: 'NEW_PROJECT', name: 'New Project', description: 'Request for new project-related budget allocation', priority: 2 },
    { typeCode: 'SEASONAL', name: 'Seasonal Adjustment', description: 'Request for seasonal budget adjustment', priority: 1 },
    { typeCode: 'EMERGENCY', name: 'Emergency', description: 'Request for emergency fund allocation', priority: 4 },
  ];

  for (const type of types) {
    await prisma.budgetRequestType.upsert({
      where: { typeCode: type.typeCode },
      update: { ...type, isActive: true },
      create: type,
    });
  }
  console.log(`✓ BudgetRequestType: ${types.length} records`);
  return types.length;
}

async function seedBudgetRequestStatuses() {
  console.log('Seeding BudgetRequestStatus...');
  const statuses = [
    { statusCode: 'PENDING', name: 'Pending', description: 'Awaiting review and approval' },
    { statusCode: 'APPROVED', name: 'Approved', description: 'Budget request approved and funds reserved' },
    { statusCode: 'REJECTED', name: 'Rejected', description: 'Budget request denied' },
    { statusCode: 'REVISED', name: 'Revised', description: 'Budget request revised and resubmitted' },
  ];

  for (const status of statuses) {
    await prisma.budgetRequestStatus.upsert({
      where: { statusCode: status.statusCode },
      update: { ...status, isActive: true },
      create: status,
    });
  }
  console.log(`✓ BudgetRequestStatus: ${statuses.length} records`);
  return statuses.length;
}

async function main() {
  console.log('🌱 Starting seed process...\n');

  await clearDynamicEnums();
  console.log('');

  const results = await Promise.all([
    seedPaymentMethods(),
    seedBudgetPeriodTypes(),
    seedLoanPaymentFrequencyTypes(),
    seedAccountTypes(),
    seedExpenseCategories(),
    seedRevenueSources(),
    seedBudgetRequestTypes(),
    seedBudgetRequestStatuses(),
  ]);

  console.log('\n✅ Seeding completed successfully!');
  console.log('═'.repeat(50));
  console.log('Summary:');
  console.log(`  • PaymentMethod: ${results[0]} records`);
  console.log(`  • BudgetPeriodType: ${results[1]} records`);
  console.log(`  • LoanPaymentFrequencyType: ${results[2]} records`);
  console.log(`  • AccountType: ${results[3]} records`);
  console.log(`  • ExpenseCategory: ${results[4]} records`);
  console.log(`  • RevenueSource: ${results[5]} records`);
  console.log(`  • BudgetRequestType: ${results[6]} records`);
  console.log(`  • BudgetRequestStatus: ${results[7]} records`);
  console.log('═'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
