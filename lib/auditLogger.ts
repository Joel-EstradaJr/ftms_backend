// ftms/lib/auditLogger.ts
import { prisma } from './prisma'
import { generateId } from './idGenerator'
import { headers } from 'next/headers'
import { type NextRequest } from 'next/server'

export async function getClientIp(request?: NextRequest | Request): Promise<string> {
  try {
    // Try to get IP from request object if provided
    if (request) {
      const forwardedFor = request.headers.get('x-forwarded-for')
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
      }
      const realIp = request.headers.get('x-real-ip')
      if (realIp) {
        return realIp
      }
    }

    // Try to get IP from Next.js headers() if available
    try {
      const headersList = await headers()
      const forwardedFor = headersList.get('x-forwarded-for')
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
      }
      const realIp = headersList.get('x-real-ip')
      if (realIp) {
        return realIp
      }
    } catch {
      // headers() might not be available in all contexts
    }

    return 'unknown'
  } catch (error) {
    console.error('Error getting client IP:', error)
    return 'unknown'
  }
}

type AuditLogData = {
  action: string;
  table_affected: 'ExpenseRecord' | 'RevenueRecord' | 'Reimbursement';
  record_id: string;
  performed_by: string;
  details: string;
  ip_address?: string;
  request?: NextRequest | Request;
};

export async function logAudit({
  action,
  table_affected,
  record_id,
  performed_by,
  details,
  ip_address,
  request,
}: AuditLogData) {
  try {
    // If ip_address is not provided, try to get it from request
    const clientIp = ip_address || await getClientIp(request)

    await prisma.auditLog.create({
      data: {
        log_id: await generateId('LOG'),
        action,
        table_affected,
        record_id,
        performed_by,
        details,
        ip_address: clientIp,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
    // Don't throw — logging shouldn't crash the main flow
  }
}
