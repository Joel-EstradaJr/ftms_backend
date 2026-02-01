# Audit Log Integration - Finance Backend

This document provides a comprehensive overview of the Audit Logs microservice integration with the finance_backend project.

## Overview

The Audit Logs microservice has been integrated into the finance_backend to record all relevant backend actions according to the defined audit action types:

- **CREATE** - New record creation
- **UPDATE** - Record modification
- **DELETE** - Record removal
- **ARCHIVE** - Soft delete/archival
- **UNARCHIVE** - Restoration from archive
- **APPROVE** - Approval workflow actions
- **REJECT** - Rejection workflow actions
- **EXPORT** - Data export operations
- **IMPORT** - Data import operations

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Audit Logs Microservice
AUDIT_LOGS_MICRO_BASE_API_URL=https://agilaaudit-production.up.railway.app
AUDIT_LOGS_API_KEY=your_finance_api_key_here
```

## Audit Client

**File:** [src/integrations/audit/audit.client.ts](src/integrations/audit/audit.client.ts)

The centralized `AuditLogClient` class handles all audit logging with:
- Non-blocking async calls (5-second timeout)
- Graceful error handling (logs warning on failure)
- Automatic payload validation based on action type
- Standardized entity type constants

### Available Methods

| Method | Action Type | Previous Data | New Data |
|--------|-------------|---------------|----------|
| `logCreate()` | CREATE | ❌ null | ✅ Required |
| `logUpdate()` | UPDATE | ✅ Required | ✅ Required |
| `logDelete()` | DELETE | ✅ Required | ❌ null |
| `logArchive()` | ARCHIVE | ❌ Optional | ✅ Required |
| `logUnarchive()` | UNARCHIVE | ❌ Optional | ✅ Required |
| `logApprove()` | APPROVE | ❌ Optional | ❌ Optional |
| `logReject()` | REJECT | ❌ Optional | ❌ Optional |
| `logExport()` | EXPORT | ❌ N/A | ❌ N/A |
| `logImport()` | IMPORT | ❌ N/A | ❌ N/A |

---

## Audited Endpoints by Service

### 1. Account Type Service

**File:** [src/services/accountType.service.ts](src/services/accountType.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `create()` | CREATE | account_type | Logs new account type data |
| `update()` | UPDATE | account_type | Logs previous and new data |
| `archive()` | ARCHIVE | account_type | Logs archived status |
| `restore()` | UNARCHIVE | account_type | Logs restored status |
| `delete()` | DELETE | account_type | Logs deleted record |

### 2. Chart of Account Service

**File:** [src/services/chartOfAccount.service.ts](src/services/chartOfAccount.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `create()` | CREATE | chart_of_account | Logs new account data |
| `update()` | UPDATE | chart_of_account | Logs previous and new data |
| `archive()` | ARCHIVE | chart_of_account | Logs archived status |
| `restore()` | UNARCHIVE | chart_of_account | Logs restored status |
| `delete()` | DELETE | chart_of_account | Logs deleted record |

### 3. Expense Service

**File:** [src/services/expense.service.ts](src/services/expense.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createExpense()` | CREATE | expense | Logs new expense data |
| `updateExpense()` | UPDATE | expense | Logs previous and new data |
| `deleteExpense()` | DELETE | expense | Logs deleted expense |
| `archiveExpense()` | ARCHIVE | expense | Logs archived expense |
| `unarchiveExpense()` | UNARCHIVE | expense | Logs restored expense |

### 4. Journal Entry Service

**File:** [src/services/journalEntry.service.ts](src/services/journalEntry.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createJournalEntry()` | CREATE | journal_entry | Logs new journal entry |
| `updateJournalEntry()` | UPDATE | journal_entry | Logs previous and new data |
| `deleteJournalEntry()` | DELETE | journal_entry | Logs deleted entry |
| `archiveJournalEntry()` | ARCHIVE | journal_entry | Logs archived entry |
| `unarchiveJournalEntry()` | UNARCHIVE | journal_entry | Logs restored entry |

### 5. Accounts Payable Service

**File:** [src/services/payable.service.ts](src/services/payable.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createPayable()` | CREATE | accounts_payable | Logs new payable |
| `updatePayable()` | UPDATE | accounts_payable | Logs previous and new data |
| `deletePayable()` | DELETE | accounts_payable | Logs deleted payable |
| `archivePayable()` | ARCHIVE | accounts_payable | Logs archived payable |
| `unarchivePayable()` | UNARCHIVE | accounts_payable | Logs restored payable |

### 6. Accounts Receivable Service

**File:** [src/services/receivable.service.ts](src/services/receivable.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createReceivable()` | CREATE | accounts_receivable | Logs new receivable |
| `updateReceivable()` | UPDATE | accounts_receivable | Logs previous and new data |
| `deleteReceivable()` | DELETE | accounts_receivable | Logs deleted receivable |
| `archiveReceivable()` | ARCHIVE | accounts_receivable | Logs archived receivable |
| `unarchiveReceivable()` | UNARCHIVE | accounts_receivable | Logs restored receivable |

### 7. Bus Trip Revenue Service

**File:** [src/services/busTripRevenue.service.ts](src/services/busTripRevenue.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createBusTripRevenue()` | CREATE | bus_trip_revenue | Logs new revenue record |
| `updateBusTripRevenue()` | UPDATE | bus_trip_revenue | Logs previous and new data |
| `deleteBusTripRevenue()` | DELETE | bus_trip_revenue | Logs deleted record |
| `archiveBusTripRevenue()` | ARCHIVE | bus_trip_revenue | Logs archived record |
| `unarchiveBusTripRevenue()` | UNARCHIVE | bus_trip_revenue | Logs restored record |

### 8. Rental Revenue Service

**File:** [src/services/rentalRevenue.service.ts](src/services/rentalRevenue.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createRentalRevenue()` | CREATE | rental_revenue | Logs new rental revenue |
| `updateRentalRevenue()` | UPDATE | rental_revenue | Logs previous and new data |
| `deleteRentalRevenue()` | DELETE | rental_revenue | Logs deleted record |
| `archiveRentalRevenue()` | ARCHIVE | rental_revenue | Logs archived record |
| `unarchiveRentalRevenue()` | UNARCHIVE | rental_revenue | Logs restored record |

### 9. Other Revenue Service

**File:** [src/services/otherRevenue.service.ts](src/services/otherRevenue.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createOtherRevenue()` | CREATE | other_revenue | Logs new other revenue |
| `approveOtherRevenue()` | APPROVE | other_revenue | Logs approval with new status |
| `rejectOtherRevenue()` | REJECT | other_revenue | Logs rejection with reason |
| `updateOtherRevenue()` | UPDATE | other_revenue | Logs previous and new data |

### 10. Attachment Service

**File:** [src/services/attachment.service.ts](src/services/attachment.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `createAttachment()` | CREATE | attachment | Logs new attachment metadata |
| `updateAttachment()` | UPDATE | attachment | Logs previous and new metadata |
| `deleteAttachment()` | DELETE | attachment | Logs deleted attachment |

### 11. Approval Service (Cash Advance)

**File:** [src/services/approval.service.ts](src/services/approval.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `receiveCashAdvance()` | CREATE | cash_advance | Logs new cash advance request |
| `updateStatus()` (approved) | APPROVE | cash_advance | Logs approval with remarks |
| `updateStatus()` (rejected) | REJECT | cash_advance | Logs rejection with remarks |
| `updateStatus()` (other) | UPDATE | cash_advance | Logs status change |

### 12. Budget Allocation Service

**File:** [src/services/budgetAllocation.service.ts](src/services/budgetAllocation.service.ts)

| Operation | Action Type | Entity Type | Notes |
|-----------|-------------|-------------|-------|
| `allocateBudget()` | CREATE | budget_allocation | Logs new allocation |
| `deductBudget()` | CREATE | budget_allocation | Logs deduction as new record |

---

## Entity Types Reference

The following entity types are defined in `AuditEntityTypes`:

```typescript
const AuditEntityTypes = {
  EXPENSE: 'expense',
  JOURNAL_ENTRY: 'journal_entry',
  BUDGET_ALLOCATION: 'budget_allocation',
  PURCHASE_REQUEST: 'purchase_request',
  CASH_ADVANCE: 'cash_advance',
  BUS_TRIP_REVENUE: 'bus_trip_revenue',
  RENTAL_REVENUE: 'rental_revenue',
  OTHER_REVENUE: 'other_revenue',
  PAYROLL_PERIOD: 'payroll_period',
  ACCOUNTS_PAYABLE: 'accounts_payable',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  CHART_OF_ACCOUNT: 'chart_of_account',
  ACCOUNT_TYPE: 'account_type',
  OPERATIONAL_EXPENSE: 'operational_expense',
  SUPPLIER: 'supplier',
  ATTACHMENT: 'attachment'
};
```

---

## Usage Example

### Basic CREATE Audit

```typescript
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';

const auditClient = new AuditLogClient();

// After creating a new record
await auditClient.logCreate(
  AuditEntityTypes.EXPENSE,
  createdExpense.id.toString(),
  userId,
  req,           // Express Request object for IP extraction
  createdExpense // New data object
);
```

### UPDATE Audit

```typescript
// Fetch previous state BEFORE update
const previousData = await prisma.expense.findUnique({ where: { id } });

// Perform update
const updatedExpense = await prisma.expense.update({...});

// Log audit with both states
await auditClient.logUpdate(
  AuditEntityTypes.EXPENSE,
  id.toString(),
  userId,
  req,
  previousData,  // Previous state
  updatedExpense // New state
);
```

### ARCHIVE Audit

```typescript
await auditClient.logArchive(
  AuditEntityTypes.EXPENSE,
  id.toString(),
  userId,
  req,
  { id, archived: true, archivedAt: new Date() }
);
```

---

## Error Handling

The audit client is designed to be **non-blocking**:

1. All audit calls use a 5-second timeout
2. Failures are logged as warnings, not errors
3. Main operations complete regardless of audit success
4. Failed audit logs should be reviewed in application logs

```
[WARN] [AuditLogClient] Failed to send audit log: ...
```

---

## Files Summary

| File | Purpose |
|------|---------|
| `src/integrations/audit/audit.client.ts` | Centralized audit client |
| `src/services/accountType.service.ts` | Account type CRUD auditing |
| `src/services/chartOfAccount.service.ts` | Chart of account CRUD auditing |
| `src/services/expense.service.ts` | Expense CRUD auditing |
| `src/services/journalEntry.service.ts` | Journal entry CRUD auditing |
| `src/services/payable.service.ts` | Accounts payable CRUD auditing |
| `src/services/receivable.service.ts` | Accounts receivable CRUD auditing |
| `src/services/busTripRevenue.service.ts` | Bus trip revenue CRUD auditing |
| `src/services/rentalRevenue.service.ts` | Rental revenue CRUD auditing |
| `src/services/otherRevenue.service.ts` | Other revenue with approval auditing |
| `src/services/attachment.service.ts` | Attachment CRUD auditing |
| `src/services/approval.service.ts` | Cash advance approval auditing |
| `src/services/budgetAllocation.service.ts` | Budget allocation auditing |

---

## Audit API Endpoint

**Base URL:** `AUDIT_LOGS_MICRO_BASE_API_URL` environment variable

**Endpoint:** `POST /api/audit-logs`

**Headers:**
- `Content-Type: application/json`
- `x-api-key: {AUDIT_LOGS_API_KEY}`

**Payload Structure:**

```json
{
  "entity_type": "expense",
  "entity_id": "123",
  "action_type_code": "CREATE",
  "action_by": "user-uuid",
  "action_from": "192.168.1.1",
  "previous_data": null,
  "new_data": { ... }
}
```

---

## Testing

To verify audit logging is working:

1. Set up environment variables
2. Perform a CREATE/UPDATE/DELETE operation
3. Check the Audit Logs microservice dashboard or API for the logged action
4. Verify payload data matches expectations

---

*Last Updated: Integration completed with all CRUD, archive, and approval operations across 12 services.*
