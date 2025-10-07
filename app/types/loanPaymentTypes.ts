// ============================================================
// Loan Payment Configuration Types
// ============================================================

export enum PaymentScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

export enum PaymentAmountType {
  FIXED = 'fixed',
  CUSTOM = 'custom'
}

export enum PaymentMode {
  PESO = 'peso',
  PERCENTAGE = 'percentage'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial'
}

export interface PaymentEntry {
  id: string;
  payment_date: string;
  amount: number;
  mode: PaymentMode;
  status: PaymentStatus;
  amount_paid?: number;
  notes?: string;
}

export interface PaymentConfiguration {
  loan_id?: string;
  schedule_type: PaymentScheduleType;
  amount_type: PaymentAmountType;
  payment_mode: PaymentMode;
  
  // For Fixed schedules
  fixed_amount?: number;
  start_date?: string;
  duration?: number; // Number of payments
  
  // For Custom schedules
  custom_payments?: PaymentEntry[];
  
  // Calculated fields
  total_amount: number;
  total_percentage?: number;
}

export interface LoanDetails {
  loan_id: string;
  loan_request_id: string;
  principal_amount: number;
  interest_rate: number;
  duration_months: number;
  current_balance: number;
  disbursed_date: string;
}
