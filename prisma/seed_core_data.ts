/**
 * Core Data Seeder for FTMS Database
 * 
 * Seeds all remaining tables (not covered by seed_globals.ts) with 50 realistic mock records each.
 * 
 * Prerequisites:
 * - Run seed_globals.ts first to populate global/enum tables
 * - Install @faker-js/faker: npm install -D @faker-js/faker
 * 
 * Usage:
 * npx tsx prisma/seed_core_data.ts
 */

import { PrismaClient, Prisma, AuditAction } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { generateRevenueCode } from '../lib/idGenerator';

const prisma = new PrismaClient();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a random date within a range from now
 * @param yearsBack How many years back from today
 * @param yearsFuture How many years forward from today
 */
function generateRandomDateWithin(yearsBack: number = 2, yearsFuture: number = 0): Date {
  const start = new Date();
  start.setFullYear(start.getFullYear() - yearsBack);
  
  const end = new Date();
  end.setFullYear(end.getFullYear() + yearsFuture);
  
  return faker.date.between({ from: start, to: end });
}

/**
 * Generate a random past date
 */
function randomPastDate(years: number = 2): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - Math.random() * years);
  return date;
}

/**
 * Generate a random future date
 */
function randomFutureDate(months: number = 12): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.floor(Math.random() * months));
  return date;
}

/**
 * Get random item from array
 */
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get random items from array (multiple)
 */
function randomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ============================================
// CLEAR FUNCTIONS (in proper order)
// ============================================

async function clearAllData() {
  console.log('🧹 Clearing existing core data...\n');

  // Delete in order respecting foreign key constraints
  console.log('  Clearing audit logs and notifications...');
  await prisma.auditLog.deleteMany();
  await prisma.financeNotification.deleteMany();
  
  console.log('  Clearing financial reports and metrics...');
  await prisma.financialReport.deleteMany();
  await prisma.dashboardMetric.deleteMany();
  
  console.log('  Clearing documents and attachments...');
  await prisma.attachedDocument.deleteMany();
  
  console.log('  Clearing journal entries and line items...');
  await prisma.journalLineItem.deleteMany();
  await prisma.journalEntryApproval.deleteMany();
  await prisma.journalEntry.deleteMany();
  
  console.log('  Clearing installments and schedules...');
  await prisma.installment.deleteMany();
  await prisma.installmentSchedule.deleteMany();
  
  console.log('  Clearing accounts receivable and payable...');
  await prisma.accountsReceivable.deleteMany();
  await prisma.accountsPayable.deleteMany();
  
  console.log('  Clearing reimbursements, refunds, and deposits...');
  await prisma.renterDamage.deleteMany();
  await prisma.forfeitedDeposit.deleteMany();
  await prisma.refundReplacement.deleteMany();
  await prisma.reimbursement.deleteMany();
  
  console.log('  Clearing revenues and expenses...');
  await prisma.revenue.deleteMany();
  await prisma.expense.deleteMany();
  
  console.log('  Clearing orders and deliveries...');
  await prisma.delivery.deleteMany();
  await prisma.order.deleteMany();
  
  console.log('  Clearing payroll and loans...');
  await prisma.payrollItem.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.loanPayment.deleteMany();
  await prisma.loan.deleteMany();
  
  console.log('  Clearing budgets...');
  await prisma.budgetRequest.deleteMany();
  await prisma.budgetAllocation.deleteMany();
  
  console.log('  Clearing inventory sync data...');
  await prisma.inventoryDeliverySync.deleteMany();
  await prisma.inventoryOrderSync.deleteMany();
  await prisma.inventoryPurchaseRequestSync.deleteMany();
  
  console.log('  Clearing cache tables...');
  await prisma.busTripCache.deleteMany();
  await prisma.payrollCache.deleteMany();
  await prisma.employeeCache.deleteMany();
  
  console.log('  Clearing chart of accounts...');
  await prisma.chartOfAccount.deleteMany();
  
  console.log('  Clearing disposal sales and supplier performance...');
  await prisma.disposalSale.deleteMany();
  await prisma.supplierPerformance.deleteMany();
  
  console.log('  Clearing system configuration...');
  await prisma.systemConfiguration.deleteMany();
  
  console.log('  Clearing approval authority...');
  await prisma.approvalAuthority.deleteMany();

  console.log('✓ All existing data cleared.\n');
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedApprovalAuthorities() {
  console.log('Seeding ApprovalAuthority...');
  
  const authorities: Prisma.ApprovalAuthorityCreateManyInput[] = [
    // Purchase Request approvals
    { role: 'OWNER', approvalType: 'PURCHASE_REQUEST', minThreshold: 0, maxThreshold: 1000000, isActive: true, createdBy: 'system' },
    { role: 'FINANCE_ADMIN', approvalType: 'PURCHASE_REQUEST', minThreshold: 0, maxThreshold: 100000, isActive: true, createdBy: 'system' },
    
    // Budget Request approvals
    { role: 'OWNER', approvalType: 'BUDGET_REQUEST', minThreshold: 0, maxThreshold: 10000000, isActive: true, createdBy: 'system' },
    { role: 'FINANCE_ADMIN', approvalType: 'BUDGET_REQUEST', minThreshold: 0, maxThreshold: 500000, isActive: true, createdBy: 'system' },
    
    // Journal Entry approvals
    { role: 'OWNER', approvalType: 'JOURNAL_ENTRY', minThreshold: 0, maxThreshold: 10000000, isActive: true, createdBy: 'system' },
    { role: 'FINANCE_ADMIN', approvalType: 'JOURNAL_ENTRY', minThreshold: 0, maxThreshold: 1000000, isActive: true, createdBy: 'system' },
    
    // Refund Request approvals
    { role: 'OWNER', approvalType: 'REFUND_REQUEST', minThreshold: 0, maxThreshold: 500000, isActive: true, createdBy: 'system' },
    { role: 'FINANCE_ADMIN', approvalType: 'REFUND_REQUEST', minThreshold: 0, maxThreshold: 50000, isActive: true, createdBy: 'system' },
  ];

  await prisma.approvalAuthority.createMany({ data: authorities });
  console.log(`✓ ApprovalAuthority: ${authorities.length} records`);
  return authorities.length;
}

async function seedSystemConfiguration() {
  console.log('Seeding SystemConfiguration...');
  
  const configs: Prisma.SystemConfigurationCreateManyInput[] = [
    { configKey: 'DEFAULT_CURRENCY', configValue: 'PHP', configType: 'STRING', description: 'Default currency for transactions', createdBy: 'system' },
    { configKey: 'FISCAL_YEAR_START_MONTH', configValue: '1', configType: 'NUMBER', description: 'Month when fiscal year starts (1-12)', createdBy: 'system' },
    { configKey: 'TAX_RATE_PERCENTAGE', configValue: '12', configType: 'NUMBER', description: 'Default VAT/Tax rate percentage', createdBy: 'system' },
    { configKey: 'LATE_PAYMENT_PENALTY_RATE', configValue: '2.5', configType: 'NUMBER', description: 'Monthly late payment penalty rate (%)', createdBy: 'system' },
    { configKey: 'AUTO_JOURNAL_ENTRY_APPROVAL', configValue: 'false', configType: 'BOOLEAN', description: 'Auto-approve journal entries below threshold', createdBy: 'system' },
    { configKey: 'AUTO_JOURNAL_ENTRY_THRESHOLD', configValue: '50000', configType: 'NUMBER', description: 'Auto-approval threshold for journal entries', createdBy: 'system' },
    { configKey: 'REVENUE_GL_ACCOUNT', configValue: '4000', configType: 'STRING', description: 'Default GL account code for revenue', createdBy: 'system' },
    { configKey: 'EXPENSE_GL_ACCOUNT', configValue: '5000', configType: 'STRING', description: 'Default GL account code for expenses', createdBy: 'system' },
    { configKey: 'AR_GL_ACCOUNT', configValue: '1200', configType: 'STRING', description: 'GL account code for accounts receivable', createdBy: 'system' },
    { configKey: 'AP_GL_ACCOUNT', configValue: '2100', configType: 'STRING', description: 'GL account code for accounts payable', createdBy: 'system' },
  ];

  await prisma.systemConfiguration.createMany({ data: configs });
  console.log(`✓ SystemConfiguration: ${configs.length} records`);
  return configs.length;
}

async function seedEmployeeCache() {
  console.log('Seeding EmployeeCache...');
  
  const employees: Prisma.EmployeeCacheCreateManyInput[] = [];
  const departments = ['Operations', 'Finance', 'HR', 'Maintenance', 'Admin'];
  const positions = ['Manager', 'Supervisor', 'Staff', 'Technician', 'Clerk', 'Driver', 'Conductor'];

  for (let i = 1; i <= 50; i++) {
    employees.push({
      employeeNumber: `EMP${String(i).padStart(5, '0')}`,
      firstName: faker.person.firstName(),
      middleName: Math.random() > 0.3 ? faker.person.firstName() : null,
      lastName: faker.person.lastName(),
      phone: `+639${Math.floor(Math.random() * 900000000) + 100000000}`,
      position: randomItem(positions),
      departmentId: Math.floor(Math.random() * 5) + 1,
      department: randomItem(departments),
      lastSynced: new Date(),
    });
  }

  await prisma.employeeCache.createMany({ data: employees });
  console.log(`✓ EmployeeCache: ${employees.length} records`);
  return employees.length;
}

async function seedPayrollCache() {
  console.log('Seeding PayrollCache...');
  
  const payrolls: Prisma.PayrollCacheCreateManyInput[] = [];
  const departments = ['Operations', 'Finance', 'HR', 'Maintenance', 'Admin'];
  const positions = ['Manager', 'Supervisor', 'Staff', 'Technician', 'Clerk', 'Driver', 'Conductor'];
  const statuses = ['Active', 'Inactive', 'On Leave'];

  for (let i = 1; i <= 50; i++) {
    const hiredate = randomPastDate(5);
    const isActive = Math.random() > 0.1;
    
    payrolls.push({
      employeeNumber: `EMP${String(i).padStart(5, '0')}`,
      firstName: faker.person.firstName(),
      middleName: Math.random() > 0.3 ? faker.person.firstName() : null,
      lastName: faker.person.lastName(),
      suffix: Math.random() > 0.8 ? randomItem(['Jr.', 'Sr.', 'III']) : null,
      employeeStatus: isActive ? 'Active' : randomItem(['Inactive', 'On Leave']),
      hiredate: hiredate,
      terminationDate: !isActive && Math.random() > 0.5 ? randomPastDate(1) : null,
      basicRate: parseFloat((15000 + Math.random() * 35000).toFixed(2)),
      positionName: randomItem(positions),
      departmentName: randomItem(departments),
      attendanceData: null, // Can be populated with JSON if needed
      benefitsData: null,
      deductionsData: null,
      lastSynced: new Date(),
    });
  }

  await prisma.payrollCache.createMany({ data: payrolls });
  console.log(`✓ PayrollCache: ${payrolls.length} records`);
  return payrolls.length;
}

async function seedBusTripCache() {
  console.log('Seeding BusTripCache...');
  
  const busTrips: Prisma.BusTripCacheCreateManyInput[] = [];
  const routes = ['Manila-Baguio', 'Manila-Bicol', 'Manila-Pangasinan', 'Manila-Ilocos', 'Manila-Batangas'];
  const assignmentTypes = ['Percentage', 'Boundary'];
  const tripStatuses = ['Completed', 'Ongoing', 'Cancelled'];
  const busTypes = ['Regular', 'Deluxe', 'Super Deluxe'];
  const paymentMethods = ['Cash', 'GCash', 'Bank Transfer'];

  for (let i = 1; i <= 50; i++) {
    const assignmentType = randomItem(assignmentTypes);
    const tripRevenue = parseFloat((5000 + Math.random() * 15000).toFixed(2));
    
    busTrips.push({
      assignmentId: `ASSIGN-${String(i).padStart(5, '0')}`,
      busTripId: `TRIP-${String(i).padStart(5, '0')}`,
      busRoute: randomItem(routes),
      dateAssigned: randomPastDate(0.5),
      tripRevenue: tripRevenue,
      tripFuelExpense: parseFloat((1000 + Math.random() * 3000).toFixed(2)),
      assignmentType: assignmentType,
      assignmentValue: assignmentType === 'Percentage' ? parseFloat((10 + Math.random() * 20).toFixed(2)) : parseFloat((3000 + Math.random() * 5000).toFixed(2)),
      paymentMethod: randomItem(paymentMethods),
      driverName: faker.person.fullName(),
      conductorName: faker.person.fullName(),
      driverEmployeeNumber: `EMP${String(Math.floor(Math.random() * 50) + 1).padStart(5, '0')}`,
      conductorEmployeeNumber: `EMP${String(Math.floor(Math.random() * 50) + 1).padStart(5, '0')}`,
      busPlateNumber: `ABC${Math.floor(Math.random() * 9000) + 1000}`,
      busType: randomItem(busTypes),
      bodyNumber: `BN-${String(i).padStart(3, '0')}`,
      isRevenueRecorded: Math.random() > 0.5,
      isExpenseRecorded: Math.random() > 0.5,
      tripStatus: randomItem(tripStatuses),
      lastSynced: new Date(),
    });
  }

  await prisma.busTripCache.createMany({ data: busTrips });
  console.log(`✓ BusTripCache: ${busTrips.length} records`);
  return busTrips.length;
}

async function seedChartOfAccounts() {
  console.log('Seeding ChartOfAccount...');
  
  // First, get account types
  const accountTypes = await prisma.accountType.findMany();
  
  const accounts: Prisma.ChartOfAccountCreateManyInput[] = [];
  
  // Assets (1000-1999)
  const assetType = accountTypes.find(t => t.typeCode === 'ASSET');
  if (assetType) {
    const assetAccounts = [
      { accountCode: '1000', accountName: 'Cash on Hand', description: 'Physical cash in office' },
      { accountCode: '1010', accountName: 'Cash in Bank', description: 'Bank account balance' },
      { accountCode: '1100', accountName: 'Petty Cash', description: 'Small cash fund for minor expenses' },
      { accountCode: '1200', accountName: 'Accounts Receivable', description: 'Money owed by customers' },
      { accountCode: '1300', accountName: 'Inventory', description: 'Stock of parts and supplies' },
      { accountCode: '1400', accountName: 'Prepaid Expenses', description: 'Advance payments for services' },
      { accountCode: '1500', accountName: 'Buses - Cost', description: 'Bus fleet at cost' },
      { accountCode: '1510', accountName: 'Accumulated Depreciation - Buses', description: 'Depreciation of buses' },
      { accountCode: '1600', accountName: 'Office Equipment', description: 'Office furniture and equipment' },
      { accountCode: '1610', accountName: 'Accumulated Depreciation - Equipment', description: 'Equipment depreciation' },
    ];
    
    assetAccounts.forEach(acc => {
      accounts.push({ ...acc, accountTypeId: assetType.id, isActive: true, createdBy: 'system' });
    });
  }
  
  // Liabilities (2000-2999)
  const liabilityType = accountTypes.find(t => t.typeCode === 'LIABILITY');
  if (liabilityType) {
    const liabilityAccounts = [
      { accountCode: '2000', accountName: 'Accounts Payable', description: 'Money owed to suppliers' },
      { accountCode: '2100', accountName: 'Salaries Payable', description: 'Unpaid salaries' },
      { accountCode: '2200', accountName: 'Loans Payable - Short Term', description: 'Short-term loans' },
      { accountCode: '2300', accountName: 'Loans Payable - Long Term', description: 'Long-term loans' },
      { accountCode: '2400', accountName: 'Accrued Expenses', description: 'Accumulated unpaid expenses' },
      { accountCode: '2500', accountName: 'Customer Deposits', description: 'Advance payments from customers' },
      { accountCode: '2600', accountName: 'Withholding Tax Payable', description: 'Tax withheld from salaries' },
      { accountCode: '2700', accountName: 'SSS Payable', description: 'Social security contributions payable' },
      { accountCode: '2710', accountName: 'PhilHealth Payable', description: 'Health insurance payable' },
      { accountCode: '2720', accountName: 'Pag-IBIG Payable', description: 'Housing fund payable' },
    ];
    
    liabilityAccounts.forEach(acc => {
      accounts.push({ ...acc, accountTypeId: liabilityType.id, isActive: true, createdBy: 'system' });
    });
  }
  
  // Equity (3000-3999)
  const equityType = accountTypes.find(t => t.typeCode === 'EQUITY');
  if (equityType) {
    const equityAccounts = [
      { accountCode: '3000', accountName: 'Owner\'s Capital', description: 'Owner\'s investment in business' },
      { accountCode: '3100', accountName: 'Owner\'s Drawings', description: 'Owner\'s withdrawals' },
      { accountCode: '3200', accountName: 'Retained Earnings', description: 'Accumulated profits' },
      { accountCode: '3300', accountName: 'Current Year Earnings', description: 'Profit/loss for current year' },
    ];
    
    equityAccounts.forEach(acc => {
      accounts.push({ ...acc, accountTypeId: equityType.id, isActive: true, createdBy: 'system' });
    });
  }
  
  // Revenue (4000-4999)
  const revenueType = accountTypes.find(t => t.typeCode === 'REVENUE');
  if (revenueType) {
    const revenueAccounts = [
      { accountCode: '4000', accountName: 'Bus Trip Revenue', description: 'Revenue from regular bus trips' },
      { accountCode: '4100', accountName: 'Charter Revenue', description: 'Revenue from chartered trips' },
      { accountCode: '4200', accountName: 'Rental Revenue', description: 'Revenue from bus rentals' },
      { accountCode: '4300', accountName: 'Interest Income', description: 'Interest earned' },
      { accountCode: '4400', accountName: 'Other Revenue', description: 'Miscellaneous income' },
    ];
    
    revenueAccounts.forEach(acc => {
      accounts.push({ ...acc, accountTypeId: revenueType.id, isActive: true, createdBy: 'system' });
    });
  }
  
  // Expenses (5000-5999)
  const expenseType = accountTypes.find(t => t.typeCode === 'EXPENSE');
  if (expenseType) {
    const expenseAccounts = [
      { accountCode: '5000', accountName: 'Fuel Expense', description: 'Fuel costs for buses' },
      { accountCode: '5100', accountName: 'Maintenance Expense', description: 'Bus maintenance and repairs' },
      { accountCode: '5200', accountName: 'Salaries and Wages', description: 'Employee compensation' },
      { accountCode: '5300', accountName: 'Rent Expense', description: 'Office and terminal rent' },
      { accountCode: '5400', accountName: 'Utilities Expense', description: 'Electricity, water, internet' },
      { accountCode: '5500', accountName: 'Insurance Expense', description: 'Insurance premiums' },
      { accountCode: '5600', accountName: 'Depreciation Expense', description: 'Asset depreciation' },
      { accountCode: '5700', accountName: 'Office Supplies', description: 'Office materials and supplies' },
      { accountCode: '5800', accountName: 'Travel and Training', description: 'Employee development expenses' },
      { accountCode: '5900', accountName: 'Miscellaneous Expense', description: 'Other operating expenses' },
    ];
    
    expenseAccounts.forEach(acc => {
      accounts.push({ ...acc, accountTypeId: expenseType.id, isActive: true, createdBy: 'system' });
    });
  }

  await prisma.chartOfAccount.createMany({ data: accounts });
  console.log(`✓ ChartOfAccount: ${accounts.length} records`);
  return accounts.length;
}

async function seedRevenues() {
  console.log('Seeding Revenue...');
  
  const sources = await prisma.revenueSource.findMany();
  const paymentMethods = await prisma.paymentMethod.findMany();
  const busTrips = await prisma.busTripCache.findMany({ take: 30 });
  
  // We cannot use createMany with generated codes, so we'll create individually
  let createdCount = 0;

  for (let i = 1; i <= 50; i++) {
    const source = randomItem(sources);
    const paymentMethod = randomItem(paymentMethods);
    const transactionDate = randomPastDate(1);
    
    let externalRefType = null;
    let externalRefId = null;
    let busTripCacheId = null;
    
    // 60% chance of being linked to a bus trip
    if (Math.random() > 0.4 && busTrips.length > 0) {
      const busTrip = randomItem(busTrips);
      externalRefType = 'BUS_TRIP';
      externalRefId = busTrip.assignmentId;
      busTripCacheId = busTrip.id;
    }
    
    // Generate revenue code based on transaction date
    const revenueCode = await generateRevenueCode(transactionDate);
    
    await prisma.revenue.create({
      data: {
        revenueCode: revenueCode,
        sourceId: source.id,
        description: `${source.name} - ${faker.company.catchPhrase()}`,
        amount: parseFloat((1000 + Math.random() * 49000).toFixed(2)),
        transactionDate: transactionDate,
        paymentMethodId: paymentMethod.id,
        busTripCacheId: busTripCacheId,
        externalRefId: externalRefId,
        externalRefType: externalRefType,
        isAccountsReceivable: Math.random() > 0.7,
        arDueDate: Math.random() > 0.7 ? randomFutureDate(3) : null,
        arStatus: Math.random() > 0.7 ? randomItem(['PENDING', 'PAID', 'OVERDUE']) : null,
        isInstallment: Math.random() > 0.9,
        createdBy: 'admin',
      },
    });
    
    createdCount++;
  }

  console.log(`✓ Revenue: ${createdCount} records`);
  return createdCount;
}

async function seedExpenses() {
  console.log('Seeding Expense...');
  
  const categories = await prisma.expenseCategory.findMany();
  const paymentMethods = await prisma.paymentMethod.findMany();
  
  const expenses: Prisma.ExpenseCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const category = randomItem(categories);
    const paymentMethod = randomItem(paymentMethods);
    const transactionDate = randomPastDate(1);
    
    expenses.push({
      categoryId: category.id,
      description: `${category.name} - ${faker.commerce.productDescription()}`,
      amount: parseFloat((500 + Math.random() * 29500).toFixed(2)),
      transactionDate: transactionDate,
      paymentMethodId: paymentMethod.id,
      isPayable: Math.random() > 0.6,
      payableDueDate: Math.random() > 0.6 ? randomFutureDate(2) : null,
      payableStatus: Math.random() > 0.6 ? randomItem(['PENDING', 'PAID', 'OVERDUE']) : null,
      createdBy: 'admin',
      approvedBy: Math.random() > 0.3 ? 'owner' : null,
    });
  }

  await prisma.expense.createMany({ data: expenses });
  console.log(`✓ Expense: ${expenses.length} records`);
  return expenses.length;
}

async function seedBudgetAllocations() {
  console.log('Seeding BudgetAllocation...');
  
  const categories = await prisma.expenseCategory.findMany();
  const periodTypes = await prisma.budgetPeriodType.findMany();
  
  const allocations: Prisma.BudgetAllocationCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const category = randomItem(categories);
    const periodType = randomItem(periodTypes);
    const startDate = randomPastDate(0.5);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3); // 3 months duration
    
    const allocatedAmount = parseFloat((50000 + Math.random() * 450000).toFixed(2));
    const consumedAmount = parseFloat((Math.random() * allocatedAmount * 0.8).toFixed(2));
    
    allocations.push({
      department: randomItem(['Operations', 'Finance', 'HR', 'Maintenance']),
      category: randomItem(['Personnel', 'Operating', 'Capital', 'Maintenance']),
      expenseCategoryId: category.id,
      allocatedAmount: allocatedAmount,
      consumedAmount: consumedAmount,
      availableAmount: allocatedAmount - consumedAmount,
      periodTypeId: periodType.id,
      periodStart: startDate,
      periodEnd: endDate,
      createdBy: 'admin',
      approvedBy: Math.random() > 0.2 ? 'owner' : null,
    });
  }

  await prisma.budgetAllocation.createMany({ data: allocations });
  console.log(`✓ BudgetAllocation: ${allocations.length} records`);
  return allocations.length;
}

async function seedBudgetRequests() {
  console.log('Seeding BudgetRequest...');
  
  const requestTypes = await prisma.budgetRequestType.findMany();
  const statuses = await prisma.budgetRequestStatus.findMany();
  const categories = await prisma.expenseCategory.findMany();
  
  const requests: Prisma.BudgetRequestCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const requestType = randomItem(requestTypes);
    const status = randomItem(statuses);
    const category = randomItem(categories);
    
    requests.push({
      department: randomItem(['Operations', 'Finance', 'HR', 'Maintenance']),
      category: randomItem(['Personnel', 'Operating', 'Capital', 'Maintenance']),
      requestedAmount: parseFloat((10000 + Math.random() * 490000).toFixed(2)),
      justification: faker.lorem.paragraph(),
      requestTypeId: requestType.id,
      statusId: status.id,
      requestedBy: `EMP${String(Math.floor(Math.random() * 50) + 1).padStart(5, '0')}`,
      reviewedBy: Math.random() > 0.3 ? 'admin' : null,
      approvedBy: Math.random() > 0.5 ? 'owner' : null,
    });
  }

  await prisma.budgetRequest.createMany({ data: requests });
  console.log(`✓ BudgetRequest: ${requests.length} records`);
  return requests.length;
}

async function seedLoans() {
  console.log('Seeding Loan...');
  
  const frequencies = await prisma.loanPaymentFrequencyType.findMany();
  const employees = await prisma.employeeCache.findMany();
  
  const loans: Prisma.LoanCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const frequency = randomItem(frequencies);
    const employee = randomItem(employees);
    const principal = parseFloat((5000 + Math.random() * 95000).toFixed(2));
    const interestRate = parseFloat((1 + Math.random() * 4).toFixed(2));
    const totalAmount = parseFloat((principal * (1 + interestRate / 100)).toFixed(2));
    const numberOfPayments = Math.floor(6 + Math.random() * 30); // 6 to 36 payments
    const paymentAmount = parseFloat((totalAmount / numberOfPayments).toFixed(2));
    const startDate = randomPastDate(2);
    
    loans.push({
      employeeNumber: employee.employeeNumber,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department || 'Operations',
      principalAmount: principal,
      interestRate: interestRate,
      totalAmount: totalAmount,
      balanceAmount: totalAmount, // Initially full amount
      paymentFrequencyId: frequency.id,
      numberOfPayments: numberOfPayments,
      paymentAmount: paymentAmount,
      applicationDate: randomPastDate(3),
      approvalDate: Math.random() > 0.3 ? randomPastDate(2.5) : null,
      startDate: Math.random() > 0.4 ? startDate : null,
      endDate: Math.random() > 0.4 ? randomFutureDate(24) : null,
      status: randomItem(['PENDING', 'APPROVED', 'RELEASED', 'FULLY_PAID', 'DEFAULTED']),
      createdBy: 'admin',
      approvedBy: Math.random() > 0.3 ? 'owner' : null,
    });
  }

  await prisma.loan.createMany({ data: loans });
  console.log(`✓ Loan: ${loans.length} records`);
  return loans.length;
}

async function seedPayrolls() {
  console.log('Seeding Payroll...');
  
  const employees = await prisma.payrollCache.findMany();
  
  const payrolls: Prisma.PayrollCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const employee = randomItem(employees);
    const periodStart = randomPastDate(1);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 15); // Semi-monthly
    
    const month = periodStart.toLocaleString('default', { month: 'long' });
    const year = periodStart.getFullYear();
    
    const grossAmount = parseFloat(employee.basicRate.toString()) * 2; // 2 employees worth
    const totalDeductions = parseFloat((grossAmount * 0.15).toFixed(2)); // 15% deductions
    const netAmount = grossAmount - totalDeductions;
    
    payrolls.push({
      payrollPeriod: `${month} ${year}`,
      frequency: 'SEMI_MONTHLY',
      periodStart: periodStart,
      periodEnd: periodEnd,
      grossAmount: grossAmount,
      totalDeductions: totalDeductions,
      netAmount: netAmount,
      totalAmount: netAmount,
      status: randomItem(['DRAFT', 'APPROVED', 'DISBURSED']),
      createdBy: 'admin',
      approvedBy: Math.random() > 0.3 ? 'owner' : null,
      disbursedBy: Math.random() > 0.5 ? 'finance' : null,
    });
  }

  await prisma.payroll.createMany({ data: payrolls });
  console.log(`✓ Payroll: ${payrolls.length} records`);
  return payrolls.length;
}

async function seedReimbursements() {
  console.log('Seeding Reimbursement...');
  
  const employees = await prisma.employeeCache.findMany();
  const expenses = await prisma.expense.findMany({ where: { isReimbursement: true }, take: 50 });
  
  // If no expenses marked for reimbursement, mark some
  if (expenses.length === 0) {
    console.log('⚠ No expenses found with isReimbursement=true, skipping reimbursements');
    return 0;
  }
  
  const reimbursements: Prisma.ReimbursementCreateManyInput[] = [];

  for (let i = 0; i < Math.min(50, expenses.length); i++) {
    const employee = randomItem(employees);
    const expense = expenses[i];
    const claimedAmount = parseFloat(expense.amount.toString());
    
    reimbursements.push({
      expenseId: expense.id,
      employeeNumber: employee.employeeNumber,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department || 'Operations',
      claimedAmount: claimedAmount,
      approvedAmount: Math.random() > 0.2 ? claimedAmount : parseFloat((claimedAmount * 0.9).toFixed(2)),
      status: randomItem(['PENDING', 'APPROVED', 'REJECTED', 'DISBURSED']),
      createdBy: employee.employeeNumber,
      approvedBy: Math.random() > 0.5 ? 'owner' : null,
      disbursedBy: Math.random() > 0.7 ? 'finance' : null,
    });
  }

  await prisma.reimbursement.createMany({ data: reimbursements });
  console.log(`✓ Reimbursement: ${reimbursements.length} records`);
  return reimbursements.length;
}

async function seedJournalEntries() {
  console.log('Seeding JournalEntry...');
  
  const journalEntries: Prisma.JournalEntryCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    const entryDate = randomPastDate(1);
    
    journalEntries.push({
      entryDate: entryDate,
      description: faker.lorem.sentence(),
      status: randomItem(['DRAFT', 'POSTED', 'APPROVED', 'VOID']),
      fiscalPeriod: `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`,
      preparedBy: 'admin',
      approvedBy: Math.random() > 0.3 ? 'owner' : null,
      postedBy: Math.random() > 0.5 ? 'accountant' : null,
    });
  }

  await prisma.journalEntry.createMany({ data: journalEntries });
  console.log(`✓ JournalEntry: ${journalEntries.length} records`);
  return journalEntries.length;
}

async function seedAuditLogs() {
  console.log('Seeding AuditLog...');
  
  const actions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];
  const modules = ['REVENUE', 'EXPENSE', 'BUDGET', 'PAYROLL', 'LOAN'];
  const recordTypes = ['Revenue', 'Expense', 'BudgetRequest', 'Payroll', 'Loan'];
  
  const auditLogs: Prisma.AuditLogCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    auditLogs.push({
      userId: `EMP${String(Math.floor(Math.random() * 50) + 1).padStart(5, '0')}`,
      userName: faker.person.fullName(),
      action: randomItem(actions),
      module: randomItem(modules),
      recordId: Math.floor(Math.random() * 50) + 1,
      recordType: randomItem(recordTypes),
      description: faker.lorem.sentence(),
      ipAddress: faker.internet.ipv4(),
      timestamp: randomPastDate(0.5),
    });
  }

  await prisma.auditLog.createMany({ data: auditLogs });
  console.log(`✓ AuditLog: ${auditLogs.length} records`);
  return auditLogs.length;
}

async function seedDashboardMetrics() {
  console.log('Seeding DashboardMetric...');
  
  const metrics: Prisma.DashboardMetricCreateManyInput[] = [];
  const metricNames = [
    'Total Revenue',
    'Total Expenses',
    'Net Profit',
    'Outstanding AR',
    'Outstanding AP',
    'Active Loans',
    'Budget Utilization',
    'Payroll Processed',
  ];

  for (let i = 1; i <= 50; i++) {
    const metricName = randomItem(metricNames);
    const metricKey = `${metricName.toLowerCase().replace(/\s+/g, '_')}_${i}`;
    
    metrics.push({
      metricKey: metricKey,
      metricName: metricName,
      metricValue: parseFloat((10000 + Math.random() * 990000).toFixed(2)),
      metricType: randomItem(['FINANCIAL', 'OPERATIONAL', 'HR']),
      periodType: randomItem(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL']),
      calculatedAt: randomPastDate(0.5),
    });
  }

  await prisma.dashboardMetric.createMany({ data: metrics });
  console.log(`✓ DashboardMetric: ${metrics.length} records`);
  return metrics.length;
}

async function seedFinanceNotifications() {
  console.log('Seeding FinanceNotification...');
  
  const notifications: Prisma.FinanceNotificationCreateManyInput[] = [];
  const notificationTypes = ['BUDGET_ALERT', 'APPROVAL_REQUEST', 'PAYMENT_DUE', 'REPORT_READY', 'SYSTEM_UPDATE'];
  const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

  for (let i = 1; i <= 50; i++) {
    const empNum = String(Math.floor(Math.random() * 50) + 1).padStart(5, '0');
    
    notifications.push({
      notificationType: randomItem(notificationTypes),
      title: faker.lorem.words(5),
      message: faker.lorem.sentence(),
      recipientUserId: `EMP${empNum}`,
      recipientUserName: faker.person.fullName(),
      recipientDepartment: randomItem(['Finance', 'Operations', 'HR', 'Maintenance']),
      priority: randomItem(priorities),
      isRead: Math.random() > 0.5,
      actionUrl: Math.random() > 0.5 ? `/admin/revenue/${Math.floor(Math.random() * 50) + 1}` : null,
    });
  }

  await prisma.financeNotification.createMany({ data: notifications });
  console.log(`✓ FinanceNotification: ${notifications.length} records`);
  return notifications.length;
}

// ============================================
// MAIN FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting core data seeding process...\n');
  console.log('═'.repeat(50));

  await clearAllData();

  console.log('📊 Seeding core data...\n');

  const results = {
    approvalAuthority: await seedApprovalAuthorities(),
    systemConfiguration: await seedSystemConfiguration(),
    employeeCache: await seedEmployeeCache(),
    payrollCache: await seedPayrollCache(),
    busTripCache: await seedBusTripCache(),
    chartOfAccount: await seedChartOfAccounts(),
    revenue: await seedRevenues(),
    expense: await seedExpenses(),
    budgetAllocation: await seedBudgetAllocations(),
    budgetRequest: await seedBudgetRequests(),
    loan: await seedLoans(),
    payroll: await seedPayrolls(),
    reimbursement: await seedReimbursements(),
    journalEntry: await seedJournalEntries(),
    auditLog: await seedAuditLogs(),
    dashboardMetric: await seedDashboardMetrics(),
    financeNotification: await seedFinanceNotifications(),
  };

  console.log('\n✅ Seeding completed successfully!');
  console.log('═'.repeat(50));
  console.log('Summary:');
  console.log(`  • ApprovalAuthority: ${results.approvalAuthority} records`);
  console.log(`  • SystemConfiguration: ${results.systemConfiguration} records`);
  console.log(`  • EmployeeCache: ${results.employeeCache} records`);
  console.log(`  • PayrollCache: ${results.payrollCache} records`);
  console.log(`  • BusTripCache: ${results.busTripCache} records`);
  console.log(`  • ChartOfAccount: ${results.chartOfAccount} records`);
  console.log(`  • Revenue: ${results.revenue} records`);
  console.log(`  • Expense: ${results.expense} records`);
  console.log(`  • BudgetAllocation: ${results.budgetAllocation} records`);
  console.log(`  • BudgetRequest: ${results.budgetRequest} records`);
  console.log(`  • Loan: ${results.loan} records`);
  console.log(`  • Payroll: ${results.payroll} records`);
  console.log(`  • Reimbursement: ${results.reimbursement} records`);
  console.log(`  • JournalEntry: ${results.journalEntry} records`);
  console.log(`  • AuditLog: ${results.auditLog} records`);
  console.log(`  • DashboardMetric: ${results.dashboardMetric} records`);
  console.log(`  • FinanceNotification: ${results.financeNotification} records`);
  console.log('═'.repeat(50));
  console.log(`\n📈 Total records seeded: ${Object.values(results).reduce((a, b) => a + b, 0)}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
