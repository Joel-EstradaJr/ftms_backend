# FTMS Database Seeders

This directory contains comprehensive database seeding scripts for the Finance Transport Management System (FTMS).

## 📁 Available Seeders

### 1. `backup-seed_globals.ts` (or `seed_globals.ts`)
**Purpose:** Seeds global configuration and enum tables  
**Records:** 6-10 records per table  
**Tables covered:**
- ✅ PaymentMethod
- ✅ BudgetPeriodType
- ✅ LoanPaymentFrequencyType
- ✅ AccountType
- ✅ ExpenseCategory
- ✅ RevenueSource
- ✅ BudgetRequestType
- ✅ BudgetRequestStatus

### 2. `seed_core_data.ts` ⭐ NEW
**Purpose:** Seeds all remaining core business data  
**Records:** 50 records per table (configurable)  
**Tables covered:**
- ✅ ApprovalAuthority (8 records)
- ✅ SystemConfiguration (10 records)
- ✅ EmployeeCache (50 records)
- ✅ PayrollCache (50 records)
- ✅ BusTripCache (50 records)
- ✅ ChartOfAccount (40+ records)
- ✅ Revenue (50 records)
- ✅ Expense (50 records)
- ✅ BudgetAllocation (50 records)
- ✅ BudgetRequest (50 records)
- ✅ Loan (50 records)
- ✅ Payroll (50 records)
- ✅ Reimbursement (50 records)
- ✅ JournalEntry (50 records)
- ✅ AuditLog (50 records)
- ✅ DashboardMetric (50 records)
- ✅ FinanceNotification (50 records)

## 🚀 Installation

### Prerequisites
```bash
# Install Faker.js for realistic data generation
npm install -D @faker-js/faker
```

## 📝 Usage

### Step 1: Seed Global/Enum Tables FIRST
```bash
# This must be run first as other tables depend on these
npx tsx prisma/backup-seed_globals.ts
```

**Expected output:**
```
🌱 Starting seed process...
Clearing existing dynamic enum data...
Cleared existing data.

Seeding PaymentMethod...
✓ PaymentMethod: 6 records
Seeding BudgetPeriodType...
✓ BudgetPeriodType: 8 records
...

✅ Seeding completed successfully!
════════════════════════════════════════════════
Summary:
  • PaymentMethod: 6 records
  • BudgetPeriodType: 8 records
  ...
════════════════════════════════════════════════
```

### Step 2: Seed Core Business Data
```bash
# After globals are seeded, run this
npx tsx prisma/seed_core_data.ts
```

**Expected output:**
```
🌱 Starting core data seeding process...
══════════════════════════════════════════════════

🧹 Clearing existing core data...
  Clearing audit logs and notifications...
  Clearing financial reports and metrics...
  ...
✓ All existing data cleared.

📊 Seeding core data...

Seeding ApprovalAuthority...
✓ ApprovalAuthority: 8 records
Seeding SystemConfiguration...
✓ SystemConfiguration: 10 records
...

✅ Seeding completed successfully!
══════════════════════════════════════════════════
Summary:
  • ApprovalAuthority: 8 records
  • SystemConfiguration: 10 records
  • EmployeeCache: 50 records
  • PayrollCache: 50 records
  • BusTripCache: 50 records
  • ChartOfAccount: 40 records
  • Revenue: 50 records
  • Expense: 50 records
  • BudgetAllocation: 50 records
  • BudgetRequest: 50 records
  • Loan: 50 records
  • Payroll: 50 records
  • Reimbursement: 50 records
  • JournalEntry: 50 records
  • AuditLog: 50 records
  • DashboardMetric: 50 records
  • FinanceNotification: 50 records
══════════════════════════════════════════════════

📈 Total records seeded: 700+
```

## ⚠️ Important Notes

### Execution Order
**ALWAYS run in this order:**
1. ✅ Global/Enum tables first (`backup-seed_globals.ts`)
2. ✅ Core business data second (`seed_core_data.ts`)

**Why?** Core data has foreign key dependencies on global tables.

### Data Clearing
Both scripts **clear existing data** before seeding:
- Global seeder: Clears only global/enum tables
- Core seeder: Clears ALL core business data (respecting FK constraints)

⚠️ **WARNING:** This will delete all existing records in covered tables!

### Development vs Production
- ✅ **Development:** Safe to run anytime for testing
- ❌ **Production:** DO NOT RUN on production databases with real data!

## 🔧 Customization

### Change Number of Records
Edit `seed_core_data.ts` and modify the loop count:

```typescript
// Change from 50 to your desired number
for (let i = 1; i <= 100; i++) {  // Changed to 100
  // ...
}
```

### Add More Tables
To seed additional tables, add new functions following this pattern:

```typescript
async function seedYourTable() {
  console.log('Seeding YourTable...');
  
  // Fetch any required FK data
  const relatedData = await prisma.relatedTable.findMany();
  
  const records: Prisma.YourTableCreateManyInput[] = [];

  for (let i = 1; i <= 50; i++) {
    records.push({
      // Your fields here
      field1: faker.lorem.word(),
      field2: randomItem(relatedData).id,
      // ...
    });
  }

  await prisma.yourTable.createMany({ data: records });
  console.log(`✓ YourTable: ${records.length} records`);
  return records.length;
}
```

Then add to `main()` function:
```typescript
const results = {
  // ... existing
  yourTable: await seedYourTable(),
};
```

## 📊 Data Characteristics

### Realistic Data
- Uses `@faker-js/faker` for realistic names, addresses, descriptions
- Proper date ranges (past 2 years for historical data)
- Reasonable amounts and values
- Maintains referential integrity

### Foreign Key Relationships
All FK relationships are properly maintained:
- Revenue → RevenueSource, PaymentMethod, BusTripCache
- Expense → ExpenseCategory, PaymentMethod
- BudgetRequest → BudgetRequestType, BudgetRequestStatus
- Loan → LoanPaymentFrequencyType
- And more...

### Random Distribution
- 60% of revenues linked to bus trips
- 70% of revenues are accounts receivable
- 40% of expenses are accounts payable
- 80% of records approved
- Realistic status distributions

## 🐛 Troubleshooting

### Error: "Foreign key constraint failed"
**Solution:** Run global seeder first
```bash
npx tsx prisma/backup-seed_globals.ts
```

### Error: "Cannot find module '@faker-js/faker'"
**Solution:** Install faker
```bash
npm install -D @faker-js/faker
```

### Error: "Unique constraint failed"
**Solution:** Clear the database first
```bash
npx prisma migrate reset
npx tsx prisma/backup-seed_globals.ts
npx tsx prisma/seed_core_data.ts
```

### Slow Performance
**Solution:** The script uses `createMany()` for bulk inserts, which is already optimized. If still slow:
- Reduce number of records per table
- Check database connection
- Ensure indexes are applied

## 📚 Utility Functions

The core seeder includes helpful utility functions:

```typescript
// Generate random date within range
generateRandomDateWithin(yearsBack, yearsFuture)

// Generate random past date
randomPastDate(years)

// Generate random future date
randomFutureDate(months)

// Get random item from array
randomItem(array)

// Get multiple random items
randomItems(array, count)
```

## 🎯 Use Cases

### Development & Testing
```bash
# Full reset and reseed
npx prisma migrate reset
npx tsx prisma/backup-seed_globals.ts
npx tsx prisma/seed_core_data.ts
```

### Demo & Presentation
```bash
# Fresh data for demo
npx tsx prisma/seed_core_data.ts
```

### Testing Specific Features
```bash
# Comment out unwanted seed functions in main()
# Run only what you need
```

## 📄 License
Part of the FTMS project.

---

**Last Updated:** October 17, 2025  
**Maintainer:** Finance Development Team
