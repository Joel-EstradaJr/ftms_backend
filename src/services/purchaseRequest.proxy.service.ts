/**
 * Purchase Request Proxy Service
 * 
 * Proxies purchase request API calls to the purchase-request-management microservice.
 * The microservice handles purchase request data and workflow.
 */

import { logger } from '../config/logger';

// Hardcoded for now based on user request, or could be in env config
// User provided: https://purchase-request-production-17a6.up.railway.app/api/v1/finance
const PURCHASE_API_BASE_URL = 'https://purchase-request-production-17a6.up.railway.app/api/v1/finance';

interface PurchaseRequestFilters {
    status?: string;
    department_id?: string;
    request_type?: string;
    page?: number;
    limit?: number;
}

export interface PurchaseRequestResponse {
    success: boolean;
    data?: any;
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
}

function getHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

export async function getFinancePurchaseRequests(token: string, filters?: PurchaseRequestFilters) {
    try {
        // The microservice URL provided is /purchase-requests
        // Query params might need to be adjusted based on what the microservice accepts
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());

        const url = `${PURCHASE_API_BASE_URL}/purchase-requests${queryParams.toString() ? `?${queryParams}` : ''}`;
        logger.debug(`Fetching purchase requests from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to fetch purchase requests: ${response.status}`);
        }

        return await response.json() as PurchaseRequestResponse;
    } catch (error) {
        logger.error('Error fetching purchase requests:', error);
        throw error;
    }
}

export async function getPurchaseRequestForFinance(token: string, id: string) {
    try {
        const url = `${PURCHASE_API_BASE_URL}/purchase-requests/${id}`;
        logger.debug(`Fetching purchase request details: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to fetch purchase request details: ${response.status}`);
        }

        return await response.json() as PurchaseRequestResponse;
    } catch (error) {
        logger.error('Error fetching purchase request details:', error);
        throw error;
    }
}

export async function updatePurchaseRequestForFinance(
    token: string,
    id: string,
    data: { status?: string; finance_remarks?: string }
) {
    try {
        const url = `${PURCHASE_API_BASE_URL}/purchase-requests/${id}`;
        logger.debug(`Updating purchase request: ${url}`);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to update purchase request: ${response.status}`);
        }

        return await response.json() as PurchaseRequestResponse;
    } catch (error) {
        logger.error('Error updating purchase request:', error);
        throw error;
    }
}

export async function updatePurchaseRequestItemForFinance(
    token: string,
    id: string,
    data: { status?: string; quantity?: number; adjustmentReason?: string }
) {
    try {
        const url = `${PURCHASE_API_BASE_URL}/purchase-request-items/${id}`;
        logger.debug(`Updating purchase request item: ${url}`);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to update purchase request item: ${response.status}`);
        }

        return await response.json() as PurchaseRequestResponse;
    } catch (error) {
        logger.error('Error updating purchase request item:', error);
        throw error;
    }
}

export async function bulkUpdatePurchaseRequestItemsForFinance(
    token: string,
    data: { items: Array<{ id: number; status: string; quantity?: number; adjustmentReason?: string }> }
) {
    try {
        const url = `${PURCHASE_API_BASE_URL}/purchase-request-items/bulk`;
        logger.debug(`Bulk updating purchase request items: ${url}`);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: getHeaders(token),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to bulk update items: ${response.status}`);
        }

        return await response.json() as PurchaseRequestResponse;
    } catch (error) {
        logger.error('Error in bulk update:', error);
        throw error;
    }
}
