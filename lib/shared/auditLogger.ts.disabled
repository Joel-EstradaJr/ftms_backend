/**
 * Shared Audit Logger
 * Centralized audit logging utility for all API routes (Admin + Staff)
 */

import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';
import { headers } from 'next/headers';
import { type NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers
 * @param request - Optional NextRequest or Request object
 * @returns IP address string or 'unknown'
 */
export async function getClientIp(request?: NextRequest | Request): Promise<string> {
  try {
    // Try to get IP from request object if provided
    if (request) {
      const forwardedFor = request.headers.get('x-forwarded-for');
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
      }
      const realIp = request.headers.get('x-real-ip');
      if (realIp) {
        return realIp;
      }
    }

    // Try to get IP from Next.js headers() if available
    try {
      const headersList = await headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
      }
      const realIp = headersList.get('x-real-ip');
      if (realIp) {
        return realIp;
      }
    } catch {
      // headers() might not be available in all contexts
    }

    return 'unknown';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return 'unknown';
  }
}

/**
 * Audit log data structure
 */
type AuditLogData = {
  action: string;
  table_affected: 'ExpenseRecord' | 'RevenueRecord' | 'Reimbursement' | string;
  record_id: string;
  performed_by: string;
  details: string;
  ip_address?: string;
  request?: NextRequest | Request;
};

/**
 * Create audit log entry
 * @param data - Audit log data
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const ip_address = data.ip_address || (await getClientIp(data.request));
    
    await prisma.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
        action: data.action,
        table_affected: data.table_affected,
        record_id: data.record_id,
        performed_by: data.performed_by,
        details: data.details,
        ip_address,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Audit logger for revenue operations (Admin + Staff)
 */
export const auditLogger = {
  /**
   * Log revenue creation
   */
  logRevenueCreation: async (revenueId: string, userId: string, details: string, request?: NextRequest | Request) => {
    await createAuditLog({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: revenueId,
      performed_by: userId,
      details,
      request,
    });
  },

  /**
   * Log revenue update
   */
  logRevenueUpdate: async (revenueId: string, userId: string, details: string, request?: NextRequest | Request) => {
    await createAuditLog({
      action: 'UPDATE',
      table_affected: 'RevenueRecord',
      record_id: revenueId,
      performed_by: userId,
      details,
      request,
    });
  },

  /**
   * Log revenue deletion
   */
  logRevenueDeletion: async (revenueId: string, userId: string, details: string, request?: NextRequest | Request) => {
    await createAuditLog({
      action: 'DELETE',
      table_affected: 'RevenueRecord',
      record_id: revenueId,
      performed_by: userId,
      details,
      request,
    });
  },

  /**
   * Generic log function for custom actions
   */
  log: async (data: AuditLogData) => {
    await createAuditLog(data);
  },
};
