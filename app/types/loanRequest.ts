// Shared types for Loan Management
export enum LoanStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

export enum Department {
  OPERATIONS = 'operations',
  MAINTENANCE = 'maintenance',
  ADMINISTRATION = 'administration',
  FINANCE = 'finance',
  HR = 'hr'
}

export enum LoanType {
  EMERGENCY = 'emergency',
  EDUCATIONAL = 'educational',
  MEDICAL = 'medical',
  HOUSING = 'housing',
  PERSONAL = 'personal',
  SALARY_ADVANCE = 'salary_advance'
}

export interface AuditTrailEntry {
  id: string;
  action: string;
  action_type: 'created' | 'updated' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'cancelled';
  performed_by: string;
  performed_at: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  comments?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface Employee {
  employee_id?: string; // Made optional for compatibility
  name: string;
  job_title: string;
  department: Department | string;
  employee_number: string;
  monthly_salary?: number;
  hire_date: string;
}

export interface LoanRequest {
  id: string;
  loan_request_id: string;
  employee_id?: string; // Made optional for modal compatibility
  employee: Employee;
  loan_type: LoanType | string;
  requested_amount: number;
  purpose: string;
  justification: string;
  repayment_terms: number; // months
  monthly_deduction: number;
  status: LoanStatus | string;
  
  // Application details
  application_date: string;
  submitted_by: string;
  submitted_date?: string;
  
  // Approval workflow
  reviewed_by?: string;
  reviewed_date?: string;
  approved_by?: string;
  approved_date?: string;
  approval_comments?: string;
  approved_amount?: number;
  adjusted_terms?: number;
  interest_rate?: number;
  processing_fee?: number;
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
  
  // Disbursement details
  disbursed_by?: string;
  disbursed_date?: string;
  disbursed_amount?: number; // Added for close modal compatibility
  disbursement_method?: string;
  disbursement_reference?: string;
  disbursement_attachment?: string;
  
  // Closure details
  closed_by?: string;
  closed_date?: string;
  closure_reason?: string;
  closure_type?: 'completed' | 'early_settlement' | 'write_off' | 'transfer';
  closure_notes?: string;
  
  // Emergency contact (for emergency loans)
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Payment tracking
  total_paid?: number;
  remaining_balance?: number;
  payment_records?: any[];
  
  // Audit trail
  audit_trail?: AuditTrailEntry[]; // Fixed type for audit modal compatibility
  
  // Audit fields
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted?: boolean; // Made optional for modal compatibility
}

export interface LoanFilters {
  status?: LoanStatus | '';
  loan_type?: LoanType | '';
  department?: Department | '';
  date_range?: {
    start?: string;
    end?: string;
  };
  amount_range?: {
    min?: number;
    max?: number;
  };
  search_term?: string;
}