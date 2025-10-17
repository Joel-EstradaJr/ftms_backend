# Revenue Helper Functions - Quick Reference Guide

## 📁 Files Created

| File | Size | Purpose |
|------|------|---------|
| `lib/revenues/busTripRevenue.ts` | 5.2 KB | Bus trip revenue creation |
| `lib/revenues/installments.ts` | 7.4 KB | Installment schedules |
| `lib/revenues/journalEntry.ts` | 10.7 KB | Journal entry management |
| `lib/revenues/validation.ts` | 8.8 KB | Validation helpers (existing, no changes) |

**Total**: 32.1 KB of production-ready business logic

---

## 🚀 Quick Start

### Bus Trip Revenue

```typescript
// Create revenue from bus trip
import { createRevenueFromBusTrip } from '@/lib/revenues/busTripRevenue';

const result = await createRevenueFromBusTrip({
  busTripCacheId: 1,
  userId: 'admin@example.com',
  overrideAmount: 8500, // Optional
  remarks: 'Special trip',
});

console.log(result.revenue.revenueCode); // clxxx...
```

### Installment Schedules

```typescript
// Create installment schedule
import { createInstallmentSchedule } from '@/lib/revenues/installments';

const schedule = await createInstallmentSchedule({
  type: 'REVENUE',
  totalAmount: 12000,
  numberOfPayments: 12,
  paymentAmount: 1000,
  frequency: 'MONTHLY',
  startDate: new Date(),
  createdBy: 'admin@example.com',
});

console.log(schedule.scheduleCode); // clxxx...
```

### Journal Entries

```typescript
// Create and post journal entry
import { createRevenueJournalEntry, postRevenueToGL } from '@/lib/revenues/journalEntry';

// 1. Create draft JE
const je = await createRevenueJournalEntry(1, 'admin@example.com');
console.log(je.status); // DRAFT

// 2. Post to GL
const posted = await postRevenueToGL(1, 'admin@example.com');
console.log(posted.status); // POSTED
```

---

## 📚 Function Reference

### busTripRevenue.ts (3 functions)

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `createRevenueFromBusTrip` | `params` | Revenue | Create revenue from bus trip |
| `isBusTripRevenueRecorded` | `assignmentId` | boolean | Check if trip has revenue |
| `getAvailableBusTrips` | `filters?` | BusTripCache[] | List available trips |

### installments.ts (7 functions)

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `createInstallmentSchedule` | `params` | Schedule | Create new schedule |
| `calculateEndDate` | `start, freq, count` | Date | Calculate end date |
| `generateInstallmentRecords` | `scheduleId` | Installment[] | Generate payment records |
| `validateInstallmentAmount` | `total, payment, count` | ValidationResult | Validate amounts |
| `updateInstallmentScheduleStatus` | `scheduleId, status` | Schedule | Update status |
| `getInstallmentScheduleWithPayments` | `scheduleId` | Schedule | Get full schedule |
| `recordInstallmentPayment` | `installmentId, amount, date` | Installment | Record payment |

### journalEntry.ts (4 functions)

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `createRevenueJournalEntry` | `revenueId, userId` | JournalEntry | Create draft JE |
| `postRevenueToGL` | `revenueId, userId` | JournalEntry | Post JE to GL |
| `reverseRevenue` | `revenueId, userId, reason` | JournalEntry | Create reversal |
| `isRevenuePosted` | `revenueId` | boolean | Check if posted |

---

## ⚡ Common Use Cases

### Use Case 1: Record Bus Trip Revenue
```typescript
import { getAvailableBusTrips, createRevenueFromBusTrip } from '@/lib/revenues/busTripRevenue';

// 1. Get trips without revenue
const trips = await getAvailableBusTrips({ limit: 10 });

// 2. Create revenue for first trip
if (trips.length > 0) {
  const result = await createRevenueFromBusTrip({
    busTripCacheId: trips[0].id,
    userId: 'admin@example.com',
  });
  
  console.log('Revenue created:', result.revenue.revenueCode);
}
```

### Use Case 2: Create Revenue with Installments
```typescript
import { createInstallmentSchedule, generateInstallmentRecords } from '@/lib/revenues/installments';

// 1. Create installment schedule
const schedule = await createInstallmentSchedule({
  type: 'REVENUE',
  totalAmount: 120000,
  numberOfPayments: 12,
  paymentAmount: 10000,
  frequency: 'MONTHLY',
  startDate: new Date('2025-11-01'),
  createdBy: 'admin@example.com',
});

// 2. Generate installment records
const installments = await generateInstallmentRecords(schedule.id);
console.log(`Created ${installments.length} installment records`);

// 3. Create revenue with this schedule (via API route)
// POST /api/revenue
// {
//   ...revenue data,
//   isInstallment: true,
//   installmentScheduleId: schedule.id
// }
```

### Use Case 3: Post Revenue to General Ledger
```typescript
import { createRevenueJournalEntry, postRevenueToGL } from '@/lib/revenues/journalEntry';

// After revenue is created and approved:

// 1. Create journal entry (if not exists)
const je = await createRevenueJournalEntry(revenueId, 'finance@example.com');

// 2. Review journal entry (manual step)
console.log('Journal Entry:', je.journalCode);
console.log('Line Items:', je.lineItems);

// 3. Post to GL
const posted = await postRevenueToGL(revenueId, 'finance@example.com');
console.log('Posted:', posted.status === 'POSTED');
```

### Use Case 4: Reverse Posted Revenue
```typescript
import { reverseRevenue } from '@/lib/revenues/journalEntry';

// Reverse a posted revenue entry
const reversal = await reverseRevenue(
  revenueId,
  'finance@example.com',
  'Duplicate entry - correcting'
);

console.log('Reversal created:', reversal.journalCode);
console.log('Original entry voided');
```

---

## 🔍 Error Handling

All functions throw descriptive errors:

```typescript
try {
  const result = await createRevenueFromBusTrip({ ... });
} catch (error) {
  console.error(error.message);
  // Possible errors:
  // - "Bus trip not found"
  // - "Revenue already recorded for this bus trip"
  // - "Revenue source not found"
  // - etc.
}
```

---

## 🐛 Troubleshooting

### Issue: TypeScript errors in IDE

**Solution**: Restart TypeScript server
```
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: "Property 'revenue' does not exist on type 'PrismaClient'"

**Cause**: TypeScript server cache  
**Solution**: Restart TS server or reload VS Code

### Issue: Database connection error

**Solution**: Check `.env` file
```env
DATABASE_URL="postgresql://user:password@localhost:5432/rev_ftms_db"
```

---

## 📊 Data Flow

### Bus Trip → Revenue Flow
```
1. Bus trip completed (BusTripCache created)
2. isRevenueRecorded = false
3. getAvailableBusTrips() → returns trip
4. createRevenueFromBusTrip() → creates Revenue
5. isRevenueRecorded = true
6. Audit log created
```

### Revenue → Journal Entry Flow
```
1. Revenue created (status: not posted)
2. createRevenueJournalEntry() → JournalEntry (DRAFT)
3. Review and approve
4. postRevenueToGL() → JournalEntry (POSTED)
5. Revenue linked to posted JE
6. Can only reverse, not edit/delete
```

### Installment Flow
```
1. createInstallmentSchedule() → InstallmentSchedule (ACTIVE)
2. generateInstallmentRecords() → Installment[] (PENDING)
3. Revenue created with installmentScheduleId
4. recordInstallmentPayment() for each payment
5. Track paidAmount, outstandingBalance, status
6. Schedule completed when all paid
```

---

## ✅ Validation Rules

### Bus Trip Revenue
- ✅ Bus trip must exist
- ✅ Bus trip must not already have revenue
- ✅ Amount must match trip revenue (unless overridden)
- ✅ Revenue source must be active
- ✅ Payment method must be active

### Installment Schedule
- ✅ Payment amount × number of payments must equal total amount (±0.01)
- ✅ Number of payments must be ≥ 2
- ✅ Payment amount must be > 0
- ✅ Start date must be valid

### Journal Entry
- ✅ Revenue must exist
- ✅ Chart of Accounts must have required accounts
- ✅ Journal entry must be balanced (debits = credits)
- ✅ Can only post DRAFT entries
- ✅ Can only reverse POSTED entries

---

## 🎯 Best Practices

### 1. Always use try-catch
```typescript
try {
  const result = await createRevenueFromBusTrip({ ... });
} catch (error) {
  // Handle error appropriately
  return { error: error.message };
}
```

### 2. Check before creating
```typescript
// Check if trip already has revenue
const hasRevenue = await isBusTripRevenueRecorded(assignmentId);
if (hasRevenue) {
  // Show warning or prevent creation
}
```

### 3. Validate before posting
```typescript
// Check if revenue is already posted
const isPosted = await isRevenuePosted(revenueId);
if (isPosted) {
  // Prevent editing
}
```

### 4. Use audit logs
All functions automatically create audit logs. Review them for troubleshooting:
```sql
SELECT * FROM audit_log 
WHERE module = 'REVENUE' 
AND record_id = 1
ORDER BY timestamp DESC;
```

---

## 📖 Additional Resources

- **Full Documentation**: `docs/revenue-helper-functions-COMPLETE.md`
- **Testing Guide**: `docs/revenue-api-testing-guide.md`
- **Action Plan**: `docs/revenue-action-plan.md`
- **API Routes**: `app/api/revenue/route.ts`
- **Prisma Schema**: `prisma/schema.prisma`

---

**Last Updated**: October 17, 2025  
**Status**: ✅ Production Ready
