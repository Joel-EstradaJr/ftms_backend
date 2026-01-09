/**
 * Shared Response Formatter
 * Consistent API response formatting for all routes (Admin + Staff)
 */

import { NextResponse } from 'next/server';

/**
 * Success response structure
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Format error response
 */
export function formatErrorResponse(
  error: string,
  details?: any,
  status: number = 500
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Format paginated response
 */
export function formatPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    { status }
  );
}

/**
 * Format created response (HTTP 201)
 */
export function formatCreatedResponse<T>(
  data: T,
  message: string = 'Resource created successfully'
): NextResponse<SuccessResponse<T>> {
  return formatSuccessResponse(data, message, 201);
}

/**
 * Format no content response (HTTP 204)
 */
export function formatNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Format not found response (HTTP 404)
 */
export function formatNotFoundResponse(resource: string = 'Resource'): NextResponse<ErrorResponse> {
  return formatErrorResponse(`${resource} not found`, undefined, 404);
}

/**
 * Format validation error response (HTTP 400)
 */
export function formatValidationErrorResponse(
  message: string,
  details?: any
): NextResponse<ErrorResponse> {
  return formatErrorResponse(message, details, 400);
}

/**
 * Format forbidden response (HTTP 403)
 */
export function formatForbiddenResponse(
  message: string = 'Access forbidden'
): NextResponse<ErrorResponse> {
  return formatErrorResponse(message, undefined, 403);
}

/**
 * Format unauthorized response (HTTP 401)
 */
export function formatUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ErrorResponse> {
  return formatErrorResponse(message, undefined, 401);
}

/**
 * Format conflict response (HTTP 409)
 */
export function formatConflictResponse(
  message: string,
  details?: any
): NextResponse<ErrorResponse> {
  return formatErrorResponse(message, details, 409);
}
