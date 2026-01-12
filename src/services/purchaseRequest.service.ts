/**
 * PURCHASE REQUEST SERVICE
 * Handles integration with external Purchase Request System API
 * 
 * External API: https://purchase-request-production-17a6.up.railway.app/api/v1/finance
 * 
 * Available endpoints from external system:
 * - GET  /purchase-requests - Get all purchase requests
 * - GET  /purchase-requests/:id - Get single purchase request
 * - PATCH /purchase-requests/:id - Update purchase request (status, finance_remarks)
 * - PATCH /purchase-request-items/:id - Update item (status, quantity, adjustmentReason)
 * - PATCH /purchase-request-items/bulk - Bulk update items
 */

import { PrismaClient, purchase_request_approval_status, pr_item_finance_status } from '@prisma/client';

const prisma = new PrismaClient();

// External API base URL
const EXTERNAL_API_URL = process.env.PURCHASE_REQUEST_API_URL || 
  'https://purchase-request-production-17a6.up.railway.app/api/v1/finance';

// ============================================================================
// TYPES
// ============================================================================

export interface ExternalPurchaseRequest {
  id: number;
  request_code: string;
  requestor_id: number;
  department_id: string;
  type: string;
  reason: string;
  status: string;
  total_amount: string;
  is_deleted: boolean;
  finance_remarks: string | null;
  budget_request_code: string | null;
  department_buget_code: string | null;
  old_order_code: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
  items: ExternalPurchaseRequestItem[];
}

export interface ExternalPurchaseRequestItem {
  id: number;
  purchase_request_item_code: string;
  purchase_request_id: number;
  item_code: string;
  supplier_code: string;
  quantity: string;
  status: string;
  remarks: string;
  is_deleted: boolean;
  adjustment_reason: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
  item?: {
    id: number;
    item_code: string;
    item_name: string;
    category_id: number;
    unit_id: number;
    status: string;
    description: string;
    unit?: {
      id: number;
      unit_code: string;
      unit_name: string;
      abbreviation: string;
    };
    category?: {
      id: number;
      category_code: string;
      category_name: string;
      description: string;
    };
  };
  supplier?: {
    id: number;
    supplier_id: string;
    supplier_name: string;
    contact_number: string;
    email: string;
    city: string;
    province: string;
    status: string;
  };
  supplier_item?: {
    supplier_id: number;
    item_id: number;
    supplier_unit_id: number;
    conversion_amount: string;
    unit_price: string;
    description: string;
    supplier_unit?: {
      id: number;
      unit_code: string;
      unit_name: string;
      abbreviation: string;
    };
  };
  unit?: {
    id: number;
    unit_code: string;
    unit_name: string;
    abbreviation: string;
  };
  category?: {
    id: number;
    category_code: string;
    category_name: string;
    description: string;
  };
}

export interface TransformedPurchaseRequest {
  id: number;
  purchase_request_code: string;
  department_name: string;
  request_type: string;
  reason: string;
  status: string;
  total_amount: number;
  finance_remarks: string | null;
  budget_request_code: string | null;
  department_budget_code: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  requestor: {
    user_id: string;
    employee_id: string;
    employee_name: string;
    first_name: string;
    last_name: string;
    department_id: string;
    department_name: string;
  };
  items: TransformedPurchaseRequestItem[];
}

export interface TransformedPurchaseRequestItem {
  id: number;
  purchase_request_item_id: string;
  purchase_request_item_code: string;
  purchase_request_id: number;
  item_code: string;
  supplier_code: string;
  quantity: number;
  status: string;
  remarks: string;
  adjustment_reason: string | null;
  item?: {
    id: number;
    item_code: string;
    item_name: string;
    description: string;
    unit?: {
      unit_id: number;
      unit_code: string;
      unit_name: string;
      abbreviation: string;
    };
    category?: {
      category_id: number;
      category_code: string;
      category_name: string;
    };
  };
  supplier?: {
    supplier_id: string;
    supplier_code: string;
    supplier_name: string;
    contact_number: string;
    email: string;
  };
  supplier_item?: {
    unit_cost: number;
    conversion_amount: number;
    supplier_unit?: {
      unit_id: number;
      unit_code: string;
      unit_name: string;
      abbreviation: string;
    };
  };
  unit_cost: number;
  total_amount: number;
}

export interface ApproveRequestDto {
  financeRemarks?: string;
  approvedBy: string;
  itemApprovals?: Array<{
    itemId: number;
    approvedQuantity: number;
    adjustmentReason?: string;
  }>;
}

export interface RejectRequestDto {
  financeRemarks?: string;
  rejectionReason: string;
  rejectedBy: string;
}

export interface UpdateItemDto {
  status?: string;
  quantity?: number;
  adjustmentReason?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class PurchaseRequestService {
  /**
   * Fetch all purchase requests from external API
   */
  async getAllPurchaseRequests(status?: string): Promise<TransformedPurchaseRequest[]> {
    try {
      let url = `${EXTERNAL_API_URL}/purchase-requests`;
      if (status) {
        url += `?status=${status}`;
      }

      console.log(`📥 Fetching purchase requests from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { success: boolean; data: ExternalPurchaseRequest[] };
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from external API');
      }

      // Transform external data to match frontend types
      const transformed = data.data.map((pr: ExternalPurchaseRequest) => 
        this.transformPurchaseRequest(pr)
      );

      console.log(`✅ Fetched ${transformed.length} purchase requests`);
      return transformed;

    } catch (error: any) {
      console.error('❌ Error fetching purchase requests:', error.message);
      throw error;
    }
  }

  /**
   * Fetch single purchase request by ID
   */
  async getPurchaseRequestById(id: number): Promise<TransformedPurchaseRequest | null> {
    try {
      const url = `${EXTERNAL_API_URL}/purchase-requests/${id}`;
      console.log(`📥 Fetching purchase request ${id} from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`External API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { success: boolean; data: ExternalPurchaseRequest };
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from external API');
      }

      return this.transformPurchaseRequest(data.data);

    } catch (error: any) {
      console.error(`❌ Error fetching purchase request ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Get purchase request status by request code (for external system to check)
   */
  async getStatusByRequestCode(requestCode: string): Promise<{
    request_code: string;
    status: string;
    finance_remarks: string | null;
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
  } | null> {
    try {
      // First try to get from local database
      const localRecord = await prisma.purchase_request_approval.findUnique({
        where: { request_code: requestCode },
        select: {
          request_code: true,
          status: true,
          finance_remarks: true,
          approved_by: true,
          approved_at: true,
          rejected_by: true,
          rejected_at: true,
        },
      });

      if (localRecord) {
        return {
          request_code: localRecord.request_code,
          status: localRecord.status,
          finance_remarks: localRecord.finance_remarks,
          approved_by: localRecord.approved_by,
          approved_at: localRecord.approved_at?.toISOString() || null,
          rejected_by: localRecord.rejected_by,
          rejected_at: localRecord.rejected_at?.toISOString() || null,
        };
      }

      // Fall back to fetching from external API
      const allRequests = await this.getAllPurchaseRequests();
      const request = allRequests.find(r => r.purchase_request_code === requestCode);
      
      if (!request) {
        return null;
      }

      return {
        request_code: request.purchase_request_code,
        status: request.status,
        finance_remarks: request.finance_remarks,
        approved_by: request.approved_by,
        approved_at: request.approved_at,
        rejected_by: request.rejected_by,
        rejected_at: request.rejected_at,
      };

    } catch (error: any) {
      console.error(`❌ Error getting status for ${requestCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Approve a purchase request
   */
  async approveRequest(id: number, dto: ApproveRequestDto): Promise<TransformedPurchaseRequest> {
    try {
      console.log(`✅ Approving purchase request ${id}`);

      // Update external API
      const response = await fetch(`${EXTERNAL_API_URL}/purchase-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          finance_remarks: dto.financeRemarks || 'Approved by Finance',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || `Failed to approve: ${response.status}`);
      }

      // If there are item-level approvals with quantity adjustments
      if (dto.itemApprovals && dto.itemApprovals.length > 0) {
        for (const itemApproval of dto.itemApprovals) {
          await this.updateItem(itemApproval.itemId, {
            status: 'APPROVED',
            quantity: itemApproval.approvedQuantity,
            adjustmentReason: itemApproval.adjustmentReason,
          });
        }
      }

      // Sync to local database
      await this.syncToLocalDb(id, 'APPROVED', dto.approvedBy, dto.financeRemarks);

      // Fetch and return updated data
      const updated = await this.getPurchaseRequestById(id);
      if (!updated) {
        throw new Error('Failed to fetch updated purchase request');
      }

      return updated;

    } catch (error: any) {
      console.error(`❌ Error approving purchase request ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Reject a purchase request
   */
  async rejectRequest(id: number, dto: RejectRequestDto): Promise<TransformedPurchaseRequest> {
    try {
      console.log(`❌ Rejecting purchase request ${id}`);

      // Update external API
      const response = await fetch(`${EXTERNAL_API_URL}/purchase-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          finance_remarks: dto.rejectionReason || dto.financeRemarks || 'Rejected by Finance',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || `Failed to reject: ${response.status}`);
      }

      // Sync to local database
      await this.syncToLocalDb(id, 'REJECTED', undefined, dto.financeRemarks, dto.rejectedBy);

      // Fetch and return updated data
      const updated = await this.getPurchaseRequestById(id);
      if (!updated) {
        throw new Error('Failed to fetch updated purchase request');
      }

      return updated;

    } catch (error: any) {
      console.error(`❌ Error rejecting purchase request ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a purchase request item
   */
  async updateItem(itemId: number, dto: UpdateItemDto): Promise<void> {
    try {
      console.log(`📝 Updating purchase request item ${itemId}`);

      const updateData: Record<string, any> = {};
      if (dto.status) updateData.status = dto.status;
      if (dto.quantity !== undefined) updateData.quantity = dto.quantity.toString();
      if (dto.adjustmentReason) updateData.adjustment_reason = dto.adjustmentReason;

      const response = await fetch(`${EXTERNAL_API_URL}/purchase-request-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || `Failed to update item: ${response.status}`);
      }

      console.log(`✅ Updated item ${itemId}`);

    } catch (error: any) {
      console.error(`❌ Error updating item ${itemId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync approval decision to local database
   */
  private async syncToLocalDb(
    externalId: number,
    status: string,
    approvedBy?: string,
    financeRemarks?: string,
    rejectedBy?: string
  ): Promise<void> {
    try {
      // First fetch the full data to get request_code
      const request = await this.getPurchaseRequestById(externalId);
      if (!request) return;

      const statusMap: Record<string, purchase_request_approval_status> = {
        'PENDING': 'PENDING',
        'APPROVED': 'APPROVED',
        'REJECTED': 'REJECTED',
        'ADJUSTED': 'ADJUSTED',
        'CLOSED': 'CLOSED',
      };

      await prisma.purchase_request_approval.upsert({
        where: { request_code: request.purchase_request_code },
        create: {
          request_code: request.purchase_request_code,
          department_id: request.department_name,
          department_name: request.department_name,
          category_id: 1, // Default category
          request_type: request.request_type,
          reason: request.reason,
          total_amount: request.total_amount,
          status: statusMap[status] || 'PENDING',
          finance_remarks: financeRemarks,
          approved_by: approvedBy,
          approved_at: status === 'APPROVED' ? new Date() : undefined,
          rejected_by: rejectedBy,
          rejected_at: status === 'REJECTED' ? new Date() : undefined,
          created_by: 'SYSTEM',
        },
        update: {
          status: statusMap[status] || 'PENDING',
          finance_remarks: financeRemarks,
          approved_by: status === 'APPROVED' ? approvedBy : undefined,
          approved_at: status === 'APPROVED' ? new Date() : undefined,
          rejected_by: status === 'REJECTED' ? rejectedBy : undefined,
          rejected_at: status === 'REJECTED' ? new Date() : undefined,
          updated_by: 'SYSTEM',
        },
      });

      console.log(`💾 Synced ${request.purchase_request_code} to local database`);

    } catch (error: any) {
      console.error('❌ Error syncing to local DB:', error.message);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Transform external API response to frontend format
   */
  private transformPurchaseRequest(pr: ExternalPurchaseRequest): TransformedPurchaseRequest {
    return {
      id: pr.id,
      purchase_request_code: pr.request_code,
      department_name: pr.department_id,
      request_type: pr.type,
      reason: pr.reason,
      status: pr.status,
      total_amount: parseFloat(pr.total_amount) || 0,
      finance_remarks: pr.finance_remarks,
      budget_request_code: pr.budget_request_code,
      department_budget_code: pr.department_buget_code, // Note: typo in external API
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      approved_by: pr.approved_by,
      approved_at: pr.approved_at,
      rejected_by: pr.rejected_by,
      rejected_at: pr.rejected_at,
      requestor: {
        user_id: pr.created_by,
        employee_id: pr.created_by,
        employee_name: pr.created_by, // We don't have full name from API
        first_name: pr.created_by,
        last_name: '',
        department_id: pr.department_id,
        department_name: pr.department_id,
      },
      items: pr.items?.map(item => this.transformItem(item)) || [],
    };
  }

  /**
   * Transform external item to frontend format
   */
  private transformItem(item: ExternalPurchaseRequestItem): TransformedPurchaseRequestItem {
    const unitPrice = item.supplier_item?.unit_price 
      ? parseFloat(item.supplier_item.unit_price) 
      : 0;
    const quantity = parseFloat(item.quantity) || 0;

    return {
      id: item.id,
      purchase_request_item_id: item.purchase_request_item_code,
      purchase_request_item_code: item.purchase_request_item_code,
      purchase_request_id: item.purchase_request_id,
      item_code: item.item_code,
      supplier_code: item.supplier_code,
      quantity: quantity,
      status: item.status,
      remarks: item.remarks,
      adjustment_reason: item.adjustment_reason,
      item: item.item ? {
        id: item.item.id,
        item_code: item.item.item_code,
        item_name: item.item.item_name,
        description: item.item.description,
        unit: item.item.unit ? {
          unit_id: item.item.unit.id,
          unit_code: item.item.unit.unit_code,
          unit_name: item.item.unit.unit_name,
          abbreviation: item.item.unit.abbreviation,
        } : undefined,
        category: item.item.category ? {
          category_id: item.item.category.id,
          category_code: item.item.category.category_code,
          category_name: item.item.category.category_name,
        } : undefined,
      } : undefined,
      supplier: item.supplier ? {
        supplier_id: item.supplier.supplier_id,
        supplier_code: item.supplier.supplier_id,
        supplier_name: item.supplier.supplier_name,
        contact_number: item.supplier.contact_number,
        email: item.supplier.email,
      } : undefined,
      supplier_item: item.supplier_item ? {
        unit_cost: unitPrice,
        conversion_amount: parseFloat(item.supplier_item.conversion_amount) || 1,
        supplier_unit: item.supplier_item.supplier_unit ? {
          unit_id: item.supplier_item.supplier_unit.id,
          unit_code: item.supplier_item.supplier_unit.unit_code,
          unit_name: item.supplier_item.supplier_unit.unit_name,
          abbreviation: item.supplier_item.supplier_unit.abbreviation,
        } : undefined,
      } : undefined,
      unit_cost: unitPrice,
      total_amount: quantity * unitPrice,
    };
  }
}

export default new PurchaseRequestService();
