/**
 * Budget Request Proxy Service
 * 
 * Proxies budget request API calls to the budget-request-management microservice.
 * The microservice handles all budget request CRUD operations and approval workflows.
 */

import { config } from '../config/env';
import { logger } from '../config/logger';

const BUDGET_API_URL = config.externalApis.budgetRequests;

interface BudgetRequestFilters {
    status?: string;
    department_id?: string;
    request_type?: string;
    page?: number;
    limit?: number;
}

// Response type from the microservice
export interface BudgetRequestResponse {
    success: boolean;
    data?: any;
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
}

/**
 * Forward the Authorization header to the microservice
 */
function getHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * List all budget requests with optional filters
 */
export async function listBudgetRequests(token: string, filters?: BudgetRequestFilters) {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.department_id) queryParams.append('department_id', filters.department_id);
        if (filters?.request_type) queryParams.append('request_type', filters.request_type);
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());

        const url = `${BUDGET_API_URL}/finance/admin/budget-requests${queryParams.toString() ? `?${queryParams}` : ''}`;
        logger.debug(`Fetching budget requests from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to fetch budget requests: ${response.status}`);
        }

        return await response.json() as BudgetRequestResponse;
    } catch (error) {
        logger.error('Error fetching budget requests:', error);
        throw error;
    }
}

/**
 * Get a single budget request by ID
 */
export async function getBudgetRequestById(token: string, id: string) {
    try {
        const url = `${BUDGET_API_URL}/finance/admin/budget-requests/${id}`;
        logger.debug(`Fetching budget request: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to fetch budget request: ${response.status}`);
        }

        return await response.json() as BudgetRequestResponse;
    } catch (error) {
        logger.error('Error fetching budget request:', error);
        throw error;
    }
}

/**
 * Approve a budget request
 */
export async function approveBudgetRequest(
    token: string,
    id: string,
    data: { approved_amount?: number; remarks?: string }
) {
    try {
        const url = `${BUDGET_API_URL}/finance/admin/approvals/${id}/approve`;
        logger.debug(`Approving budget request: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to approve budget request: ${response.status}`);
        }

        return await response.json() as BudgetRequestResponse;
    } catch (error) {
        logger.error('Error approving budget request:', error);
        throw error;
    }
}

/**
 * Reject a budget request
 */
export async function rejectBudgetRequest(
    token: string,
    id: string,
    data: { rejection_reason: string }
) {
    try {
        const url = `${BUDGET_API_URL}/finance/admin/approvals/${id}/reject`;
        logger.debug(`Rejecting budget request: ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
            throw new Error(errorBody.message || `Failed to reject budget request: ${response.status}`);
        }

        return await response.json() as BudgetRequestResponse;
    } catch (error) {
        logger.error('Error rejecting budget request:', error);
        throw error;
    }
}
