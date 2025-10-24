// ============================================================================
// INTEGRATION HELPERS - Utility functions for microservice communication
// ============================================================================

import { Request } from 'express';

export interface UserContext {
  id: string;
  username: string;
  role: string;
  department?: string;
}

/**
 * Build forward headers for service-to-service requests
 * Includes API key and optionally forwards user JWT token
 */
export function buildForwardHeaders(
  req: Request,
  serviceApiKey: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-api-key': serviceApiKey,
    'Content-Type': 'application/json',
  };

  // Forward Authorization token if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    headers['Authorization'] = authHeader;
  }

  // Forward correlation ID for distributed tracing
  const correlationId = req.headers['x-correlation-id'] as string;
  if (correlationId) {
    headers['X-Correlation-Id'] = correlationId;
  }

  return headers;
}

/**
 * Generate idempotency key for cross-service requests
 */
export function generateIdempotencyKey(
  service: string,
  action: string,
  resourceId: string | number
): string {
  const timestamp = Date.now();
  return `${service}-${action}-${resourceId}-${timestamp}`;
}

/**
 * Extract user context from request
 */
export function extractUserContext(req: any): UserContext | null {
  if (req.user) {
    return {
      id: req.user.id || req.user.sub,
      username: req.user.username,
      role: req.user.role,
      department: req.user.department,
    };
  }
  return null;
}

/**
 * Validate fiscal period format (YYYY-MM)
 */
export function isValidFiscalPeriod(period: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(period);
}

/**
 * Build standard success response
 */
export function successResponse<T = any>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Build standard error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
