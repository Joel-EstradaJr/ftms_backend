# Archive / Unarchive / Delete Implementation

## Overview

This document describes the implementation of archive (soft delete), restore (unarchive), and hard delete functionality across all entity modules in the Finance Backend system.

## Implementation Date
- Date: January 2025
- Implemented by: System Enhancement

---

## Architecture

### Soft Delete (Archive) Pattern

All entities follow the same pattern using database columns:
- `is_deleted` (boolean) - Indicates if the record is archived
- `archived_by` (string) - User ID who archived the record
- `archived_at` (datetime) - Timestamp when the record was archived
- `deleted_by` (string) - User ID who permanently deleted the record
- `deleted_at` (datetime) - Timestamp when permanent deletion was recorded

### API Endpoints Pattern

For each entity, the following endpoints are available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/:id/archive` | Archive (soft delete) a record |
| PATCH | `/:id/restore` | Restore an archived record |
| DELETE | `/:id/permanent` | Permanently delete an archived record |

### Business Rules

1. **Archive (Soft Delete)**:
   - Sets `is_deleted = true`
   - Records `archived_by` (user ID) and `archived_at` (current timestamp)
   - Archived records are excluded from normal list queries

2. **Restore (Unarchive)**:
   - Sets `is_deleted = false`
   - Updates `archived_by` and `archived_at` to track who restored
   - Record becomes visible in normal queries again

3. **Hard Delete (Permanent)**:
   - Only allowed for records where `is_deleted = true`
   - Permanently removes the record from the database
   - Cascades to related records (e.g., journal lines, installments)
   - Records `deleted_by` and `deleted_at` before deletion for audit trail

---

## Automatic Cleanup Job

A scheduled job runs daily to automatically hard delete old archived records.

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `ARCHIVE_RETENTION_YEARS` | 5 | Years to retain archived records |
| `ARCHIVE_CLEANUP_SCHEDULE` | `0 2 * * *` | Cron schedule (2:00 AM daily) |

### File Location
`src/jobs/archiveCleanupJob.ts`

### Functions

- `initArchiveCleanupJob()` - Initialize the scheduled cleanup job
- `runArchiveCleanup()` - Manually trigger cleanup (for testing/admin)
- `getCleanupPreview()` - Preview records that would be deleted

### Tables Covered

The cleanup job processes the following tables:
- `journal_entry` (and `journal_entry_line`)
- `chart_of_account`
- `account_type`
- `revenue_type`
- `revenue`
- `expense`
- `expense_type`
- `payable`
- `receivable`
- `payroll_period`
- `payroll` (and `payroll_benefit`, `payroll_deduction`)
- `vendor`
- `employee`
- `department_local`
- `purchase_request`
- `purchase_request_item`
- `bus_trip_local`
- `bus_assignment_local`
- `driver_local`
- `conductor_local`
- `bus_local`
- `fixed_asset`
- `system_config`
- `revenue_installment_schedule`

---

## Modules Updated

### 1. Account Types

**Files Modified:**
- `src/services/accountType.service.ts`
- `src/controllers/accountType.controller.ts`
- `src/routes/admin/chart-of-accounts/index.ts`

**New Endpoints:**
- `PATCH /api/v1/admin/account-types/:id` - Update account type
- `PATCH /api/v1/admin/account-types/:id/archive` - Archive account type
- `PATCH /api/v1/admin/account-types/:id/restore` - Restore account type
- `DELETE /api/v1/admin/account-types/:id` - Hard delete account type

**Business Rules:**
- Cannot archive account type with active chart of accounts
- Can only hard delete archived account types

---

### 2. Journal Entries

**Files Modified:**
- `src/services/journalEntry.service.ts`
- `src/services/journalEntryAuto.service.ts`
- `src/controllers/journalEntry.controller.ts`
- `src/controllers/journalEntryAuto.controller.ts`
- `src/routes/journalEntry.routes.ts`

**New Endpoints:**
- `PATCH /api/v1/admin/journal-entry/:id/archive` - Archive journal entry
- `PATCH /api/v1/admin/journal-entry/:id/restore` - Restore journal entry
- `DELETE /api/v1/admin/journal-entry/:id/permanent` - Hard delete journal entry

**Business Rules:**
- Only DRAFT entries can be archived
- POSTED/APPROVED entries cannot be archived
- Hard delete removes journal lines as well

---

### 3. Bus Trip Revenue

**Files Modified:**
- `src/services/busTripRevenue.service.ts`
- `src/controllers/busTripRevenue.controller.ts`
- `src/routes/admin/bus-trip-revenue/index.ts`

**New Endpoints:**
- `PATCH /api/v1/admin/bus-trip-revenue/:id/archive` - Archive revenue
- `PATCH /api/v1/admin/bus-trip-revenue/:id/restore` - Restore revenue
- `DELETE /api/v1/admin/bus-trip-revenue/:id/permanent` - Hard delete revenue

**Business Rules:**
- Cannot archive revenue with pending/partial receivables
- Hard delete removes associated receivables and installment schedules

---

### 4. Rental Revenue

**Files Modified:**
- `src/services/rentalRevenue.service.ts`
- `src/controllers/rentalRevenue.controller.ts`
- `src/routes/admin/rental-revenue/index.ts`

**New Endpoints:**
- `PATCH /api/v1/admin/rental-revenue/:id/archive` - Archive rental revenue
- `PATCH /api/v1/admin/rental-revenue/:id/restore` - Restore rental revenue
- `DELETE /api/v1/admin/rental-revenue/:id/permanent` - Hard delete rental revenue

---

### 5. Payroll Periods

**Files Modified:**
- `src/services/payrollPeriod.service.ts`
- `src/controllers/adminPayrollPeriod.controller.ts`
- `src/routes/admin/payroll-periods/index.ts`

**New Endpoints:**
- `PATCH /api/v1/admin/payroll-periods/:id/archive` - Archive payroll period
- `PATCH /api/v1/admin/payroll-periods/:id/restore` - Restore payroll period
- `DELETE /api/v1/admin/payroll-periods/:id/permanent` - Hard delete payroll period

**Business Rules:**
- Cannot archive DRAFT or PARTIAL payroll periods (delete them instead)
- Only RELEASED/APPROVED periods can be archived
- Hard delete removes all associated payroll records (payroll, benefits, deductions)

---

### 6. Chart of Accounts (Already Implemented)

The Chart of Accounts module already had archive/restore/delete functionality:
- `PATCH /api/v1/admin/chart-of-accounts/:id/archive`
- `PATCH /api/v1/admin/chart-of-accounts/:id/restore`
- `DELETE /api/v1/admin/chart-of-accounts/:id`

---

## Server Initialization

The archive cleanup job is initialized on server startup:

**File:** `src/server.ts`

```typescript
import { initArchiveCleanupJob } from './jobs/archiveCleanupJob';

// In startServer():
initArchiveCleanupJob();
```

---

## API Response Format

All archive/restore/delete endpoints return consistent responses:

### Success Response

```json
{
  "success": true,
  "message": "Record archived/restored/deleted successfully",
  "data": { /* updated record */ }
}
```

### Error Responses

**400 Bad Request** - Business rule violation
```json
{
  "success": false,
  "error": "Cannot archive record with active dependencies"
}
```

**404 Not Found** - Record doesn't exist
```json
{
  "success": false,
  "error": "Record with ID X not found"
}
```

---

## Query Parameter: includeArchived

List endpoints support an optional query parameter to include archived records:

```
GET /api/v1/admin/account-types?includeArchived=true
GET /api/v1/admin/journal-entry?includeDeleted=true
```

---

## Audit Logging

All archive/restore/delete operations are logged via `AuditLogClient`:

- **Archive**: `logUpdate` with old/new `is_deleted` state
- **Restore**: `logUpdate` with old/new `is_deleted` state  
- **Hard Delete**: `logDelete` with full record snapshot

---

## Testing Checklist

### For Each Module:

- [ ] Archive a record - verify `is_deleted = true`
- [ ] Confirm archived records are excluded from list queries
- [ ] Restore an archived record - verify `is_deleted = false`
- [ ] Attempt to hard delete non-archived record - should fail
- [ ] Hard delete an archived record - verify permanent removal
- [ ] Verify business rule validations (e.g., no active dependencies)
- [ ] Verify audit logs are created

### Cleanup Job:

- [ ] Verify job initializes on server startup
- [ ] Run `getCleanupPreview()` to see records eligible for cleanup
- [ ] Run `runArchiveCleanup()` manually to verify cleanup works
- [ ] Confirm records older than retention period are deleted

---

## Migration Notes

No database migrations are required. The existing schema already has:
- `is_deleted`
- `archived_by`
- `archived_at`
- `deleted_by`
- `deleted_at`

columns on all relevant tables.

---

## Future Enhancements

1. **Frontend Integration**: Update frontend components to use new archive/restore endpoints
2. **Bulk Operations**: Add batch archive/restore/delete endpoints
3. **Undo Feature**: Allow immediate undo after archive (within time window)
4. **Export Before Delete**: Option to export data before permanent deletion
5. **Retention Policy UI**: Admin interface to configure retention periods
