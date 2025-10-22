# 🔍 FTMS + Audit Logs Microservice Integration

**Date:** October 22, 2025  
**Purpose:** Complete integration guide for FTMS Finance Backend with Audit Logs Microservice

---

## 📋 Overview

The FTMS Finance Backend will integrate with the **Audit Logs Microservice** to track all critical financial operations for compliance, accountability, and traceability.

---

## 🌐 Configuration

### Environment Variables

Add to your `.env` file:

```env
# Audit Logs Integration
AUDIT_LOGS_API_URL=http://localhost:4004
AUDIT_LOGS_API_KEY=FINANCE_DEFAULT_KEY

# Optional: Direct UI link
AUDIT_LOGS_UI_URL=http://localhost:4003/audit
```

### Network Configuration

Update CORS to allow Audit Logs communication:

```env
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:4003,http://localhost:4004
```

---

## 🔑 Authentication

### Creating Audit Logs
- **Method:** API Key authentication
- **Header:** `x-api-key: FINANCE_DEFAULT_KEY`
- **Department:** Finance

### Viewing Audit Logs
- **Method:** JWT token (same as FTMS auth)
- **Header:** `Authorization: Bearer <token>`
- **JWT Secret:** `8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i` (shared with HR Auth)

---

## 📤 Audit Logging Implementation

### Step 1: Create Audit Logger Utility

**src/integrations/audit/audit.client.ts**

```typescript
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

      logger.debug(`Audit log created: ${payload.moduleName} - ${payload.action}`);
    } catch (error) {
      // Don't break main flow if audit logging fails
      logger.error('Failed to create audit log:', error);
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
```

### Step 2: Update Configuration

**src/config/env.ts**

```typescript
interface Config {
  // ... existing config ...
  
  auditLogsApiKey: string;
  
  externalApis: {
    hrAuth: string;
    hrEmployees: string;
    hrPayroll: string;
    operations: string;
    auditLogs: string; // ADD THIS
  };
}

export const config: Config = {
  // ... existing config ...
  
  auditLogsApiKey: process.env.AUDIT_LOGS_API_KEY || 'FINANCE_DEFAULT_KEY',
  
  externalApis: {
    hrAuth: process.env.HR_AUTH_API_URL!,
    hrEmployees: process.env.HR_API_EMPLOYEES_URL!,
    hrPayroll: process.env.HR_API_PAYROLL_URL!,
    operations: process.env.OP_API_BUSTRIP_URL!,
    auditLogs: process.env.AUDIT_LOGS_API_URL || 'http://localhost:4004', // ADD THIS
  },
};

// Update required env vars
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'HR_AUTH_API_URL',
  'AUDIT_LOGS_API_URL', // ADD THIS
];
```

---

## 🎯 Integration Points

### 1. Revenue Management

**src/services/revenue.service.ts**

```typescript
import { AuditLogClient } from '../integrations/audit/audit.client';

export class RevenueService {
  async createRevenue(data: any, userId: string, req?: any) {
    // 1. Create revenue
    const revenue = await prisma.revenue.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });

    // 2. Log to Audit Logs
    await AuditLogClient.logCreate(
      'Revenue Management',
      { id: revenue.id, code: revenue.code },
      revenue,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    return revenue;
  }

  async updateRevenue(id: number, updates: any, userId: string, req?: any) {
    // 1. Get old values
    const oldRevenue = await prisma.revenue.findUnique({ where: { id } });

    // 2. Update revenue
    const newRevenue = await prisma.revenue.update({
      where: { id },
      data: {
        ...updates,
        updatedBy: userId,
      },
    });

    // 3. Log to Audit Logs
    await AuditLogClient.logUpdate(
      'Revenue Management',
      { id, code: newRevenue.code },
      oldRevenue,
      newRevenue,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    return newRevenue;
  }

  async deleteRevenue(id: number, userId: string, reason: string, req?: any) {
    // 1. Get revenue data before deletion
    const revenue = await prisma.revenue.findUnique({ where: { id } });

    // 2. Soft delete
    await prisma.revenue.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date(),
      },
    });

    // 3. Log to Audit Logs
    await AuditLogClient.logDelete(
      'Revenue Management',
      { id, code: revenue.code },
      revenue,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      reason,
      req
    );
  }

  async approveRevenue(id: number, userId: string, req?: any) {
    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await AuditLogClient.logApproval(
      'Revenue Management',
      { id, code: revenue.code },
      'APPROVE',
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      undefined,
      req
    );

    return revenue;
  }
}
```

### 2. Expense Management

**src/services/expense.service.ts**

```typescript
export class ExpenseService {
  async createExpense(data: any, userId: string, req?: any) {
    const expense = await prisma.expense.create({
      data: { ...data, createdBy: userId },
    });

    await AuditLogClient.logCreate(
      'Expense Management',
      { id: expense.id, code: expense.code },
      expense,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    return expense;
  }

  // Similar pattern for update, delete, approve
}
```

### 3. Loan Management

**src/services/loan.service.ts**

```typescript
export class LoanService {
  async createLoan(data: any, userId: string, req?: any) {
    const loan = await prisma.loan.create({
      data: { ...data, createdBy: userId },
    });

    await AuditLogClient.logCreate(
      'Loan Management',
      { id: loan.id, code: loan.loanCode },
      loan,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    return loan;
  }

  async approveLoan(id: number, userId: string, req?: any) {
    const loan = await prisma.loan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await AuditLogClient.logApproval(
      'Loan Management',
      { id, code: loan.loanCode },
      'APPROVE',
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      undefined,
      req
    );

    return loan;
  }
}
```

### 4. Budget Management

**src/services/budget.service.ts**

```typescript
export class BudgetService {
  async createBudget(data: any, userId: string, req?: any) {
    const budget = await prisma.budgetAllocation.create({
      data: { ...data, createdBy: userId },
    });

    await AuditLogClient.logCreate(
      'Budget Management',
      { id: budget.id },
      budget,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    return budget;
  }
}
```

### 5. Sensitive Data Access (Reports/Exports)

**src/services/report.service.ts**

```typescript
export class ReportService {
  async generateFinancialReport(params: any, userId: string, req?: any) {
    // Log sensitive data access
    await AuditLogClient.logView(
      'Financial Reports',
      { id: 'financial-report' },
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      req
    );

    // Generate report
    const report = await this.buildReport(params);
    return report;
  }

  async exportData(exportType: string, userId: string, req?: any) {
    // Log data export
    await AuditLogClient.logExport(
      'Data Export',
      exportType,
      { id: userId, name: req?.user?.name, role: req?.user?.role },
      { format: 'xlsx', dateRange: '2025-01-01 to 2025-12-31' },
      req
    );

    // Perform export
    const data = await this.fetchDataForExport(exportType);
    return data;
  }
}
```

---

## 🔄 Middleware Integration

### Audit Logging Middleware

**src/middleware/auditLogger.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditLogClient } from '../integrations/audit/audit.client';

/**
 * Middleware to automatically log all state-changing operations
 */
export const auditLogMiddleware = (moduleName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only log state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to capture response
      res.json = function (data: any) {
        // Log after successful response (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const action = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
          }[req.method] || req.method;

          AuditLogClient.log({
            moduleName,
            action,
            performedBy: req.user?.id || 'unknown',
            performedByName: req.user?.name,
            performedByRole: req.user?.role,
            recordId: data.id?.toString(),
            recordCode: data.code,
            newValues: data,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          }).catch((err) => {
            console.error('Audit log failed:', err);
          });
        }

        return originalJson(data);
      };
    }

    next();
  };
};
```

### Usage in Routes

**src/routes/admin/revenue.routes.ts**

```typescript
import { auditLogMiddleware } from '../../middleware/auditLogger';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'finance_admin'));

// Apply audit logging middleware
router.use(auditLogMiddleware('Revenue Management'));

// All routes automatically logged
router.get('/', revenueController.listRevenues);
router.post('/', revenueController.createRevenue);
router.put('/:id', revenueController.updateRevenue);
router.delete('/:id', revenueController.deleteRevenue);

export default router;
```

---

## 📊 Audit Log Coverage

### Critical Operations to Log

| Module | Actions | Priority |
|--------|---------|----------|
| **Revenue Management** | CREATE, UPDATE, DELETE, APPROVE, REJECT | ⭐⭐⭐⭐⭐ |
| **Expense Management** | CREATE, UPDATE, DELETE, APPROVE, REJECT | ⭐⭐⭐⭐⭐ |
| **Loan Management** | CREATE, UPDATE, DELETE, APPROVE, REJECT, PAYMENT | ⭐⭐⭐⭐⭐ |
| **Budget Management** | CREATE, UPDATE, DELETE, APPROVE, TRANSFER | ⭐⭐⭐⭐ |
| **Payroll Processing** | CREATE, UPDATE, DELETE, APPROVE, PROCESS | ⭐⭐⭐⭐⭐ |
| **Purchase Orders** | CREATE, UPDATE, DELETE, APPROVE, REJECT | ⭐⭐⭐⭐ |
| **Journal Entries** | CREATE, UPDATE, DELETE, VERIFY | ⭐⭐⭐⭐ |
| **Asset Management** | CREATE, UPDATE, DELETE, DISPOSE | ⭐⭐⭐ |
| **Financial Reports** | VIEW, EXPORT | ⭐⭐⭐⭐ |
| **User Management** | VIEW (sensitive data) | ⭐⭐⭐ |

---

## 🧪 Testing Audit Integration

### Test 1: Create Revenue with Audit Log

```bash
# 1. Create revenue
curl -X POST http://localhost:3000/api/v1/admin/revenues \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "revenueType": "TRIP",
    "amount": 5000,
    "dateRecorded": "2025-10-22",
    "sourceRefNo": "TRIP-001"
  }'

# 2. Verify audit log created
curl http://localhost:4004/api/audit-logs?service=finance&action=CREATE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 2: Update Expense with Audit Log

```bash
# 1. Update expense
curl -X PUT http://localhost:3000/api/v1/expenses/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 6000,
    "category": "operational"
  }'

# 2. Verify audit log shows old/new values
curl http://localhost:4004/api/audit-logs?recordId=123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚠️ Error Handling

### Graceful Degradation

```typescript
// Audit logging should NEVER break main flow
try {
  await AuditLogClient.log({...});
} catch (error) {
  // Log error but don't throw
  logger.error('Audit logging failed:', error);
  // Continue with main operation
}
```

### Retry Logic

```typescript
export class AuditLogClient {
  static async logWithRetry(payload: AuditLogPayload, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.log(payload);
        return;
      } catch (error) {
        if (i === retries - 1) {
          logger.error('Audit log failed after retries:', error);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}
```

---

## 📝 Implementation Checklist

### Phase 1: Setup
- [x] Add Audit Logs env variables
- [x] Create AuditLogClient utility
- [x] Update CORS configuration
- [x] Test connectivity to Audit Logs API

### Phase 2: Core Integration
- [x] Integrate Revenue Management
- [x] Integrate Expense Management
- [x] Integrate Loan Management
- [x] Integrate Budget Management
- [x] Integrate Payroll Processing

### Phase 3: Advanced
- [x] Add audit logging middleware
- [x] Log sensitive data access (reports)
- [x] Log data exports
- [x] Add retry logic
- [x] Monitor audit log failures

### Phase 4: Testing
- [x] Test CREATE operations
- [x] Test UPDATE operations with change tracking
- [x] Test DELETE operations
- [x] Test APPROVE/REJECT operations
- [x] Verify logs appear in Audit Logs UI

---

**Integration Complete!** All critical financial operations will now be audited and traceable through the Audit Logs Microservice. 🎉
