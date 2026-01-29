// ============================================================================
// RENTAL REVENUE DTOs
// Data Transfer Objects for Rental Revenue API endpoints
// All fields aligned with database schema (revenue + rental_local tables)
// ============================================================================

import { payment_method, receivable_status } from '@prisma/client';

// ============================================================================
// ENUMS (for validation)
// ============================================================================

export const VALID_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'E_WALLET', 'REIMBURSEMENT'] as const;
export type PaymentMethodEnum = typeof VALID_PAYMENT_METHODS[number];

export const VALID_RENTAL_STATUSES = ['approved', 'completed', 'cancelled'] as const;
export type RentalStatusType = typeof VALID_RENTAL_STATUSES[number];

export const VALID_REMITTANCE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF'] as const;
export type RemittanceStatusType = typeof VALID_REMITTANCE_STATUSES[number];

// ============================================================================
// LIST FILTERS
// ============================================================================

export interface RentalRevenueListFilters {
    // Date filters
    date_recorded_from?: string;
    date_recorded_to?: string;
    down_payment_date_from?: string;
    down_payment_date_to?: string;
    rental_start_date_from?: string;
    rental_start_date_to?: string;
    
    // Status filters
    rental_status?: RentalStatusType;
    remittance_status?: RemittanceStatusType;
    
    // Payment method filter (enum)
    payment_method?: PaymentMethodEnum;
    
    // Amount filters
    amount_min?: number;
    amount_max?: number;
    balance_min?: number;
    balance_max?: number;
    
    // Search (applies across multiple fields)
    search?: string;
    
    // Sorting
    sort_by?: 'code' | 'date_recorded' | 'total_rental_amount' | 'balance_amount' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

// ============================================================================
// LIST RESPONSE ITEM
// ============================================================================

export interface RentalRevenueListItem {
    // Revenue fields
    id: number;
    code: string;
    revenue_type_id: number;
    revenue_type_name: string;
    amount: number;
    date_recorded: string | null;
    description: string | null;
    payment_method: PaymentMethodEnum | null;
    remittance_status: string;
    
    // Rental fields (from rental_local via rental_assignment_id)
    assignment_id: string;
    rental_status: string | null;
    rental_package: string | null;
    total_rental_amount: number;
    down_payment_amount: number;
    balance_amount: number;
    down_payment_date: string | null;
    full_payment_date: string | null;
    cancelled_at: string | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    
    // Bus info (optional)
    bus_id: string | null;
    bus_plate_number: string | null;
    bus_body_number: string | null;
    
    // Audit fields
    created_at: string;
    updated_at: string | null;
}

// ============================================================================
// DETAIL RESPONSE (for View Modal)
// ============================================================================

export interface RentalRevenueDetailResponse {
    // Revenue fields
    id: number;
    code: string;
    revenue_type_id: number;
    revenue_type_code: string;
    revenue_type_name: string;
    amount: number;
    date_recorded: string | null;
    date_expected: string | null;
    description: string | null;
    payment_method: PaymentMethodEnum | null;
    payment_reference: string | null;
    remittance_status: string;
    journal_entry_id: number | null;
    
    // Rental fields (from rental_local)
    assignment_id: string;
    rental_status: string | null;
    rental_package: string | null;
    total_rental_amount: number;
    down_payment_amount: number;
    balance_amount: number;
    down_payment_date: string | null;
    full_payment_date: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    
    // Bus info
    bus_id: string | null;
    bus_plate_number: string | null;
    bus_body_number: string | null;
    bus_type: string | null;
    
    // Employees assigned (from rental_employee_local)
    employees: Array<{
        employee_id: string;
        name: string;
        role: string | null;
    }>;
    
    // Receivable info (if exists)
    receivable: {
        id: number;
        code: string;
        status: string;
        amount_due: number;
        amount_paid: number;
        balance: number;
    } | null;
    
    // Journal entry summary
    journal_entry: {
        id: number;
        code: string;
        status: string;
        posted_at: string | null;
    } | null;
    
    // Audit fields
    created_by: string | null;
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
}

// ============================================================================
// CREATE DTO
// ============================================================================

export interface CreateRentalRevenueDTO {
    // Required: Link to rental
    assignment_id: string;
    
    // Revenue fields
    date_recorded?: string;
    description?: string;
    payment_method?: PaymentMethodEnum;
    payment_reference?: string;
    
    // Optional: Override rental amounts (defaults to rental_local values)
    down_payment_amount?: number;
}

// ============================================================================
// UPDATE DTO (for Edit Modal)
// ============================================================================

export interface UpdateRentalRevenueDTO {
    // Editable revenue fields
    date_recorded?: string;
    date_expected?: string;
    description?: string;
    payment_method?: PaymentMethodEnum;
    payment_reference?: string;
    
    // Editable rental fields (updates rental_local)
    down_payment_amount?: number;
    down_payment_date?: string;
    
    // Status management
    remittance_status?: RemittanceStatusType;
    
    // Balance payment (triggers full_payment_date update)
    pay_balance?: boolean;
    balance_payment_method?: PaymentMethodEnum;
    balance_payment_reference?: string;
}

// ============================================================================
// CANCEL DTO
// ============================================================================

export interface CancelRentalRevenueDTO {
    cancellation_reason?: string;
}

// ============================================================================
// ANALYTICS RESPONSE
// ============================================================================

export interface RentalRevenueAnalytics {
    total_rentals: number;
    total_revenue: number;
    total_pending_balance: number;
    
    by_status: {
        approved: number;
        completed: number;
        cancelled: number;
    };
    
    by_payment_method: {
        CASH: number;
        BANK_TRANSFER: number;
        E_WALLET: number;
        REIMBURSEMENT: number;
    };
    
    recent_rentals: RentalRevenueListItem[];
}

// ============================================================================
// PAGINATION RESPONSE
// ============================================================================

export interface PaginatedRentalRevenueResponse {
    data: RentalRevenueListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
