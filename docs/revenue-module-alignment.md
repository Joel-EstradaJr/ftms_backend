# Revenue Module Alignment - Implementation Guide

## Overview
This document outlines the complete alignment of the Revenue module with the revised schema.

## Database Schema Summary (Revenue Model)

```prisma
model Revenue {
  id                    Int            @id @default(autoincrement())
  revenueCode           String         @unique @default(cuid())
  sourceId              Int
  source                RevenueSource  @relation(fields: [sourceId], references: [id])
  description           String         @db.Text
  amount                Decimal        @db.Decimal(15, 2)
  transactionDate       DateTime       @default(now())
  paymentMethodId       Int
  paymentMethod         PaymentMethod  @relation(fields: [paymentMethodId], references: [id])

  busTripCacheId        Int?
  busTripCache          BusTripCache?  @relation(fields: [busTripCacheId], references: [id])

  externalRefId         String?        @db.VarChar(20)
  externalRefType       String?        @db.VarChar(50)

  loanPaymentId         Int?           @unique
  loanPayment           LoanPayment?   @relation(fields: [loanPaymentId], references: [id])

  isInstallment         Boolean        @default(false)
  installmentScheduleId Int?
  installmentSchedule   InstallmentSchedule? @relation(fields: [installmentScheduleId], references: [id])

  isAccountsReceivable  Boolean        @default(false)
  arDueDate             DateTime?
  arPaidDate            DateTime?
  arStatus              String?        @db.VarChar(50) @default("PENDING")
  arId                  Int?
  accountsReceivable    AccountsReceivable? @relation(fields: [arId], references: [id])

  documentIds           String?        @db.Text

  journalEntryId        Int?
  journalEntry          JournalEntry?  @relation("RevenueJournalEntry", fields: [journalEntryId], references: [id])

  createdBy             String         @db.VarChar(100)
  approvedBy            String?        @db.VarChar(100)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  auditLogs             AuditLog[]
}
```

## API Endpoints

### 1. GET /api/revenue
**Purpose:** List all revenues with filtering and pagination

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `sourceId` (number, optional)
- `externalRefType` (string, optional)
- `isAccountsReceivable` (boolean, optional)
- `isInstallment` (boolean, optional)
- `arStatus` (string, optional)
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)
- `search` (string, optional)

**Response:**
```json
{
  "data": [Revenue[]],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 2. POST /api/revenue
**Purpose:** Create new revenue record

**Request Body:**
```json
{
  "sourceId": 1,
  "description": "Revenue description",
  "amount": 1000.00,
  "transactionDate": "2025-10-17T00:00:00Z",
  "paymentMethodId": 1,
  "busTripCacheId": 123,  // Optional
  "externalRefType": "BUS_TRIP",  // Optional
  "externalRefId": "ASSIGN-001",  // Optional
  "loanPaymentId": 5,  // Optional
  "isAccountsReceivable": false,
  "arDueDate": "2025-11-17T00:00:00Z",  // Optional
  "arStatus": "PENDING",  // Optional
  "isInstallment": false,
  "installmentSchedule": {  // Optional, if isInstallment = true
    "numberOfPayments": 12,
    "paymentAmount": 83.33,
    "frequency": "MONTHLY",
    "startDate": "2025-10-17T00:00:00Z",
    "interestRate": 5.0
  },
  "journalEntryId": 10,  // Optional
  "documentIds": "doc1,doc2",  // Optional
  "createdBy": "user@example.com"
}
```

### 3. GET /api/revenue/[id]
**Purpose:** Get single revenue record with full details

**Response:** Full Revenue object with all relations

### 4. PUT /api/revenue/[id]
**Purpose:** Update existing revenue record

**Request Body:** Same as POST, but all fields optional

### 5. DELETE /api/revenue/[id]
**Purpose:** Soft delete revenue record

## UI Components

### 1. Revenue List Page (`page.tsx`)

**Display Columns:**
- Revenue Code (auto-generated, locked)
- Transaction Date (sortable)
- Source Name (from RevenueSource)
- Amount (currency formatted)
- Payment Method Name
- AR Status (if isAccountsReceivable = true)
- Actions (View, Edit, Delete)

**Optional Columns (collapsible):**
- External Ref Type
- Journal Entry ID (if posted)
- Is Installment badge

**Features:**
- Pagination
- Filtering by source, date range, AR status, etc.
- Search by revenue code or description
- Export to CSV/Excel
- Bulk actions

### 2. Add/Edit Revenue Modal (`addRevenue.tsx`, `editRevenue.tsx`)

**Common Fields:**
- Revenue Code (locked, display only in edit mode)
- Source ID (dropdown from RevenueSource)
- Description (textarea, required)
- Amount (decimal input, required)
- Transaction Date (date/time picker, default = now)
- Payment Method ID (dropdown from PaymentMethod)
- Document IDs (file upload, optional)
- Remarks (textarea, optional)

**Conditional Fields Based on Revenue Type:**

**If Revenue Type = "BUS_TRIP":**
- Bus Trip Cache ID (dropdown/autocomplete)
- External Ref Type (hidden, auto = "BUS_TRIP")
- External Ref ID (auto-fill from BusTripCache.assignmentId)
- Calculation Section (display):
  - Trip Revenue (from BusTripCache)
  - Assignment Type ("Percentage" or "Boundary")
  - Assignment Value
- ⚠️ Amount must match Trip Revenue (validation)

**If Revenue Type = "RENTAL":**
- External Ref Type (hidden, auto = "RENTAL")
- External Ref ID (text input, rental booking ID)
- AR Status (dropdown: PENDING, PARTIAL, PAID)
- Is Accounts Receivable (toggle)

**If Revenue Type = "DISPOSAL":**
- External Ref Type (hidden, auto = "DISPOSAL")
- External Ref ID (text input, DisposalSale ID)

**If Revenue Type = "FORFEITED_DEPOSIT":**
- External Ref Type (hidden, auto = "FORFEITED_DEPOSIT")
- External Ref ID (text input, ForfeitedDeposit ID)

**If Revenue Type = "LOAN_REPAYMENT":**
- Loan Payment ID (dropdown from LoanPayment)
- External Ref Type (hidden, auto = "LOAN_REPAYMENT")
- External Ref ID (auto-fill from LoanPayment.paymentCode)

**If Revenue Type = "RENTER_DAMAGE":**
- External Ref Type (hidden, auto = "RENTER_DAMAGE")
- External Ref ID (text input, RenterDamage ID)

**Accounts Receivable Section (if isAccountsReceivable = true):**
- Is Accounts Receivable (toggle)
- AR ID (dropdown, link to AccountsReceivable)
- AR Due Date (date picker)
- AR Paid Date (date picker, filled after paid)
- AR Status (dropdown: PENDING → PARTIAL → PAID)

**Installment Section (if isInstallment = true):**
- Is Installment (toggle)
- Installment Schedule ID (dropdown or create new)
- If creating new schedule:
  - Schedule Code (auto-generated)
  - Number of Payments (number input)
  - Payment Amount (decimal input)
  - Frequency (dropdown: WEEKLY, MONTHLY, etc.)
  - Start Date (date picker)
  - End Date (auto-calculated)

**Journal Entry Section:**
- Journal Entry ID (dropdown, create/link JE)
- If creating JE:
  - Source Module (hidden, auto = "REVENUE")
  - Source Ref ID (hidden, auto = revenueCode)
  - JE Details (link/button to view JE)

**Workflow Section:**
- Created By (auto-filled from session user)
- Created At (auto-generated)
- Approved By (filled after approval)

**Button Section:**
- Save as Draft (save without posting to GL)
- Save & Submit for Approval (create draft JE, flag for approval)
- Delete (only if DRAFT status)

### 3. View Revenue Modal (`viewRevenue.tsx`)

**Display all fields from Add/Edit but as read-only:**

**Header Section:**
- Revenue Code (highlighted, copyable)
- Status badge (Draft, Posted, Approved - inferred from journalEntryId status)
- Created by [user] on [date]
- Last updated by [user] on [date]

**Main Revenue Info:**
- Source: [RevenueSource.name]
- Description: [full text]
- Amount: [currency formatted, highlighted]
- Transaction Date: [formatted date]
- Payment Method: [PaymentMethod.methodName]

**Reference Section:**
- External Type: [RENTAL, DISPOSAL, etc.]
- External ID: [clickable link if applicable]
- Bus Trip (if applicable): [link to BusTripCache]
- Related Documents: [display count, open in modal/lightbox]

**AR Section (if applicable):**
- AR Status: [PENDING/PARTIAL/PAID badge]
- Due Date: [date or "N/A"]
- Paid Date: [date or "N/A"]
- Balance: [amount or "Fully Paid"]

**Installment Section (if applicable):**
- Payment Plan: [Schedule code and details]
- Installments: [Table showing dates, amounts, paid status]

**Journal Entry Section (if posted):**
- Journal Code: [clickable link]
- Status: [DRAFT/POSTED/APPROVED/VOID badge]
- Accounts Posted:
  - Debit: [Account code - Account name: amount]
  - Credit: [Account code - Account name: amount]

**Audit Trail Section (collapsible):**
- Created: [User, Date, Time, IP]
- Modified: [User, Date, Time, IP] (if edited)
- Approved: [User, Date, Time] (if approved)
- Approver Notes: [remarks]

**Actions Section (bottom):**
- Edit (if DRAFT)
- Approve (if Finance Admin/Owner, and JE created)
- Reverse (if POSTED, creates reversal JE)
- View Full JE Details (if journalEntryId exists)
- Download Supporting Docs
- Close Modal

## Key Logic for Modal Display

1. **On Load:** Check externalRefType → show/hide relevant conditional fields
2. **Amount Validation:** If trip revenue selected, auto-populate/lock amount to match
3. **AR Toggle:** Show/hide AR date fields based on isAccountsReceivable
4. **Installment Toggle:** Show/hide installment config based on isInstallment
5. **GL Posting:** Disable "Save & Approve" unless journalEntryId is linked
6. **Overwrite Protection:** Warn if editing posted revenue (show audit trail)

## Implementation Steps

### Phase 1: Backend API (Priority 1)
1. ✅ Create TypeScript types (`app/types/revenue.ts`)
2. Create updated API routes:
   - `app/api/revenue/route.ts` (GET, POST)
   - `app/api/revenue/[id]/route.ts` (GET, PUT, DELETE)
3. Create helper functions:
   - `lib/revenues/validation.ts` - Validation logic
   - `lib/revenues/busTripRevenue.ts` - Bus trip revenue creation
   - `lib/revenues/installments.ts` - Installment schedule logic

### Phase 2: UI Components (Priority 2)
1. Update Revenue List Page (`app/(admin)/admin/revenue/page.tsx`)
2. Update Add Revenue Modal (`app/(admin)/admin/revenue/addRevenue.tsx`)
3. Update Edit Revenue Modal (`app/(admin)/admin/revenue/editRevenue.tsx`)
4. Update View Revenue Modal (`app/(admin)/admin/revenue/viewRevenue.tsx`)
5. Create conditional field components for each revenue type

### Phase 3: Integration (Priority 3)
1. Update Journal Entry integration
2. Update Accounts Receivable integration
3. Update Installment Schedule integration
4. Update Audit Log integration
5. Update Document Upload integration

### Phase 4: Testing & Refinement (Priority 4)
1. Unit tests for API endpoints
2. Integration tests for workflows
3. UI/UX testing
4. Performance optimization
5. Error handling improvements

## Notes
- All monetary values use Decimal(15, 2)
- Dates are stored as DateTime in UTC
- Revenue codes are auto-generated using cuid()
- Soft deletes are not implemented (hard deletes only)
- Audit logs are automatically created for all operations
