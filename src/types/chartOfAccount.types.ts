// DTO definitions for Chart of Account creation and queries.
// Lives in types/ to enforce type safety across controller/service boundaries.
import { normal_balance } from '@prisma/client';

export interface ChartOfAccountCreateDTO {
  account_type_code?: string; // Alternate way to reference account type by its fixed code
  account_type_id?: number;   // Direct FK reference
  account_name: string;       // Unique (within account_type) non-deleted
  normal_balance: normal_balance; // DEBIT or CREDIT
  description?: string;
  custom_suffix?: number;     // Optional override for last 3 digits (0-999)
}

export interface ChartOfAccountResponseDTO {
  id: number;
  account_code: string;
  account_name: string;
  account_type_id: number;
  normal_balance: normal_balance;
  description?: string | null;
  created_at: Date;
}

// Query DTO for listing Chart of Accounts with filtering
export interface ChartOfAccountQueryDTO {
  includeArchived?: boolean;  // Include soft-deleted records (default: false)
  accountTypeId?: number;     // Filter by account type
  search?: string;            // Search in account_name or account_code
  page?: number;              // Pagination (default: 1)
  limit?: number;             // Records per page (default: 50)
}

// Response DTO for Chart of Accounts list with account type details
export interface ChartOfAccountListItemDTO {
  id: number;
  account_code: string;       // Unique identifier
  account_name: string;       // COA title
  account_type_name: string;  // Joined from account_type table
  normal_balance: normal_balance; // DEBIT or CREDIT
  description: string | null; // Short preview
  status: 'Active' | 'Archived'; // Derived from is_deleted
  created_at: Date;
  updated_at: Date | null;
}

// Paginated response wrapper
export interface ChartOfAccountListResponseDTO {
  data: ChartOfAccountListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
