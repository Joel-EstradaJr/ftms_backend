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

export interface HREmployeeAttendance {
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Overtime';
}

export interface HREmployeeBenefit {
  value: string;
  frequency: 'Monthly' | 'Semi-Monthly' | 'Daily';
  effectiveDate: string;
  endDate: string | null;
  isActive: boolean;
  benefitType: {
    name: string;
  };
}

export interface HREmployeeDeduction {
  type: string;
  value: string;
  frequency: 'Monthly' | 'Semi-Monthly' | 'Daily';
  effectiveDate: string;
  endDate: string | null;
  isActive: boolean;
  deductionType: {
    name: string;
  };
}

export interface HREmployeeData {
  employeeNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  employeeStatus: 'active' | 'inactive';
  hiredate: string;
  terminationDate: string | null;
  basicRate: string;
  position: {
    positionName: string;
    department: {
      departmentName: string;
    };
  };
  attendances: HREmployeeAttendance[];
  benefits: HREmployeeBenefit[];
  deductions: HREmployeeDeduction[];
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
