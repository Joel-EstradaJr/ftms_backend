import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { AuthRequest } from '../../middleware/auth';

export interface AuditLogPayload {
  moduleName: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  performedByRole?: string;
  recordId?: string;
  recordCode?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  reason?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogClient {
  private static baseUrl = config.externalApis.auditLogs;
  private static apiKey = config.auditLogsApiKey;

  /**
   * Create audit log entry
   */
  static async log(payload: AuditLogPayload): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/api/audit-logs`,
        {
          ...payload,
          oldValues: payload.oldValues ? JSON.stringify(payload.oldValues) : null,
          newValues: payload.newValues ? JSON.stringify(payload.newValues) : null,
          changedFields: payload.changedFields ? JSON.stringify(payload.changedFields) : null,
          metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
        }
      );

      logger.debug(`📝 Audit log created: ${payload.moduleName} - ${payload.action}`);
    } catch (error) {
      // Don't break main flow if audit logging fails
      logger.error('❌ Failed to create audit log:', error);
    }
  }

  /**
   * Convenience method for CREATE action
   */
  static async logCreate(
    moduleName: string,
    record: { id?: any; code?: string },
    data: any,
    user: { id: string; name?: string; role?: string },
    req?: any
  ): Promise<void> {
    await this.log({
      moduleName,
      action: 'CREATE',
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      recordId: record.id?.toString(),
      recordCode: record.code,
      newValues: data,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  /**
   * Convenience method for UPDATE action
   */
  static async logUpdate(
    moduleName: string,
    record: { id?: any; code?: string },
    oldData: any,
    newData: any,
    user: { id: string; name?: string; role?: string },
    req?: any
  ): Promise<void> {
    // Calculate changed fields
    const changedFields = Object.keys(newData).filter(
      (key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
    );

    await this.log({
      moduleName,
      action: 'UPDATE',
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      recordId: record.id?.toString(),
      recordCode: record.code,
      oldValues: oldData,
      newValues: newData,
      changedFields,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  /**
   * Convenience method for DELETE action
   */
  static async logDelete(
    moduleName: string,
    record: { id?: any; code?: string },
    data: any,
    user: { id: string; name?: string; role?: string },
    reason?: string,
    req?: any
  ): Promise<void> {
    await this.log({
      moduleName,
      action: 'DELETE',
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      recordId: record.id?.toString(),
      recordCode: record.code,
      oldValues: data,
      reason,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  /**
   * Log APPROVE/REJECT actions
   */
  static async logApproval(
    moduleName: string,
    record: { id?: any; code?: string },
    action: 'APPROVE' | 'REJECT',
    user: { id: string; name?: string; role?: string },
    reason?: string,
    req?: any
  ): Promise<void> {
    await this.log({
      moduleName,
      action,
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      recordId: record.id?.toString(),
      recordCode: record.code,
      reason,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  /**
   * Log VIEW action (for sensitive data access)
   */
  static async logView(
    moduleName: string,
    record: { id?: any; code?: string },
    user: { id: string; name?: string; role?: string },
    req?: any
  ): Promise<void> {
    await this.log({
      moduleName,
      action: 'VIEW',
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      recordId: record.id?.toString(),
      recordCode: record.code,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }

  /**
   * Log EXPORT action
   */
  static async logExport(
    moduleName: string,
    exportType: string,
    user: { id: string; name?: string; role?: string },
    metadata?: any,
    req?: any
  ): Promise<void> {
    await this.log({
      moduleName,
      action: 'EXPORT',
      performedBy: user.id,
      performedByName: user.name,
      performedByRole: user.role,
      metadata: { exportType, ...metadata },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });
  }
}
