// ============================================================================
// AUDIT LOG CLIENT - CENTRALIZED AUDIT LOGGING FOR FINANCE BACKEND
// ============================================================================
// This client sends DENORMALIZED, HUMAN-READABLE audit logs to the Audit service.
// 
// KEY FEATURES:
// - Automatically resolves foreign keys to meaningful names
// - Formats currency, dates, and status values for display
// - Creates audit logs understandable by non-technical reviewers
// - Supports all action types: CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.
//
// PAYLOAD STRUCTURE:
// Instead of raw data like { department_id: 23, amount: "1000.00" }
// We send denormalized data like:
// {
//   summary: "Miscellaneous Income of ₱1,000.00",
//   fields: [
//     { label: "Department", value: "Inventory", raw_id: 23 },
//     { label: "Amount", value: "₱1,000.00", type: "currency" }
//   ]
// }
// ============================================================================

import axios from 'axios';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { Request } from 'express';
import {
  AuditActionType,
  AuditUser,
  AuditEntity,
  DenormalizedAuditData,
  AuditPayloadOptions,
  EnhancedAuditLogPayload,
} from './audit.types';
import {
  getPayloadBuilder,
  buildGenericAuditData,
  buildChangeData,
} from './audit.payloadBuilders';

// ============================================================================
// RE-EXPORT TYPES FOR BACKWARD COMPATIBILITY
// ============================================================================

export type { AuditActionType, AuditUser, AuditEntity, AuditPayloadOptions };

/**
 * Legacy audit log payload (still supported for backward compatibility)
 */
export interface AuditLogPayload {
  entity_type: string;
  entity_id: string;
  action_type_code: AuditActionType;
  action_by?: string;
  action_from?: string;
  previous_data?: object | null;
  new_data?: object | null;
  ip_address?: string;
}

// ============================================================================
// AUDIT LOG CLIENT CLASS
// ============================================================================

export class AuditLogClient {
  private static baseUrl = config.externalApis.auditLogs;
  private static apiKey = config.auditLogsApiKey;
  private static defaultActionFrom = 'Finance';

  /**
   * Get IP address from request
   */
  private static getIpAddress(req?: Request): string | undefined {
    if (!req) return undefined;
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip = req.ip || req.socket?.remoteAddress;
    
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded)) return forwarded[0];
    if (typeof realIp === 'string') return realIp;
    return ip;
  }

  /**
   * Convert entity type to snake_case format
   */
  private static normalizeEntityType(entityType: string): string {
    return entityType
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Build entity ID string from entity info
   */
  private static buildEntityId(entity: AuditEntity): string {
    if (entity.code) return entity.code;
    return String(entity.id);
  }

  /**
   * Filter out sensitive fields from data before logging
   */
  private static sanitizeData(data: any): object | null {
    if (!data) return null;
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'secret', 'api_key', 'apiKey',
      'access_token', 'refresh_token', 'private_key'
    ];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Calculate changes between old and new data for UPDATE actions
   */
  private static calculateChanges(oldData: any, newData: any): { previous: object; current: object } {
    const previous: Record<string, any> = {};
    const current: Record<string, any> = {};
    
    if (!oldData || !newData) {
      return { previous: oldData || {}, current: newData || {} };
    }
    
    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Skip internal/metadata fields
      if (['created_at', 'updated_at', 'createdAt', 'updatedAt'].includes(key)) {
        continue;
      }
      
      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        previous[key] = oldValue;
        current[key] = newValue;
      }
    }
    
    return { previous, current };
  }

  /**
   * Core method to send audit log to the microservice
   */
  static async log(payload: AuditLogPayload): Promise<void> {
    try {
      // Validate and normalize payload based on action type
      const normalizedPayload = this.validateAndNormalizePayload(payload);
      
      await axios.post(
        `${this.baseUrl}/api/audit-logs`,
        normalizedPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 5000, // 5 second timeout to avoid blocking main operations
        }
      );

      logger.debug(`📝 Audit log created: ${payload.entity_type} - ${payload.action_type_code}`);
    } catch (error: any) {
      // Don't break main flow if audit logging fails
      // Log the error for monitoring but don't throw
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`❌ Failed to create audit log [${payload.action_type_code} ${payload.entity_type}]: ${errorMessage}`);
      
      // Optionally log to local file for later retry
      this.logFailedAudit(payload, errorMessage);
    }
  }

  /**
   * Validate and normalize payload based on action type rules
   */
  private static validateAndNormalizePayload(payload: AuditLogPayload): object {
    const { action_type_code, previous_data, new_data } = payload;
    
    const normalized: Record<string, any> = {
      entity_type: this.normalizeEntityType(payload.entity_type),
      entity_id: payload.entity_id,
      action_type_code: action_type_code.toUpperCase(),
      action_by: payload.action_by || null,
      action_from: payload.action_from || this.defaultActionFrom,
      ip_address: payload.ip_address || null,
    };

    switch (action_type_code.toUpperCase()) {
      case 'CREATE':
        // CREATE: new_data required, previous_data must be null
        normalized.new_data = this.sanitizeData(new_data) || {};
        // Don't include previous_data for CREATE
        break;
        
      case 'UPDATE':
        // UPDATE: both required
        normalized.previous_data = this.sanitizeData(previous_data) || {};
        normalized.new_data = this.sanitizeData(new_data) || {};
        break;
        
      case 'DELETE':
        // DELETE: previous_data required, new_data must be null
        normalized.previous_data = this.sanitizeData(previous_data) || {};
        // Don't include new_data for DELETE
        break;
        
      case 'ARCHIVE':
      case 'UNARCHIVE':
        // ARCHIVE/UNARCHIVE: new_data required (status field)
        normalized.new_data = this.sanitizeData(new_data) || { status: action_type_code };
        // Don't include previous_data
        break;
        
      case 'APPROVE':
      case 'REJECT':
        // APPROVE/REJECT: both optional
        if (previous_data) normalized.previous_data = this.sanitizeData(previous_data);
        if (new_data) normalized.new_data = this.sanitizeData(new_data);
        break;
        
      case 'EXPORT':
      case 'IMPORT':
        // EXPORT/IMPORT: neither required (but we can include metadata in new_data if needed)
        // Don't include previous_data or new_data
        break;
        
      default:
        // For unknown actions, include whatever is provided
        if (previous_data) normalized.previous_data = this.sanitizeData(previous_data);
        if (new_data) normalized.new_data = this.sanitizeData(new_data);
    }

    return normalized;
  }

  /**
   * Log failed audit attempts for later retry/monitoring
   */
  private static logFailedAudit(payload: AuditLogPayload, error: string): void {
    logger.warn(`⚠️ Failed audit log queued for retry: ${JSON.stringify({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      action_type_code: payload.action_type_code,
      error,
      timestamp: new Date().toISOString(),
    })}`);
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ============================================================================

  /**
   * Log CREATE action with denormalized, human-readable data
   * Automatically resolves foreign keys to meaningful names
   */
  static async logCreate(
    entityType: string,
    entity: AuditEntity,
    newData: any,
    user: AuditUser,
    req?: Request,
    options?: AuditPayloadOptions
  ): Promise<void> {
    try {
      // Get the appropriate payload builder for this entity type
      const builder = getPayloadBuilder(entityType);
      const denormalizedData = await builder(newData, options);

      await this.sendEnhancedAuditLog({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'CREATE',
        action_by: user.id,
        action_by_name: user.name,
        action_from: user.department || this.defaultActionFrom,
        new_data: denormalizedData,
        previous_data: null,
        ip_address: this.getIpAddress(req),
      });
    } catch (error: any) {
      logger.error(`Error building audit payload for CREATE: ${error.message}`);
      // Fallback to basic audit log
      await this.log({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'CREATE',
        action_by: user.id,
        action_from: user.department || this.defaultActionFrom,
        new_data: newData,
        ip_address: this.getIpAddress(req),
      });
    }
  }

  /**
   * Log UPDATE action with denormalized data and clear change descriptions
   */
  static async logUpdate(
    entityType: string,
    entity: AuditEntity,
    oldData: any,
    newData: any,
    user: AuditUser,
    req?: Request,
    options?: AuditPayloadOptions
  ): Promise<void> {
    try {
      const builder = getPayloadBuilder(entityType);

      // Build denormalized payloads for both states
      const previousDenormalized = await builder(oldData, options);
      const newDenormalized = await builder(newData, options);

      // Build change data showing what specifically changed
      const changeData = buildChangeData(oldData, newData, options);

      await this.sendEnhancedAuditLog({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'UPDATE',
        action_by: user.id,
        action_by_name: user.name,
        action_from: user.department || this.defaultActionFrom,
        previous_data: previousDenormalized,
        new_data: newDenormalized,
        change_data: changeData,
        ip_address: this.getIpAddress(req),
      });
    } catch (error: any) {
      logger.error(`Error building audit payload for UPDATE: ${error.message}`);
      // Fallback to basic change calculation
      const { previous, current } = this.calculateChanges(oldData, newData);
      await this.log({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'UPDATE',
        action_by: user.id,
        action_from: user.department || this.defaultActionFrom,
        previous_data: previous,
        new_data: current,
        ip_address: this.getIpAddress(req),
      });
    }
  }

  /**
   * Log DELETE action with denormalized data showing what was deleted
   */
  static async logDelete(
    entityType: string,
    entity: AuditEntity,
    deletedData: any,
    user: AuditUser,
    reason?: string,
    req?: Request,
    options?: AuditPayloadOptions
  ): Promise<void> {
    try {
      const builder = getPayloadBuilder(entityType);
      const denormalizedData = await builder(deletedData, options);

      // Add deletion reason if provided
      if (reason && denormalizedData.fields) {
        denormalizedData.fields.push({
          label: 'Deletion Reason',
          value: reason,
          type: 'text',
        });
      }

      await this.sendEnhancedAuditLog({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'DELETE',
        action_by: user.id,
        action_by_name: user.name,
        action_from: user.department || this.defaultActionFrom,
        previous_data: denormalizedData,
        new_data: null,
        ip_address: this.getIpAddress(req),
      });
    } catch (error: any) {
      logger.error(`Error building audit payload for DELETE: ${error.message}`);
      const previousData = reason ? { ...deletedData, _deletion_reason: reason } : deletedData;
      await this.log({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'DELETE',
        action_by: user.id,
        action_from: user.department || this.defaultActionFrom,
        previous_data: previousData,
        ip_address: this.getIpAddress(req),
      });
    }
  }

  /**
   * Send enhanced audit log with denormalized data
   */
  private static async sendEnhancedAuditLog(payload: EnhancedAuditLogPayload): Promise<void> {
    try {
      const finalPayload = {
        entity_type: this.normalizeEntityType(payload.entity_type),
        entity_id: payload.entity_id,
        action_type_code: payload.action_type_code.toUpperCase(),
        action_by: payload.action_by || null,
        action_by_name: payload.action_by_name || null,
        action_from: payload.action_from || this.defaultActionFrom,
        previous_data: payload.previous_data || null,
        new_data: payload.new_data || null,
        change_data: payload.change_data || null,
        ip_address: payload.ip_address || null,
      };

      await axios.post(
        `${this.baseUrl}/api/audit-logs`,
        finalPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 5000,
        }
      );

      logger.debug(`📝 Audit log created: ${payload.entity_type} - ${payload.action_type_code}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`❌ Failed to create audit log [${payload.action_type_code} ${payload.entity_type}]: ${errorMessage}`);
      this.logFailedAudit(payload as any, errorMessage);
    }
  }

  /**
   * Log ARCHIVE action with human-readable summary
   */
  static async logArchive(
    entityType: string,
    entity: AuditEntity,
    user: AuditUser,
    metadata?: object,
    req?: Request
  ): Promise<void> {
    const newData: DenormalizedAuditData = {
      summary: `Archived ${entityType.replace(/_/g, ' ')}`,
      fields: [
        { label: 'Status', value: 'Archived', type: 'status' },
        ...(metadata ? Object.entries(metadata).map(([key, value]) => ({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          type: 'text' as const,
        })) : []),
      ],
    };

    await this.sendEnhancedAuditLog({
      entity_type: entityType,
      entity_id: this.buildEntityId(entity),
      action_type_code: 'ARCHIVE',
      action_by: user.id,
      action_by_name: user.name,
      action_from: user.department || this.defaultActionFrom,
      new_data: newData,
      ip_address: this.getIpAddress(req),
    });
  }

  /**
   * Log UNARCHIVE action with human-readable summary
   */
  static async logUnarchive(
    entityType: string,
    entity: AuditEntity,
    user: AuditUser,
    metadata?: object,
    req?: Request
  ): Promise<void> {
    const newData: DenormalizedAuditData = {
      summary: `Restored ${entityType.replace(/_/g, ' ')}`,
      fields: [
        { label: 'Status', value: 'Active', type: 'status' },
        ...(metadata ? Object.entries(metadata).map(([key, value]) => ({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          type: 'text' as const,
        })) : []),
      ],
    };

    await this.sendEnhancedAuditLog({
      entity_type: entityType,
      entity_id: this.buildEntityId(entity),
      action_type_code: 'UNARCHIVE',
      action_by: user.id,
      action_by_name: user.name,
      action_from: user.department || this.defaultActionFrom,
      new_data: newData,
      ip_address: this.getIpAddress(req),
    });
  }

  /**
   * Log APPROVE action with denormalized data
   */
  static async logApprove(
    entityType: string,
    entity: AuditEntity,
    user: AuditUser,
    previousData?: object,
    newData?: object,
    req?: Request,
    options?: AuditPayloadOptions
  ): Promise<void> {
    try {
      const builder = getPayloadBuilder(entityType);

      const prevDenormalized = previousData ? await builder(previousData as Record<string, any>, options) : null;
      const newDenormalized = newData
        ? await builder(newData as Record<string, any>, options)
        : {
            summary: `Approved ${entityType.replace(/_/g, ' ')}`,
            fields: [{ label: 'Status', value: 'Approved', type: 'status' as const }],
          };

      // Ensure status is shown as Approved
      if (newDenormalized.fields && !newDenormalized.fields.find(f => f.label === 'Status')) {
        newDenormalized.fields.unshift({ label: 'Status', value: 'Approved', type: 'status' });
      }

      await this.sendEnhancedAuditLog({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'APPROVE',
        action_by: user.id,
        action_by_name: user.name,
        action_from: user.department || this.defaultActionFrom,
        previous_data: prevDenormalized,
        new_data: newDenormalized,
        ip_address: this.getIpAddress(req),
      });
    } catch (error: any) {
      logger.error(`Error building audit payload for APPROVE: ${error.message}`);
      await this.log({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'APPROVE',
        action_by: user.id,
        action_from: user.department || this.defaultActionFrom,
        previous_data: previousData,
        new_data: newData || { status: 'APPROVED' },
        ip_address: this.getIpAddress(req),
      });
    }
  }

  /**
   * Log REJECT action with denormalized data and rejection reason
   */
  static async logReject(
    entityType: string,
    entity: AuditEntity,
    user: AuditUser,
    reason?: string,
    previousData?: object,
    newData?: object,
    req?: Request,
    options?: AuditPayloadOptions
  ): Promise<void> {
    try {
      const builder = getPayloadBuilder(entityType);

      const prevDenormalized = previousData ? await builder(previousData as Record<string, any>, options) : null;
      const newDenormalized = newData
        ? await builder(newData as Record<string, any>, options)
        : {
            summary: `Rejected ${entityType.replace(/_/g, ' ')}`,
            fields: [{ label: 'Status', value: 'Rejected', type: 'status' as const }],
          };

      // Add rejection reason
      if (reason && newDenormalized.fields) {
        newDenormalized.fields.push({ label: 'Rejection Reason', value: reason, type: 'text' });
      }

      await this.sendEnhancedAuditLog({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'REJECT',
        action_by: user.id,
        action_by_name: user.name,
        action_from: user.department || this.defaultActionFrom,
        previous_data: prevDenormalized,
        new_data: newDenormalized,
        ip_address: this.getIpAddress(req),
      });
    } catch (error: any) {
      logger.error(`Error building audit payload for REJECT: ${error.message}`);
      await this.log({
        entity_type: entityType,
        entity_id: this.buildEntityId(entity),
        action_type_code: 'REJECT',
        action_by: user.id,
        action_from: user.department || this.defaultActionFrom,
        previous_data: previousData,
        new_data: newData || { status: 'REJECTED', reason },
        ip_address: this.getIpAddress(req),
      });
    }
  }

  /**
   * Log EXPORT action with human-readable metadata
   */
  static async logExport(
    entityType: string,
    exportType: string,
    user: AuditUser,
    metadata?: object,
    req?: Request
  ): Promise<void> {
    const newData: DenormalizedAuditData = {
      summary: `Exported ${entityType.replace(/_/g, ' ')} data`,
      fields: [
        { label: 'Export Type', value: exportType, type: 'text' },
        { label: 'Exported At', value: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), type: 'datetime' },
        ...(metadata ? Object.entries(metadata).map(([key, value]) => ({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          type: 'text' as const,
        })) : []),
      ],
    };

    await this.sendEnhancedAuditLog({
      entity_type: entityType,
      entity_id: `${entityType}_export_${Date.now()}`,
      action_type_code: 'EXPORT',
      action_by: user.id,
      action_by_name: user.name,
      action_from: user.department || this.defaultActionFrom,
      new_data: newData,
      ip_address: this.getIpAddress(req),
    });
  }

  /**
   * Log IMPORT action with human-readable metadata
   */
  static async logImport(
    entityType: string,
    importType: string,
    user: AuditUser,
    metadata?: object,
    req?: Request
  ): Promise<void> {
    const newData: DenormalizedAuditData = {
      summary: `Imported ${entityType.replace(/_/g, ' ')} data`,
      fields: [
        { label: 'Import Type', value: importType, type: 'text' },
        { label: 'Imported At', value: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), type: 'datetime' },
        ...(metadata ? Object.entries(metadata).map(([key, value]) => ({
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          type: 'text' as const,
        })) : []),
      ],
    };

    await this.sendEnhancedAuditLog({
      entity_type: entityType,
      entity_id: `${entityType}_import_${Date.now()}`,
      action_type_code: 'IMPORT',
      action_by: user.id,
      action_by_name: user.name,
      action_from: user.department || this.defaultActionFrom,
      new_data: newData,
      ip_address: this.getIpAddress(req),
    });
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS (for backward compatibility)
  // These methods map the old API signature to the new one
  // ============================================================================

  /**
   * @deprecated Use logApprove or logReject instead
   * Legacy method for approval/rejection logging
   */
  static async logApproval(
    moduleName: string,
    record: { id?: any; code?: string },
    action: 'APPROVE' | 'REJECT',
    user: { id: string; name?: string; role?: string },
    reason?: string,
    req?: any
  ): Promise<void> {
    const auditUser: AuditUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      department: this.defaultActionFrom,
    };

    if (action === 'APPROVE') {
      await this.logApprove(moduleName, { id: record.id, code: record.code }, auditUser, undefined, undefined, req);
    } else {
      await this.logReject(moduleName, { id: record.id, code: record.code }, auditUser, reason, undefined, undefined, req);
    }
  }

  /**
   * @deprecated Use logView for read tracking if needed
   * Legacy method - views are not currently audited by default
   */
  static async logView(
    moduleName: string,
    record: { id?: any; code?: string },
    user: { id: string; name?: string; role?: string },
    req?: any
  ): Promise<void> {
    // View logging is not part of the required audit action types
    // This method is kept for backward compatibility but does nothing
    logger.debug(`View action not logged (excluded from audit): ${moduleName}`);
  }
}

// ============================================================================
// ENTITY TYPE CONSTANTS
// ============================================================================
export const AuditEntityTypes = {
  // Financial Entities
  EXPENSE: 'expense',
  JOURNAL_ENTRY: 'journal_entry',
  BUDGET_ALLOCATION: 'budget_allocation',
  PURCHASE_REQUEST: 'purchase_request',
  CASH_ADVANCE: 'cash_advance',
  
  // Revenue Entities
  BUS_TRIP_REVENUE: 'bus_trip_revenue',
  RENTAL_REVENUE: 'rental_revenue',
  OTHER_REVENUE: 'other_revenue',
  
  // Payroll
  PAYROLL_PERIOD: 'payroll_period',
  
  // Accounts
  ACCOUNTS_PAYABLE: 'accounts_payable',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  CHART_OF_ACCOUNT: 'chart_of_account',
  ACCOUNT_TYPE: 'account_type',
  
  // Operations
  OPERATIONAL_EXPENSE: 'operational_expense',
  SUPPLIER: 'supplier',
  ATTACHMENT: 'attachment',
} as const;

export type AuditEntityType = typeof AuditEntityTypes[keyof typeof AuditEntityTypes];
