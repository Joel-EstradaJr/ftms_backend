// ============================================================================
// AUDIT LOG TYPES - ENHANCED PAYLOAD STRUCTURE FOR MEANINGFUL AUDIT LOGS
// ============================================================================
// These types define the denormalized, human-readable audit payload structure.
// The goal is to send rich, contextual data to the audit service so that
// audit logs are meaningful to auditors, finance users, and non-technical reviewers.
// ============================================================================

import { Request } from 'express';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Supported audit action types
 */
export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'IMPORT'
  | 'ARCHIVE'
  | 'UNARCHIVE'
  | 'APPROVE'
  | 'REJECT';

/**
 * User info for audit logging - includes name for readability
 */
export interface AuditUser {
  id: string;
  name?: string;
  role?: string;
  department?: string;
}

/**
 * Entity info for audit logging
 */
export interface AuditEntity {
  id: any;
  code?: string;
}

// ============================================================================
// DENORMALIZED FIELD STRUCTURE
// ============================================================================

/**
 * Represents a human-readable field value in audit logs.
 * Instead of storing just `department_id: 23`, we store:
 * {
 *   label: "Department",
 *   value: "Inventory",
 *   raw_id: 23
 * }
 */
export interface AuditFieldValue {
  label: string;           // Human-readable field name (e.g., "Department")
  value: any;              // Human-readable value (e.g., "Inventory")
  raw_id?: string | number; // Optional: Original ID for reference
  type?: 'text' | 'currency' | 'date' | 'datetime' | 'status' | 'reference';
}

/**
 * Denormalized audit payload for rich, human-readable audit logs.
 * This is what gets stored in new_data/previous_data.
 */
export interface DenormalizedAuditData {
  /** Human-readable summary of the record */
  summary: string;
  
  /** Key business fields with human-readable values */
  fields: AuditFieldValue[];
  
  /** Optional: Raw data for technical reference */
  _raw?: Record<string, any>;
}

/**
 * Change description for UPDATE actions
 */
export interface AuditFieldChange {
  label: string;           // Human-readable field name
  from: any;               // Previous value
  to: any;                 // New value
  type?: 'text' | 'currency' | 'date' | 'datetime' | 'status' | 'reference';
}

/**
 * Denormalized change data for UPDATE actions
 */
export interface DenormalizedChangeData {
  /** Human-readable summary of changes */
  summary: string;
  
  /** List of individual field changes */
  changes: AuditFieldChange[];
  
  /** Total number of fields changed */
  change_count: number;
}

// ============================================================================
// ENTITY-SPECIFIC PAYLOADS
// ============================================================================

/**
 * Revenue audit payload - denormalized for readability
 */
export interface RevenueAuditPayload {
  code: string;
  revenue_type: string;         // Denormalized from revenue_type_id
  department?: string;          // Denormalized from department_id
  amount: string;               // Formatted currency
  payment_method?: string;      // Formatted payment method
  payment_reference?: string;
  date_recorded?: string;       // Formatted date
  description?: string;
  remarks?: string;
  status: string;
  created_by?: string;          // Denormalized user name
}

/**
 * Expense audit payload - denormalized for readability
 */
export interface ExpenseAuditPayload {
  code: string;
  category: string;
  subcategory?: string;
  vendor?: string;              // Denormalized from vendor_id
  department?: string;
  amount: string;               // Formatted currency
  date_recorded?: string;       // Formatted date
  status: string;
  remarks?: string;
  created_by?: string;          // Denormalized user name
}

/**
 * Journal Entry audit payload - denormalized for readability
 */
export interface JournalEntryAuditPayload {
  code: string;
  date: string;                 // Formatted date
  description?: string;
  reference?: string;
  total_debit: string;          // Formatted currency
  total_credit: string;         // Formatted currency
  status: string;
  entry_type: string;
  lines?: JournalLineAuditPayload[];
  created_by?: string;
}

export interface JournalLineAuditPayload {
  account: string;              // Denormalized from account_id (e.g., "1000 - Cash")
  debit?: string;               // Formatted currency
  credit?: string;              // Formatted currency
  description?: string;
}

/**
 * Receivable audit payload
 */
export interface ReceivableAuditPayload {
  code: string;
  debtor_name: string;
  employee?: string;            // Denormalized from employee_number
  description?: string;
  total_amount: string;         // Formatted currency
  paid_amount: string;          // Formatted currency
  balance: string;              // Formatted currency
  due_date?: string;            // Formatted date
  status: string;
  frequency?: string;
  number_of_payments?: number;
}

/**
 * Payable audit payload
 */
export interface PayableAuditPayload {
  code: string;
  creditor_name: string;
  vendor?: string;              // Denormalized from vendor_id
  description?: string;
  total_amount: string;         // Formatted currency
  paid_amount: string;          // Formatted currency
  balance: string;              // Formatted currency
  due_date?: string;            // Formatted date
  status: string;
}

/**
 * Payroll Period audit payload
 */
export interface PayrollPeriodAuditPayload {
  code: string;
  period_name: string;
  start_date: string;           // Formatted date
  end_date: string;             // Formatted date
  pay_date?: string;            // Formatted date
  total_gross: string;          // Formatted currency
  total_net: string;            // Formatted currency
  employee_count: number;
  status: string;
}

/**
 * Chart of Account audit payload
 */
export interface ChartOfAccountAuditPayload {
  account_code: string;
  account_name: string;
  account_type: string;         // Denormalized from account_type_id
  normal_balance: string;
  description?: string;
}

/**
 * Account Type audit payload
 */
export interface AccountTypeAuditPayload {
  code: string;
  name: string;
  description?: string;
}

/**
 * Bus Trip Revenue audit payload
 */
export interface BusTripRevenueAuditPayload {
  code: string;
  bus: string;                  // Denormalized (e.g., "ABC-1234 / Body #123")
  route: string;
  date_assigned: string;        // Formatted date
  trip_revenue: string;         // Formatted currency
  fuel_expense: string;         // Formatted currency
  assignment_type: string;
  assignment_value: string;
  driver?: string;              // Denormalized employee name
  conductor?: string;           // Denormalized employee name
  status: string;
}

/**
 * Rental Revenue audit payload
 */
export interface RentalRevenueAuditPayload {
  code: string;
  bus: string;                  // Denormalized (e.g., "ABC-1234 / Body #123")
  rental_package: string;
  rental_start_date: string;    // Formatted date
  rental_end_date: string;      // Formatted date
  total_amount: string;         // Formatted currency
  down_payment?: string;        // Formatted currency
  balance?: string;             // Formatted currency
  driver?: string;              // Denormalized employee name
  status: string;
}

/**
 * Attachment audit payload
 */
export interface AttachmentAuditPayload {
  filename: string;
  file_type: string;
  file_size: string;            // Formatted (e.g., "2.5 MB")
  related_entity: string;       // What this is attached to
  related_entity_code: string;
  uploaded_by: string;
}

/**
 * Budget Allocation audit payload
 */
export interface BudgetAllocationAuditPayload {
  code: string;
  department: string;           // Denormalized from department_id
  allocation_type: string;
  amount: string;               // Formatted currency
  fiscal_period: string;
  status: string;
  remarks?: string;
}

/**
 * Cash Advance audit payload
 */
export interface CashAdvanceAuditPayload {
  request_number: string;
  employee: string;             // Denormalized employee name
  department: string;
  purpose: string;
  requested_amount: string;     // Formatted currency
  approved_amount?: string;     // Formatted currency
  status: string;
  request_date: string;         // Formatted date
}

// ============================================================================
// AUDIT LOG PAYLOAD (Final structure sent to audit service)
// ============================================================================

/**
 * Enhanced audit log payload with denormalized data
 */
export interface EnhancedAuditLogPayload {
  /** Entity type in snake_case (e.g., "other_revenue", "journal_entry") */
  entity_type: string;
  
  /** Primary identifier for the entity (preferably the business code) */
  entity_id: string;
  
  /** Action type code */
  action_type_code: AuditActionType;
  
  /** User who performed the action (ID) */
  action_by?: string;
  
  /** User's name for display (optional, for readability) */
  action_by_name?: string;
  
  /** Department/module where action was performed */
  action_from?: string;
  
  /**
   * Previous state data (for UPDATE/DELETE)
   * Contains denormalized, human-readable field values
   */
  previous_data?: DenormalizedAuditData | null;
  
  /**
   * New state data (for CREATE/UPDATE)
   * Contains denormalized, human-readable field values
   */
  new_data?: DenormalizedAuditData | null;
  
  /**
   * Change data (for UPDATE actions)
   * Summarizes what changed between previous and new states
   */
  change_data?: DenormalizedChangeData | null;
  
  /** IP address of the request */
  ip_address?: string;
}

// ============================================================================
// PAYLOAD BUILDER OPTIONS
// ============================================================================

/**
 * Options for building audit payloads
 */
export interface AuditPayloadOptions {
  /** Whether to include raw data for technical reference */
  includeRawData?: boolean;
  
  /** Fields to exclude from the audit log */
  excludeFields?: string[];
  
  /** Custom field labels (overrides defaults) */
  fieldLabels?: Record<string, string>;
  
  /** Currency locale for formatting (default: 'en-PH') */
  currencyLocale?: string;
  
  /** Date format style (default: 'long') */
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
}

// ============================================================================
// DEFAULT EXCLUDED FIELDS
// ============================================================================

/**
 * System fields that should NOT appear in audit logs
 * These are technical/internal fields that don't provide business value
 */
export const DEFAULT_EXCLUDED_FIELDS = [
  // Internal metadata
  'is_deleted',
  'is_active',
  'created_at',
  'updated_at',
  'deleted_at',
  'archived_at',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'archivedAt',
  
  // Foreign key IDs (we use denormalized names instead)
  // Only exclude if the name is available
  // 'department_id',
  // 'revenue_type_id',
  // 'account_type_id',
  // 'vendor_id',
  // 'employee_number', // Keep for reference
  
  // Audit trail IDs
  'created_by',
  'updated_by',
  'deleted_by',
  'archived_by',
  
  // Version/sync metadata
  'version',
  'last_synced_at',
  
  // Prisma internal
  '_count',
  '_sum',
  '_avg',
  '_min',
  '_max',
];

/**
 * Fields that should be masked/redacted
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apiKey',
  'access_token',
  'refresh_token',
  'private_key',
  'ssn',
  'social_security',
  'credit_card',
  'bank_account',
];
