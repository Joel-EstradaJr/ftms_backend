# Admin vs Staff Route Separation - Implementation Guide

## 📋 Overview

This document outlines the complete route separation between **Admin** and **Staff (Non-Admin)** users for the FTMS Finance Backend, ensuring proper data access restrictions as per your requirements.

## 🔐 Authentication & Authorization

### Middleware Stack
```typescript
// Admin routes
router.use(authenticate);        // JWT validation
router.use(authorize('admin'));  // Role check: admin

// Staff routes
router.use(authenticate);        // JWT validation
router.use(authorize('staff'));  // Role check: staff
```

### JWT Token Structure
```json
{
  "userId": "user123",
  "role": "admin" | "staff",
  "department": "Finance",
  "exp": 1234567890
}
```

## 📁 Route Structure

```
src/routes/
├── admin/                      # Admin-only routes (Full access)
│   ├── revenue.routes.ts       ✅ Implemented
│   ├── expense.routes.ts       ⏳ TODO
│   ├── payroll.routes.ts       ⏳ TODO
│   ├── loan.routes.ts          ⏳ TODO
│   ├── receivables.routes.ts   ⏳ TODO
│   ├── payables.routes.ts      ⏳ TODO
│   ├── budget.routes.ts        ⏳ TODO
│   ├── journal.routes.ts       ⏳ TODO
│   └── asset.routes.ts         ⏳ TODO
│
└── staff/                      # Staff-only routes (Limited access)
    ├── revenue.routes.ts       ✅ Implemented
    ├── expense.routes.ts       ⏳ TODO
    ├── payroll.routes.ts       ⏳ TODO
    ├── loan.routes.ts          ⏳ TODO
    ├── receivables.routes.ts   ⏳ TODO
    ├── payables.routes.ts      ⏳ TODO
    ├── budget.routes.ts        ⏳ TODO
    ├── journal.routes.ts       ⏳ TODO
    └── asset.routes.ts         ⏳ TODO
```

## 1️⃣ REVENUE MANAGEMENT

### Module 1.1: Trip Revenue Recording

#### **Admin Routes** (`/api/v1/admin/revenues`)
| Method | Endpoint | Action | Description |
|--------|----------|--------|-------------|
| GET | `/` | View Main Table | List all trip revenues with full filters |
| GET | `/:id` | View Detailed Modal | Get single revenue with all details |
| POST | `/` | Add New Record | Create new trip revenue |
| PUT | `/:id` | Edit Record | Update existing revenue (before approval) |
| DELETE | `/:id` | Delete Record (Soft) | Soft delete revenue |
| GET | `/export` | Export Data | Export to CSV/PDF ⏳ TODO |
| PATCH | `/:id/verify` | Mark as Verified | Toggle verification status ⏳ TODO |
| PATCH | `/:id/recalculate` | Recalculate Income | Recalculate if Operations data changes ⏳ TODO |

**Admin Filters (Full):**
- Date range (startDate, endDate)
- Revenue type (TRIP, RENTAL, OTHER)
- Trip type (if from Operations)
- Assignment type (boundary, percentage)
- Bus unit
- Driver/Conductor
- Verification status (isVerified)
- Soft delete status (isDeleted)
- Search (trip ID, bus number, driver name)
- Sort (date, amount, type)
- Pagination (page, limit)

#### **Staff Routes** (`/api/v1/staff/revenues`)
| Method | Endpoint | Action | Description |
|--------|----------|--------|-------------|
| GET | `/` | View Main Table | List trip revenues (limited filters) |
| GET | `/:id` | View Detailed Modal | Get single revenue details |
| POST | `/` | Add New Record | Create new trip revenue |

**Staff Filters (Limited):**
- Date range (startDate, endDate)
- Revenue type (revenueType)
- Search (trip ID, bus number)
- Sort (date, amount)
- Pagination (page, limit)

**Staff Restrictions:**
- ❌ Cannot edit records (no PUT)
- ❌ Cannot delete records (no DELETE)
- ❌ Cannot export data
- ❌ Cannot mark as verified/unverified
- ❌ Cannot recalculate income
- ❌ Limited filter options (no bus unit, driver/conductor filters)

### Module 1.2: Rental Revenue Recording

#### **Admin Routes** (Same endpoints as 1.1)
**Additional Admin Actions:**
- PATCH `/:id/downpayment` - Mark downpayment as received ⏳ TODO
- PATCH `/:id/balance` - Mark balance as received ⏳ TODO
- POST `/:id/receipt` - Link receipt/document ⏳ TODO

**Admin Filters (Full):**
- Date range
- Rental status
- Payment status
- Customer name
- Bus unit
- Search (rental ID, customer, bus unit)

#### **Staff Routes** (Same as 1.1)
**Staff Filters (Limited):**
- Date range
- Search (rental ID, customer)
- Sort (date)
- Pagination

**Staff Restrictions:**
- ❌ Cannot mark payments received
- ❌ Cannot edit/delete records

### Module 1.3: Other Revenue Recording

#### **Admin Routes** (Same endpoints as 1.1)
**Additional Admin Actions:**
- PUT `/:id/category` - Update revenue category ⏳ TODO
- POST `/:id/receipt` - Link receipt/document ⏳ TODO

**Admin Filters (Full):**
- Date range
- Revenue category (asset_sale, advertising, insurance, etc.)
- Search (description, category)
- Sort (date, amount, category)

#### **Staff Routes** (Same as 1.1)
**Staff Filters (Limited):**
- Date range
- Category
- Search (description)
- Sort (date, amount)

**Staff Restrictions:**
- ❌ Cannot edit/delete records

## 2️⃣ EXPENSE MANAGEMENT

### Module 2.1: Operational Expense Recording

#### **Admin Routes** (`/api/v1/admin/expenses`) ⏳ TODO
| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/` | View Main Table |
| GET | `/:id` | View Detailed Modal |
| POST | `/` | Add New Record |
| PUT | `/:id` | Edit Record |
| DELETE | `/:id` | Delete Record (Soft) |
| GET | `/export` | Export Data |
| PATCH | `/:id/approve` | Approve Expense |
| PATCH | `/:id/reject` | Reject Expense |

**Admin Filters:**
- Date range
- Expense category (fuel, toll, parking, allowances, etc.)
- Bus unit
- Approval status
- Search (description, bus number)

#### **Staff Routes** (`/api/v1/staff/expenses`) ⏳ TODO
| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/` | View Main Table |
| GET | `/:id` | View Detailed Modal |
| POST | `/` | Add New Record |

**Staff Filters (Limited):**
- Date range
- Category
- Search (description)
- Sort (date, amount)

**Staff Restrictions:**
- ❌ Cannot edit/delete
- ❌ Cannot approve/reject
- ❌ Expenses > ₱5,000 require Admin approval

### Module 2.2: Administrative Expense Recording

Same structure as 2.1 with different categories (supplies, utilities, permits, insurance, professional fees)

### Module 2.3: Purchase Expense Processing

#### **Admin Routes** (`/api/v1/admin/purchase-expenses`) ⏳ TODO
**Full Admin Actions:**
- Perform 2-way match (PR + Delivery Receipt)
- Post expense
- Update budget utilization
- Handle refund requests
- Handle replacement requests
- Update refund/replacement status
- Rollback status
- Flag supplier
- Close transaction

#### **Staff Routes** (`/api/v1/staff/purchase-expenses`) ⏳ TODO
**Limited Staff Actions:**
- View only
- View match status
- No posting/approval capabilities

## 3️⃣ PAYROLL & COMPENSATION

### Module 3.1: Payroll Generation & Disbursement

#### **Admin Routes** (`/api/v1/admin/payroll`) ⏳ TODO
- Generate payroll per period
- Edit before finalization
- Mark as disbursed
- Finalize payroll (locks editing)
- Export payroll summary

#### **Staff Routes** (`/api/v1/staff/payroll`) ⏳ TODO
- View only (read-only access)
- Cannot generate/edit/disburse

### Module 3.2: Employee Reimbursement Processing

#### **Admin Routes** (`/api/v1/admin/reimbursements`) ⏳ TODO
- Approve/Reject reimbursement
- Mark as disbursed

#### **Staff Routes** (`/api/v1/staff/reimbursements`) ⏳ TODO
- Create reimbursement request
- Upload receipts
- View own requests

### Module 3.3: Trip Deficit Loan Auto-Recording

#### **Admin Routes** (`/api/v1/admin/trip-deficit-loans`) ⏳ TODO
- Override auto-calculation
- Confirm loans
- Convert to employee loan

#### **Staff Routes** (`/api/v1/staff/trip-deficit-loans`) ⏳ TODO
- View only (system-generated)

## 4️⃣ LOAN MANAGEMENT

### Module 4.1: Employee Loan Administration

#### **Admin Routes** (`/api/v1/admin/employee-loans`) ⏳ TODO
- Approve/Reject loans
- Record repayments
- Update repayment schedule
- Mark as fully paid/defaulted

#### **Staff Routes** (`/api/v1/staff/employee-loans`) ⏳ TODO
- Create loan request
- View own loans

### Module 4.2: External Loan Administration

#### **Admin Routes** (`/api/v1/admin/external-loans`) ⏳ TODO
- Full CRUD
- Record repayments

#### **Staff Routes** (`/api/v1/staff/external-loans`) ⏳ TODO
- View only

## 5️⃣ RECEIVABLES & PAYABLES

### Module 5.1: Accounts Receivable

#### **Admin Routes** (`/api/v1/admin/receivables`) ⏳ TODO
- Record payment received
- Update collection status
- Send payment reminder
- Mark as bad debt

#### **Staff Routes** (`/api/v1/staff/receivables`) ⏳ TODO
- View only

### Module 5.2: Accounts Payable

#### **Admin Routes** (`/api/v1/admin/payables`) ⏳ TODO
- Record payment made
- Update payment status
- Set payment schedule

#### **Staff Routes** (`/api/v1/staff/payables`) ⏳ TODO
- View only

## 6️⃣ BUDGET MANAGEMENT

### Module 6.1: Budget Allocation & Monitoring

#### **Admin Routes** (`/api/v1/admin/budgets`) ⏳ TODO
- Add/Edit/Delete budget
- Assign to departments
- Adjust mid-period
- Generate reports

#### **Staff Routes** (`/api/v1/staff/budgets`) ⏳ TODO
- View only
- View own department report

### Module 6.2: Budget Request Creation (Finance Microservice)

#### **Admin Routes** (`/api/v1/admin/budget-requests`) ⏳ TODO
- View all departments
- Create on behalf of department

#### **Staff Routes** (`/api/v1/staff/budget-requests`) ⏳ TODO
- View/Create own department requests only

### Module 6.3: Budget & Purchase Request Approval

#### **Admin Routes** (`/api/v1/admin/approvals`) ⏳ TODO
- Approve/Reject Budget Requests
- Approve/Reject Purchase Requests
- Reserve funds
- Release unused funds

#### **Staff Routes** (`/api/v1/staff/approvals`) ⏳ TODO
- View only
- No approval capabilities

## 7️⃣ FINANCIAL RECORDS & REPORTING

### Module 7.1: Journal Entry Management

#### **Admin Routes** (`/api/v1/admin/journal-entries`) ⏳ TODO
- Add manual entries
- Edit drafts
- Verify/Unverify entries

#### **Staff Routes** (`/api/v1/staff/journal-entries`) ⏳ TODO
- View only (auto-generated)

### Module 7.2: Asset Management

#### **Admin Routes** (`/api/v1/admin/assets`) ⏳ TODO
- Full CRUD
- Record purchase/disposal
- Update status

#### **Staff Routes** (`/api/v1/staff/assets`) ⏳ TODO
- View only

### Module 7.3: Financial Dashboard & Reports

#### **Admin Routes** (`/api/v1/admin/reports`) ⏳ TODO
- View all reports
- Export to PDF/CSV
- Generate company receipts
- Schedule automated reports
- View full audit trail

#### **Staff Routes** (`/api/v1/staff/reports`) ⏳ TODO
- View limited dashboard
- View own department reports only
- Cannot generate company receipts

## 8️⃣ AUDIT LOGS

### Module 8.1: System Audit Trail

#### **Admin Routes** (`/api/v1/admin/audit-logs`) ⏳ TODO
- View all departments (Finance)
- Super Admin sees ALL departments
- Export audit reports

#### **Staff Routes** (`/api/v1/staff/audit-logs`) ⏳ TODO
- View own actions only
- Cannot export

**Note:** Audit logs are auto-generated, cannot be manually added/edited/deleted by anyone

## 🔒 Security Implementation

### Role-Based Authorization Middleware

```typescript
// src/middleware/authorize.ts
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};
```

### Usage in Routes

```typescript
// Admin route - requires 'admin' role
router.use(authenticate);
router.use(authorize('admin'));

// Staff route - requires 'staff' role
router.use(authenticate);
router.use(authorize('staff'));
```

## 📊 Access Matrix Summary

| Module | Admin | Staff |
|--------|-------|-------|
| Revenue Management | Full CRUD + Export + Verify + Recalculate | View + Create only |
| Expense Management | Full CRUD + Approve/Reject | View + Create (approval required for large) |
| Payroll | Generate + Edit + Disburse + Finalize | View only |
| Reimbursements | Approve/Reject + Disburse | Create + View own |
| Loans | Approve/Reject + Record payments | Create request + View own |
| Receivables/Payables | Record payments + Update status | View only |
| Budgets | Create + Edit + Delete + Approve | View only (own department) |
| Journal Entries | Manual entries + Verify | View only (auto-generated) |
| Assets | Full CRUD + Depreciation | View only |
| Reports | All reports + Export + Company receipts | Limited (own department) |
| Audit Logs | View all (Finance/Super Admin) | View own actions |

## 🚀 Testing Routes

### Test Admin Access
```bash
# Get JWT token with admin role
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use admin token
curl -X GET http://localhost:3000/api/v1/admin/revenues \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Should succeed ✅
```

### Test Staff Access
```bash
# Get JWT token with staff role
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "staff", "password": "password"}'

# Try to access admin route
curl -X GET http://localhost:3000/api/v1/admin/revenues \
  -H "Authorization: Bearer STAFF_TOKEN"

# Should fail with 403 Forbidden ❌

# Try staff route
curl -X GET http://localhost:3000/api/v1/staff/revenues \
  -H "Authorization: Bearer STAFF_TOKEN"

# Should succeed ✅

# Try to edit (PUT) with staff token
curl -X PUT http://localhost:3000/api/v1/staff/revenues/1 \
  -H "Authorization: Bearer STAFF_TOKEN"

# Should fail with 404 (route doesn't exist) ❌
```

## ✅ Implementation Checklist

### Phase 1: Revenue Management ✅
- [x] Admin revenue routes implemented
- [x] Staff revenue routes implemented
- [x] Both mounted in app.ts
- [x] Authorization middleware applied
- [x] Build compiles successfully

### Phase 2: Expense Management ⏳
- [ ] Admin expense routes
- [ ] Staff expense routes
- [ ] Purchase expense routes (separate)
- [ ] Approval workflow

### Phase 3: Payroll & Compensation ⏳
- [ ] Admin payroll routes
- [ ] Staff payroll routes (view only)
- [ ] Reimbursement routes
- [ ] Trip deficit loan routes

### Phase 4: Loan Management ⏳
- [ ] Employee loan routes
- [ ] External loan routes

### Phase 5: Receivables & Payables ⏳
- [ ] AR routes
- [ ] AP routes

### Phase 6: Budget Management ⏳
- [ ] Budget allocation routes
- [ ] Budget request routes (microservice)
- [ ] Approval routes

### Phase 7: Financial Records ⏳
- [ ] Journal entry routes
- [ ] Asset management routes
- [ ] Reports & dashboard routes

### Phase 8: Audit Logs ⏳
- [ ] Admin audit log routes
- [ ] Staff audit log routes (own only)

## 📝 Notes

1. **Route Naming Convention:**
   - Admin: `/api/v1/admin/{module}`
   - Staff: `/api/v1/staff/{module}`

2. **Shared Controllers:**
   - Same controller can be used for both admin and staff routes
   - Business logic in service layer handles permission checks
   - Route layer enforces role-based access

3. **Filter Restrictions:**
   - Staff routes use same controller but with limited query parameters
   - Validation in service layer can further restrict staff data access

4. **Future Enhancement:**
   - Add department-based filtering (staff sees own department only)
   - Add data masking for sensitive fields
   - Add rate limiting per role

---

**Status:** ✅ Phase 1 (Revenue Management) complete and tested  
**Next:** Implement Phase 2 (Expense Management) following same pattern  
**Documentation:** Complete separation between Admin and Staff routes as per requirements
