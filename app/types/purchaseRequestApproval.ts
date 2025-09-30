// Purchase Request Approval Status Enum
export enum ApprovalStatus {
  PENDING_APPROVAL = 'pending-approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partially-completed',
  REFUND_REQUESTED = 'refund-requested',
  CANCELLED = 'cancelled'
}

// Purchase Request Priority/Type
export enum RequestPriority {
  NORMAL = 'normal',
  URGENT = 'urgent'
}

// Department enum
export enum Department {
  OPERATIONS = 'operations',
  MAINTENANCE = 'maintenance',
  ADMINISTRATION = 'administration',
  FINANCE = 'finance',
  HR = 'hr'
}

// Purchase Request Item interface
export interface PurchaseRequestItem {
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  category?: string;
  specifications?: string;
}

// Main Purchase Request Approval interface
export interface PurchaseRequestApproval {
  id: string;
  request_id: string;
  title: string;
  department: Department;
  requester_name: string;
  requester_position: string;
  supplier_name: string;
  total_amount: number;
  request_date: string;
  approval_deadline?: string;
  
  // Status and workflow
  status: ApprovalStatus;
  priority: RequestPriority;
  
  // Approval workflow data
  submitted_by: string;
  submitted_date: string;
  reviewed_by?: string;
  reviewed_date?: string;
  approved_by?: string;
  approved_date?: string;
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
  
  // Items and details
  items: PurchaseRequestItem[];
  purpose: string;
  justification?: string;
  
  // Additional tracking
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  order_number?: string;
  invoice_number?: string;
  
  // Financial tracking
  budget_code?: string;
  remaining_budget?: number;
  
  // Refund/Return data
  refund_amount?: number;
  refund_reason?: string;
  refund_requested_by?: string;
  refund_requested_date?: string;
  
  // Metadata
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  is_deleted: boolean;
}

// Approval Action Data interfaces
export interface ApprovalAction {
  request_id: string;
  action: 'approve' | 'reject';
  comments?: string;
  approved_by: string;
  rejection_reason?: string;
}

export interface RollbackAction {
  request_id: string;
  rollback_reason: string;
  rollback_by: string;
}

export interface RefundAction {
  request_id: string;
  refund_amount: number;
  refund_reason: string;
  processed_by: string;
}

// Filter interfaces for the approval page
export interface ApprovalFilters {
  department?: Department[];
  status?: ApprovalStatus[];
  priority?: RequestPriority[];
  supplier?: string[];
  amount_range?: {
    min: number;
    max: number;
  };
  date_range?: {
    from: string;
    to: string;
  };
  requester?: string[];
}

// Export data interface
export interface ApprovalExportData {
  request_id: string;
  title: string;
  department: string;
  requester_name: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  priority: string;
  request_date: string;
  approved_date?: string;
  rejection_reason?: string;
  items_count: number;
  total_items_value: number;
}

// Audit Trail Entry interface
export interface ApprovalAuditEntry {
  id: string;
  request_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  old_status?: string;
  new_status?: string;
  comments?: string;
  additional_data?: Record<string, any>;
}

// Status tracking interface
export interface StatusTrackingEntry {
  id: string;
  request_id: string;
  status: ApprovalStatus;
  timestamp: string;
  updated_by: string;
  notes?: string;
  milestone: string;
  expected_completion?: string;
}