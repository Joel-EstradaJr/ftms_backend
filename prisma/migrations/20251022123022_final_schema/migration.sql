-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'POSTED', 'REJECTED', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'PENDING_ADJUSTED', 'RECEIVED', 'PARTIALLY_COMPLETED', 'TO_BE_REFUNDED', 'TO_BE_REPLACED', 'CLOSED', 'CLOSED_FAILED');

-- CreateEnum
CREATE TYPE "RefundReplacementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESS_REFUND', 'PROCESS_REPLACEMENT', 'CLOSED', 'CLOSED_FAILED');

-- CreateEnum
CREATE TYPE "ItemApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('REGULAR', 'PROJECT_BASED', 'BUDGET_SHORTAGE', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('EMPLOYEE', 'EXTERNAL', 'TRIP_DEFICIT');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('TRIP', 'RENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InstallmentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "Revenue" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "revenueType" "RevenueType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dateRecorded" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "sourceRefNo" TEXT,
    "department" TEXT,
    "rentalDownpayment" DECIMAL(12,2),
    "rentalBalance" DECIMAL(12,2),
    "downpaymentReceivedAt" TIMESTAMP(3),
    "balanceReceivedAt" TIMESTAMP(3),
    "isDownpaymentRefundable" BOOLEAN NOT NULL DEFAULT false,
    "otherRevenueCategory" TEXT,
    "receiptUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dateRecorded" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "linkedPurchaseId" INTEGER,
    "department" TEXT,
    "receiptUrl" TEXT,
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2),
    "deductions" DECIMAL(12,2),
    "netPay" DECIMAL(12,2) NOT NULL,
    "disbursementDate" TIMESTAMP(3),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isDisbursed" BOOLEAN NOT NULL DEFAULT false,
    "disbursedBy" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "receiptUrl" TEXT,
    "disbursementDate" TIMESTAMP(3),
    "isDisbursed" BOOLEAN NOT NULL DEFAULT false,
    "disbursedBy" TEXT,
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "entityName" TEXT,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2),
    "totalPayable" DECIMAL(12,2),
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "installmentFrequency" "InstallmentFrequency",
    "installmentAmount" DECIMAL(12,2),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "tripDeficitRefNo" TEXT,
    "driverShare" DECIMAL(12,2),
    "conductorShare" DECIMAL(12,2),
    "driverId" INTEGER,
    "conductorId" INTEGER,
    "isConvertedToEmployeeLoan" BOOLEAN NOT NULL DEFAULT false,
    "convertedLoanId" INTEGER,
    "convertedAt" TIMESTAMP(3),
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "status" "RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" SERIAL NOT NULL,
    "refNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "requestType" "RequestType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "justification" TEXT,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByInventory" BOOLEAN NOT NULL DEFAULT true,
    "inventoryMetadata" TEXT,
    "requiresBudgetApproval" BOOLEAN NOT NULL DEFAULT false,
    "linkedBudgetRequestId" INTEGER,
    "budgetRequestCode" TEXT,
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" SERIAL NOT NULL,
    "purchaseRequestId" INTEGER NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitMeasure" TEXT NOT NULL,
    "estimatedUnitCost" DECIMAL(12,2) NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "supplierItemCode" TEXT,
    "itemStatus" "ItemApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedQuantity" INTEGER,
    "approvedUnitCost" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "rejectionReason" TEXT,
    "modificationNotes" TEXT,
    "attachmentUrls" TEXT,
    "externalItemId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "refNo" TEXT NOT NULL,
    "purchaseRequestId" INTEGER NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierContact" TEXT,
    "supplierEmail" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "invoiceUrl" TEXT,
    "deliveryReceiptUrl" TEXT,
    "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentSummary" TEXT,
    "totalItemsOrdered" INTEGER NOT NULL DEFAULT 0,
    "totalItemsReceived" INTEGER NOT NULL DEFAULT 0,
    "totalItemsDamaged" INTEGER NOT NULL DEFAULT 0,
    "totalItemsMissing" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "purchaseRequestItemId" INTEGER NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "orderedQuantity" INTEGER NOT NULL,
    "unitMeasure" TEXT NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "receivedQuantity" INTEGER DEFAULT 0,
    "damagedQuantity" INTEGER DEFAULT 0,
    "missingQuantity" INTEGER DEFAULT 0,
    "acceptedQuantity" INTEGER DEFAULT 0,
    "itemStatus" TEXT NOT NULL DEFAULT 'pending',
    "issueDescription" TEXT,
    "qualityCheckPassed" BOOLEAN,
    "qualityCheckNotes" TEXT,
    "qualityCheckedBy" TEXT,
    "qualityCheckedAt" TIMESTAMP(3),
    "needsRefund" BOOLEAN NOT NULL DEFAULT false,
    "needsReplacement" BOOLEAN NOT NULL DEFAULT false,
    "refundAmount" DECIMAL(12,2),
    "externalItemId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundReplacement" (
    "id" SERIAL NOT NULL,
    "refNo" TEXT NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "status" "RefundReplacementStatus" NOT NULL DEFAULT 'PENDING',
    "issueType" TEXT NOT NULL,
    "totalAffectedItems" INTEGER NOT NULL DEFAULT 0,
    "totalRefundAmount" DECIMAL(12,2),
    "totalReplacementCost" DECIMAL(12,2),
    "resolutionType" TEXT,
    "replacementAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxReplacementAttempts" INTEGER NOT NULL DEFAULT 3,
    "supplierNotifiedAt" TIMESTAMP(3),
    "supplierResponseAt" TIMESTAMP(3),
    "supplierResolution" TEXT,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionDate" TIMESTAMP(3),
    "resolutionDeadline" TIMESTAMP(3),
    "remarks" TEXT,
    "externalRefNo" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefundReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundReplacementItem" (
    "id" SERIAL NOT NULL,
    "refundReplacementId" INTEGER NOT NULL,
    "purchaseOrderItemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "affectedQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "issueType" TEXT NOT NULL,
    "issueDescription" TEXT,
    "photosUrls" TEXT,
    "itemResolution" TEXT,
    "refundAmount" DECIMAL(12,2),
    "replacementQuantity" INTEGER,
    "replacementReceived" BOOLEAN NOT NULL DEFAULT false,
    "replacementReceivedDate" TIMESTAMP(3),
    "itemStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefundReplacementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountReceivable" (
    "id" SERIAL NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityType" TEXT,
    "description" TEXT,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) DEFAULT 0,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" "InstallmentFrequency",
    "interestRate" DECIMAL(5,2),
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "collectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastReminderSent" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountPayable" (
    "id" SERIAL NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityType" TEXT,
    "description" TEXT,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) DEFAULT 0,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" "InstallmentFrequency",
    "interestRate" DECIMAL(5,2),
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "nextPaymentDue" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccountPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "department" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalPeriod" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(12,2) NOT NULL,
    "usedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reservedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debitAmount" DECIMAL(12,2) NOT NULL,
    "creditAmount" DECIMAL(12,2) NOT NULL,
    "linkedEntityType" TEXT,
    "linkedEntityId" INTEGER,
    "accountCode" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "acquisitionCost" DECIMAL(12,2) NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "currentValue" DECIMAL(12,2),
    "depreciationRate" DECIMAL(5,2),
    "accumulatedDepreciation" DECIMAL(12,2) DEFAULT 0,
    "salvageValue" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "disposalDate" TIMESTAMP(3),
    "disposalAmount" DECIMAL(12,2),
    "location" TEXT,
    "serialNumber" TEXT,
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedEmployee" (
    "id" SERIAL NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "departmentId" INTEGER,
    "department" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'HR',
    "sourceEndpoint" TEXT NOT NULL DEFAULT '/api/clean/hr_employees',
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CachedEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedPayrollData" (
    "id" SERIAL NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "suffix" TEXT,
    "employeeStatus" TEXT NOT NULL,
    "hiredate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "basicRate" DECIMAL(12,2) NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "attendances" TEXT,
    "benefits" TEXT,
    "deductions" TEXT,
    "totalMonthlyBenefits" DECIMAL(12,2),
    "totalMonthlyDeductions" DECIMAL(12,2),
    "netMonthlyRate" DECIMAL(12,2),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'HR',
    "sourceEndpoint" TEXT NOT NULL DEFAULT '/api/clean/hr_payroll',
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CachedPayrollData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedTrip" (
    "id" SERIAL NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "busTripId" TEXT NOT NULL,
    "busRoute" TEXT NOT NULL,
    "isRevenueRecorded" BOOLEAN NOT NULL DEFAULT false,
    "isExpenseRecorded" BOOLEAN NOT NULL DEFAULT false,
    "dateAssigned" TIMESTAMP(3) NOT NULL,
    "tripFuelExpense" DECIMAL(12,2),
    "tripRevenue" DECIMAL(12,2),
    "assignmentType" TEXT NOT NULL,
    "assignmentValue" DECIMAL(5,4),
    "paymentMethod" TEXT,
    "driverName" TEXT,
    "conductorName" TEXT,
    "busPlateNumber" TEXT,
    "busType" TEXT,
    "bodyNumber" TEXT,
    "companyIncome" DECIMAL(12,2),
    "driverShare" DECIMAL(12,2),
    "conductorShare" DECIMAL(12,2),
    "tripDeficit" DECIMAL(12,2),
    "linkedRevenueId" INTEGER,
    "linkedExpenseId" INTEGER,
    "linkedLoanId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'Operations',
    "sourceEndpoint" TEXT NOT NULL DEFAULT '/api/clean/op_bus-trip-details',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "syncErrorMessage" TEXT,

    CONSTRAINT "CachedTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedInventoryItem" (
    "id" SERIAL NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "supplierId" INTEGER,
    "supplierName" TEXT,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "stockOnHand" INTEGER NOT NULL,
    "reorderLevel" INTEGER,
    "unitMeasure" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL DEFAULT 'Inventory',
    "sourceEndpoint" TEXT,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CachedInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSyncLog" (
    "id" SERIAL NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceEndpoint" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "triggeredBy" TEXT,

    CONSTRAINT "ExternalSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_code_key" ON "Revenue"("code");

-- CreateIndex
CREATE INDEX "Revenue_revenueType_dateRecorded_idx" ON "Revenue"("revenueType", "dateRecorded");

-- CreateIndex
CREATE INDEX "Revenue_isDeleted_idx" ON "Revenue"("isDeleted");

-- CreateIndex
CREATE INDEX "Revenue_sourceRefNo_idx" ON "Revenue"("sourceRefNo");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_code_key" ON "Expense"("code");

-- CreateIndex
CREATE INDEX "Expense_category_dateRecorded_idx" ON "Expense"("category", "dateRecorded");

-- CreateIndex
CREATE INDEX "Expense_subcategory_idx" ON "Expense"("subcategory");

-- CreateIndex
CREATE INDEX "Expense_isDeleted_idx" ON "Expense"("isDeleted");

-- CreateIndex
CREATE INDEX "Expense_linkedPurchaseId_idx" ON "Expense"("linkedPurchaseId");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_periodStart_idx" ON "Payroll"("employeeId", "periodStart");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "Payroll_isDeleted_idx" ON "Payroll"("isDeleted");

-- CreateIndex
CREATE INDEX "Reimbursement_employeeId_status_idx" ON "Reimbursement"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Reimbursement_isDeleted_idx" ON "Reimbursement"("isDeleted");

-- CreateIndex
CREATE INDEX "Loan_loanType_entityId_idx" ON "Loan"("loanType", "entityId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_isDeleted_idx" ON "Loan"("isDeleted");

-- CreateIndex
CREATE INDEX "Loan_tripDeficitRefNo_idx" ON "Loan"("tripDeficitRefNo");

-- CreateIndex
CREATE INDEX "LoanRepayment_loanId_idx" ON "LoanRepayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanRepayment_status_dueDate_idx" ON "LoanRepayment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "LoanRepayment_isDeleted_idx" ON "LoanRepayment"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_refNo_key" ON "PurchaseRequest"("refNo");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_department_idx" ON "PurchaseRequest"("status", "department");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requestType_priority_idx" ON "PurchaseRequest"("requestType", "priority");

-- CreateIndex
CREATE INDEX "PurchaseRequest_isDeleted_idx" ON "PurchaseRequest"("isDeleted");

-- CreateIndex
CREATE INDEX "PurchaseRequest_externalRefNo_idx" ON "PurchaseRequest"("externalRefNo");

-- CreateIndex
CREATE INDEX "PurchaseRequest_linkedBudgetRequestId_idx" ON "PurchaseRequest"("linkedBudgetRequestId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdAt_idx" ON "PurchaseRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_purchaseRequestId_idx" ON "PurchaseRequestItem"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_itemStatus_idx" ON "PurchaseRequestItem"("itemStatus");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_supplierId_idx" ON "PurchaseRequestItem"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_isDeleted_idx" ON "PurchaseRequestItem"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_refNo_key" ON "PurchaseOrder"("refNo");

-- CreateIndex
CREATE INDEX "PurchaseOrder_purchaseRequestId_idx" ON "PurchaseOrder"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_isDeleted_idx" ON "PurchaseOrder"("isDeleted");

-- CreateIndex
CREATE INDEX "PurchaseOrder_actualDeliveryDate_idx" ON "PurchaseOrder"("actualDeliveryDate");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseRequestItemId_idx" ON "PurchaseOrderItem"("purchaseRequestItemId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_itemStatus_idx" ON "PurchaseOrderItem"("itemStatus");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_needsRefund_needsReplacement_idx" ON "PurchaseOrderItem"("needsRefund", "needsReplacement");

-- CreateIndex
CREATE UNIQUE INDEX "RefundReplacement_refNo_key" ON "RefundReplacement"("refNo");

-- CreateIndex
CREATE UNIQUE INDEX "RefundReplacement_purchaseOrderId_key" ON "RefundReplacement"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "RefundReplacement_status_idx" ON "RefundReplacement"("status");

-- CreateIndex
CREATE INDEX "RefundReplacement_issueType_idx" ON "RefundReplacement"("issueType");

-- CreateIndex
CREATE INDEX "RefundReplacement_isDeleted_idx" ON "RefundReplacement"("isDeleted");

-- CreateIndex
CREATE INDEX "RefundReplacement_resolutionDeadline_idx" ON "RefundReplacement"("resolutionDeadline");

-- CreateIndex
CREATE INDEX "RefundReplacement_createdAt_idx" ON "RefundReplacement"("createdAt");

-- CreateIndex
CREATE INDEX "RefundReplacementItem_refundReplacementId_idx" ON "RefundReplacementItem"("refundReplacementId");

-- CreateIndex
CREATE INDEX "RefundReplacementItem_purchaseOrderItemId_idx" ON "RefundReplacementItem"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "RefundReplacementItem_itemStatus_idx" ON "RefundReplacementItem"("itemStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AccountReceivable_referenceCode_key" ON "AccountReceivable"("referenceCode");

-- CreateIndex
CREATE INDEX "AccountReceivable_dueDate_isSettled_idx" ON "AccountReceivable"("dueDate", "isSettled");

-- CreateIndex
CREATE INDEX "AccountReceivable_isDeleted_idx" ON "AccountReceivable"("isDeleted");

-- CreateIndex
CREATE INDEX "AccountReceivable_entityName_idx" ON "AccountReceivable"("entityName");

-- CreateIndex
CREATE UNIQUE INDEX "AccountPayable_referenceCode_key" ON "AccountPayable"("referenceCode");

-- CreateIndex
CREATE INDEX "AccountPayable_dueDate_isSettled_idx" ON "AccountPayable"("dueDate", "isSettled");

-- CreateIndex
CREATE INDEX "AccountPayable_isDeleted_idx" ON "AccountPayable"("isDeleted");

-- CreateIndex
CREATE INDEX "AccountPayable_entityName_idx" ON "AccountPayable"("entityName");

-- CreateIndex
CREATE INDEX "Budget_department_periodStart_idx" ON "Budget"("department", "periodStart");

-- CreateIndex
CREATE INDEX "Budget_status_idx" ON "Budget"("status");

-- CreateIndex
CREATE INDEX "Budget_isDeleted_idx" ON "Budget"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_department_fiscalYear_fiscalPeriod_key" ON "Budget"("department", "fiscalYear", "fiscalPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_referenceNo_key" ON "JournalEntry"("referenceNo");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_linkedEntityType_linkedEntityId_idx" ON "JournalEntry"("linkedEntityType", "linkedEntityId");

-- CreateIndex
CREATE INDEX "JournalEntry_isDeleted_idx" ON "JournalEntry"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "Asset_isDeleted_idx" ON "Asset"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "CachedEmployee_employeeNumber_key" ON "CachedEmployee"("employeeNumber");

-- CreateIndex
CREATE INDEX "CachedEmployee_employeeNumber_idx" ON "CachedEmployee"("employeeNumber");

-- CreateIndex
CREATE INDEX "CachedEmployee_department_idx" ON "CachedEmployee"("department");

-- CreateIndex
CREATE INDEX "CachedEmployee_position_idx" ON "CachedEmployee"("position");

-- CreateIndex
CREATE INDEX "CachedEmployee_lastSyncedAt_idx" ON "CachedEmployee"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CachedEmployee_isStale_idx" ON "CachedEmployee"("isStale");

-- CreateIndex
CREATE INDEX "CachedPayrollData_employeeNumber_idx" ON "CachedPayrollData"("employeeNumber");

-- CreateIndex
CREATE INDEX "CachedPayrollData_employeeStatus_idx" ON "CachedPayrollData"("employeeStatus");

-- CreateIndex
CREATE INDEX "CachedPayrollData_department_idx" ON "CachedPayrollData"("department");

-- CreateIndex
CREATE INDEX "CachedPayrollData_position_idx" ON "CachedPayrollData"("position");

-- CreateIndex
CREATE INDEX "CachedPayrollData_lastSyncedAt_idx" ON "CachedPayrollData"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CachedPayrollData_isStale_idx" ON "CachedPayrollData"("isStale");

-- CreateIndex
CREATE UNIQUE INDEX "CachedTrip_assignmentId_key" ON "CachedTrip"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedTrip_busTripId_key" ON "CachedTrip"("busTripId");

-- CreateIndex
CREATE INDEX "CachedTrip_assignmentId_idx" ON "CachedTrip"("assignmentId");

-- CreateIndex
CREATE INDEX "CachedTrip_busTripId_idx" ON "CachedTrip"("busTripId");

-- CreateIndex
CREATE INDEX "CachedTrip_dateAssigned_idx" ON "CachedTrip"("dateAssigned");

-- CreateIndex
CREATE INDEX "CachedTrip_isRevenueRecorded_isExpenseRecorded_idx" ON "CachedTrip"("isRevenueRecorded", "isExpenseRecorded");

-- CreateIndex
CREATE INDEX "CachedTrip_lastSyncedAt_idx" ON "CachedTrip"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CachedTrip_isStale_idx" ON "CachedTrip"("isStale");

-- CreateIndex
CREATE INDEX "CachedTrip_driverName_idx" ON "CachedTrip"("driverName");

-- CreateIndex
CREATE INDEX "CachedTrip_conductorName_idx" ON "CachedTrip"("conductorName");

-- CreateIndex
CREATE INDEX "CachedTrip_busPlateNumber_idx" ON "CachedTrip"("busPlateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CachedInventoryItem_itemCode_key" ON "CachedInventoryItem"("itemCode");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_itemCode_idx" ON "CachedInventoryItem"("itemCode");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_itemName_idx" ON "CachedInventoryItem"("itemName");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_supplierName_idx" ON "CachedInventoryItem"("supplierName");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_category_idx" ON "CachedInventoryItem"("category");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_lastSyncedAt_idx" ON "CachedInventoryItem"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CachedInventoryItem_isStale_idx" ON "CachedInventoryItem"("isStale");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_sourceSystem_syncType_idx" ON "ExternalSyncLog"("sourceSystem", "syncType");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_status_idx" ON "ExternalSyncLog"("status");

-- CreateIndex
CREATE INDEX "ExternalSyncLog_startedAt_idx" ON "ExternalSyncLog"("startedAt");

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseRequestItemId_fkey" FOREIGN KEY ("purchaseRequestItemId") REFERENCES "PurchaseRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacement" ADD CONSTRAINT "RefundReplacement_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacementItem" ADD CONSTRAINT "RefundReplacementItem_refundReplacementId_fkey" FOREIGN KEY ("refundReplacementId") REFERENCES "RefundReplacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacementItem" ADD CONSTRAINT "RefundReplacementItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
