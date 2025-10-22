// ==================== EXPENSE MANAGEMENT TYPE DEFINITIONS ====================

// Operational Expense Types
export enum OperationalExpenseType {
  FUEL = 'FUEL',
  TOLL = 'TOLL',
  PARKING = 'PARKING',
  ALLOWANCES = 'ALLOWANCES',
  PETTY_CASH = 'PETTY_CASH',
  VIOLATIONS = 'VIOLATIONS',
  TERMINAL_FEES = 'TERMINAL_FEES'
}

// Administrative Expense Types
export enum AdministrativeExpenseType {
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  UTILITIES = 'UTILITIES',
  PROFESSIONAL_FEES = 'PROFESSIONAL_FEES',
  INSURANCE = 'INSURANCE',
  LICENSING = 'LICENSING',
  PERMITS = 'PERMITS',
  GENERAL_ADMIN = 'GENERAL_ADMIN'
}

// Expense Status
export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  POSTED = 'POSTED'
}

// Purchase Expense Status (more detailed)
export enum PurchaseExpenseStatus {
  DRAFT = 'DRAFT',
  MATCHED = 'MATCHED',
  DELIVERED = 'DELIVERED',
  POSTED = 'POSTED',
  CLOSED = 'CLOSED',
  REFUNDED = 'REFUNDED',
  REPLACED = 'REPLACED'
}

// Item Interface for expenses
export interface ExpenseItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
  type: 'supply' | 'service';
}

// Operational Expense Interface
export interface OperationalExpense {
  id: string;
  expense_type: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  status: string;
  bus_id?: string;
  bus_number?: string;
  employee_id?: string;
  employee_name?: string;
  receipt_number?: string;
  items?: ExpenseItem[];
  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

// Administrative Expense Interface
export interface AdministrativeExpense {
  id: string;
  expense_type: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  status: string;
  department?: string;
  vendor?: string;
  invoice_number?: string;
  receipt_number?: string;
  items?: ExpenseItem[];
  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

// Purchase Expense Interface
export interface PurchaseExpense {
  id: string;
  pr_number: string;
  pr_date: string;
  dr_number?: string;
  dr_date?: string;
  date: string;
  amount: number;
  category?: string;
  description: string;
  status: string;
  budget_code?: string;
  budget_allocated?: number;
  budget_utilized?: number;
  supplier?: string;
  receipt_number?: string;
  items?: ExpenseItem[];
  adjustment_reason?: string;
  adjustment_amount?: number;
  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

// Filter Interfaces
export interface OperationalExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  expense_type?: string;
  status?: string;
}

export interface AdministrativeExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  expense_type?: string;
  status?: string;
}

export interface PurchaseExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  status?: string;
}
