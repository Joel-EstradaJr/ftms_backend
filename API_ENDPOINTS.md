# FTMS Backend API Endpoints

**Base URL:** `http://localhost:4000` (configurable via PORT environment variable)

**API Version:** v1

---

## Table of Contents

1. [General Endpoints](#general-endpoints)
2. [Admin Routes](#admin-routes)
3. [Staff Routes](#staff-routes)
4. [Integration Routes](#integration-routes)
5. [Summary](#summary)

---

## General Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/health` | Health check endpoint with uptime and environment info |

---

## Admin Routes

**Base Path:** `/api/v1/admin`

**Authentication:** Required (admin role)

### Chart of Accounts

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| GET | `/api/v1/admin/chart-of-accounts` | `http://localhost:4000/api/v1/admin/chart-of-accounts` | List all chart of accounts with filtering, search, pagination |
| GET | `/api/v1/admin/chart-of-accounts/:id` | `http://localhost:4000/api/v1/admin/chart-of-accounts/:id` | Get single chart of account details |
| GET | `/api/v1/admin/chart-of-accounts/suggest-code/:accountTypeId` | `http://localhost:4000/api/v1/admin/chart-of-accounts/suggest-code/:accountTypeId` | Get suggested next account code |
| POST | `/api/v1/admin/chart-of-accounts` | `http://localhost:4000/api/v1/admin/chart-of-accounts` | Create new chart of account |
| PATCH | `/api/v1/admin/chart-of-accounts/:id` | `http://localhost:4000/api/v1/admin/chart-of-accounts/:id` | Update chart of account |
| PATCH | `/api/v1/admin/chart-of-accounts/:id/archive` | `http://localhost:4000/api/v1/admin/chart-of-accounts/:id/archive` | Archive chart of account (soft delete) |
| PATCH | `/api/v1/admin/chart-of-accounts/:id/restore` | `http://localhost:4000/api/v1/admin/chart-of-accounts/:id/restore` | Restore archived chart of account |
| DELETE | `/api/v1/admin/chart-of-accounts/:id` | `http://localhost:4000/api/v1/admin/chart-of-accounts/:id` | Hard delete chart of account |
| POST | `/api/v1/admin/account-types` | `http://localhost:4000/api/v1/admin/account-types` | Create new account type |

### Payroll Periods

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| GET | `/api/v1/admin/payroll-periods` | `http://localhost:4000/api/v1/admin/payroll-periods` | List all payroll periods with filters |
| POST | `/api/v1/admin/payroll-periods` | `http://localhost:4000/api/v1/admin/payroll-periods` | Create new payroll period |
| GET | `/api/v1/admin/payroll-periods/stats` | `http://localhost:4000/api/v1/admin/payroll-periods/stats` | Get payroll statistics |
| GET | `/api/v1/admin/payroll-periods/:id` | `http://localhost:4000/api/v1/admin/payroll-periods/:id` | Get payroll period by ID with employee details |
| PATCH | `/api/v1/admin/payroll-periods/:id` | `http://localhost:4000/api/v1/admin/payroll-periods/:id` | Update payroll period |
| DELETE | `/api/v1/admin/payroll-periods/:id` | `http://localhost:4000/api/v1/admin/payroll-periods/:id` | Delete payroll period (soft delete) |
| POST | `/api/v1/admin/payroll-periods/:id/process` | `http://localhost:4000/api/v1/admin/payroll-periods/:id/process` | Process payroll - fetch employees and create records |
| POST | `/api/v1/admin/payroll-periods/:id/release` | `http://localhost:4000/api/v1/admin/payroll-periods/:id/release` | Release payroll period |
| GET | `/api/v1/admin/payroll-periods/:id/payrolls/:payrollId/payslip` | `http://localhost:4000/api/v1/admin/payroll-periods/:id/payrolls/:payrollId/payslip` | Get payslip for specific employee payroll |

---

## Staff Routes

**Base Path:** `/api/v1/staff`

**Authentication:** Required (staff role)

**⚠️ Status:** Currently commented out in `src/app.ts` due to compilation errors. Route files exist but are not active.

### Revenues

**Path:** `/api/v1/staff/revenues`

**Permissions:** View and create only (no edit/delete)

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/revenues` | `http://localhost:4000/api/v1/staff/revenues` | List revenues with limited filters | ⚠️ Inactive |
| POST | `/api/v1/staff/revenues` | `http://localhost:4000/api/v1/staff/revenues` | Create new revenue | ⚠️ Inactive |
| GET | `/api/v1/staff/revenues/:id` | `http://localhost:4000/api/v1/staff/revenues/:id` | Get revenue details | ⚠️ Inactive |

### Expenses

**Path:** `/api/v1/staff/expenses`

**Permissions:** View and create only (large amounts require admin approval)

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/expenses` | `http://localhost:4000/api/v1/staff/expenses` | List expenses | ⚠️ Inactive |
| POST | `/api/v1/staff/expenses` | `http://localhost:4000/api/v1/staff/expenses` | Create new expense | ⚠️ Inactive |
| GET | `/api/v1/staff/expenses/:id` | `http://localhost:4000/api/v1/staff/expenses/:id` | Get expense details | ⚠️ Inactive |

### Payrolls

**Path:** `/api/v1/staff/payrolls`

**Permissions:** View own records only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/payrolls` | `http://localhost:4000/api/v1/staff/payrolls` | List own payroll records | ⚠️ Inactive |
| GET | `/api/v1/staff/payrolls/:id` | `http://localhost:4000/api/v1/staff/payrolls/:id` | Get payroll details | ⚠️ Inactive |

### Reimbursements

**Path:** `/api/v1/staff/reimbursements`

**Permissions:** Full CRUD for own pending reimbursements

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/reimbursements` | `http://localhost:4000/api/v1/staff/reimbursements` | List reimbursements | ⚠️ Inactive |
| POST | `/api/v1/staff/reimbursements` | `http://localhost:4000/api/v1/staff/reimbursements` | Create new reimbursement | ⚠️ Inactive |
| GET | `/api/v1/staff/reimbursements/:id` | `http://localhost:4000/api/v1/staff/reimbursements/:id` | Get reimbursement details | ⚠️ Inactive |
| PUT | `/api/v1/staff/reimbursements/:id` | `http://localhost:4000/api/v1/staff/reimbursements/:id` | Update reimbursement (pending only) | ⚠️ Inactive |
| DELETE | `/api/v1/staff/reimbursements/:id` | `http://localhost:4000/api/v1/staff/reimbursements/:id` | Delete reimbursement (pending only) | ⚠️ Inactive |

### Budgets

**Path:** `/api/v1/staff/budgets`

**Permissions:** Read-only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/budgets` | `http://localhost:4000/api/v1/staff/budgets` | List department budgets | ⚠️ Inactive |
| GET | `/api/v1/staff/budgets/:id` | `http://localhost:4000/api/v1/staff/budgets/:id` | Get budget details | ⚠️ Inactive |

### Journal Entries

**Path:** `/api/v1/staff/journalEntries`

**Permissions:** Read-only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/journalEntries` | `http://localhost:4000/api/v1/staff/journalEntries` | List journal entries | ⚠️ Inactive |
| GET | `/api/v1/staff/journalEntries/:id` | `http://localhost:4000/api/v1/staff/journalEntries/:id` | Get journal entry details | ⚠️ Inactive |

### Assets

**Path:** `/api/v1/staff/assets`

**Permissions:** Read-only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/assets` | `http://localhost:4000/api/v1/staff/assets` | List assets | ⚠️ Inactive |
| GET | `/api/v1/staff/assets/:id` | `http://localhost:4000/api/v1/staff/assets/:id` | Get asset details | ⚠️ Inactive |
| GET | `/api/v1/staff/assets/:id/depreciation` | `http://localhost:4000/api/v1/staff/assets/:id/depreciation` | Calculate asset depreciation | ⚠️ Inactive |

### Receivables

**Path:** `/api/v1/staff/receivables`

**Permissions:** Read-only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/receivables` | `http://localhost:4000/api/v1/staff/receivables` | List receivables | ⚠️ Inactive |
| GET | `/api/v1/staff/receivables/:id` | `http://localhost:4000/api/v1/staff/receivables/:id` | Get receivable details | ⚠️ Inactive |

### Payables

**Path:** `/api/v1/staff/payables`

**Permissions:** Read-only

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/payables` | `http://localhost:4000/api/v1/staff/payables` | List payables | ⚠️ Inactive |
| GET | `/api/v1/staff/payables/:id` | `http://localhost:4000/api/v1/staff/payables/:id` | Get payable details | ⚠️ Inactive |

### Loans

**Path:** `/api/v1/staff/loans`

**Permissions:** Request loans and view own loans

| Method | Route | Full URL | Description | Status |
|--------|-------|----------|-------------|--------|
| GET | `/api/v1/staff/loans` | `http://localhost:4000/api/v1/staff/loans` | List own loans | ⚠️ Inactive |
| POST | `/api/v1/staff/loans` | `http://localhost:4000/api/v1/staff/loans` | Submit loan request | ⚠️ Inactive |
| GET | `/api/v1/staff/loans/:id` | `http://localhost:4000/api/v1/staff/loans/:id` | Get loan details | ⚠️ Inactive |
| GET | `/api/v1/staff/loans/:id/repayments` | `http://localhost:4000/api/v1/staff/loans/:id/repayments` | Get repayment schedule | ⚠️ Inactive |

---

## Integration Routes

**Base Path:** `/api/integration`

**Authentication:** Service API key required

**Purpose:** Machine-to-machine communication between microservices

### Health Check

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| GET | `/api/integration/health` | `http://localhost:4000/api/integration/health` | Integration service health check |

### Budget Integration

**Path:** `/api/integration/budgets`

| Method | Route | Full URL | Description | Permission |
|--------|-------|----------|-------------|------------|
| POST | `/api/integration/budgets/reserve` | `http://localhost:4000/api/integration/budgets/reserve` | Reserve budget funds | Write required |
| GET | `/api/integration/budgets/department/:department` | `http://localhost:4000/api/integration/budgets/department/:department` | Get department budget information | Read-only |

---

## Summary

### Statistics

- **Total Active Endpoints:** 16
  - General: 2
  - Admin: 11
  - Integration: 3
- **Total Inactive Endpoints:** 39 (Staff routes)
- **Total Endpoints:** 55

### Configuration

- **Default Port:** 4000 (configurable via `PORT` environment variable)
- **Authentication:** Configurable via `ENABLE_AUTH` environment variable
  - Currently: `false` (disabled for testing)
  - Production: Should be `true`
- **Base URL (Local):** `http://localhost:4000`
- **Base URL (Production):** Configured via deployment environment

### External Service URLs

The backend integrates with:
- **HR Service:** `https://backends-blue.vercel.app`
  - Employees: `/api/clean/hr_employees`
  - Payroll: `/api/clean/hr_payroll`
- **Operations Service:** `https://backends-blue.vercel.app`
  - Bus Trips: `/api/clean/op_bus-trip-details`

### Notes

1. **Staff Routes Status:** All staff routes are currently commented out in `src/app.ts` (lines 12-22) due to compilation errors. The route files exist and are properly configured, but need to be uncommented after resolving the compilation issues.

2. **Authentication:** The `ENABLE_AUTH` environment variable is currently set to `false` for testing purposes. In production, this should be enabled for security.

3. **CORS Origins:** Currently configured to allow:
   - `http://localhost:3001`
   - `http://localhost:3002`
   - `http://localhost:4003`
   - `http://localhost:4004`

4. **Rate Limiting:** 
   - Window: 15 minutes (900000ms)
   - Max requests: 100 per window

5. **Request Body Limits:** 10MB for JSON and URL-encoded data

---

## Development

### Starting the Server

```bash
npm start
```

### Health Check

```bash
curl http://localhost:4000/health
```

### API Information

```bash
curl http://localhost:4000/
```

---

**Last Updated:** January 9, 2026
