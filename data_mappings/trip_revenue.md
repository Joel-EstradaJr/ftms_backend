# Bus Trip Revenue - UI to Backend Data Mapping

## Overview
This document maps UI fields in the Bus Trip Revenue sub-module to their corresponding backend database fields in `schema.prisma`.

---

## Business Logic Summary

### Status Determination (CRITICAL)
Status is based on **expected remittance**, NOT minimum wage.

```
BOUNDARY:
  expected_remittance = trip_fuel_expense + assignment_value
  
PERCENTAGE:
  expected_remittance = (trip_revenue × assignment_value) + trip_fuel_expense

STATUS LOGIC:
  if trip_revenue >= expected_remittance → PAID
  if trip_revenue < expected_remittance → PARTIALLY_PAID
```

### Shortage Calculation
```
shortage = expected_remittance - trip_revenue
```
- Create receivables **only if shortage > 0**
- Minimum wage is NOT part of shortage computation

### Installment Schedule Calculation
```
number_of_payments = system_configuration.default_number_of_payments
frequency = system_configuration.default_frequency
amount_due_per_installment = receivable.total_amount / number_of_payments
last_installment = receivable.total_amount - sum(previous_installments)

Due Date Intervals:
  DAILY → +1 day
  WEEKLY → +7 days
  BIWEEKLY → +14 days  
  MONTHLY → +1 month
```

---

## Chart of Accounts (Reference)

| SUB-MODULE | PAGE | SECTION | UI FIELDS | DB FIELDS / ACTIONS | NOTES | GENERAL NOTES |
|------------|------|---------|-----------|---------------------|-------|---------------|
| N/A | MAIN | TABLE | Account Code | account_code | Unique identifier | - |
| | | | Account Name | account_name | COA title | - |
| | | | Account Type | account_type.name | Join with account_type table | - |
| | | | Normal Balance | normal_balance | Debit / Credit | - |
| | | | Description | description | Short preview (truncate if long) | - |
| | | | Status | is_deleted | Display as Active / Archived | - |
| | | | Actions | View / Edit / Archive / Restore / Delete (Hard) | Can only archive no-linked accounts. Actions for Active accounts: View, Edit, Archive; Actions for Archive accounts: View, Restore, Delete (Hard) | - |
| | | FILTER | Account Type | account_type.name | Join with account_type table | Can be multi-selected |
| | | | Normal Balance | normal_balance | Debit / Credit | |
| | | | Status | is_deleted | Display as Active / Archived | |
| | | SEARCH | All | - | - | - |
| | | EXPORT | TBA | TBA | TBA | - |
| | ADD | INPUT FIELDS | Account Code | account_code | Must be unique; auto-filled/suggested but last three digit is customizable; Only last three digit is editable but must be unique from the existing records. | - |
| | | | Account Name | account_name | Must be unique per account type | - |
| | | | Account Type | account_type_id | Select from account_type table | - |
| | | | Normal Balance | normal_balance | Enum: Debit / Credit | - |
| | | | Description | description | Optional | - |
| | | | Status | is_deleted | default Active, can be edited. | - |
| | EDIT | INPUT FIELDS | Account Code | account_code | Must be unique; Only last three digit is editable but must be unique from the existing records. | All fields can be edited if the COA record is not yet linked to any record. Else, all fields cannot be edited. |
| | | | Account Name | account_name | Must be unique per account type | |
| | | | Account Type | account_type_id | Select from account_type table | |
| | | | Normal Balance | normal_balance | Enum: Debit / Credit | |
| | | | Description | description | Editable | |
| | | | Status | is_deleted | default Active, can be edited. | |
| | VIEW | DISPLAY FIELDS | Account Code | account_code | - | |
| | | | Account Name | account_name | - | |
| | | | Account Type | account_type.name | - | |
| | | | Normal Balance | normal_balance | - | |
| | | | Description | description | - | |
| | | | Status | is_deleted | - | |
| | | | No. of linked entries | Journal Entry Line [] | - | |
| | | | Created By | created_by | - | Only latest Audit data will be displayed. Audit microservice will handle historical audits. |
| | | | Created At | created_at | - | |
| | | | Last Updated By | updated_by | - | |
| | | | Last Updated At | updated_at | - | |
| | | | Archived By | deleted_by | - | |
| | | | Archived At | deleted_at | - | |

---

## Journal Entry (Reference)

| SUB-MODULE | PAGE | SECTION | UI FIELDS | DB FIELDS / ACTIONS | NOTES | GENERAL NOTES |
|------------|------|---------|-----------|---------------------|-------|---------------|
| N/A | MAIN | TABLE | JE Code | journal_entry.code | Unique. Clickable → opens View Modal | |
| | | | Date | journal_entry.date | Display format: YYYY-MM-DD | |
| | | | Reference | journal_entry.reference | Nullable | |
| | | | Description (subtitle under Reference) | journal_entry.description | Truncated (e.g. 2 lines) | |
| | | | Total Debit | journal_entry.total_debit | Must match credit | |
| | | | Total Credit | journal_entry.total_credit | Must match debit | |
| | | | Entry Type | journal_entry.entry_type | AUTO, MANUAL | |
| | | | Status | journal_entry.status | DRAFT, POSTED, REVERSED | |
| | | | Actions | View, Edit, Archive, Post, Reverse, Restore, Delete (Hard) | View - Always, Edit - status = DRAFT & not deleted, Archive - status IN (DRAFT and MANUAL ENTRY), Post - status = APPROVED, Reverse - status = POSTED, Restore - is_deleted = true, Delete (Hard) - is_deleted = true | |
| | | FILTER | Date | journal_entry.date | - | |
| | | | Total Debit Range | journal_entry.total_debit | - | |
| | | | Total Credit Range | journal_entry.total_credit | - | |
| | | | Entry Type | journal_entry.entry_type | - | |
| | | | Status | journal_entry.status | - | |
| | | SEARCH | ALL | - | - | - |
| | | EXPORT | TBA | TBA | TBA | TBA |
| | ADD | INPUT FIELDS (MAIN) | JE Code | journal_entry.code | Auto-generated, unique | Must have minimum 2 lines, No negative values, Sum of debit = sum of credit |
| | | | Date | journal_entry.date | Date Picker, auto-filled editable | |
| | | | Reference | journal_entry.reference | searchable dropdown (other module code) | |
| | | | Description | journal_entry.description | - | |
| | | | Entry Type | journal_entry.entry_type | Auto-generated, not editable | |
| | | | Status | journal_entry.status | default DRAFT | |
| | | | Reversal Of | reversal_of_code | searchable dropdown (journal code); Visible only if this is reversal triggered from action button | |
| | | INPUT FIELDS (JE LINE SECTION) | # | line_number | Auto/Number increment, Ascending order | |
| | | | Account Code \| Account Name | account_code \| account_name | CONCAT, Must be valid COA | |
| | | | Debit | debit | Cannot be >0 if credit >0 | |
| | | | Credit | credit | Cannot be >0 if debit >0 | |
| | | | Line Description | description | - | |
| | EDIT | INPUT FIELDS (MAIN) | JE Code | journal_entry.code | Auto-generated, unique | All fields can be edited except JE code, entry_type, and Line No. IF entry_type is MANUAL and entry_status is DRAFT. |
| | | | Date | journal_entry.date | Date Picker, auto-filled editable | |
| | | | Reference | journal_entry.reference | searchable dropdown (other module code) | |
| | | | Description | journal_entry.description | - | |
| | | | Entry Type | journal_entry.entry_type | Auto-generated, not editable | |
| | | | Status | journal_entry.status | default DRAFT | |
| | | | Reversal Of | reversal_of_code | searchable dropdown (journal code); Visible only if this is reversal triggered from action button | |
| | | INPUT FIELDS (JE LINE SECTION) | Line No. | line_number | Auto/Number increment, Ascending order | |
| | | | Account Code \| Account Name | account_code \| account_name | CONCAT, Must be valid COA | |
| | | | Debit | debit | Cannot be >0 if credit >0 | |
| | | | Credit | credit | Cannot be >0 if debit >0 | |
| | | | Line Description | description | - | |
| | VIEW | DISPLAY FIELDS (MAIN) | JE Code | journal_entry.code | Auto-generated, unique | - |
| | | | Date | journal_entry.date | Date Picker, auto-filled editable | - |
| | | | Reference | journal_entry.reference | searchable dropdown (other module code) | - |
| | | | Description | journal_entry.description | - | - |
| | | | Entry Type | journal_entry.entry_type | Auto-generated, not editable | - |
| | | | Status | journal_entry.status | default DRAFT | - |
| | | | Reversal Of | reversal_of_code | searchable dropdown (journal code); Visible only if this is reversal triggered from action button | - |
| | | DISPLAY FIELDS (JE LINE SECTION) | Line No. | line_number | Auto/Number increment, Ascending order | - |
| | | | Account Code \| Account Name | account_code \| account_name | CONCAT, Must be valid COA | - |
| | | | Debit | debit | Cannot be >0 if credit >0 | - |
| | | | Credit | credit | Cannot be >0 if debit >0 | - |
| | | | Line Description | description | - | - |

---

## Bus Trip Revenue

### MAIN PAGE - TABLE

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| No. | N/A | UI only, incremental, respects filter/current number of records |
| Body Number | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.bus_id → bus_local.body_number | Join through composite FK |
| Date Assigned | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.date_assigned | Join through composite FK |
| Trip Revenue | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.trip_revenue | Actual cash collected |
| Assignment Type | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.assignment_type | BOUNDARY or PERCENTAGE |
| Status | revenue.remittance_status | **CORRECT LOGIC:**<br>BOUNDARY: if trip_revenue >= (trip_fuel_expense + assignment_value) → PAID; else → PARTIALLY_PAID<br>PERCENTAGE: if trip_revenue >= ((trip_revenue × assignment_value) + trip_fuel_expense) → PAID; else → PARTIALLY_PAID<br>**NOTE:** PARTIALLY_PAID creates receivable record |
| Date Recorded | revenue.date_recorded | Default: datetime when record created |
| Action Buttons | View, Record Receivable Payment, Edit | All Status: View<br>PARTIALLY_PAID only: Record Receivable Payment, Edit |

### MAIN PAGE - FILTER

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Assigned | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.date_assigned | Date range filter |
| Assignment Type | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.assignment_type | Dropdown: BOUNDARY, PERCENTAGE |
| Status | revenue.remittance_status | Dropdown: PAID, PARTIALLY_PAID |
| Trip Revenue | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.trip_revenue | Range filter (min-max) |
| Date Recorded | revenue.date_recorded | Date range filter |

### MAIN PAGE - SEARCH

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Body Number | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.bus_id → bus_local.body_number | Searchable text |
| Date Assigned | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.date_assigned | Searchable date |
| Trip Revenue | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.trip_revenue | Searchable number |
| Assignment Type | revenue.bus_trip_assignment_id AND revenue.bus_trip_id → bus_trip_local.assignment_type | Searchable text |
| Status | revenue.remittance_status | Searchable enum |
| Date Recorded | revenue.date_recorded | Searchable date |

### MAIN PAGE - EXPORT

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Assigned | bus_trip_local.date_assigned | - |
| Body Number | bus_local.body_number | - |
| Route | bus_trip_local.bus_route | - |
| Type | bus_trip_local.assignment_type | - |
| Trip Revenue | bus_trip_local.trip_revenue | - |
| Due Date | revenue.date_expected | - |
| Status | revenue.remittance_status | - |

---

## ADD / RECORD TRIP REVENUE MODAL

### Input Fields - Bus Details (Auto-Filled, Not Editable)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Assigned | bus_trip_local.date_assigned | Auto-Filled |
| Body Number | bus_trip_local.bus_id → bus_local.body_number | Auto-Filled |
| Body Builder | bus_local.body_builder | Auto-Filled |
| Plate Number | bus_trip_local.bus_id → bus_local.license_plate | Auto-Filled |
| Bus Type | bus_trip_local.bus_id → bus_local.type | Auto-Filled |
| Route | bus_trip_local.bus_route | Auto-Filled |
| Assignment Type | bus_trip_local.assignment_type | Auto-Filled |
| Company Share | bus_trip_local.assignment_value | Auto-Filled (percentage or boundary quota) |
| Payment Method | bus_trip_local.payment_method | Auto-Filled |
| Trip Revenue | bus_trip_local.trip_revenue | Auto-Filled |
| Fuel Expense | bus_trip_local.trip_fuel_expense | Auto-Filled |

### Input Fields - Employee Details (Auto-Filled, Not Editable)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Driver Name | bus_trip_employee_local.employee_number → employee_local.first_name + middle_name + last_name WHERE bus_trip_employee_local.role = DRIVER | Auto-Filled |
| Conductor Name | bus_trip_employee_local.employee_number → employee_local.first_name + middle_name + last_name WHERE bus_trip_employee_local.role = CONDUCTOR | Auto-Filled (optional - may not exist) |

### Input Fields - Remittance Details

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Recorded | revenue.date_recorded | Default: now(); Editable |
| Due Date | revenue.date_expected | Auto-calculated: date_assigned + 1 day |
| Expected Remittance | **Calculated** | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense |
| Amount Remitted | revenue.amount | **MAPS TO:** bus_trip_local.trip_revenue (auto-filled) |
| Remittance Status | revenue.remittance_status | Auto-calculated based on expected vs actual |
| Remarks | revenue.description | User input, editable |

### Input Fields - Shortage Details (Only when shortage > 0)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| **Principal Amount Breakdown** | | |
| Trip Revenue | bus_trip_local.trip_revenue | Display |
| Company Share | bus_trip_local.assignment_value | **PERCENTAGE:** display calculated amount (trip_revenue × assignment_value)<br>**BOUNDARY:** display assignment_value |
| Fuel Expense | bus_trip_local.trip_fuel_expense | Display |
| Expected Remittance | Calculated | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense |
| Amount Remitted | revenue.amount | Display |
| Principal Amount | receivable.total_amount | **shortage = expected_remittance - trip_revenue**<br>Only > 0 creates receivable |
| **General Details** | | |
| Total Receivable | receivable.total_amount | Same as shortage |
| Description | receivable.description | Auto-filled: "Trip Deficit" |
| Due Date | receivable.due_date | revenue.date_recorded + system_configuration.receivable_due_date_days |
| **Installment Configuration** | | |
| Schedule Frequency | system_configuration.default_frequency | DAILY, WEEKLY, BIWEEKLY, MONTHLY |
| Number of Payments | system_configuration.default_number_of_payments | Default: 3 |
| Start Date | receivable.installment_start_date | Default: date_recorded |
| **Installment Table** | | |
| Due Date | revenue_installment_schedule.due_date | Calculated based on frequency |
| Amount Due | revenue_installment_schedule.amount_due | total_amount / number_of_payments |
| Status | revenue_installment_schedule.status | Default: PENDING |

---

## CONFIGURATION MODAL

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Minimum Wage | system_configuration.minimum_wage | Editable; Default: 600.00 |
| Duration to Receivable (Hours) | system_configuration.duration_to_receivable_hours | Editable; Default: 72 (3 days) |
| Receivable Due Date (Days) | system_configuration.receivable_due_date_days | Editable; Default: 30 days |
| Default Driver Share (%) | system_configuration.driver_share_percentage | Editable; Default: 50% |
| Default Conductor Share (%) | system_configuration.conductor_share_percentage | Editable; Default: 50% |
| Default Frequency | system_configuration.default_frequency | Editable; DAILY/WEEKLY/BIWEEKLY/MONTHLY |
| Default Number of Payments | system_configuration.default_number_of_payments | Editable; Default: 3 |

---

## AUTO-CREATION FIELDS (Backend - No UI)

### Revenue Record Creation

Upon syncing external operations data to `bus_trip_local`, each record must have a corresponding `revenue` record created automatically.

| FIELD | DB FIELD | MAPPING / LOGIC |
|-------|----------|-----------------|
| id | revenue.id | Auto-generated, incremental |
| code | revenue.code | Auto-generated, format: REV-XXXXX |
| revenue_type_id | revenue.revenue_type_id | **BOUNDARY:** "REVT-001" (Bus Trip Revenue - Boundary)<br>**PERCENTAGE:** "REVT-002" (Bus Trip Revenue - Percentage) |
| amount | revenue.amount | **MAPS TO:** bus_trip_local.trip_revenue |
| date_recorded | revenue.date_recorded | Auto-filled with datetime when recorded |
| date_expected | revenue.date_expected | bus_trip_local.date_assigned + 1 day |
| description | revenue.description | User input or auto-generated |
| remittance_status | revenue.remittance_status | **BOUNDARY:** if trip_revenue >= (trip_fuel_expense + assignment_value) → PAID; else → PARTIALLY_PAID<br>**PERCENTAGE:** if trip_revenue >= ((trip_revenue × assignment_value) + trip_fuel_expense) → PAID; else → PARTIALLY_PAID |
| receivable_id | revenue.receivable_id | Always NULL for Bus Trip Revenue |
| driver_receivable_id | revenue.driver_receivable_id | Links to driver's receivable if PARTIALLY_PAID |
| conductor_receivable_id | revenue.conductor_receivable_id | Links to conductor's receivable if PARTIALLY_PAID |
| payment_method | revenue.payment_method | Default: CASH |
| payment_reference | revenue.payment_reference | Always NULL for Bus Trip Revenue |
| journal_entry_id | revenue.journal_entry_id | Links to auto-generated journal entry |
| disposal_ref | revenue.disposal_ref | Always NULL for Bus Trip Revenue |
| rental_assignment_id | revenue.rental_assignment_id | Always NULL for Bus Trip Revenue |
| bus_trip_assignment_id | revenue.bus_trip_assignment_id | bus_trip_local.assignment_id |
| bus_trip_id | revenue.bus_trip_id | bus_trip_local.bus_trip_id |

### Receivable Record Creation (Only if shortage > 0)

| FIELD | DB FIELD | MAPPING / LOGIC |
|-------|----------|-----------------|
| id | receivable.id | Auto-generated, incremental |
| code | receivable.code | Auto-generated, format: RCVL-XXXXX |
| debtor_name | receivable.debtor_name | Employee full name from employee_local |
| employee_number | receivable.employee_number | bus_trip_employee_local.employee_number |
| description | receivable.description | **Format:**<br>"[ROLE] \| [ASSIGNMENT_TYPE] trip shortage - Bus: [BODY_NUMBER] - Date: [DATE_ASSIGNED] - Expected: ₱[EXPECTED_REMITTANCE] - Collected: ₱[TRIP_REVENUE] - Shortage: ₱[SHORTAGE]"<br><br>**Where:**<br>- BODY_NUMBER = bus_trip_local.bus_id → bus_local.body_number<br>- EXPECTED_REMITTANCE = trip_fuel_expense + assignment_value (BOUNDARY) OR (trip_revenue × assignment_value) + trip_fuel_expense (PERCENTAGE)<br>- SHORTAGE = expected_remittance - trip_revenue |
| total_amount | receivable.total_amount | **shortage = expected_remittance - trip_revenue**<br>**BOUNDARY:** (trip_fuel_expense + assignment_value) - trip_revenue<br>**PERCENTAGE:** ((trip_revenue × assignment_value) + trip_fuel_expense) - trip_revenue<br>**NOTE:** Only creates receivable if shortage > 0 |
| installment_start_date | receivable.installment_start_date | Default: revenue.date_recorded |
| due_date | receivable.due_date | revenue.date_recorded + system_configuration.receivable_due_date_days |
| status | receivable.status | Default: PENDING |
| paid_amount | receivable.paid_amount | Default: 0 |
| balance | receivable.balance | receivable.total_amount - receivable.paid_amount |
| last_payment_date | receivable.last_payment_date | NULL initially |
| last_payment_amount | receivable.last_payment_amount | NULL initially |
| interest_rate | receivable.interest_rate | Default: 0 |
| accrued_interest | receivable.accrued_interest | Default: 0 |
| last_interest_applied | receivable.last_interest_applied | NULL initially |

### Installment Schedule Creation

| FIELD | DB FIELD | MAPPING / LOGIC |
|-------|----------|-----------------|
| id | revenue_installment_schedule.id | Auto-generated |
| receivable_id | revenue_installment_schedule.receivable_id | FK to receivable.id |
| installment_number | revenue_installment_schedule.installment_number | Sequential: 1, 2, 3... up to number_of_payments |
| due_date | revenue_installment_schedule.due_date | Calculated from installment_start_date + frequency interval:<br>- DAILY: +1 day per installment<br>- WEEKLY: +7 days per installment<br>- BIWEEKLY: +14 days per installment<br>- MONTHLY: +1 month per installment |
| amount_due | revenue_installment_schedule.amount_due | receivable.total_amount / number_of_payments<br>**Last installment:** total_amount - sum(previous installments) |
| amount_paid | revenue_installment_schedule.amount_paid | Default: 0 |
| balance | revenue_installment_schedule.balance | Initially same as amount_due |
| status | revenue_installment_schedule.status | Default: PENDING |

### Installment Payment Recording

| FIELD | DB FIELD | MAPPING / LOGIC |
|-------|----------|-----------------|
| id | revenue_installment_payment.id | Auto-generated |
| installment_id | revenue_installment_payment.installment_id | FK to schedule row being paid |
| revenue_id | revenue_installment_payment.revenue_id | FK to revenue record |
| amount_paid | revenue_installment_payment.amount_paid | User input |
| payment_date | revenue_installment_payment.payment_date | Default: now() or user-specified |
| payment_method | revenue_installment_payment.payment_method | User input: CASH / BANK_TRANSFER / E_WALLET |
| payment_reference | revenue_installment_payment.payment_reference | Optional external reference |
| journal_entry_id | revenue_installment_payment.journal_entry_id | Links to auto-generated journal entry |

---

## Journal Entry Auto-Generation

### FOR BUS TRIP REVENUE - NO SHORTAGE (PAID status)

```json
{
  "module": "Trip Revenue",
  "reference_id": "[revenue.code]",
  "description": "[ASSIGNMENT_TYPE] revenue - ₱[TRIP_REVENUE] - Payment: [PAYMENT_METHOD] - Bus: [BODY_NUMBER]",
  "date": "[DATE_RECORDED]",
  "entries": [
    {
      "account_code": "1000",
      "debit": "[TRIP_REVENUE]",
      "credit": 0,
      "description": "Cash received from trip"
    },
    {
      "account_code": "3000",
      "debit": 0,
      "credit": "[TRIP_REVENUE]",
      "description": "Trip revenue recognized"
    }
  ]
}
```

**Account Codes:**
- Asset account (debit): 1000 = CASH, 1005 = BANK_TRANSFER, 1010 = E_WALLET
- Revenue account (credit): 3000 = BOUNDARY, 3005 = PERCENTAGE

### FOR BUS TRIP REVENUE - WITH SHORTAGE (PARTIALLY_PAID status)

```json
{
  "module": "Trip Revenue",
  "reference_id": "[revenue.code]",
  "description": "[ASSIGNMENT_TYPE] revenue - ₱[TRIP_REVENUE] received (Expected: ₱[EXPECTED_REMITTANCE], Shortage: ₱[SHORTAGE]) - Payment: [PAYMENT_METHOD] - Bus: [BODY_NUMBER]",
  "date": "[DATE_RECORDED]",
  "entries": [
    {
      "account_code": "1000",
      "debit": "[TRIP_REVENUE]",
      "credit": 0,
      "description": "Cash received from trip"
    },
    {
      "account_code": "1100",
      "debit": "[DRIVER_SHORTAGE]",
      "credit": 0,
      "description": "Driver shortage receivable"
    },
    {
      "account_code": "1105",
      "debit": "[CONDUCTOR_SHORTAGE]",
      "credit": 0,
      "description": "Conductor shortage receivable"
    },
    {
      "account_code": "3000",
      "debit": 0,
      "credit": "[EXPECTED_REMITTANCE]",
      "description": "Trip revenue recognized"
    }
  ]
}
```

**Placeholders:**
- `[TRIP_REVENUE]` = bus_trip_local.trip_revenue (actual cash collected)
- `[EXPECTED_REMITTANCE]` = BOUNDARY: trip_fuel_expense + assignment_value | PERCENTAGE: (trip_revenue × assignment_value) + trip_fuel_expense
- `[SHORTAGE]` = expected_remittance - trip_revenue
- `[DRIVER_SHORTAGE]` = shortage × system_configuration.driver_share_percentage
- `[CONDUCTOR_SHORTAGE]` = shortage × system_configuration.conductor_share_percentage
- `[BODY_NUMBER]` = bus_trip_local.bus_id → bus_local.body_number

---

## EDIT MODAL

### Bus Details (Not Editable)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Assigned | bus_trip_local.date_assigned | Not Editable |
| Body Number | bus_trip_local.bus_id → bus_local.body_number | Not Editable |
| Plate Number | bus_trip_local.bus_id → bus_local.license_plate | Not Editable |
| Bus Type | bus_trip_local.bus_id → bus_local.type | Not Editable |
| Route | bus_trip_local.bus_route | Not Editable |
| Assignment Type | bus_trip_local.assignment_type | Not Editable |
| Company Share | bus_trip_local.assignment_value | Not Editable |
| Payment Method | bus_trip_local.payment_method | Not Editable |
| Trip Revenue | bus_trip_local.trip_revenue | Not Editable |
| Fuel Expense | bus_trip_local.trip_fuel_expense | Not Editable |
| Company Share (Amount) | **PERCENTAGE:** trip_revenue × assignment_value<br>**BOUNDARY:** assignment_value | Not Editable, Calculated |

### Employee Details (Not Editable)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Driver Name | bus_trip_employee_local.employee_number → employee_local.first_name + middle_name + last_name WHERE role = DRIVER | Not Editable |
| Conductor Name | bus_trip_employee_local.employee_number → employee_local.first_name + middle_name + last_name WHERE role = CONDUCTOR | Not Editable |

### Remittance Details

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Recorded | revenue.date_recorded | EDITABLE |
| Due Date | revenue.date_expected | Calculated: date_recorded + duration_to_receivable_hours |
| Expected Remittance | Calculated | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense<br>Not Editable |
| Amount Remitted | revenue.amount | EDITABLE |
| Remittance Status | revenue.remittance_status | Not Editable, Auto-calculated |
| Remarks | revenue.description | EDITABLE |

### Shortage Details (Only for PARTIALLY_PAID)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| **Receivable Amount Breakdown** | | |
| Boundary/Quota Amount | bus_trip_local.assignment_value | For BOUNDARY type |
| Fuel Expense | bus_trip_local.trip_fuel_expense | - |
| Expected Remittance | Calculated | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense |
| Amount Remitted | revenue.amount | - |
| Total Receivable | receivable.total_amount | shortage = expected_remittance - trip_revenue |
| **Receivable Distribution** | | |
| Conductor Share | receivable.total_amount × system_configuration.conductor_share_percentage | - |
| Driver Share | receivable.total_amount × system_configuration.driver_share_percentage | - |
| Total Receivable Amount | receivable.total_amount | - |
| Receivable Due Date | receivable.due_date | - |
| Payment Frequency | system_configuration.default_frequency | - |
| Number of Payments | system_configuration.default_number_of_payments | - |
| Start Date | receivable.installment_start_date | - |
| **Conductor Installment Schedule** | | |
| Conductor Name | employee_local WHERE role = CONDUCTOR | - |
| Total Receivable | conductor receivable.total_amount | - |
| Due Date | revenue_installment_schedule.due_date | - |
| Amount Due | revenue_installment_schedule.amount_due | - |
| Paid Amount | revenue_installment_schedule.amount_paid | - |
| Balance | revenue_installment_schedule.balance | - |
| Status | revenue_installment_schedule.status | - |
| **Driver Installment Schedule** | | |
| Driver Name | employee_local WHERE role = DRIVER | - |
| Total Receivable | driver receivable.total_amount | - |
| Due Date | revenue_installment_schedule.due_date | - |
| Amount Due | revenue_installment_schedule.amount_due | - |
| Paid Amount | revenue_installment_schedule.amount_paid | - |
| Balance | revenue_installment_schedule.balance | - |
| Status | revenue_installment_schedule.status | - |

---

## VIEW MODAL

### Header Information

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Assignment ID | bus_trip_local.assignment_id | - |
| Trip ID | bus_trip_local.bus_trip_id | - |
| Status | revenue.remittance_status | - |

### Bus Details

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Assigned | bus_trip_local.date_assigned | - |
| Body Number | bus_trip_local.bus_id → bus_local.body_number | - |
| Plate Number | bus_trip_local.bus_id → bus_local.license_plate | - |
| Bus Type | bus_trip_local.bus_id → bus_local.type | - |
| Route | bus_trip_local.bus_route | - |
| Assignment Type | bus_trip_local.assignment_type | - |
| Company Share | bus_trip_local.assignment_value | - |
| Payment Method | bus_trip_local.payment_method | - |
| Trip Revenue | bus_trip_local.trip_revenue | - |
| Fuel Expense | bus_trip_local.trip_fuel_expense | - |
| Company Share (Amount) | **PERCENTAGE:** trip_revenue × assignment_value<br>**BOUNDARY:** assignment_value | Calculated |

### Employee Details

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Driver Name | bus_trip_employee_local.employee_number → employee_local WHERE role = DRIVER | - |
| Conductor Name | bus_trip_employee_local.employee_number → employee_local WHERE role = CONDUCTOR | - |

### Remittance Details

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Date Recorded | revenue.date_recorded | - |
| Due Date | revenue.date_expected | - |
| Expected Remittance | Calculated | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense |
| Amount Remitted | revenue.amount | - |
| Remittance Status | revenue.remittance_status | - |
| Remarks | revenue.description | - |

### Shortage Details (Only for PARTIALLY_PAID)

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| **Receivable Amount Breakdown** | | |
| Trip Revenue | bus_trip_local.trip_revenue | - |
| Company Share (Boundary/Percentage) | bus_trip_local.assignment_value | - |
| Fuel Expense | bus_trip_local.trip_fuel_expense | - |
| Expected Remittance | Calculated | **BOUNDARY:** trip_fuel_expense + assignment_value<br>**PERCENTAGE:** (trip_revenue × assignment_value) + trip_fuel_expense |
| Amount Remitted | revenue.amount | - |
| Total Receivable | receivable.total_amount | - |
| Total Receivable Amount | receivable.total_amount | - |
| Receivable Due Date | receivable.due_date | - |
| Conductor Name | employee_local WHERE role = CONDUCTOR | - |
| Conductor Share | receivable.total_amount × system_configuration.conductor_share_percentage | - |
| Driver Name | employee_local WHERE role = DRIVER | - |
| Driver Share | receivable.total_amount × system_configuration.driver_share_percentage | - |
| **Conductor Installment Schedule** | | |
| Due Date | revenue_installment_schedule.due_date | - |
| Amount Due | revenue_installment_schedule.amount_due | - |
| Status | revenue_installment_schedule.status | - |
| **Driver Installment Schedule** | | |
| Due Date | revenue_installment_schedule.due_date | - |
| Amount Due | revenue_installment_schedule.amount_due | - |
| Status | revenue_installment_schedule.status | - |

---

## RECORD PAYMENT MODAL

### Trip Information

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Body Number | bus_trip_local.bus_id → bus_local.body_number | - |
| Date Assigned | bus_trip_local.date_assigned | - |
| Due Date | revenue_installment_schedule.due_date | - |
| Route | bus_trip_local.bus_route | - |
| Total Receivable | receivable.total_amount | - |
| Status | receivable.status | - |

### Employee Selection - Driver

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Driver Name | receivable.employee_number → employee_local | driver_receivable |
| Status | receivable.status | driver_receivable.status |
| Share | receivable.total_amount | driver_receivable.total_amount |
| Balance | receivable.balance | driver_receivable.balance |
| No. of Installment Schedule | COUNT(revenue_installment_schedule) WHERE receivable_id = driver_receivable_id | - |

### Employee Selection - Conductor

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Conductor Name | receivable.employee_number → employee_local | conductor_receivable |
| Status | receivable.status | conductor_receivable.status |
| Share | receivable.total_amount | conductor_receivable.total_amount |
| Balance | receivable.balance | conductor_receivable.balance |
| No. of Installment Schedule | COUNT(revenue_installment_schedule) WHERE receivable_id = conductor_receivable_id | - |

### Payment Information

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Receivable Code | receivable.code | Reference identifier |
| Installment No. | revenue_installment_schedule.installment_number | - |
| Due Date | revenue_installment_schedule.due_date | - |
| Amount Due (Current Installment) | revenue_installment_schedule.amount_due | - |
| Total Balance (Remaining) | receivable.balance | - |
| Amount Received | revenue_installment_payment.amount_paid | User input |
| Payment Date | revenue_installment_payment.payment_date | User input |
| Payment Method | revenue_installment_payment.payment_method | User input |

### Payment Schedule Overview

| UI FIELD | DB FIELD / MAPPING | NOTES |
|----------|-------------------|-------|
| Due Date | revenue_installment_schedule.due_date | - |
| Amount | revenue_installment_schedule.amount_due | - |
| Paid | revenue_installment_schedule.amount_paid | - |
| Balance | revenue_installment_schedule.balance | - |
| Status | revenue_installment_schedule.status | - |

---

## Key Corrections Applied

1. **Status Determination**: Changed from minimum wage-based calculation to expected remittance-based:
   - BOUNDARY: `expected_remittance = trip_fuel_expense + assignment_value`
   - PERCENTAGE: `expected_remittance = (trip_revenue × assignment_value) + trip_fuel_expense`

2. **Shortage Calculation**: Simplified to `shortage = expected_remittance - trip_revenue` (minimum wage removed)

3. **Journal Entry Description**: Changed `[ACTUAL_RECEIVED]` to `[TRIP_REVENUE]` for consistency with stored revenue field

4. **Receivable Description**: Fixed bus reference to use `bus_trip_local.bus_id → bus_local.body_number`

5. **Revenue Amount Mapping**: Added explicit mapping `revenue.amount = bus_trip_local.trip_revenue`

6. **Installment Logic**: Added complete mapping for:
   - Number of installments from `system_configuration.default_number_of_payments`
   - Frequency from `system_configuration.default_frequency`
   - Due date intervals (DAILY: +1 day, WEEKLY: +7 days, BIWEEKLY: +14 days, MONTHLY: +1 month)
   - Last installment calculation to handle rounding differences
