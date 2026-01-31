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

**Authentication:** Service API key required (recommended for production)

**Purpose:** Machine-to-machine communication between microservices and external system data synchronization

### Health Check

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| GET | `/api/integration/health` | `http://localhost:4000/api/integration/health` | Integration service health check |

### HR Integration

**Path:** `/api/integration/hr`

**Purpose:** Synchronize employee data from external HR system

**External API:** `https://api.agilabuscorp.me/inventory/employees`

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| POST | `/api/integration/hr/sync-employees` | `http://localhost:4000/api/integration/hr/sync-employees` | Manually sync employees with provided payload |
| POST | `/api/integration/hr/fetch-and-sync` | `http://localhost:4000/api/integration/hr/fetch-and-sync` | Auto-fetch from HR API and sync to database |
| GET | `/api/integration/hr/employees/by-department/:departmentId` | `http://localhost:4000/api/integration/hr/employees/by-department/:departmentId` | Get employees by department ID |
| GET | `/api/integration/hr/employees/by-position` | `http://localhost:4000/api/integration/hr/employees/by-position?position=Driver` | Get employees by position name (query param) |

**Request Body Example (sync-employees):**
```json
{
  "employees": [
    {
      "employeeNumber": "EMP-2024-NKFN57",
      "firstName": "Juan",
      "middleName": "Reyes",
      "lastName": "Dela Cruz",
      "phone": "09171234567",
      "position": "HR Officer",
      "barangay": "Barangay Uno",
      "zipCode": "1100",
      "departmentId": 1,
      "department": "Human Resource"
    }
  ]
}
```

### HR Payroll Integration

**Path:** `/api/integration/hr_payroll`

**Purpose:** Synchronize payroll data from external HR system

**External API:** `https://api.agilabuscorp.me/finance/v2/payroll-integration`

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| GET | `/api/integration/hr_payroll` | `http://localhost:4000/api/integration/hr_payroll` | Get payroll data with optional filters |
| GET | `/api/integration/hr_payroll/periods` | `http://localhost:4000/api/integration/hr_payroll/periods` | Get available semi-monthly payroll periods |
| POST | `/api/integration/hr_payroll/fetch-and-sync` | `http://localhost:4000/api/integration/hr_payroll/fetch-and-sync` | Fetch from HR API and sync to database |
| POST | `/api/integration/hr_payroll/sync-period/:id` | `http://localhost:4000/api/integration/hr_payroll/sync-period/:id` | Recalculate totals for existing period |
| GET | `/api/integration/hr_payroll/by-period` | `http://localhost:4000/api/integration/hr_payroll/by-period` | Get payroll data for specific period |
| GET | `/api/integration/hr_payroll/by-employee/:employeeNumber` | `http://localhost:4000/api/integration/hr_payroll/by-employee/:employeeNumber` | Get employee payroll history |

**Request Body Example (fetch-and-sync):**
```json
{
  "period_start": "2024-01-01",
  "period_end": "2024-12-31",
  "employee_number": "EMP-2023-FIN-001"
}
```

**Response Example:**
```json
{
  "message": "Payroll sync completed",
  "success": true,
  "synced": 1,
  "errors": []
}
```

**Query Parameters (by-period):**
- `period_start` (required): YYYY-MM-DD
- `period_end` (required): YYYY-MM-DD

### Operations Integration - Bus Trips

**Path:** `/api/integration/operations`

**Purpose:** Synchronize operational bus trip data from external Operations system

**External API:** `https://boms-api.agilabuscorp.me/api/Bus-Trips-Details`

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| POST | `/api/integration/operations/sync-trips` | `http://localhost:4000/api/integration/operations/sync-trips` | Manually sync bus trips with provided payload |
| POST | `/api/integration/operations/fetch-and-sync-bus-trips` | `http://localhost:4000/api/integration/operations/fetch-and-sync-bus-trips` | Auto-fetch from Operations API and sync to database |
| GET | `/api/integration/operations/unrecorded-trips` | `http://localhost:4000/api/integration/operations/unrecorded-trips?type=all` | Get trips not yet recorded as revenue/expense (type: all/revenue/expense) |

**Request Body Example (sync-trips):**
```json
[
  {
    "assignment_id": "BA-xyz",
    "bus_trip_id": "BT-abc",
    "bus_route": "Sapang Palay - PITX",
    "is_revenue_recorded": false,
    "is_expense_recorded": false,
    "date_assigned": "2026-01-11T02:00:00.000Z",
    "trip_fuel_expense": 320,
    "trip_revenue": 2200,
    "assignment_type": "PERCENTAGE",
    "assignment_value": 0.22,
    "payment_method": "Reimbursement",
    "employee_driver": null,
    "employee_conductor": null,
    "bus_plate_number": "MPH 7643",
    "bus_type": "Aircon",
    "body_number": null
  }
]
```

### Operations Integration - Rental Trips

**Path:** `/api/integration/operations`

**Purpose:** Synchronize rental trip data from external Operations system

**External API:** `https://boms-api.agilabuscorp.me/api/Rental-Request-Details`

| Method | Route | Full URL | Description |
|--------|-------|----------|-------------|
| POST | `/api/integration/operations/sync-rental-trips` | `http://localhost:4000/api/integration/operations/sync-rental-trips` | Manually sync rental trips with provided payload |
| POST | `/api/integration/operations/fetch-and-sync-rental-trips` | `http://localhost:4000/api/integration/operations/fetch-and-sync-rental-trips` | Auto-fetch from Operations API and sync to database |
| GET | `/api/integration/operations/unrecorded-rental-trips` | `http://localhost:4000/api/integration/operations/unrecorded-rental-trips?type=all` | Get rental trips not yet recorded (type: all/revenue/expense) |
| GET | `/api/integration/operations/rental-trips/by-status` | `http://localhost:4000/api/integration/operations/rental-trips/by-status?status=approved` | Get rental trips by status (approved/completed/cancelled) |

**Request Body Example (sync-rental-trips):**
```json
[
  {
    "assignment_id": "BA-xyz",
    "bus_plate_number": "RPH 9080",
    "bus_type": "Non-Aircon",
    "body_number": "Unknown",
    "rental_status": "completed",
    "rental_details": {
      "rental_package": "Manila → Batangas Port",
      "rental_start_date": "2026-01-10T00:00:00.000Z",
      "rental_end_date": "2026-01-11T00:00:00.000Z",
      "total_rental_amount": 12500,
      "down_payment_amount": 5000,
      "balance_amount": 7500,
      "down_payment_date": "2026-01-10T00:00:00.000Z",
      "full_payment_date": "2026-01-07T00:00:00.000Z",
      "cancelled_at": null,
      "cancellation_reason": null
    },
    "employees": [
      {
        "employee_id": "EMP-2019-X9K979",
        "employee_firstName": null,
        "employee_middleName": null,
        "employee_lastName": null,
        "employee_position_name": "Driver"
      }
    ]
  }
]
```

### Budget Integration

**Path:** `/api/integration/budgets`

| Method | Route | Full URL | Description | Permission |
|--------|-------|----------|-------------|------------|
| POST | `/api/integration/budgets/reserve` | `http://localhost:4000/api/integration/budgets/reserve` | Reserve budget funds | Write required |
| GET | `/api/integration/budgets/department/:department` | `http://localhost:4000/api/integration/budgets/department/:department` | Get department budget information | Read-only |

---

## Summary

### Statistics

- **Total Active Endpoints:** 33
  - General: 2
  - Admin: 11
  - Integration: 20 (HR: 4, HR Payroll: 6, Operations: 7, Budget: 2, Health: 1)
- **Total Inactive Endpoints:** 39 (Staff routes)
- **Total Endpoints:** 72

### Configuration

- **Default Port:** 4000 (configurable via `PORT` environment variable)
- **Authentication:** Configurable via `ENABLE_AUTH` environment variable
  - Currently: `false` (disabled for testing)
  - Production: Should be `true`
- **Base URL (Local):** `http://localhost:4000`
- **Base URL (Production):** Configured via deployment environment

### External Service URLs

**Environment Variables (.env):**
```env
# HR System
HR_API_BASE_URL=https://api.agilabuscorp.me
HR_EMPLOYEES_ENDPOINT=/inventory/employees
HR_PAYROLL_ENDPOINT=/finance/v2/payroll-integration

# Operations System
OP_API_BASE_URL=https://boms-api.agilabuscorp.me
OP_BUS_TRIPS_ENDPOINT=/api/Bus-Trips-Details
OP_RENTAL_TRIPS_ENDPOINT=/api/Rental-Request-Details
```

The backend integrates with:
- **HR Service:** `https://api.agilabuscorp.me`
  - Employees: `/inventory/employees` (Sync employee master data)
  - Payroll: `/finance/v2/payroll-integration` (Sync payroll data with benefits/deductions)
- **Operations Service:** `https://boms-api.agilabuscorp.me`
  - Bus Trips: `/api/Bus-Trips-Details` (Sync operational trip data)
  - Rental Trips: `/api/Rental-Request-Details` (Sync rental trip data)

### Notes

1. **Staff Routes Status:** All staff routes are currently commented out in `src/app.ts` (lines 12-22) due to compilation errors. The route files exist and are properly configured, but need to be uncommented after resolving the compilation issues.

2. **Authentication:** The `ENABLE_AUTH` environment variable is currently set to `false` for testing purposes. In production, this should be enabled for security.

3. **External Integration:** New integration endpoints have been added for syncing data from external HR and Operations systems. These endpoints support:
   - Manual sync with provided payloads
   - Automatic fetch and sync from external APIs
   - Query helpers for retrieving synced data
   - Tracking flags to prevent duplicate revenue/expense recording

4. **Environment Configuration:** All external API URLs are now configured through environment variables. Update `.env` file with:
   ```env
   HR_API_BASE_URL=https://api.agilabuscorp.me
   HR_EMPLOYEES_ENDPOINT=/inventory/employees
   HR_PAYROLL_ENDPOINT=/finance/v2/payroll-integration
   OP_API_BASE_URL=https://boms-api.agilabuscorp.me
   OP_BUS_TRIPS_ENDPOINT=/api/Bus-Trips-Details
   OP_RENTAL_TRIPS_ENDPOINT=/api/Rental-Request-Details
   ```

5. **Payroll Integration:** The new payroll sync feature supports:
   - Fetching payroll data by period with optional employee filtering
   - Automatic creation/update of payroll periods
   - Syncing attendance records
   - Syncing benefits and deductions with frequency tracking
   - Automatic calculation of gross pay, deductions, and net pay
   - Support for different rate types (Weekly, Monthly, Daily, Hourly)

5. **Data Synchronization:** Integration routes sync data to:
   - `employees_cache` table (from HR)
   - `operational_trip` table (from Operations bus trips)
   - `rental_trip` table (from Operations rental trips)
   
   These tables are then referenced by `revenue` and `expense` records for financial tracking.

6. **CORS Origins:** Currently configured to allow:
   - `http://localhost:3001`
   - `http://localhost:3002`
   - `http://localhost:4003`
   - `http://localhost:4004`

7. **Rate Limiting:** 
   - Window: 15 minutes (900000ms)
   - Max requests: 100 per window

8. **Request Body Limits:** 10MB for JSON and URL-encoded data

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

**Last Updated:** January 11, 2026

**Recent Changes:**
- Added 11 new integration endpoints for HR and Operations data synchronization
- Configured external API URLs through environment variables
- Added tracking flags for revenue/expense recording prevention
- Updated external service documentation with current API endpoints
