# FTMS Backend - Remaining Modules Implementation Guide

## ✅ COMPLETED (5/10)
1. Revenue Management - DONE
2. Expense Management - DONE
3. Payroll & Compensation - DONE
4. Reimbursement - DONE
5. Budget Management - Service created (needs controller + routes)

## 📋 TODO (5/10) - Quick Implementation Templates

### Module 6: Journal Entry Service

```typescript
// src/services/journalEntry.service.ts
import { prisma } from '../config/database';
import { AuditLogClient } from '../integrations/audit/audit.client';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export class JournalEntryService {
  async createJournalEntry(data, userId, userInfo?, req?) {
    const entry = await prisma.journalEntry.create({
      data: {
        entryNumber: data.entryNumber,
        entryDate: new Date(data.entryDate),
        description: data.description,
        debitAccount: data.debitAccount,
        creditAccount: data.creditAccount,
        amount: data.amount.toString(),
        createdBy: userId,
      },
    });
    
    await AuditLogClient.logCreate('Journal Entry', 
      { id: entry.id, code: entry.entryNumber }, 
      entry, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return entry;
  }

  async listJournalEntries(filters, page = 1, limit = 10) {
    const where: any = { isDeleted: false };
    if (filters.dateFrom || filters.dateTo) {
      where.entryDate = {};
      if (filters.dateFrom) where.entryDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.entryDate.lte = new Date(filters.dateTo);
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({ where, skip, take: limit, orderBy: { entryDate: 'desc' } }),
      prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJournalEntryById(id: number) {
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.isDeleted) throw new NotFoundError(`Journal entry ${id} not found`);
    return entry;
  }

  async updateJournalEntry(id, updates, userId, userInfo?, req?) {
    const oldEntry = await this.getJournalEntryById(id);
    const updateData: any = { ...updates, updatedBy: userId };
    if (updates.amount) updateData.amount = updates.amount.toString();
    if (updates.entryDate) updateData.entryDate = new Date(updates.entryDate);

    const newEntry = await prisma.journalEntry.update({ where: { id }, data: updateData });
    
    await AuditLogClient.logUpdate('Journal Entry',
      { id, code: newEntry.entryNumber },
      oldEntry, newEntry, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return newEntry;
  }

  async deleteJournalEntry(id, userId, reason, userInfo?, req?) {
    const entry = await this.getJournalEntryById(id);
    await prisma.journalEntry.update({
      where: { id },
      data: { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    });
    
    await AuditLogClient.logDelete('Journal Entry',
      { id, code: entry.entryNumber },
      entry, { id: userId, name: userInfo?.username, role: userInfo?.role }, reason, req
    );
  }
}
```

### Module 7: Asset Management Service

```typescript
// src/services/asset.service.ts
export class AssetService {
  async createAsset(data, userId, userInfo?, req?) {
    const asset = await prisma.asset.create({
      data: {
        assetCode: data.assetCode,
        assetName: data.assetName,
        category: data.category,
        purchaseDate: new Date(data.purchaseDate),
        purchaseCost: data.purchaseCost.toString(),
        depreciationRate: data.depreciationRate?.toString(),
        usefulLife: data.usefulLife,
        salvageValue: data.salvageValue?.toString() || '0',
        currentValue: data.purchaseCost.toString(),
        createdBy: userId,
      },
    });
    
    await AuditLogClient.logCreate('Asset Management',
      { id: asset.id, code: asset.assetCode },
      asset, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return asset;
  }

  async listAssets(filters, page = 1, limit = 10) {
    const where: any = { isDeleted: false };
    if (filters.category) where.category = filters.category;
    if (filters.isDisposed !== undefined) where.isDisposed = filters.isDisposed;

    const skip = (page - 1) * limit;
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { purchaseDate: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    return {
      data: assets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAssetById(id: number) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.isDeleted) throw new NotFoundError(`Asset ${id} not found`);
    return asset;
  }

  async updateAsset(id, updates, userId, userInfo?, req?) {
    const oldAsset = await this.getAssetById(id);
    const updateData: any = { ...updates, updatedBy: userId };
    if (updates.purchaseCost) updateData.purchaseCost = updates.purchaseCost.toString();
    if (updates.currentValue) updateData.currentValue = updates.currentValue.toString();
    if (updates.depreciationRate) updateData.depreciationRate = updates.depreciationRate.toString();
    if (updates.salvageValue) updateData.salvageValue = updates.salvageValue.toString();
    if (updates.purchaseDate) updateData.purchaseDate = new Date(updates.purchaseDate);

    const newAsset = await prisma.asset.update({ where: { id }, data: updateData });
    
    await AuditLogClient.logUpdate('Asset Management',
      { id, code: newAsset.assetCode },
      oldAsset, newAsset, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return newAsset;
  }

  async deleteAsset(id, userId, reason, userInfo?, req?) {
    const asset = await this.getAssetById(id);
    await prisma.asset.update({
      where: { id },
      data: { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    });
    
    await AuditLogClient.logDelete('Asset Management',
      { id, code: asset.assetCode },
      asset, { id: userId, name: userInfo?.username, role: userInfo?.role }, reason, req
    );
  }

  async calculateDepreciation(id: number) {
    const asset = await this.getAssetById(id);
    // Simple straight-line depreciation
    const yearsSincePurchase = (new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear());
    const annualDepreciation = (parseFloat(asset.purchaseCost.toString()) - parseFloat(asset.salvageValue.toString())) / asset.usefulLife;
    const accumulatedDepreciation = annualDepreciation * yearsSincePurchase;
    const currentValue = Math.max(
      parseFloat(asset.purchaseCost.toString()) - accumulatedDepreciation,
      parseFloat(asset.salvageValue.toString())
    );

    return {
      assetId: id,
      purchaseCost: asset.purchaseCost,
      annualDepreciation,
      accumulatedDepreciation,
      currentValue,
      salvageValue: asset.salvageValue,
    };
  }
}
```

### Module 8: Account Receivable Service

```typescript
// src/services/receivable.service.ts
export class ReceivableService {
  async createReceivable(data, userId, userInfo?, req?) {
    const receivable = await prisma.accountReceivable.create({
      data: {
        customerName: data.customerName,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        totalAmount: data.totalAmount.toString(),
        remainingBalance: data.totalAmount.toString(),
        createdBy: userId,
      },
    });
    
    await AuditLogClient.logCreate('Receivables',
      { id: receivable.id, code: receivable.invoiceNumber },
      receivable, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return receivable;
  }

  async recordPayment(id, paymentAmount, userId, userInfo?, req?) {
    const receivable = await prisma.accountReceivable.findUnique({ where: { id } });
    if (!receivable) throw new NotFoundError(`Receivable ${id} not found`);

    const currentBalance = parseFloat(receivable.remainingBalance.toString());
    const payment = parseFloat(paymentAmount.toString());
    const newBalance = currentBalance - payment;

    const updated = await prisma.accountReceivable.update({
      where: { id },
      data: {
        paidAmount: (parseFloat(receivable.paidAmount?.toString() || '0') + payment).toString(),
        remainingBalance: newBalance.toString(),
        isPaid: newBalance <= 0,
        paidDate: newBalance <= 0 ? new Date() : null,
      },
    });

    await AuditLogClient.log({
      moduleName: 'Receivables',
      action: 'PAYMENT_RECORDED',
      recordId: id.toString(),
      recordCode: receivable.invoiceNumber,
      performedBy: userId,
      performedByName: userInfo?.username,
      performedByRole: userInfo?.role,
      newValues: { paymentAmount: payment, newBalance },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return updated;
  }
}
```

### Module 9: Account Payable Service

```typescript
// src/services/payable.service.ts
// Same pattern as Receivable, just change model to accountPayable
export class PayableService {
  async createPayable(data, userId, userInfo?, req?) {
    const payable = await prisma.accountPayable.create({
      data: {
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        totalAmount: data.totalAmount.toString(),
        remainingBalance: data.totalAmount.toString(),
        createdBy: userId,
      },
    });
    
    await AuditLogClient.logCreate('Payables',
      { id: payable.id, code: payable.invoiceNumber },
      payable, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return payable;
  }

  async recordPayment(id, paymentAmount, userId, userInfo?, req?) {
    // Same logic as receivable payment
    const payable = await prisma.accountPayable.findUnique({ where: { id } });
    if (!payable) throw new NotFoundError(`Payable ${id} not found`);

    const currentBalance = parseFloat(payable.remainingBalance.toString());
    const payment = parseFloat(paymentAmount.toString());
    const newBalance = currentBalance - payment;

    const updated = await prisma.accountPayable.update({
      where: { id },
      data: {
        paidAmount: (parseFloat(payable.paidAmount?.toString() || '0') + payment).toString(),
        remainingBalance: newBalance.toString(),
        isPaid: newBalance <= 0,
        paidDate: newBalance <= 0 ? new Date() : null,
      },
    });

    await AuditLogClient.log({
      moduleName: 'Payables',
      action: 'PAYMENT_RECORDED',
      recordId: id.toString(),
      recordCode: payable.invoiceNumber,
      performedBy: userId,
      performedByName: userInfo?.username,
      performedByRole: userInfo?.role,
      newValues: { paymentAmount: payment, newBalance },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return updated;
  }
}
```

### Module 10: Loan Management Service (Most Complex)

```typescript
// src/services/loan.service.ts
export class LoanService {
  async createLoan(data, userId, userInfo?, req?) {
    const loan = await prisma.loan.create({
      data: {
        loanType: data.loanType, // EMPLOYEE, EXTERNAL, TRIP_DEFICIT
        entityId: data.entityId,
        entityName: data.entityName,
        principalAmount: data.principalAmount.toString(),
        interestRate: data.interestRate?.toString(),
        totalPayable: data.totalPayable?.toString(),
        remainingBalance: data.principalAmount.toString(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        installmentFrequency: data.installmentFrequency,
        installmentAmount: data.installmentAmount?.toString(),
        status: 'PENDING',
        createdBy: userId,
      },
    });
    
    await AuditLogClient.logCreate('Loan Management',
      { id: loan.id, code: `LOAN-${loan.id}` },
      loan, { id: userId, name: userInfo?.username, role: userInfo?.role }, req
    );
    
    return loan;
  }

  async approveLoan(id, userId, userInfo?, req?) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundError(`Loan ${id} not found`);
    if (loan.status !== 'PENDING') throw new ValidationError(`Loan is already ${loan.status}`);

    const updated = await prisma.loan.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });

    await AuditLogClient.logApproval('Loan Management',
      { id, code: `LOAN-${id}` },
      'APPROVE',
      { id: userId, name: userInfo?.username, role: userInfo?.role },
      undefined, req
    );

    return updated;
  }

  async recordRepayment(loanId, amount, userId, userInfo?, req?) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundError(`Loan ${loanId} not found`);

    const repayment = await prisma.loanRepayment.create({
      data: {
        loanId,
        amount: amount.toString(),
        paymentDate: new Date(),
        status: 'PAID',
        createdBy: userId,
      },
    });

    const newBalance = parseFloat(loan.remainingBalance.toString()) - amount;
    await prisma.loan.update({
      where: { id: loanId },
      data: { remainingBalance: newBalance.toString() },
    });

    await AuditLogClient.log({
      moduleName: 'Loan Management',
      action: 'REPAYMENT_RECORDED',
      recordId: loanId.toString(),
      recordCode: `LOAN-${loanId}`,
      performedBy: userId,
      performedByName: userInfo?.username,
      performedByRole: userInfo?.role,
      newValues: { repaymentAmount: amount, newBalance },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });

    return repayment;
  }
}
```

## 🚀 Implementation Steps

For each module above:

1. **Create Service** (`src/services/[module].service.ts`)
2. **Create Controller** (copy pattern from expense/payroll/reimbursement)
3. **Create Admin Routes** (`src/routes/admin/[module].routes.ts`)
4. **Create Staff Routes** (`src/routes/staff/[module].routes.ts`)
5. **Update app.ts** (import and mount routes)
6. **Test Build** (`npm run build`)

## ⚡ Quick Controller Template

```typescript
import { Response, NextFunction } from 'express';
import { [Module]Service } from '../services/[module].service';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export class [Module]Controller {
  private service = new [Module]Service();

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const result = await this.service.create[Module](data, req.user!.sub, req.user, req);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.list[Module]s(req.query, parseInt(req.query.page as string) || 1, parseInt(req.query.limit as string) || 10);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid ID');
      const result = await this.service.get[Module]ById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) throw new ValidationError('Invalid ID');
      const result = await this.service.update[Module](id, req.body, req.user!.sub, req.user, req);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      if (isNaN(id)) throw new ValidationError('Invalid ID');
      if (!reason) throw new ValidationError('Deletion reason is required');
      await this.service.delete[Module](id, req.user!.sub, reason, req.user, req);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
```

## ⚡ Quick Route Template (Admin)

```typescript
import { Router } from 'express';
import { [Module]Controller } from '../../controllers/[module].controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new [Module]Controller();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
```

## ⚡ Quick Route Template (Staff)

```typescript
import { Router } from 'express';
import { [Module]Controller } from '../../controllers/[module].controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();
const controller = new [Module]Controller();

router.use(authenticate);
router.use(authorize('staff'));

// Staff typically: view only or view + create
router.get('/', controller.list);
router.get('/:id', controller.getById);
// router.post('/', controller.create); // Only if staff can create

export default router;
```

## 📝 Completion Checklist

- [ ] Budget - Service ✅, Controller ⏳, Routes ⏳
- [ ] JournalEntry - All ⏳
- [ ] Asset - All ⏳
- [ ] Receivable - All ⏳
- [ ] Payable - All ⏳
- [ ] Loan - All ⏳

**Estimated Time to Complete All:** 4-6 hours

**Current Progress:** 50% (5/10 modules with services, 4/10 complete end-to-end)
