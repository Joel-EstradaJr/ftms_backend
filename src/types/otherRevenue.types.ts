/**
 * Other Revenue Module Type Definitions
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// ENUMS (matching Prisma schema)
// ============================================================================

export type RevenueStatus = 'PENDING' | 'RECORDED' | 'OVERDUE' | 'CANCELLED';
export type RevenueApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReceivableStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';
export type InstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';
export type InstallmentPlan = 'WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY' | 'QUARTERLY' | 'ONE_TIME';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateOtherRevenueDTO {
  revenue_type_id: number;
  amount: number;
  date_recorded: string; // ISO date string
  description?: string;
  payment_method?: string;
  payment_reference?: string;
  
  // Unearned revenue fields (creates receivable + schedule)
  is_unearned_revenue?: boolean;
  debtor_ref?: string; // Employee number for HR API lookup
  debtor_name?: string; // Optional: manual override if HR API fails
  installment_plan?: InstallmentPlan;
  due_date?: string; // ISO date string - final due date for receivable
  schedule_items?: CreateInstallmentScheduleItemDTO[];
}

export interface CreateInstallmentScheduleItemDTO {
  installment_number: number;
  due_date: string; // ISO date string
  amount_due: number;
}

export interface UpdateOtherRevenueDTO {
  description?: string;
  payment_method?: string;
  payment_reference?: string;
  
  // Only allowed if no payments have been made:
  amount?: number;
  installment_plan?: InstallmentPlan;
  schedule_items?: CreateInstallmentScheduleItemDTO[];
}

export interface RecordInstallmentPaymentDTO {
  installment_id: number;
  amount_paid: number;
  payment_date: string; // ISO date string
  payment_method?: string;
  payment_reference?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface RevenueTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface OtherRevenueResponse {
  id: number;
  code: string;
  revenue_type_id: number;
  revenue_type: RevenueTypeResponse;
  amount: number | Decimal;
  date_recorded: Date | null;
  date_expected: Date | null;
  description: string | null;
  status: RevenueStatus;
  approval_status: RevenueApprovalStatus;
  payment_method: string | null;
  payment_reference: string | null;
  receivable_id: number | null;
  receivable: ReceivableResponse | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface ReceivableResponse {
  id: number;
  code: string;
  debtor_ref: string | null;
  debtor_name: string;
  description: string | null;
  total_amount: number | Decimal;
  due_date: Date | null;
  status: ReceivableStatus;
  installment_plan: string | null;
  expected_installment: number | Decimal | null;
  paid_amount: number | Decimal;
  balance: number | Decimal;
  last_payment_date: Date | null;
  last_payment_amount: number | Decimal | null;
  installment_schedule: InstallmentScheduleResponse[];
}

export interface InstallmentScheduleResponse {
  id: number;
  receivable_id: number;
  installment_number: number;
  due_date: Date;
  amount_due: number | Decimal;
  amount_paid: number | Decimal;
  balance: number | Decimal;
  carried_over_amount: number | Decimal;
  status: InstallmentStatus;
  payments: InstallmentPaymentResponse[];
}

export interface InstallmentPaymentResponse {
  id: number;
  installment_id: number;
  revenue_id: number;
  amount_paid: number | Decimal;
  payment_date: Date;
  payment_method: string | null;
  payment_reference: string | null;
}

// ============================================================================
// LIST RESPONSE
// ============================================================================

export interface OtherRevenueListResponse {
  success: boolean;
  data: OtherRevenueResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OtherRevenueDetailResponse {
  success: boolean;
  data: OtherRevenueResponse;
}

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

export interface OtherRevenueListQuery {
  page?: number;
  limit?: number;
  sortBy?: 'code' | 'date_recorded' | 'amount' | 'created_at';
  order?: 'asc' | 'desc';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  status?: RevenueStatus;
  revenue_type_id?: number;
}

// ============================================================================
// CASCADE PAYMENT TYPES
// ============================================================================

export interface CascadePaymentAllocation {
  installment_id: number;
  installment_number: number;
  previous_balance: number;
  amount_applied: number;
  new_balance: number;
  new_status: InstallmentStatus;
  is_carried_over: boolean;
}

export interface CascadePaymentResult {
  success: boolean;
  total_amount_paid: number;
  allocations: CascadePaymentAllocation[];
  remaining_amount: number;
  receivable_new_status: ReceivableStatus;
  receivable_new_balance: number;
  receivable_new_paid_amount: number;
  payment_records_created: number[];
  revenue_id: number;
}

// ============================================================================
// SERVICE RESULT TYPES
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CreateRevenueResult {
  revenue: OtherRevenueResponse;
  receivable?: ReceivableResponse;
}
