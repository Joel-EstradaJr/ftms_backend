// ==================== JEV TYPE DEFINITIONS ====================

// Account Types
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum AccountSubType {
  // Assets
  CURRENT_ASSET = 'current_asset',
  NON_CURRENT_ASSET = 'non_current_asset',
  
  // Liabilities
  CURRENT_LIABILITY = 'current_liability',
  NON_CURRENT_LIABILITY = 'non_current_liability',
  
  // Equity
  CAPITAL = 'capital',
  RETAINED_EARNINGS = 'retained_earnings',
  
  // Revenue
  OPERATING_REVENUE = 'operating_revenue',
  NON_OPERATING_REVENUE = 'non_operating_revenue',
  
  // Expenses
  OPERATING_EXPENSE = 'operating_expense',
  NON_OPERATING_EXPENSE = 'non_operating_expense'
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface ParentAccount {
  account_code: string;
  account_name: string;
}

export interface ChartOfAccount {
  // CORE FIELDS (Required)
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  
  // OPTIONAL FIELDS
  description?: string;
  notes?: string;
  
  // HIERARCHY FIELDS (for parent-child relationships)
  parent_account_id?: string;
  parent_account_code?: string;
  parent_account_name?: string;    
  level?: number;                  
  
  // PRACTICAL FIELDS
  is_active: boolean;
  is_system_account: boolean;
}

// Journal Entry Types
export enum EntryType {
  MANUAL = 'MANUAL',
  AUTO_REVENUE = 'AUTO_REVENUE',
  AUTO_EXPENSE = 'AUTO_EXPENSE',
  AUTO_PAYROLL = 'AUTO_PAYROLL',
  AUTO_LOAN = 'AUTO_LOAN',
  AUTO_PURCHASE = 'AUTO_PURCHASE',
  AUTO_REFUND = 'AUTO_REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  CLOSING = 'CLOSING'
}

export enum JournalStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export interface JournalEntryLine {
  line_id?: string;
  journal_entry_id?: string;
  account_id: string;
  account?: ChartOfAccount;
  line_number: number;
  description?: string;
  debit_amount?: number;
  credit_amount?: number;
  department?: string;
  responsibility_center?: string;
}

export interface JournalEntry {
  journal_entry_id: string;
  journal_number: string;
  transaction_date: string;
  posting_date?: string;
  reference_number?: string;
  description: string;
  entry_type: EntryType;
  source_module?: string;
  source_id?: string;
  status: JournalStatus;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  reversed_by_id?: string;
  reversed_entry?: JournalEntry;
  reverses_entry?: JournalEntry[];
  created_at: string;
  created_by: string;
  posted_at?: string;
  posted_by?: string;
  updated_at: string;
  updated_by?: string;
  attachments?: string[];
  journal_lines: JournalEntryLine[];
}

// Form Data Types
export interface AccountFormData {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  description?: string;
  notes?: string;
  parent_account_id?: string;
}

export interface JournalEntryFormData {
  transaction_date: string;
  reference_number?: string;
  description: string;
  entry_type: EntryType;
  source_module?: string;
  source_id?: string;
  journal_lines: JournalEntryLine[];
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BalanceValidationResult {
  balanced: boolean;
  issues: string[];
  orphaned_accounts?: string[];
  duplicate_codes?: string[];
  balance_mismatches?: Array<{
    account_code: string;
    account_name: string;
    expected: number;
    actual: number;
  }>;
}

// User Role for Permissions
export enum UserRole {
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  FINANCE_STAFF = 'FINANCE_STAFF',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  VIEWER = 'VIEWER'
}

// Filter Types
export interface AccountFilters {
  search?: string;
  account_type?: AccountType | '';
  status?: 'active' | 'archived' | 'all';
  parent_id?: string;
  has_transactions?: boolean;
}

export interface JournalEntryFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  entry_type?: EntryType | '';
  status?: JournalStatus | '';
  source_module?: string;
  account_id?: string;
}

// Audit Trail
export interface AuditLog {
  audit_id: string;
  action: string;
  table_affected: string;
  record_id: string;
  performed_by: string;
  performed_at: string;
  details: string;
  old_values?: any;
  new_values?: any;
}
