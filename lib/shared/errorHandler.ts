/**
 * Shared Error Handler
 * Centralized error handling and response formatting for API routes
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: unknown): { statusCode: number; message: string; details?: any } {
  // Prisma Client Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return {
          statusCode: 409,
          message: 'A record with this unique field already exists',
          details: { field: error.meta?.target },
        };
      case 'P2003':
        // Foreign key constraint violation
        return {
          statusCode: 400,
          message: 'Invalid reference to related record',
          details: { field: error.meta?.field_name },
        };
      case 'P2025':
        // Record not found
        return {
          statusCode: 404,
          message: 'Record not found',
        };
      default:
        return {
          statusCode: 500,
          message: 'Database operation failed',
          details: { code: error.code },
        };
    }
  }

  // Prisma Validation Errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid data provided',
      details: error.message,
    };
  }

  // Default error
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
  };
}

/**
 * Handle API errors and return formatted NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Custom API Error
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Prisma Errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    const { statusCode, message, details } = handlePrismaError(error);
    return NextResponse.json(
      {
        error: message,
        details,
      },
      { status: statusCode }
    );
  }

  // Generic Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }

  // Unknown Error
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

/**
 * Validation Error Helper
 */
export function createValidationError(message: string, details?: any): ApiError {
  return new ApiError(400, message, details);
}

/**
 * Not Found Error Helper
 */
export function createNotFoundError(resource: string): ApiError {
  return new ApiError(404, `${resource} not found`);
}

/**
 * Forbidden Error Helper
 */
export function createForbiddenError(message: string = 'Access forbidden'): ApiError {
  return new ApiError(403, message);
}

/**
 * Unauthorized Error Helper
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): ApiError {
  return new ApiError(401, message);
}

/**
 * Conflict Error Helper
 */
export function createConflictError(message: string, details?: any): ApiError {
  return new ApiError(409, message, details);
}
