// ============================================================================
// BUS TRIP REVENUE DATA TRANSFER OBJECTS
// DTOs and interfaces for the Bus Trip Revenue module
// ============================================================================

import { payment_method, receivable_frequency, receivable_status } from '@prisma/client';

// ============================================================================
// LIST & FILTER INTERFACES
// ============================================================================

export interface RevenueListFilters {
    date_assigned_from?: string;
    date_assigned_to?: string;
    date_recorded_from?: string;
    date_recorded_to?: string;
    assignment_type?: 'BOUNDARY' | 'PERCENTAGE';
    status?: receivable_status;
    trip_revenue_min?: number;
    trip_revenue_max?: number;
    search?: string;
    sort_by?: 'date_assigned' | 'date_recorded' | 'trip_revenue' | 'amount';
    sort_order?: 'asc' | 'desc';
}

export interface UnsyncedTripsFilters {
    date_from?: string;
    date_to?: string;
    assignment_type?: 'BOUNDARY' | 'PERCENTAGE';
    search?: string;
}

// ============================================================================
// CREATE DTOs
// ============================================================================

export interface CreateRevenueDTO {
    // Composite FK to bus_trip_local
    assignment_id: string;
    bus_trip_id: string;

    // Editable fields
    date_recorded?: string;   // Optional, defaults to now
    description?: string;     // Remarks
}

export interface RecordPaymentDTO {
    installment_id: number;
    amount_paid: number;
    payment_method: payment_method;
    payment_date?: string;    // Optional, defaults to now
    payment_reference?: string;
}

// ============================================================================
// UPDATE DTOs
// ============================================================================

export interface UpdateRevenueDTO {
    date_recorded?: string;
    amount?: number;
    description?: string;
}

export interface UpdateConfigDTO {
    minimum_wage?: number;
    duration_to_receivable_hours?: number;
    receivable_due_date_days?: number;
    driver_share_percentage?: number;
    conductor_share_percentage?: number;
    default_frequency?: receivable_frequency;
    default_number_of_payments?: number;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface RevenueListItem {
    id: number;
    code: string;
    body_number: string | null;
    date_assigned: string | null;
    trip_revenue: number;
    assignment_type: string | null;
    remittance_status: string;
    date_recorded: string | null;
    expected_remittance: number;
    shortage: number;
    has_receivables: boolean;
}

export interface RevenueDetailResponse {
    // Header
    id: number;
    code: string;
    assignment_id: string;
    bus_trip_id: string;
    remittance_status: string;

    // Bus Details
    bus_details: {
        date_assigned: string | null;
        body_number: string | null;
        body_builder: string | null;
        license_plate: string | null;
        bus_type: string | null;
        route: string | null;
        assignment_type: string | null;
        assignment_value: number | null;
        payment_method: string | null;
        trip_revenue: number;
        trip_fuel_expense: number;
        company_share_amount: number;
    };

    // Employee Details
    employees: {
        driver: {
            employee_number: string;
            name: string;
        } | null;
        conductor: {
            employee_number: string;
            name: string;
        } | null;
    };

    // Remittance Details
    remittance: {
        date_recorded: string | null;
        date_expected: string | null;
        expected_remittance: number;
        amount_remitted: number;
        shortage: number;
        description: string | null;
    };

    // Shortage Details (only if PARTIALLY_PAID)
    shortage_details?: {
        driver_share: number;
        conductor_share: number;
        receivable_due_date: string | null;
        driver_receivable: ReceivableWithSchedules | null;
        conductor_receivable: ReceivableWithSchedules | null;
    };

    // Journal Entry
    journal_entry?: {
        id: number;
        code: string;
        status: string;
    };

    // Audit
    created_by: string | null;
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
}

export interface ReceivableWithSchedules {
    id: number;
    code: string;
    debtor_name: string;
    employee_number: string | null;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: string;
    due_date: string | null;
    installment_schedules: InstallmentSchedule[];
}

export interface InstallmentSchedule {
    id: number;
    installment_number: number;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    balance: number;
    status: string;
}

export interface UnsyncedTripItem {
    assignment_id: string;
    bus_trip_id: string;
    body_number: string | null;
    date_assigned: string | null;
    route: string | null;
    assignment_type: string | null;
    assignment_value: number;
    trip_revenue: number;
    trip_fuel_expense: number;
    expected_remittance: number;
    shortage: number;
    driver: { employee_number: string; name: string } | null;
    conductor: { employee_number: string; name: string } | null;
}

export interface ProcessUnsyncedResult {
    total: number;
    processed: number;
    failed: number;
    results: Array<{
        assignment_id: string;
        bus_trip_id: string;
        success: boolean;
        revenue_id?: number;
        revenue_code?: string;
        error?: string;
    }>;
}

export interface SystemConfigResponse {
    minimum_wage: number;
    duration_to_receivable_hours: number;
    receivable_due_date_days: number;
    driver_share_percentage: number;
    conductor_share_percentage: number;
    default_frequency: string;
    default_number_of_payments: number;
}

// ============================================================================
// JOURNAL ENTRY TEMPLATES
// ============================================================================

export interface JournalEntryPayload {
    module: string;
    reference_id: string;
    description: string;
    date: string;
    entries: Array<{
        account_code: string;
        debit: number;
        credit: number;
        description: string;
    }>;
}
