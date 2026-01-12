/**
 * Payroll Types and DTOs
 * TYPES LAYER: TypeScript types/interfaces/enums/DTOs, framework-agnostic
 * 
 * Responsibilities:
 * - Define data structures and contracts
 * - Type safety for all layers
 * - Request/response DTOs
 * - Domain models
 * 
 * Why this belongs in types:
 * - Framework-agnostic type definitions
 * - Shared across all layers (controllers, services, integrations)
 * - No business logic, just data structure definitions
 */

import { payroll_period_status, payroll_status } from '@prisma/client';

// ==================== HR Integration Types ====================

/**
 * Frequency types for benefits and deductions
 * Used to determine when/how often to apply the item
 */
export type PayrollFrequency = 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';

/**
 * Rate type from HR system
 */
export type HRRateType = 'Daily' | 'Weekly' | 'Monthly' | 'Semi-Monthly';

/**
 * Attendance status from HR system
 */
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Overtime';

/**
 * Attendance record from HR API
 */
export interface HREmployeeAttendance {
  date: string;  // YYYY-MM-DD
  status: AttendanceStatus;
}

/**
 * Benefit record from HR API (flat structure)
 */
export interface HREmployeeBenefit {
  name: string;
  value: string;  // Decimal as string
  frequency: PayrollFrequency;
  effective_date: string;  // YYYY-MM-DD
  end_date: string | null;  // YYYY-MM-DD or null
  is_active: boolean;
}

/**
 * Deduction record from HR API (flat structure)
 */
export interface HREmployeeDeduction {
  name: string;
  value: string;  // Decimal as string
  frequency: PayrollFrequency;
  effective_date: string;  // YYYY-MM-DD
  end_date: string | null;  // YYYY-MM-DD or null
  is_active: boolean;
}

/**
 * Employee payroll data from HR API
 */
export interface HREmployeeData {
  employee_number: string;
  basic_rate: string;  // Decimal as string (this is the DAILY rate)
  rate_type: HRRateType;
  attendances: HREmployeeAttendance[];
  benefits: HREmployeeBenefit[];
  deductions: HREmployeeDeduction[];
}

/**
 * Complete HR Payroll API Response
 */
export interface HRPayrollAPIResponse {
  payroll_period_start: string;  // YYYY-MM-DD
  payroll_period_end: string;    // YYYY-MM-DD
  employees: HREmployeeData[];
  count: number;
}

// ==================== Payroll Period DTOs ====================

export interface CreatePayrollPeriodDTO {
  payroll_period_code: string;
  period_start: string;
  period_end: string;
}

export interface UpdatePayrollPeriodDTO {
  payroll_period_code?: string;
  period_start?: string;
  period_end?: string;
  status?: payroll_period_status;
}

export interface PayrollPeriodQueryDTO {
  period_start?: string;
  period_end?: string;
  status?: payroll_period_status;
  is_deleted?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PayrollPeriodListItemDTO {
  id: number;
  payroll_period_code: string;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_gross: string;
  total_deductions: string;
  total_net: string;
  status: payroll_period_status;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PayrollPeriodDetailDTO {
  id: number;
  payroll_period_code: string;
  period_start: string;
  period_end: string;
  status: payroll_period_status;
  total_employees: number;
  total_gross: string;
  total_deductions: string;
  total_net: string;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  payrolls: PayrollEmployeeDetailDTO[];
}

// ==================== Employee Payroll DTOs ====================

export interface PayrollEmployeeDetailDTO {
  id: number;
  payroll_code: string;
  employee_number: string;
  employee_name: string;
  department: string;
  position: string;
  rate_type: string;
  basic_rate: string;
  gross_pay: string;
  total_deductions: string;
  net_pay: string;
  status: payroll_status;
  present_count: number;
  absent_count: number;
  late_count: number;
  overtime_hours: number;
}

export interface PayrollEmployeeUnfoldDTO {
  employee_number: string;
  department: string;
  position: string;
  base_salary: string;
  benefits: PayrollItemDTO[];
  deductions: PayrollItemDTO[];
  net_pay: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  overtime_hours: number;
}

export interface PayrollItemDTO {
  name: string;
  category: 'EARNING' | 'BENEFIT' | 'DEDUCTION';
  amount: string;
  quantity?: string;
  rate?: string;
  description?: string;
}

// ==================== Payslip DTOs ====================

export interface PayslipDTO {
  company_name: string;
  company_logo?: string;
  period_start: string;
  period_end: string;
  release_date: string;
  payroll_code: string;
  employee_name: string;
  employee_number: string;
  department: string;
  position: string;
  basic_rate: string;
  rate_type: string;
  benefits: PayrollItemDTO[];
  deductions: PayrollItemDTO[];
  total_gross_pay: string;
  total_deductions: string;
  net_pay: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  total_overtime_hours: number;
}

// ==================== Statistics DTOs ====================

export interface PayrollPeriodStatsDTO {
  total_periods: number;
  released_count: number;
  pending_count: number;
  total_net_pay: string;
  total_employees: number;
  by_status: {
    status: payroll_period_status;
    count: number;
    total_net: string;
  }[];
}

// ==================== List Response DTOs ====================

export interface PayrollPeriodListResponseDTO {
  data: PayrollPeriodListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PayrollEmployeeListResponseDTO {
  data: PayrollEmployeeDetailDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== Process Payroll DTOs ====================

export interface ProcessPayrollDTO {
  payroll_period_id: number;
  period_start: string;
  period_end: string;
  employee_numbers?: string[]; // Optional: specific employees, or all if empty
}

export interface ProcessPayrollResultDTO {
  success: boolean;
  payroll_period_id: number;
  total_processed: number;
  total_employees: number;
  total_gross: string;
  total_deductions: string;
  total_net: string;
  errors: {
    employee_number: string;
    error: string;
  }[];
}
