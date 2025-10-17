# Revenue Module Alignment - Complete Action Plan

## Overview
This document lists ALL tasks needed to fully align the Revenue module with the revised Prisma schema, organized by priority and dependency.

---
<!-- 
## 🔴 PHASE 1: BACKEND API FOUNDATION (Critical Path - Must Complete First)

### 1.1 API Routes - Core CRUD Operations
<!-- 
#### Task 1.1.1: Main Revenue API Route (`app/api/revenue/route.ts`)
**Status**: File exists but needs COMPLETE REWRITE  
**Dependencies**: None  
**Estimated Time**: 4-6 hours

**Subtasks**:
- [ ] **DELETE** old route.ts (currently just re-exports from /revenues)
- [ ] **CREATE** new route.ts with:
  - [ ] GET endpoint - List revenues with filtering
    - [ ] Pagination (page, limit)
    - [ ] Filter by sourceId
    - [ ] Filter by externalRefType
    - [ ] Filter by isAccountsReceivable
    - [ ] Filter by isInstallment
    - [ ] Filter by arStatus
    - [ ] Date range filter (startDate, endDate)
    - [ ] Search by revenueCode or description
    - [ ] Sort by transactionDate (default: desc)
    - [ ] Include relations: source, paymentMethod, busTripCache, loanPayment, accountsReceivable, installmentSchedule, journalEntry
  - [ ] POST endpoint - Create new revenue
    - [ ] Parse and validate request body
    - [ ] Call validateRevenueData() function
    - [ ] Validate sourceId exists and is active
    - [ ] Validate paymentMethodId exists and is active
    - [ ] Handle BUS_TRIP type (validate busTripCacheId, check amount match)
    - [ ] Handle LOAN_REPAYMENT type (validate loanPaymentId, check not already linked)
    - [ ] Handle RENTAL/DISPOSAL/FORFEITED_DEPOSIT/RENTER_DAMAGE types (validate externalRefId)
    - [ ] Create installment schedule if isInstallment = true
    - [ ] Set appropriate arStatus if isAccountsReceivable = true
    - [ ] Auto-generate revenueCode (cuid)
    - [ ] Set transactionDate (default: now)
    - [ ] Create revenue record
    - [ ] Log audit trail
    - [ ] Return created revenue with relations

**Acceptance Criteria**:
- GET returns paginated list with correct filters
- POST creates revenue for all revenue types
- Validation errors return 400 with clear messages
- Server errors return 500 with error details
- All operations logged in audit trail

---

#### Task 1.1.2: Single Revenue API Route (`app/api/revenue/[id]/route.ts`)
**Status**: DOES NOT EXIST - Must be created  
**Dependencies**: Task 1.1.1 (for consistency)  
**Estimated Time**: 3-4 hours

**Subtasks**:
- [ ] **CREATE** new [id]/route.ts with:
  - [ ] GET endpoint - Get single revenue by ID
    - [ ] Parse ID from URL params
    - [ ] Fetch revenue with ALL relations
    - [ ] Include: source, paymentMethod, busTripCache, loanPayment, accountsReceivable, installmentSchedule, journalEntry (with lineItems), auditLogs
    - [ ] Return 404 if not found
    - [ ] Return full revenue object
  - [ ] PUT endpoint - Update existing revenue
    - [ ] Parse ID from URL params
    - [ ] Fetch existing revenue
    - [ ] Check if revenue is posted (journalEntry.status = POSTED/APPROVED)
    - [ ] If posted, return 400 with warning message
    - [ ] Validate updated data with validateRevenueData()
    - [ ] Store beforeData for audit
    - [ ] Update revenue record
    - [ ] Log audit trail with before/after data
    - [ ] Return updated revenue with relations
  - [ ] DELETE endpoint - Delete revenue
    - [ ] Parse ID from URL params
    - [ ] Fetch existing revenue
    - [ ] Check if revenue is posted
    - [ ] If posted, return 400 (cannot delete posted revenue)
    - [ ] Check for dependent records (installments, journal entries)
    - [ ] Delete revenue record
    - [ ] Log audit trail
    - [ ] Return success message

**Acceptance Criteria**:
- GET returns complete revenue with all nested data
- PUT updates revenue with validation
- PUT prevents editing posted revenues
- DELETE prevents deleting posted revenues
- All operations logged with before/after data

---

#### Task 1.1.3: Bus Trip Revenue API Route (`app/api/revenue/bus-trips/route.ts`)
**Status**: File exists but needs MAJOR UPDATES  
**Dependencies**: Task 1.2.1 (bus trip helper)  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **UPDATE** existing route.ts:
  - [ ] Update to use new schema fields (sourceId, paymentMethodId, etc.)
  - [ ] Remove references to old fields (category_id, payment_status_id)
  - [ ] Call createRevenueFromBusTrip() helper function
  - [ ] Validate amount matches bus trip revenue
  - [ ] Auto-set externalRefType = "BUS_TRIP"
  - [ ] Auto-set externalRefId = busTrip.assignmentId
  - [ ] Handle case where trip already has revenue
  - [ ] Return created revenue with bus trip details

**Acceptance Criteria**:
- Creates revenue from bus trip cache
- Amount automatically matches trip revenue
- External reference fields auto-populated
- Prevents duplicate revenue for same trip
- Returns complete revenue with bus trip data

--- -->
<!-- 
### 1.2 Helper Functions - Business Logic

#### Task 1.2.1: Bus Trip Revenue Helper (`lib/revenues/busTripRevenue.ts`)
**Status**: DOES NOT EXIST - Must be created  
**Dependencies**: None  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **CREATE** new busTripRevenue.ts with:
  - [ ] `createRevenueFromBusTrip(busTripCacheId, userId, overrideAmount?)` function
    - [ ] Fetch bus trip from BusTripCache by ID
    - [ ] Return error if bus trip not found
    - [ ] Check if trip already has revenue (is_revenue_recorded = true)
    - [ ] Extract trip revenue and assignment details
    - [ ] Find or create "BUS_TRIP" revenue source
    - [ ] Use default payment method (Cash)
    - [ ] Create revenue record with:
      - sourceId (from BUS_TRIP source)
      - description: "Bus Trip Revenue - {route} on {date}"
      - amount: busTrip.trip_revenue (or overrideAmount if provided)
      - transactionDate: busTrip.date_assigned
      - paymentMethodId (default Cash)
      - busTripCacheId
      - externalRefType: "BUS_TRIP"
      - externalRefId: busTrip.assignment_id
      - createdBy: userId
    - [ ] Update BusTripCache.is_revenue_recorded = true
    - [ ] Log audit trail
    - [ ] Return created revenue

**Acceptance Criteria**:
- Function creates revenue from bus trip
- Auto-populates all required fields
- Updates bus trip cache flag
- Prevents duplicate revenue creation
- Returns complete revenue object

---

#### Task 1.2.2: Installment Schedule Helper (`lib/revenues/installments.ts`)
**Status**: DOES NOT EXIST - Must be created  
**Dependencies**: None  
**Estimated Time**: 3-4 hours

**Subtasks**:
- [ ] **CREATE** new installments.ts with:
  - [ ] `createInstallmentSchedule(scheduleData)` function
    - [ ] Validate schedule data
    - [ ] Calculate end date based on frequency and numberOfPayments
    - [ ] Calculate total interest if interestRate provided
    - [ ] Create InstallmentSchedule record
    - [ ] Return created schedule
  - [ ] `calculateEndDate(startDate, frequency, numberOfPayments)` function
    - [ ] Map frequency to days interval (DAILY=1, WEEKLY=7, MONTHLY=30, etc.)
    - [ ] Calculate end date = startDate + (interval * numberOfPayments)
    - [ ] Return calculated date
  - [ ] `generateInstallmentRecords(scheduleId)` function (future use)
    - [ ] Fetch schedule by ID
    - [ ] Generate individual installment payment records
    - [ ] Set due dates based on frequency
    - [ ] Set amounts for each installment
    - [ ] Create records in database
    - [ ] Return array of created installments
  - [ ] `validateInstallmentAmount(totalAmount, paymentAmount, numberOfPayments)` function
    - [ ] Calculate: paymentAmount * numberOfPayments
    - [ ] Compare with totalAmount
    - [ ] Return validation result with error if mismatch

**Acceptance Criteria**:
- Creates installment schedules correctly
- End date calculated accurately for all frequencies
- Interest calculations correct
- Validation prevents amount mismatches
- Functions handle edge cases (leap years, month-end dates)

---

#### Task 1.2.3: Journal Entry Helper (`lib/revenues/journalEntry.ts`)
**Status**: DOES NOT EXIST - Must be created  
**Dependencies**: Chart of Accounts must exist  
**Estimated Time**: 4-5 hours

**Subtasks**:
- [ ] **CREATE** new journalEntry.ts with:
  - [ ] `createRevenueJournalEntry(revenueId, userId)` function
    - [ ] Fetch revenue by ID
    - [ ] Fetch revenue source to get accountCode
    - [ ] If no accountCode, use default revenue account
    - [ ] Fetch cash/bank account (based on payment method)
    - [ ] Create JournalEntry with status = DRAFT
    - [ ] Set sourceModule = "REVENUE"
    - [ ] Set sourceRefId = revenue.revenueCode
    - [ ] Create JournalLineItems:
      - Debit: Cash/Bank account (amount)
      - Credit: Revenue account (amount)
    - [ ] Link revenue.journalEntryId to created JE
    - [ ] Log audit trail
    - [ ] Return created journal entry
  - [ ] `postRevenueToGL(revenueId, userId)` function
    - [ ] Fetch revenue with journal entry
    - [ ] Check if JE exists (if not, create it first)
    - [ ] Validate JE is balanced
    - [ ] Update JE status to POSTED
    - [ ] Set postedBy = userId
    - [ ] Log audit trail
    - [ ] Return updated journal entry
  - [ ] `reverseRevenue(revenueId, userId, reason)` function
    - [ ] Fetch revenue with journal entry
    - [ ] Check if revenue is posted
    - [ ] Create reversal JournalEntry
    - [ ] Set isReversingEntry = true
    - [ ] Reverse debit/credit amounts
    - [ ] Link to original JE
    - [ ] Update original JE status to VOID
    - [ ] Log audit trail
    - [ ] Return reversal journal entry

**Acceptance Criteria**:
- Creates balanced journal entries
- Correctly debits and credits accounts
- Posts to GL properly
- Reversal entries created correctly
- All operations logged in audit trail

---

### 1.3 Validation Updates

#### Task 1.3.1: Fix Validation Function Type Errors (`lib/revenues/validation.ts`)
**Status**: File exists but has TypeScript errors  
**Dependencies**: Prisma client regenerated ✅  
**Estimated Time**: 1 hour

**Subtasks**:
- [ ] **FIX** TypeScript errors in validation.ts:
  - [ ] Line 17: Change `prisma.revenueSource` to use correct model name (check Prisma schema)
  - [ ] Line 43: Change `prisma.paymentMethod` to use correct model name
  - [ ] Line 74: Fix BusTripCache unique field (should be assignment_id, not id)
  - [ ] Line 80: Change `busTrip.tripRevenue` to `busTrip.trip_revenue` (snake_case)
  - [ ] Line 107: Change `prisma.loanPayment` to use correct model name
  - [ ] Test all validation functions
  - [ ] Add unit tests for each validation function

**Acceptance Criteria**:
- No TypeScript errors in validation.ts
- All validation functions work correctly
- Unit tests pass

---

### 1.4 API Testing
 -->
<!-- #### Task 1.4.1: API Endpoint Testing
**Status**: Not started  
**Dependencies**: Tasks 1.1.1, 1.1.2, 1.1.3 completed  
**Estimated Time**: 4-6 hours

**Subtasks**:
- [ ] **TEST** all API endpoints:
  - [ ] GET /api/revenue - List revenues
    - [ ] Test without filters
    - [ ] Test with each filter type
    - [ ] Test pagination
    - [ ] Test search
    - [ ] Test sorting
  - [ ] POST /api/revenue - Create revenue
    - [ ] Test basic revenue creation
    - [ ] Test BUS_TRIP type
    - [ ] Test RENTAL type
    - [ ] Test LOAN_REPAYMENT type
    - [ ] Test with AR enabled
    - [ ] Test with installments enabled
    - [ ] Test validation errors
  - [ ] GET /api/revenue/[id] - Get single revenue
    - [ ] Test with valid ID
    - [ ] Test with invalid ID
    - [ ] Verify all relations loaded
  - [ ] PUT /api/revenue/[id] - Update revenue
    - [ ] Test valid update
    - [ ] Test update with validation errors
    - [ ] Test update on posted revenue (should fail)
  - [ ] DELETE /api/revenue/[id] - Delete revenue
    - [ ] Test valid delete
    - [ ] Test delete on posted revenue (should fail)
  - [ ] GET /api/revenue/bus-trips - Create from bus trip
    - [ ] Test with valid bus trip
    - [ ] Test with invalid bus trip
    - [ ] Test duplicate revenue prevention

**Acceptance Criteria**:
- All endpoints return correct status codes
- Response data matches expected format
- Validation errors handled properly
- Edge cases covered

--- --> -->

## 🟡 PHASE 2: FRONTEND UI COMPONENTS (High Priority - Depends on Backend)

### 2.1 Revenue List Page

#### Task 2.1.1: Update Revenue List Page (`app/(admin)/admin/revenue/page.tsx`)
**Status**: File exists but needs MAJOR REWRITE  
**Dependencies**: Task 1.1.1 (GET /api/revenue)  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **REMOVE** old interfaces (RevenueRecord, RevenueData)
- [ ] **IMPORT** new types from `app/types/revenue.ts`
- [ ] **UPDATE** data fetching:
  - [ ] Change API endpoint from `/api/revenues` to `/api/revenue`
  - [ ] Update query parameters to match new API
  - [ ] Handle new response format
- [ ] **UPDATE** table columns:
  - [ ] REMOVE: category (old), payment_status (old)
  - [ ] KEEP: revenueCode, transactionDate, amount, createdBy, actions
  - [ ] ADD: source.name (RevenueSource name)
  - [ ] ADD: paymentMethod.methodName
  - [ ] ADD: arStatus (with badge if isAccountsReceivable)
  - [ ] ADD: externalRefType (optional column)
  - [ ] ADD: journalEntryId (optional column, with status badge)
  - [ ] ADD: isInstallment (badge indicator)
- [ ] **UPDATE** filters:
  - [ ] REMOVE: old category filter
  - [ ] ADD: Source dropdown (from RevenueSource)
  - [ ] ADD: External Type dropdown (BUS_TRIP, RENTAL, etc.)
  - [ ] ADD: AR Status dropdown (PENDING, PARTIAL, PAID)
  - [ ] ADD: Has AR toggle
  - [ ] ADD: Has Installments toggle
  - [ ] KEEP: Date range picker
  - [ ] KEEP: Search box (for revenueCode/description)
- [ ] **UPDATE** actions:
  - [ ] View button (opens view modal)
  - [ ] Edit button (opens edit modal, disabled if posted)
  - [ ] Delete button (disabled if posted)
- [ ] **ADD** status badges:
  - [ ] AR Status badge (green for PAID, yellow for PARTIAL, gray for PENDING)
  - [ ] JE Status badge (from journalEntry.status)
  - [ ] Installment indicator badge
- [ ] **UPDATE** pagination component
- [ ] **UPDATE** loading states
- [ ] **UPDATE** error handling

**Acceptance Criteria**:
- Table displays all correct columns
- Filters work properly
- Pagination works
- Actions work correctly
- Status badges display properly
- No console errors

---

#### Task 2.1.2: Update Staff Revenue List Page (`app/(staff)/staff/revenue/page.tsx`)
**Status**: File exists, needs same updates as admin  
**Dependencies**: Task 2.1.1  
**Estimated Time**: 2-3 hours (copy from admin with permission changes)

**Subtasks**:
- [ ] **COPY** updated structure from admin page
- [ ] **ADJUST** permissions (staff cannot delete, edit posted revenues)
- [ ] Test all functionality

**Acceptance Criteria**:
- Same functionality as admin page
- Appropriate permissions enforced

---

### 2.2 Add Revenue Modal

#### Task 2.2.1: Rewrite Add Revenue Modal (`app/(admin)/admin/revenue/addRevenue.tsx`)
**Status**: File exists but needs COMPLETE REWRITE  
**Dependencies**: Task 1.1.1 (POST /api/revenue), dropdowns need source/payment data  
**Estimated Time**: 10-12 hours

**Subtasks**:
- [ ] **REMOVE** all old code
- [ ] **CREATE** new modal structure with sections:
  
  **Header Section**:
  - [ ] Modal title: "Add New Revenue"
  - [ ] Close button

  **Revenue Type Selector Section**:
  - [ ] Dropdown/tabs for revenue type:
    - BUS_TRIP
    - RENTAL
    - DISPOSAL
    - FORFEITED_DEPOSIT
    - LOAN_REPAYMENT
    - RENTER_DAMAGE
    - MISCELLANEOUS (default)
  - [ ] onChange handler to show/hide conditional fields

  **Common Fields Section** (always visible):
  - [ ] Source dropdown (from RevenueSource, filtered by type if applicable)
  - [ ] Description textarea (required, 5-500 chars)
  - [ ] Amount input (decimal, required, > 0)
  - [ ] Transaction Date picker (default = now)
  - [ ] Payment Method dropdown (from PaymentMethod)
  - [ ] Remarks textarea (optional)

  **Conditional Fields - BUS_TRIP Type**:
  - [ ] Bus Trip selector (dropdown/autocomplete from BusTripCache)
    - [ ] Show: assignment_id, route, date, trip_revenue
    - [ ] Filter: only trips with is_revenue_recorded = false
  - [ ] onSelect handler to:
    - [ ] Auto-fill amount from trip_revenue
    - [ ] Lock amount field (read-only)
    - [ ] Set externalRefType = "BUS_TRIP"
    - [ ] Set externalRefId = assignment_id
  - [ ] Display section showing:
    - [ ] Trip Revenue (locked amount)
    - [ ] Assignment Type (from cache)
    - [ ] Assignment Value (from cache)
  - [ ] Validation warning if amount ≠ trip_revenue

  **Conditional Fields - LOAN_REPAYMENT Type**:
  - [ ] Loan Payment selector (dropdown from LoanPayment)
    - [ ] Show: paymentCode, employeeName, scheduledAmount, paymentDate
    - [ ] Filter: only payments without linked revenue
  - [ ] onSelect handler to:
    - [ ] Auto-fill amount from paidAmount
    - [ ] Set externalRefType = "LOAN_REPAYMENT"
    - [ ] Set externalRefId = paymentCode

  **Conditional Fields - RENTAL/DISPOSAL/FORFEITED_DEPOSIT/RENTER_DAMAGE Types**:
  - [ ] External Reference ID input (text, required)
  - [ ] Helper text explaining what ID to enter
  - [ ] Auto-set externalRefType based on selected type

  **Accounts Receivable Section**:
  - [ ] Toggle: "Enable Accounts Receivable"
  - [ ] Conditional fields (shown when toggle ON):
    - [ ] AR Link dropdown (optional, from AccountsReceivable)
    - [ ] AR Due Date picker (required if enabled)
    - [ ] AR Status dropdown (PENDING, PARTIAL, PAID - default PENDING)
    - [ ] AR Paid Date picker (shown if status = PAID)
  - [ ] Validation: due date > transaction date

  **Installment Section**:
  - [ ] Toggle: "Enable Installment Payment Plan"
  - [ ] Conditional fields (shown when toggle ON):
    - [ ] Option 1: Link to existing schedule
      - [ ] Installment Schedule dropdown
    - [ ] Option 2: Create new schedule
      - [ ] Number of Payments input (integer, >= 2)
      - [ ] Payment Amount input (decimal, > 0)
      - [ ] Frequency dropdown (DAILY, WEEKLY, MONTHLY, QUARTERLY)
      - [ ] Start Date picker (>= transaction date)
      - [ ] Interest Rate input (optional, decimal, >= 0)
      - [ ] Display: Calculated End Date
      - [ ] Display: Total Amount (payments × amount)
      - [ ] Validation warning if total ≠ revenue amount

  **Journal Entry Section**:
  - [ ] Optional checkbox: "Create Journal Entry"
  - [ ] Info text: "Journal entry will be created in DRAFT status"

  **Document Upload Section**:
  - [ ] File upload component (multiple files)
  - [ ] Accepted formats: PDF, JPG, PNG, XLSX, DOCX
  - [ ] Max 50MB total

  **Form State Management**:
  - [ ] Use React Hook Form or state management
  - [ ] Track all form fields
  - [ ] Handle validation errors
  - [ ] Show validation messages inline

  **Form Submission**:
  - [ ] Button: "Save as Draft" (saves without creating JE)
  - [ ] Button: "Save & Submit" (saves and creates draft JE)
  - [ ] Button: "Cancel"
  - [ ] On submit:
    - [ ] Validate all fields
    - [ ] Show validation errors if any
    - [ ] Call POST /api/revenue
    - [ ] Handle success (show success message, close modal, refresh list)
    - [ ] Handle error (show error message)
    - [ ] Disable buttons during submission
    - [ ] Show loading spinner

**Acceptance Criteria**:
- Modal opens and closes properly
- All fields render correctly
- Conditional fields show/hide based on type
- Validation works for all fields
- Can create revenue of all types
- Success/error messages display
- Modal closes and list refreshes on success

---

#### Task 2.2.2: Update Staff Add Revenue Modal (`app/(staff)/staff/revenue/addRevenue.tsx`)
**Status**: File exists, needs same updates  
**Dependencies**: Task 2.2.1  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **COPY** updated structure from admin modal
- [ ] **REMOVE** journal entry creation option (staff cannot create JE)
- [ ] Test all functionality

**Acceptance Criteria**:
- Same functionality as admin modal minus JE creation
- Appropriate permissions enforced

---

### 2.3 Edit Revenue Modal

#### Task 2.3.1: Rewrite Edit Revenue Modal (`app/(admin)/admin/revenue/editRevenue.tsx`)
**Status**: File exists but needs COMPLETE REWRITE  
**Dependencies**: Task 1.1.2 (GET, PUT /api/revenue/[id]), Task 2.2.1 (add modal structure)  
**Estimated Time**: 8-10 hours

**Subtasks**:
- [ ] **COPY** structure from Add Revenue Modal (Task 2.2.1)
- [ ] **ADD** data loading:
  - [ ] Fetch revenue by ID on modal open
  - [ ] Show loading spinner while fetching
  - [ ] Handle fetch errors
  - [ ] Populate all form fields with existing data
- [ ] **ADD** read-only fields:
  - [ ] Revenue Code (display only, highlighted)
  - [ ] Creation info: "Created by {user} on {date}"
  - [ ] Update info: "Last updated by {user} on {date}" (if edited)
- [ ] **ADD** edit restrictions:
  - [ ] Check if revenue is posted (journalEntry.status = POSTED/APPROVED)
  - [ ] If posted, show warning banner: "This revenue has been posted to GL. Editing is not recommended."
  - [ ] Option to proceed anyway or create reversal instead
  - [ ] Lock certain fields if posted (amount, payment method, etc.)
- [ ] **MODIFY** form submission:
  - [ ] Button: "Update Revenue"
  - [ ] Button: "Cancel"
  - [ ] On submit:
    - [ ] Validate all fields
    - [ ] Call PUT /api/revenue/[id]
    - [ ] Handle success (show success message, close modal, refresh list)
    - [ ] Handle error (show error message, especially if revenue is posted)
- [ ] **ADD** audit trail display (collapsible):
  - [ ] List all changes with user, date, before/after values
  - [ ] Fetch from auditLogs relation

**Acceptance Criteria**:
- Modal loads existing revenue data
- All fields editable except revenue code
- Posted revenue shows warning
- Can update revenue successfully
- Audit trail displays correctly
- Validation works

---

#### Task 2.3.2: Update Staff Edit Revenue Modal (`app/(staff)/staff/revenue/editRevenue.tsx`)
**Status**: File exists, needs same updates  
**Dependencies**: Task 2.3.1  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **COPY** updated structure from admin modal
- [ ] **RESTRICT** editing posted revenues (staff cannot edit posted)
- [ ] Test all functionality

**Acceptance Criteria**:
- Same functionality as admin modal
- Posted revenues cannot be edited by staff

---

### 2.4 View Revenue Modal

#### Task 2.4.1: Rewrite View Revenue Modal (`app/(admin)/admin/revenue/viewRevenue.tsx`)
**Status**: File exists but needs MAJOR UPDATES  
**Dependencies**: Task 1.1.2 (GET /api/revenue/[id])  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **REMOVE** old code
- [ ] **CREATE** new read-only modal structure with sections:

  **Header Section**:
  - [ ] Revenue Code (large, highlighted, copyable)
  - [ ] Status badge (inferred from journalEntry.status):
    - DRAFT (gray)
    - POSTED (blue)
    - APPROVED (green)
    - VOID (red)
  - [ ] "Created by {user} on {date}"
  - [ ] "Last updated by {user} on {date}" (if applicable)
  - [ ] Close button (X)

  **Main Revenue Info Section**:
  - [ ] **Source**: {source.name} (with description tooltip)
  - [ ] **Description**: {description} (full text)
  - [ ] **Amount**: ${amount} (large, highlighted, currency formatted)
  - [ ] **Transaction Date**: {formatted date and time}
  - [ ] **Payment Method**: {paymentMethod.methodName}
  - [ ] **Remarks**: {remarks} (if any)

  **Reference Section** (if applicable):
  - [ ] **External Type**: {externalRefType} (badge)
  - [ ] **External ID**: {externalRefId} (clickable link if applicable)
    - BUS_TRIP → link to bus trip details
    - LOAN_REPAYMENT → link to loan payment details
    - Others → display as text
  - [ ] **Bus Trip Details** (if busTripCacheId):
    - Assignment ID, Route, Date
    - Trip Revenue, Assignment Type, Assignment Value
    - Link to view full bus trip
  - [ ] **Loan Payment Details** (if loanPaymentId):
    - Payment Code, Employee, Amount
    - Link to view full loan payment

  **Documents Section** (if documentIds):
  - [ ] Display count: "X documents attached"
  - [ ] List documents with download buttons
  - [ ] Thumbnail preview for images
  - [ ] Open in modal/lightbox

  **AR Section** (if isAccountsReceivable = true):
  - [ ] **AR Status**: {arStatus} (badge - green/yellow/gray)
  - [ ] **Due Date**: {arDueDate} (formatted, or "N/A")
  - [ ] **Paid Date**: {arPaidDate} (formatted, or "Not yet paid")
  - [ ] **Balance**: {calculated balance} (or "Fully Paid")
  - [ ] **AR Link**: {accountsReceivable.arCode} (link to AR details)

  **Installment Section** (if isInstallment = true):
  - [ ] **Payment Plan**: {scheduleCode}
  - [ ] **Schedule Details**:
    - Total Amount, Number of Payments, Payment Amount
    - Frequency, Start Date, End Date
    - Interest Rate (if applicable)
  - [ ] **Installment Table**:
    - Columns: Payment #, Due Date, Amount, Status, Paid Date
    - Show all installment payments
    - Color-code by status (paid/pending/overdue)

  **Journal Entry Section** (if journalEntryId):
  - [ ] **Journal Code**: {journalEntry.journalCode} (clickable link)
  - [ ] **Status**: {journalEntry.status} (badge)
  - [ ] **Entry Date**: {formatted date}
  - [ ] **Prepared By**: {preparedBy}
  - [ ] **Approved By**: {approvedBy} (if applicable)
  - [ ] **Accounts Posted**:
    - Table with columns: Account Code, Account Name, Debit, Credit
    - Show all line items from journalEntry.lineItems
  - [ ] Button: "View Full Journal Entry" (opens JE modal)

  **Audit Trail Section** (collapsible, default collapsed):
  - [ ] **Created**:
    - User: {createdBy}
    - Date/Time: {createdAt}
    - IP: {auditLog.ipAddress}
  - [ ] **Modified** (if applicable):
    - User: {updatedBy}
    - Date/Time: {updatedAt}
    - IP: {auditLog.ipAddress}
    - Changes: List of field changes
  - [ ] **Approved** (if applicable):
    - User: {approvedBy}
    - Date/Time: {approvalDate}
    - Notes: {approver notes}
  - [ ] Full audit log table with all operations

  **Actions Section** (bottom buttons):
  - [ ] **Edit** button (if status = DRAFT)
  - [ ] **Approve** button (if Finance Admin/Owner and JE created)
  - [ ] **Reverse** button (if status = POSTED, creates reversal JE)
  - [ ] **View Full JE Details** button (if journalEntryId exists)
  - [ ] **Download Supporting Docs** button (if documents exist)
  - [ ] **Print** button (optional)
  - [ ] **Close** button

**Acceptance Criteria**:
- Modal displays all revenue information
- All sections render correctly
- Conditional sections show/hide appropriately
- Links work properly
- Actions work correctly
- Document preview/download works
- Audit trail displays completely

---

#### Task 2.4.2: Update Staff View Revenue Modal (`app/(staff)/staff/revenue/viewRevenue.tsx`)
**Status**: File exists, needs same updates  
**Dependencies**: Task 2.4.1  
**Estimated Time**: 2 hours

**Subtasks**:
- [ ] **COPY** updated structure from admin modal
- [ ] **REMOVE** admin-only actions (Approve, Reverse)
- [ ] Test all functionality

**Acceptance Criteria**:
- Same display as admin modal
- Appropriate action buttons for staff

---

## 🟢 PHASE 3: INTEGRATION & DATA (Medium Priority)

### 3.1 Dropdown Data Loading

#### Task 3.1.1: Create Dropdown API Endpoints
**Status**: Not started  
**Dependencies**: None  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **CREATE** `/api/revenue/dropdowns/sources` endpoint
  - [ ] Fetch all active RevenueSources
  - [ ] Return array of {id, sourceCode, name}
- [ ] **CREATE** `/api/revenue/dropdowns/payment-methods` endpoint
  - [ ] Fetch all active PaymentMethods
  - [ ] Return array of {id, methodCode, methodName}
- [ ] **CREATE** `/api/revenue/dropdowns/bus-trips` endpoint
  - [ ] Fetch BusTripCache records where is_revenue_recorded = false
  - [ ] Return array with assignment_id, route, date, trip_revenue
- [ ] **CREATE** `/api/revenue/dropdowns/loan-payments` endpoint
  - [ ] Fetch LoanPayments without linked revenue
  - [ ] Return array with id, paymentCode, employeeName, amount
- [ ] **CREATE** `/api/revenue/dropdowns/installment-schedules` endpoint
  - [ ] Fetch active InstallmentSchedules of type REVENUE
  - [ ] Return array with id, scheduleCode, details

**Acceptance Criteria**:
- All endpoints return correct data
- Data properly filtered
- Fast response times

---

#### Task 3.1.2: Create Dropdown Components
**Status**: Not started  
**Dependencies**: Task 3.1.1  
**Estimated Time**: 3-4 hours

**Subtasks**:
- [ ] **CREATE** `RevenueSourceDropdown` component
  - [ ] Fetch sources from API
  - [ ] Display as searchable dropdown
  - [ ] Show sourceCode and name
- [ ] **CREATE** `PaymentMethodDropdown` component
  - [ ] Fetch methods from API
  - [ ] Display as dropdown
  - [ ] Show methodCode and methodName
- [ ] **CREATE** `BusTripSelector` component
  - [ ] Fetch bus trips from API
  - [ ] Display as autocomplete with search
  - [ ] Show assignment_id, route, date, amount
  - [ ] onSelect callback returns full trip data
- [ ] **CREATE** `LoanPaymentSelector` component
  - [ ] Fetch loan payments from API
  - [ ] Display as autocomplete with search
  - [ ] Show paymentCode, employee, amount
  - [ ] onSelect callback returns full payment data
- [ ] **CREATE** `InstallmentScheduleDropdown` component
  - [ ] Fetch schedules from API
  - [ ] Display as dropdown
  - [ ] Show scheduleCode and summary

**Acceptance Criteria**:
- Components render correctly
- Search/filter works
- Selection callbacks work
- Loading states handled

---

### 3.2 Data Migration

#### Task 3.2.1: Create Data Migration Script
**Status**: Not started  
**Dependencies**: New schema fully implemented  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **CREATE** `prisma/migrations/migrate-revenue-data.ts` script
  - [ ] Fetch all existing revenue records (old structure)
  - [ ] For each revenue:
    - [ ] Map old category_id to new sourceId
      - Create lookup table: category_name → RevenueSource
    - [ ] Map old payment_method_id to new paymentMethodId
      - Use GlobalPaymentMethod → PaymentMethod mapping
    - [ ] Set externalRefType based on category/context
      - If has bus_trip_id → "BUS_TRIP"
      - If has assignment_id → "BUS_TRIP"
      - Otherwise → "MISCELLANEOUS"
    - [ ] Set externalRefId appropriately
    - [ ] Map is_receivable + due_date → isAccountsReceivable + arDueDate
    - [ ] Set arStatus based on old payment_status
    - [ ] Handle installments (if implemented in old system)
    - [ ] Set transactionDate from collection_date
    - [ ] Copy description, amount, created_by, etc.
  - [ ] Create new revenue records in batches
  - [ ] Log migration progress
  - [ ] Handle errors gracefully
  - [ ] Generate migration report

**Acceptance Criteria**:
- Script runs without errors
- All revenue records migrated
- Data integrity maintained
- Report shows success/failure stats
- Rollback possible if needed

---

#### Task 3.2.2: Test Data Migration
**Status**: Not started  
**Dependencies**: Task 3.2.1  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **RUN** migration script on test database
- [ ] **VERIFY** data accuracy:
  - [ ] Check sample records manually
  - [ ] Verify counts match (old vs new)
  - [ ] Verify amounts sum correctly
  - [ ] Check relationships intact
- [ ] **TEST** UI with migrated data
- [ ] **FIX** any issues found
- [ ] **DOCUMENT** migration process

**Acceptance Criteria**:
- Migration successful on test data
- Data verified accurate
- UI works with migrated data
- Process documented

---

### 3.3 Accounts Receivable Integration

#### Task 3.3.1: AR Creation from Revenue
**Status**: Not started  
**Dependencies**: AR module exists  
**Estimated Time**: 3-4 hours

**Subtasks**:
- [ ] **CREATE** function to create AR from revenue
  - [ ] When revenue created with isAccountsReceivable = true
  - [ ] Create AccountsReceivable record
  - [ ] Set debtorName (from external source if available)
  - [ ] Set totalAmount = revenue.amount
  - [ ] Set invoiceDate = revenue.transactionDate
  - [ ] Set dueDate = revenue.arDueDate
  - [ ] Set referenceType = "REVENUE"
  - [ ] Set referenceId = revenue.revenueCode
  - [ ] Link revenue.arId to created AR
- [ ] **CREATE** function to update AR when revenue paid
  - [ ] Update paidAmount
  - [ ] Update balanceAmount
  - [ ] Update status (PENDING → PARTIAL → PAID)
  - [ ] Update lastPaymentDate

**Acceptance Criteria**:
- AR automatically created with revenue
- AR updated when revenue status changes
- AR and revenue stay in sync

---

### 3.4 Installment Payment Tracking

#### Task 3.4.1: Installment Payment Recording
**Status**: Not started (future enhancement)  
**Dependencies**: Installment schedule created  
**Estimated Time**: 4-5 hours

**Subtasks**:
- [ ] **CREATE** table for individual installment payments (if not exists)
- [ ] **CREATE** function to record installment payment
  - [ ] Update installment payment record
  - [ ] Update revenue AR status if applicable
  - [ ] Create sub-revenue or payment record
  - [ ] Update schedule progress
- [ ] **CREATE** UI for recording payments
  - [ ] Payment form modal
  - [ ] Payment history list

**Acceptance Criteria**:
- Can record individual installment payments
- Schedule updated correctly
- Payment history visible

---

## 🔵 PHASE 4: TESTING & DOCUMENTATION (Final Priority)

### 4.1 Comprehensive Testing

#### Task 4.1.1: Unit Tests
**Status**: Not started  
**Dependencies**: All implementation complete  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **WRITE** unit tests for validation functions
  - [ ] Test each validation function independently
  - [ ] Test edge cases and error conditions
- [ ] **WRITE** unit tests for helper functions
  - [ ] Test bus trip revenue creation
  - [ ] Test installment calculations
  - [ ] Test journal entry creation
- [ ] **ACHIEVE** >80% code coverage

**Acceptance Criteria**:
- All unit tests pass
- Edge cases covered
- Code coverage >80%

---

#### Task 4.1.2: Integration Tests
**Status**: Not started  
**Dependencies**: All implementation complete  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **WRITE** integration tests for API endpoints
  - [ ] Test full request/response cycle
  - [ ] Test with database
  - [ ] Test error handling
- [ ] **WRITE** integration tests for workflows
  - [ ] Test create revenue → post to GL workflow
  - [ ] Test AR creation and payment workflow
  - [ ] Test installment creation and tracking
- [ ] **RUN** all integration tests

**Acceptance Criteria**:
- All integration tests pass
- Workflows work end-to-end
- Database operations correct

---

#### Task 4.1.3: E2E UI Tests
**Status**: Not started  
**Dependencies**: All UI complete  
**Estimated Time**: 6-8 hours

**Subtasks**:
- [ ] **WRITE** E2E tests for revenue workflows
  - [ ] Test create revenue flow (all types)
  - [ ] Test edit revenue flow
  - [ ] Test view revenue flow
  - [ ] Test filters and search
  - [ ] Test pagination
  - [ ] Test validation errors
- [ ] **USE** Playwright or Cypress
- [ ] **RUN** all E2E tests

**Acceptance Criteria**:
- All E2E tests pass
- Critical user paths covered
- Tests run in CI/CD

---

### 4.2 Documentation

#### Task 4.2.1: User Documentation
**Status**: Not started  
**Dependencies**: All implementation complete  
**Estimated Time**: 4-6 hours

**Subtasks**:
- [ ] **WRITE** user guide for revenue module
  - [ ] How to create different revenue types
  - [ ] How to use AR features
  - [ ] How to create installment plans
  - [ ] How to post to GL
  - [ ] Screenshots and examples
- [ ] **CREATE** video tutorial (optional)
- [ ] **PUBLISH** documentation

**Acceptance Criteria**:
- Comprehensive user guide available
- All features documented
- Screenshots/examples included

---

#### Task 4.2.2: Developer Documentation
**Status**: Partially complete ✅ (docs created)  
**Dependencies**: All implementation complete  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **UPDATE** API documentation
  - [ ] Document all endpoints
  - [ ] Include request/response examples
  - [ ] Document error codes
- [ ] **UPDATE** code comments
  - [ ] Add JSDoc comments to functions
  - [ ] Document complex logic
- [ ] **UPDATE** README
  - [ ] Architecture overview
  - [ ] Setup instructions
  - [ ] Development guide

**Acceptance Criteria**:
- API fully documented
- Code well-commented
- README up-to-date

---

### 4.3 Performance Optimization

#### Task 4.3.1: Database Optimization
**Status**: Not started  
**Dependencies**: All implementation complete  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **ANALYZE** slow queries
- [ ] **ADD** database indexes for frequently queried fields:
  - [ ] Revenue.sourceId
  - [ ] Revenue.transactionDate
  - [ ] Revenue.externalRefType
  - [ ] Revenue.arStatus
  - [ ] Revenue.isAccountsReceivable
  - [ ] Revenue.isInstallment
  - [ ] Revenue.journalEntryId
- [ ] **OPTIMIZE** complex queries
- [ ] **TEST** performance improvements

**Acceptance Criteria**:
- List page loads <1s
- Create/update operations <500ms
- No slow query warnings

---

#### Task 4.3.2: Frontend Optimization
**Status**: Not started  
**Dependencies**: All UI complete  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **IMPLEMENT** lazy loading for modals
- [ ] **IMPLEMENT** virtual scrolling for large lists
- [ ] **OPTIMIZE** re-renders (React.memo, useMemo, useCallback)
- [ ] **MINIMIZE** bundle size
- [ ] **TEST** performance with large datasets

**Acceptance Criteria**:
- UI responsive even with 1000+ revenues
- No lag when opening modals
- Bundle size optimized

---

## 🔴 PHASE 5: DEPLOYMENT (Final Step)

### 5.1 Pre-Deployment Checklist

#### Task 5.1.1: Pre-Deployment Tasks
**Status**: Not started  
**Dependencies**: All previous phases complete  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **RUN** all tests (unit, integration, E2E)
- [ ] **FIX** any failing tests
- [ ] **REVIEW** code for security issues
- [ ] **CHECK** environment variables configured
- [ ] **BACKUP** production database
- [ ] **PREPARE** rollback plan
- [ ] **NOTIFY** users of upcoming changes
- [ ] **SCHEDULE** maintenance window

**Acceptance Criteria**:
- All tests passing
- No security vulnerabilities
- Backup created
- Rollback plan ready
- Users notified

---

### 5.2 Deployment

#### Task 5.2.1: Deploy to Production
**Status**: Not started  
**Dependencies**: Task 5.1.1  
**Estimated Time**: 2-3 hours

**Subtasks**:
- [ ] **RUN** database migrations
- [ ] **RUN** data migration script
- [ ] **DEPLOY** backend API
- [ ] **DEPLOY** frontend UI
- [ ] **VERIFY** deployment successful
- [ ] **TEST** critical paths in production
- [ ] **MONITOR** for errors
- [ ] **BE READY** to rollback if issues

**Acceptance Criteria**:
- Deployment successful
- No critical errors
- Critical paths working
- Users can access system

---

### 5.3 Post-Deployment

#### Task 5.3.1: Post-Deployment Tasks
**Status**: Not started  
**Dependencies**: Task 5.2.1  
**Estimated Time**: 1-2 hours

**Subtasks**:
- [ ] **MONITOR** system for 24-48 hours
- [ ] **COLLECT** user feedback
- [ ] **FIX** any issues found
- [ ] **DOCUMENT** lessons learned
- [ ] **CELEBRATE** successful deployment! 🎉

**Acceptance Criteria**:
- System stable
- No major issues reported
- Users happy
- Documentation complete

---

## 📊 SUMMARY

### Total Estimated Time
- **Phase 1 (Backend)**: 25-35 hours (3-5 days)
- **Phase 2 (Frontend)**: 40-50 hours (5-7 days)
- **Phase 3 (Integration)**: 20-25 hours (3-4 days)
- **Phase 4 (Testing)**: 20-25 hours (3-4 days)
- **Phase 5 (Deployment)**: 5-8 hours (1 day)

**TOTAL: 110-143 hours (14-18 working days or 3-4 weeks)**

### Priority Order
1. ✅ **DONE**: TypeScript types, validation logic, documentation, Prisma client regeneration
2. **NEXT**: Phase 1 - Backend API (critical path)
3. **THEN**: Phase 2 - Frontend UI (depends on backend)
4. **AFTER**: Phase 3 - Integration (connects everything)
5. **FINALLY**: Phase 4 & 5 - Testing, documentation, deployment

### Quick Wins (Can do in parallel)
- Task 1.3.1: Fix validation type errors (1 hour)
- Task 3.1.1: Create dropdown endpoints (2-3 hours)
- Task 4.2.2: Update developer documentation (2-3 hours)

### Critical Path (Must complete in order)
1. Task 1.1.1: Main revenue API → Task 1.1.2: Single revenue API
2. Task 2.1.1: Revenue list page → Task 2.2.1: Add modal → Task 2.3.1: Edit modal → Task 2.4.1: View modal
3. Task 3.2.1: Data migration → Task 5.2.1: Production deployment

### Risks
- **Data Migration Complexity**: Old data may not map cleanly to new structure
- **User Training**: New UI is significantly different
- **Integration Challenges**: AR, Installments, JE integration may have edge cases
- **Performance**: New queries may be slower with large datasets
- **Timeline**: 3-4 weeks is ambitious for one developer

### Recommendations
1. **Start with Backend**: Complete Phase 1 fully before moving to UI
2. **Incremental Testing**: Test each component as you build
3. **Frequent Commits**: Commit working code frequently
4. **Parallel Work**: If team available, split backend/frontend work
5. **User Feedback**: Get feedback early on mockups/prototypes
6. **Buffer Time**: Add 20% buffer for unexpected issues

---

## 🎯 NEXT IMMEDIATE STEPS

### This Week (Priority Order)
1. [ ] Fix validation.ts type errors (1 hour)
2. [ ] Implement GET /api/revenue (4 hours)
3. [ ] Implement POST /api/revenue (4 hours)
4. [ ] Create bus trip revenue helper (3 hours)
5. [ ] Implement GET /api/revenue/[id] (3 hours)
6. [ ] Implement PUT /api/revenue/[id] (3 hours)
7. [ ] Test all backend endpoints (4 hours)

**Total: ~22 hours (3 working days)**

### Next Week
1. [ ] Update revenue list page (8 hours)
2. [ ] Create add revenue modal (12 hours)
3. [ ] Create dropdown components (4 hours)

**Total: ~24 hours (3 working days)**

---

**END OF ACTION PLAN**
