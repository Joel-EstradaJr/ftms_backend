-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "PayrollFrequency" AS ENUM ('WEEKLY', 'SEMI_MONTHLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'RELEASED', 'FULLY_PAID', 'DEFAULTED');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'APPROVED', 'VOID');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'VIEW', 'REVERSE');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "RefundReplacementType" AS ENUM ('REFUND', 'REPLACEMENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundReplacementStatus" AS ENUM ('PENDING', 'PROCESSING', 'TO_BE_REFUNDED', 'REFUNDED', 'TO_BE_REPLACED', 'REPLACED', 'REJECTED', 'FAILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ForfeitedDepositStatus" AS ENUM ('PENDING', 'APPROVED', 'CONVERTED_TO_REVENUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ApproverRole" AS ENUM ('OWNER', 'FINANCE_ADMIN');

-- CreateEnum
CREATE TYPE "ExpenseReservationStatus" AS ENUM ('NONE', 'RESERVED', 'VALIDATED', 'POSTED');

-- CreateEnum
CREATE TYPE "ReimbursementPaymentMethodType" AS ENUM ('CASH', 'GCASH', 'PAYMAYA');

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "methodCode" VARCHAR(20) NOT NULL,
    "methodName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetPeriodType" (
    "id" SERIAL NOT NULL,
    "periodCode" VARCHAR(20) NOT NULL,
    "periodName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetPeriodType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPaymentFrequencyType" (
    "id" SERIAL NOT NULL,
    "frequencyCode" VARCHAR(20) NOT NULL,
    "frequencyName" VARCHAR(100) NOT NULL,
    "daysInterval" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPaymentFrequencyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" SERIAL NOT NULL,
    "typeCode" VARCHAR(20) NOT NULL,
    "typeName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "normalBalance" VARCHAR(10) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "categoryCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "department" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueSource" (
    "id" SERIAL NOT NULL,
    "sourceCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountCode" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequestType" (
    "id" SERIAL NOT NULL,
    "typeCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequestStatus" (
    "id" SERIAL NOT NULL,
    "statusCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRequestStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAuthority" (
    "id" SERIAL NOT NULL,
    "role" "ApproverRole" NOT NULL,
    "approvalType" VARCHAR(100) NOT NULL,
    "minThreshold" DECIMAL(15,2),
    "maxThreshold" DECIMAL(15,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "ApprovalAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCache" (
    "id" SERIAL NOT NULL,
    "employeeNumber" VARCHAR(20) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "position" VARCHAR(100) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCache" (
    "id" SERIAL NOT NULL,
    "employeeNumber" VARCHAR(20) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "employeeStatus" VARCHAR(50) NOT NULL,
    "hiredate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "basicRate" DECIMAL(15,2) NOT NULL,
    "positionName" VARCHAR(100) NOT NULL,
    "departmentName" VARCHAR(100) NOT NULL,
    "attendanceData" JSONB,
    "benefitsData" JSONB,
    "deductionsData" JSONB,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusTripCache" (
    "id" SERIAL NOT NULL,
    "assignmentId" VARCHAR(20) NOT NULL,
    "busTripId" VARCHAR(20) NOT NULL,
    "busRoute" VARCHAR(100) NOT NULL,
    "isRevenueRecorded" BOOLEAN NOT NULL DEFAULT false,
    "isExpenseRecorded" BOOLEAN NOT NULL DEFAULT false,
    "dateAssigned" TIMESTAMP(3) NOT NULL,
    "tripFuelExpense" DECIMAL(15,2) NOT NULL,
    "tripRevenue" DECIMAL(15,2) NOT NULL,
    "assignmentType" VARCHAR(50) NOT NULL,
    "assignmentValue" DECIMAL(15,4) NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "driverName" VARCHAR(100) NOT NULL,
    "conductorName" VARCHAR(100) NOT NULL,
    "driverEmployeeNumber" VARCHAR(20),
    "conductorEmployeeNumber" VARCHAR(20),
    "busPlateNumber" VARCHAR(20) NOT NULL,
    "busType" VARCHAR(50) NOT NULL,
    "bodyNumber" VARCHAR(20) NOT NULL,
    "routeCode" VARCHAR(20),
    "tripStatus" VARCHAR(50) DEFAULT 'COMPLETED',
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusTripCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchaseRequestSync" (
    "id" SERIAL NOT NULL,
    "invPrId" VARCHAR(20) NOT NULL,
    "finPrId" VARCHAR(20),
    "categoryId" INTEGER,
    "categoryName" VARCHAR(100),
    "estimatedAmount" DECIMAL(15,2) NOT NULL,
    "priority" VARCHAR(20),
    "autoTrigger" BOOLEAN NOT NULL DEFAULT false,
    "reorderOfInvPrId" VARCHAR(20),
    "syncStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPurchaseRequestSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryOrderSync" (
    "id" SERIAL NOT NULL,
    "invPoId" VARCHAR(20) NOT NULL,
    "finOrderId" INTEGER,
    "invPrId" VARCHAR(20) NOT NULL,
    "supplierId" VARCHAR(20),
    "supplierName" VARCHAR(150),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "actualAmount" DECIMAL(15,2),
    "poStatus" VARCHAR(50),
    "priceMismatchFlag" BOOLEAN NOT NULL DEFAULT false,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "syncStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryOrderSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDeliverySync" (
    "id" SERIAL NOT NULL,
    "invDrId" VARCHAR(20) NOT NULL,
    "finDeliveryId" INTEGER,
    "invPoId" VARCHAR(20) NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "defectiveQuantity" INTEGER NOT NULL DEFAULT 0,
    "missingQuantity" INTEGER NOT NULL DEFAULT 0,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "inspectionStatus" VARCHAR(50),
    "invoiceNumber" VARCHAR(50),
    "invoiceAmount" DECIMAL(15,2),
    "syncStatus" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDeliverySync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revenue" (
    "id" SERIAL NOT NULL,
    "revenueCode" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethodId" INTEGER NOT NULL,
    "busTripCacheId" INTEGER,
    "externalRefId" VARCHAR(20),
    "externalRefType" VARCHAR(50),
    "loanPaymentId" INTEGER,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installmentScheduleId" INTEGER,
    "isAccountsReceivable" BOOLEAN NOT NULL DEFAULT false,
    "arDueDate" TIMESTAMP(3),
    "arPaidDate" TIMESTAMP(3),
    "arStatus" VARCHAR(50) DEFAULT 'PENDING',
    "arId" INTEGER,
    "documentIds" TEXT,
    "journalEntryId" INTEGER,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "expenseCode" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethodId" INTEGER NOT NULL,
    "busTripCacheId" INTEGER,
    "externalRefId" VARCHAR(20),
    "externalRefType" VARCHAR(50),
    "vendorName" VARCHAR(150),
    "vendorId" VARCHAR(20),
    "isReimbursement" BOOLEAN NOT NULL DEFAULT false,
    "isPayable" BOOLEAN NOT NULL DEFAULT false,
    "payableDueDate" TIMESTAMP(3),
    "payablePaidDate" TIMESTAMP(3),
    "payableStatus" VARCHAR(50) DEFAULT 'PENDING',
    "apId" INTEGER,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installmentScheduleId" INTEGER,
    "documentIds" TEXT,
    "budgetAllocationId" INTEGER,
    "journalEntryId" INTEGER,
    "purchaseRequestId" VARCHAR(20),
    "inventoryOrderId" VARCHAR(20),
    "inventoryDeliveryId" VARCHAR(20),
    "reservationStatus" "ExpenseReservationStatus" NOT NULL DEFAULT 'NONE',
    "amountReserved" DECIMAL(15,2),
    "threeWayMatchStatus" VARCHAR(50) DEFAULT 'PENDING',
    "threeWayMatchNotes" TEXT,
    "priceDecision" VARCHAR(50),
    "decisionMadeBy" VARCHAR(100),
    "decisionDate" TIMESTAMP(3),
    "decisionReason" TEXT,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "reversalOfId" INTEGER,
    "reversalReason" TEXT,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "taxExemptionReason" TEXT,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderCode" TEXT NOT NULL,
    "inventoryPoId" VARCHAR(20) NOT NULL,
    "purchaseRequestId" VARCHAR(20) NOT NULL,
    "supplierId" VARCHAR(20) NOT NULL,
    "supplierName" VARCHAR(150) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "orderAmount" DECIMAL(15,2) NOT NULL,
    "actualAmount" DECIMAL(15,2),
    "priceMatchFlag" BOOLEAN NOT NULL DEFAULT false,
    "actualQty" INTEGER,
    "newUnitPrice" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "deliveryCode" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "inventoryDrId" VARCHAR(20),
    "receivedQty" INTEGER NOT NULL,
    "defectiveQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "inspectionStatus" VARCHAR(50),
    "inspectionFindings" TEXT,
    "invoiceNumber" VARCHAR(50),
    "invoiceAmount" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" SERIAL NOT NULL,
    "reimbursementCode" TEXT NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "employeeNumber" VARCHAR(20) NOT NULL,
    "employeeName" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "claimedAmount" DECIMAL(15,2) NOT NULL,
    "approvedAmount" DECIMAL(15,2),
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethodType" "ReimbursementPaymentMethodType",
    "paymentMethodId" INTEGER,
    "disbursementDate" TIMESTAMP(3),
    "documentIds" TEXT,
    "remarks" TEXT,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "disbursedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundReplacement" (
    "id" SERIAL NOT NULL,
    "refundCode" TEXT NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "inventoryRefundId" VARCHAR(20),
    "inventoryPoId" VARCHAR(20) NOT NULL,
    "type" "RefundReplacementType" NOT NULL,
    "status" "RefundReplacementStatus" NOT NULL DEFAULT 'PENDING',
    "refundAmount" DECIMAL(15,2),
    "refundMethodId" INTEGER,
    "refundDate" TIMESTAMP(3),
    "replacementItems" TEXT,
    "replacementDate" TIMESTAMP(3),
    "replacementAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxReplacementAttempts" INTEGER NOT NULL DEFAULT 2,
    "supplierName" VARCHAR(150) NOT NULL,
    "supplierId" VARCHAR(20),
    "supplierRiskFlag" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "itemId" VARCHAR(20),
    "itemName" VARCHAR(150),
    "documentIds" TEXT,
    "journalEntryId" INTEGER,
    "previousStatus" VARCHAR(50),
    "rollbackPermission" VARCHAR(50) NOT NULL DEFAULT 'ADMIN_ONLY',
    "isRolledBack" BOOLEAN NOT NULL DEFAULT false,
    "rolledBackBy" VARCHAR(100),
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "processedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "payrollCode" TEXT NOT NULL,
    "payrollPeriod" VARCHAR(50) NOT NULL,
    "frequency" "PayrollFrequency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossAmount" DECIMAL(15,2),
    "totalDeductions" DECIMAL(15,2),
    "netAmount" DECIMAL(15,2),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "documentIds" TEXT,
    "journalEntryId" INTEGER,
    "budgetAllocationId" INTEGER,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "disbursedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" SERIAL NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "employeeNumber" VARCHAR(20) NOT NULL,
    "employeeName" VARCHAR(100) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "basicSalary" DECIMAL(15,2) NOT NULL,
    "overtimePay" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "benefits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(15,2) NOT NULL,
    "deductions" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(15,2) NOT NULL,
    "paymentMethodId" INTEGER,
    "disbursementDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "loanCode" TEXT NOT NULL,
    "employeeNumber" VARCHAR(20) NOT NULL,
    "employeeName" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "principalAmount" DECIMAL(15,2) NOT NULL,
    "interestRate" DECIMAL(5,2),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "balanceAmount" DECIMAL(15,2) NOT NULL,
    "loanType" VARCHAR(50) DEFAULT 'PERSONAL',
    "collateral" TEXT,
    "paymentFrequencyId" INTEGER NOT NULL,
    "numberOfPayments" INTEGER NOT NULL,
    "paymentAmount" DECIMAL(15,2) NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "isStaffRequest" BOOLEAN NOT NULL DEFAULT false,
    "documentIds" TEXT,
    "remarks" TEXT,
    "journalEntryId" INTEGER,
    "budgetAllocationId" INTEGER,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "releasedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" SERIAL NOT NULL,
    "paymentCode" TEXT NOT NULL,
    "loanId" INTEGER NOT NULL,
    "paymentAmount" DECIMAL(15,2) NOT NULL,
    "principalPaid" DECIMAL(15,2) NOT NULL,
    "interestPaid" DECIMAL(15,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethodId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "daysOverdue" INTEGER DEFAULT 0,
    "remarks" TEXT,
    "documentIds" TEXT,
    "journalEntryId" INTEGER,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" SERIAL NOT NULL,
    "budgetCode" TEXT NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "expenseCategoryId" INTEGER,
    "periodTypeId" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "consumedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reservedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(15,2) NOT NULL,
    "minAmount" DECIMAL(15,2),
    "maxAmount" DECIMAL(15,2),
    "allowOverflow" BOOLEAN NOT NULL DEFAULT false,
    "previousAllocation" DECIMAL(15,2),
    "varianceAmount" DECIMAL(15,2),
    "variancePercent" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequest" (
    "id" SERIAL NOT NULL,
    "requestCode" TEXT NOT NULL,
    "budgetAllocationId" INTEGER,
    "department" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "requestTypeId" INTEGER NOT NULL,
    "requestedAmount" DECIMAL(15,2) NOT NULL,
    "approvedAmount" DECIMAL(15,2),
    "justification" TEXT NOT NULL,
    "statusId" INTEGER NOT NULL,
    "priority" VARCHAR(50) DEFAULT 'NORMAL',
    "requiredByDate" TIMESTAMP(3),
    "approvalDeadline" TIMESTAMP(3),
    "expeditedReview" BOOLEAN NOT NULL DEFAULT false,
    "inventoryPrId" VARCHAR(20),
    "documentIds" TEXT,
    "remarks" TEXT,
    "requestedBy" VARCHAR(100) NOT NULL,
    "reviewedBy" VARCHAR(100),
    "approvedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" SERIAL NOT NULL,
    "accountCode" VARCHAR(20) NOT NULL,
    "accountName" VARCHAR(150) NOT NULL,
    "accountTypeId" INTEGER NOT NULL,
    "parentAccountId" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "normalBalance" VARCHAR(10) NOT NULL DEFAULT 'DEBIT',
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 1,
    "balanceSheetSection" VARCHAR(100),
    "createdBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "journalCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "sourceModule" VARCHAR(100),
    "sourceRefId" VARCHAR(100),
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "fiscalPeriod" VARCHAR(50),
    "isAdjustingEntry" BOOLEAN NOT NULL DEFAULT false,
    "isReversingEntry" BOOLEAN NOT NULL DEFAULT false,
    "documentIds" TEXT,
    "remarks" TEXT,
    "preparedBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "postedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryApproval" (
    "id" SERIAL NOT NULL,
    "journalEntryId" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "approverRole" "ApproverRole" NOT NULL,
    "approverAction" VARCHAR(50) NOT NULL,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntryApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLineItem" (
    "id" SERIAL NOT NULL,
    "journalEntryId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "description" TEXT,
    "debitAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "entityType" VARCHAR(100),
    "entityId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentSchedule" (
    "id" SERIAL NOT NULL,
    "scheduleCode" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "numberOfPayments" INTEGER NOT NULL,
    "paymentAmount" DECIMAL(15,2) NOT NULL,
    "frequency" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "interestRate" DECIMAL(5,2),
    "totalInterest" DECIMAL(15,2),
    "createdBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "principalAmount" DECIMAL(15,2),
    "interestAmount" DECIMAL(15,2),
    "daysOverdue" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsReceivable" (
    "id" SERIAL NOT NULL,
    "arCode" TEXT NOT NULL,
    "debtorName" VARCHAR(150) NOT NULL,
    "debtorType" VARCHAR(50) NOT NULL,
    "debtorContact" VARCHAR(100),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(15,2) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "referenceType" VARCHAR(50),
    "referenceId" VARCHAR(100),
    "agingCategory" VARCHAR(50),
    "lastPaymentDate" TIMESTAMP(3),
    "documentIds" TEXT,
    "remarks" TEXT,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsPayable" (
    "id" SERIAL NOT NULL,
    "apCode" TEXT NOT NULL,
    "creditorName" VARCHAR(150) NOT NULL,
    "creditorType" VARCHAR(50) NOT NULL,
    "creditorContact" VARCHAR(100),
    "creditorId" VARCHAR(20),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(15,2) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "referenceType" VARCHAR(50),
    "referenceId" VARCHAR(100),
    "agingCategory" VARCHAR(50),
    "lastPaymentDate" TIMESTAMP(3),
    "documentIds" TEXT,
    "remarks" TEXT,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForfeitedDeposit" (
    "id" SERIAL NOT NULL,
    "depositCode" TEXT NOT NULL,
    "bookingId" VARCHAR(20) NOT NULL,
    "bookingType" VARCHAR(50) NOT NULL,
    "customerName" VARCHAR(150) NOT NULL,
    "customerContact" VARCHAR(100),
    "originalDeposit" DECIMAL(15,2) NOT NULL,
    "forfeitedAmount" DECIMAL(15,2) NOT NULL,
    "forfeitedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "status" "ForfeitedDepositStatus" NOT NULL DEFAULT 'PENDING',
    "arId" INTEGER,
    "convertedRevenueId" INTEGER,
    "documentIds" TEXT,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForfeitedDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenterDamage" (
    "id" SERIAL NOT NULL,
    "damageCode" TEXT NOT NULL,
    "rentalId" VARCHAR(20) NOT NULL,
    "renterName" VARCHAR(150) NOT NULL,
    "renterContact" VARCHAR(100),
    "busPlateNumber" VARCHAR(20),
    "bodyNumber" VARCHAR(20),
    "damageDescription" TEXT NOT NULL,
    "damageDate" TIMESTAMP(3) NOT NULL,
    "repairCost" DECIMAL(15,2) NOT NULL,
    "amountCharged" DECIMAL(15,2) NOT NULL,
    "amountPaid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(15,2) NOT NULL,
    "expenseId" INTEGER,
    "revenueId" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "disputedAmount" DECIMAL(15,2),
    "paymentRevenueId" INTEGER,
    "documentIds" TEXT,
    "remarks" TEXT,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenterDamage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalSale" (
    "id" SERIAL NOT NULL,
    "disposalCode" TEXT NOT NULL,
    "disposalId" VARCHAR(20) NOT NULL,
    "disposalType" VARCHAR(50) NOT NULL,
    "itemDescription" VARCHAR(255) NOT NULL,
    "saleAmount" DECIMAL(15,2) NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerName" VARCHAR(150),
    "buyerContact" VARCHAR(100),
    "revenueId" INTEGER,
    "documentIds" TEXT,
    "remarks" TEXT,
    "recordedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPerformance" (
    "id" SERIAL NOT NULL,
    "supplierId" VARCHAR(20) NOT NULL,
    "supplierName" VARCHAR(150) NOT NULL,
    "failedRefunds" INTEGER NOT NULL DEFAULT 0,
    "failedReplacements" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" VARCHAR(50) NOT NULL DEFAULT 'LOW',
    "isBlockedFromOrders" BOOLEAN NOT NULL DEFAULT false,
    "blockedSince" TIMESTAMP(3),
    "blockedReason" TEXT,
    "lastFlaggedAt" TIMESTAMP(3),
    "flaggedBy" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR(100) NOT NULL,
    "userName" VARCHAR(100) NOT NULL,
    "userDepartment" VARCHAR(100),
    "action" "AuditAction" NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "recordId" INTEGER,
    "recordType" VARCHAR(100),
    "beforeData" JSONB,
    "afterData" JSONB,
    "description" TEXT,
    "ipAddress" VARCHAR(50),
    "userAgent" VARCHAR(255),
    "sessionId" VARCHAR(100),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenueId" INTEGER,
    "expenseId" INTEGER,
    "reimbursementId" INTEGER,
    "refundReplacementId" INTEGER,
    "payrollId" INTEGER,
    "loanId" INTEGER,
    "loanPaymentId" INTEGER,
    "budgetAllocationId" INTEGER,
    "budgetRequestId" INTEGER,
    "chartOfAccountId" INTEGER,
    "journalEntryId" INTEGER,
    "financialReportId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfiguration" (
    "id" SERIAL NOT NULL,
    "configKey" VARCHAR(100) NOT NULL,
    "configValue" TEXT NOT NULL,
    "configType" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" SERIAL NOT NULL,
    "reportCode" TEXT NOT NULL,
    "reportType" VARCHAR(100) NOT NULL,
    "reportName" VARCHAR(150) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "department" VARCHAR(100),
    "category" VARCHAR(100),
    "filters" JSONB,
    "fileUrl" TEXT,
    "fileFormat" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'GENERATED',
    "totalRecords" INTEGER,
    "totalAmount" DECIMAL(15,2),
    "templateId" VARCHAR(100),
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleFrequency" VARCHAR(50),
    "generatedBy" VARCHAR(100) NOT NULL,
    "exportedBy" VARCHAR(100),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardMetric" (
    "id" SERIAL NOT NULL,
    "metricKey" VARCHAR(100) NOT NULL,
    "metricName" VARCHAR(150) NOT NULL,
    "metricValue" DECIMAL(15,2) NOT NULL,
    "metricType" VARCHAR(50) NOT NULL,
    "periodType" VARCHAR(50) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceNotification" (
    "id" SERIAL NOT NULL,
    "notificationType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "recipientUserId" VARCHAR(100) NOT NULL,
    "recipientUserName" VARCHAR(100) NOT NULL,
    "recipientDepartment" VARCHAR(100),
    "relatedModule" VARCHAR(100),
    "relatedRecordId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "priority" VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    "expiresAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachedDocument" (
    "id" SERIAL NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentName" VARCHAR(255) NOT NULL,
    "documentType" VARCHAR(50) NOT NULL,
    "relatedModule" VARCHAR(100) NOT NULL,
    "relatedRecordId" INTEGER NOT NULL,
    "uploadedBy" VARCHAR(100) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttachedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_methodCode_key" ON "PaymentMethod"("methodCode");

-- CreateIndex
CREATE INDEX "PaymentMethod_methodCode_idx" ON "PaymentMethod"("methodCode");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetPeriodType_periodCode_key" ON "BudgetPeriodType"("periodCode");

-- CreateIndex
CREATE INDEX "BudgetPeriodType_periodCode_idx" ON "BudgetPeriodType"("periodCode");

-- CreateIndex
CREATE INDEX "BudgetPeriodType_isActive_idx" ON "BudgetPeriodType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPaymentFrequencyType_frequencyCode_key" ON "LoanPaymentFrequencyType"("frequencyCode");

-- CreateIndex
CREATE INDEX "LoanPaymentFrequencyType_frequencyCode_idx" ON "LoanPaymentFrequencyType"("frequencyCode");

-- CreateIndex
CREATE INDEX "LoanPaymentFrequencyType_isActive_idx" ON "LoanPaymentFrequencyType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_typeCode_key" ON "AccountType"("typeCode");

-- CreateIndex
CREATE INDEX "AccountType_typeCode_idx" ON "AccountType"("typeCode");

-- CreateIndex
CREATE INDEX "AccountType_isActive_idx" ON "AccountType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_categoryCode_key" ON "ExpenseCategory"("categoryCode");

-- CreateIndex
CREATE INDEX "ExpenseCategory_categoryCode_idx" ON "ExpenseCategory"("categoryCode");

-- CreateIndex
CREATE INDEX "ExpenseCategory_department_idx" ON "ExpenseCategory"("department");

-- CreateIndex
CREATE INDEX "ExpenseCategory_isActive_idx" ON "ExpenseCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueSource_sourceCode_key" ON "RevenueSource"("sourceCode");

-- CreateIndex
CREATE INDEX "RevenueSource_sourceCode_idx" ON "RevenueSource"("sourceCode");

-- CreateIndex
CREATE INDEX "RevenueSource_isActive_idx" ON "RevenueSource"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRequestType_typeCode_key" ON "BudgetRequestType"("typeCode");

-- CreateIndex
CREATE INDEX "BudgetRequestType_typeCode_idx" ON "BudgetRequestType"("typeCode");

-- CreateIndex
CREATE INDEX "BudgetRequestType_priority_idx" ON "BudgetRequestType"("priority");

-- CreateIndex
CREATE INDEX "BudgetRequestType_isActive_idx" ON "BudgetRequestType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRequestStatus_statusCode_key" ON "BudgetRequestStatus"("statusCode");

-- CreateIndex
CREATE INDEX "BudgetRequestStatus_statusCode_idx" ON "BudgetRequestStatus"("statusCode");

-- CreateIndex
CREATE INDEX "BudgetRequestStatus_isActive_idx" ON "BudgetRequestStatus"("isActive");

-- CreateIndex
CREATE INDEX "ApprovalAuthority_role_idx" ON "ApprovalAuthority"("role");

-- CreateIndex
CREATE INDEX "ApprovalAuthority_approvalType_idx" ON "ApprovalAuthority"("approvalType");

-- CreateIndex
CREATE INDEX "ApprovalAuthority_isActive_idx" ON "ApprovalAuthority"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalAuthority_role_approvalType_minThreshold_maxThresho_key" ON "ApprovalAuthority"("role", "approvalType", "minThreshold", "maxThreshold");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCache_employeeNumber_key" ON "EmployeeCache"("employeeNumber");

-- CreateIndex
CREATE INDEX "EmployeeCache_employeeNumber_idx" ON "EmployeeCache"("employeeNumber");

-- CreateIndex
CREATE INDEX "EmployeeCache_department_idx" ON "EmployeeCache"("department");

-- CreateIndex
CREATE INDEX "PayrollCache_employeeNumber_idx" ON "PayrollCache"("employeeNumber");

-- CreateIndex
CREATE INDEX "PayrollCache_departmentName_idx" ON "PayrollCache"("departmentName");

-- CreateIndex
CREATE INDEX "PayrollCache_employeeStatus_idx" ON "PayrollCache"("employeeStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BusTripCache_assignmentId_key" ON "BusTripCache"("assignmentId");

-- CreateIndex
CREATE INDEX "BusTripCache_assignmentId_idx" ON "BusTripCache"("assignmentId");

-- CreateIndex
CREATE INDEX "BusTripCache_busTripId_idx" ON "BusTripCache"("busTripId");

-- CreateIndex
CREATE INDEX "BusTripCache_dateAssigned_idx" ON "BusTripCache"("dateAssigned");

-- CreateIndex
CREATE INDEX "BusTripCache_driverEmployeeNumber_conductorEmployeeNumber_idx" ON "BusTripCache"("driverEmployeeNumber", "conductorEmployeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPurchaseRequestSync_invPrId_key" ON "InventoryPurchaseRequestSync"("invPrId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseRequestSync_invPrId_idx" ON "InventoryPurchaseRequestSync"("invPrId");

-- CreateIndex
CREATE INDEX "InventoryPurchaseRequestSync_syncStatus_idx" ON "InventoryPurchaseRequestSync"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryOrderSync_invPoId_key" ON "InventoryOrderSync"("invPoId");

-- CreateIndex
CREATE INDEX "InventoryOrderSync_invPoId_idx" ON "InventoryOrderSync"("invPoId");

-- CreateIndex
CREATE INDEX "InventoryOrderSync_syncStatus_idx" ON "InventoryOrderSync"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDeliverySync_invDrId_key" ON "InventoryDeliverySync"("invDrId");

-- CreateIndex
CREATE INDEX "InventoryDeliverySync_invDrId_idx" ON "InventoryDeliverySync"("invDrId");

-- CreateIndex
CREATE INDEX "InventoryDeliverySync_invPoId_idx" ON "InventoryDeliverySync"("invPoId");

-- CreateIndex
CREATE INDEX "InventoryDeliverySync_syncStatus_idx" ON "InventoryDeliverySync"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_revenueCode_key" ON "Revenue"("revenueCode");

-- CreateIndex
CREATE UNIQUE INDEX "Revenue_loanPaymentId_key" ON "Revenue"("loanPaymentId");

-- CreateIndex
CREATE INDEX "Revenue_sourceId_idx" ON "Revenue"("sourceId");

-- CreateIndex
CREATE INDEX "Revenue_transactionDate_idx" ON "Revenue"("transactionDate");

-- CreateIndex
CREATE INDEX "Revenue_revenueCode_idx" ON "Revenue"("revenueCode");

-- CreateIndex
CREATE INDEX "Revenue_arStatus_arDueDate_idx" ON "Revenue"("arStatus", "arDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseCode_key" ON "Expense"("expenseCode");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_transactionDate_idx" ON "Expense"("transactionDate");

-- CreateIndex
CREATE INDEX "Expense_expenseCode_idx" ON "Expense"("expenseCode");

-- CreateIndex
CREATE INDEX "Expense_vendorId_idx" ON "Expense"("vendorId");

-- CreateIndex
CREATE INDEX "Expense_payableStatus_payableDueDate_idx" ON "Expense"("payableStatus", "payableDueDate");

-- CreateIndex
CREATE INDEX "Expense_reservationStatus_idx" ON "Expense"("reservationStatus");

-- CreateIndex
CREATE INDEX "Expense_purchaseRequestId_idx" ON "Expense"("purchaseRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE INDEX "Order_inventoryPoId_idx" ON "Order"("inventoryPoId");

-- CreateIndex
CREATE INDEX "Order_purchaseRequestId_idx" ON "Order"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_deliveryCode_key" ON "Delivery"("deliveryCode");

-- CreateIndex
CREATE INDEX "Delivery_orderId_idx" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_inventoryDrId_idx" ON "Delivery"("inventoryDrId");

-- CreateIndex
CREATE UNIQUE INDEX "Reimbursement_reimbursementCode_key" ON "Reimbursement"("reimbursementCode");

-- CreateIndex
CREATE INDEX "Reimbursement_employeeNumber_idx" ON "Reimbursement"("employeeNumber");

-- CreateIndex
CREATE INDEX "Reimbursement_status_idx" ON "Reimbursement"("status");

-- CreateIndex
CREATE INDEX "Reimbursement_expenseId_idx" ON "Reimbursement"("expenseId");

-- CreateIndex
CREATE INDEX "Reimbursement_department_idx" ON "Reimbursement"("department");

-- CreateIndex
CREATE UNIQUE INDEX "RefundReplacement_refundCode_key" ON "RefundReplacement"("refundCode");

-- CreateIndex
CREATE INDEX "RefundReplacement_inventoryPoId_idx" ON "RefundReplacement"("inventoryPoId");

-- CreateIndex
CREATE INDEX "RefundReplacement_status_idx" ON "RefundReplacement"("status");

-- CreateIndex
CREATE INDEX "RefundReplacement_type_idx" ON "RefundReplacement"("type");

-- CreateIndex
CREATE INDEX "RefundReplacement_supplierId_idx" ON "RefundReplacement"("supplierId");

-- CreateIndex
CREATE INDEX "RefundReplacement_inventoryRefundId_idx" ON "RefundReplacement"("inventoryRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_payrollCode_key" ON "Payroll"("payrollCode");

-- CreateIndex
CREATE INDEX "Payroll_payrollPeriod_idx" ON "Payroll"("payrollPeriod");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "Payroll_periodStart_periodEnd_idx" ON "Payroll"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeNumber_idx" ON "PayrollItem"("employeeNumber");

-- CreateIndex
CREATE INDEX "PayrollItem_payrollId_idx" ON "PayrollItem"("payrollId");

-- CreateIndex
CREATE INDEX "PayrollItem_department_idx" ON "PayrollItem"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanCode_key" ON "Loan"("loanCode");

-- CreateIndex
CREATE INDEX "Loan_employeeNumber_idx" ON "Loan"("employeeNumber");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_loanCode_idx" ON "Loan"("loanCode");

-- CreateIndex
CREATE INDEX "Loan_department_idx" ON "Loan"("department");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_paymentCode_key" ON "LoanPayment"("paymentCode");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_paymentDate_idx" ON "LoanPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "LoanPayment_dueDate_idx" ON "LoanPayment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAllocation_budgetCode_key" ON "BudgetAllocation"("budgetCode");

-- CreateIndex
CREATE INDEX "BudgetAllocation_department_idx" ON "BudgetAllocation"("department");

-- CreateIndex
CREATE INDEX "BudgetAllocation_category_idx" ON "BudgetAllocation"("category");

-- CreateIndex
CREATE INDEX "BudgetAllocation_periodStart_periodEnd_idx" ON "BudgetAllocation"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BudgetAllocation_isActive_idx" ON "BudgetAllocation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRequest_requestCode_key" ON "BudgetRequest"("requestCode");

-- CreateIndex
CREATE INDEX "BudgetRequest_department_idx" ON "BudgetRequest"("department");

-- CreateIndex
CREATE INDEX "BudgetRequest_statusId_idx" ON "BudgetRequest"("statusId");

-- CreateIndex
CREATE INDEX "BudgetRequest_requestCode_idx" ON "BudgetRequest"("requestCode");

-- CreateIndex
CREATE INDEX "BudgetRequest_requiredByDate_idx" ON "BudgetRequest"("requiredByDate");

-- CreateIndex
CREATE INDEX "BudgetRequest_expeditedReview_idx" ON "BudgetRequest"("expeditedReview");

-- CreateIndex
CREATE INDEX "BudgetRequest_inventoryPrId_idx" ON "BudgetRequest"("inventoryPrId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_accountCode_key" ON "ChartOfAccount"("accountCode");

-- CreateIndex
CREATE INDEX "ChartOfAccount_accountCode_idx" ON "ChartOfAccount"("accountCode");

-- CreateIndex
CREATE INDEX "ChartOfAccount_accountTypeId_idx" ON "ChartOfAccount"("accountTypeId");

-- CreateIndex
CREATE INDEX "ChartOfAccount_parentAccountId_idx" ON "ChartOfAccount"("parentAccountId");

-- CreateIndex
CREATE INDEX "ChartOfAccount_isActive_idx" ON "ChartOfAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_journalCode_key" ON "JournalEntry"("journalCode");

-- CreateIndex
CREATE INDEX "JournalEntry_journalCode_idx" ON "JournalEntry"("journalCode");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "JournalEntry_fiscalPeriod_idx" ON "JournalEntry"("fiscalPeriod");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_journalEntryId_idx" ON "JournalEntryApproval"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_approverRole_idx" ON "JournalEntryApproval"("approverRole");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryApproval_journalEntryId_stage_key" ON "JournalEntryApproval"("journalEntryId", "stage");

-- CreateIndex
CREATE INDEX "JournalLineItem_journalEntryId_idx" ON "JournalLineItem"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLineItem_accountId_idx" ON "JournalLineItem"("accountId");

-- CreateIndex
CREATE INDEX "JournalLineItem_entityType_entityId_idx" ON "JournalLineItem"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentSchedule_scheduleCode_key" ON "InstallmentSchedule"("scheduleCode");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_type_idx" ON "InstallmentSchedule"("type");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_status_idx" ON "InstallmentSchedule"("status");

-- CreateIndex
CREATE INDEX "InstallmentSchedule_startDate_endDate_idx" ON "InstallmentSchedule"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Installment_scheduleId_idx" ON "Installment"("scheduleId");

-- CreateIndex
CREATE INDEX "Installment_dueDate_idx" ON "Installment"("dueDate");

-- CreateIndex
CREATE INDEX "Installment_status_idx" ON "Installment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_arCode_key" ON "AccountsReceivable"("arCode");

-- CreateIndex
CREATE INDEX "AccountsReceivable_debtorName_idx" ON "AccountsReceivable"("debtorName");

-- CreateIndex
CREATE INDEX "AccountsReceivable_status_idx" ON "AccountsReceivable"("status");

-- CreateIndex
CREATE INDEX "AccountsReceivable_dueDate_idx" ON "AccountsReceivable"("dueDate");

-- CreateIndex
CREATE INDEX "AccountsReceivable_arCode_idx" ON "AccountsReceivable"("arCode");

-- CreateIndex
CREATE INDEX "AccountsReceivable_agingCategory_idx" ON "AccountsReceivable"("agingCategory");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_apCode_key" ON "AccountsPayable"("apCode");

-- CreateIndex
CREATE INDEX "AccountsPayable_creditorName_idx" ON "AccountsPayable"("creditorName");

-- CreateIndex
CREATE INDEX "AccountsPayable_status_idx" ON "AccountsPayable"("status");

-- CreateIndex
CREATE INDEX "AccountsPayable_dueDate_idx" ON "AccountsPayable"("dueDate");

-- CreateIndex
CREATE INDEX "AccountsPayable_apCode_idx" ON "AccountsPayable"("apCode");

-- CreateIndex
CREATE INDEX "AccountsPayable_creditorId_idx" ON "AccountsPayable"("creditorId");

-- CreateIndex
CREATE UNIQUE INDEX "ForfeitedDeposit_depositCode_key" ON "ForfeitedDeposit"("depositCode");

-- CreateIndex
CREATE INDEX "ForfeitedDeposit_bookingId_idx" ON "ForfeitedDeposit"("bookingId");

-- CreateIndex
CREATE INDEX "ForfeitedDeposit_forfeitedDate_idx" ON "ForfeitedDeposit"("forfeitedDate");

-- CreateIndex
CREATE INDEX "ForfeitedDeposit_status_idx" ON "ForfeitedDeposit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RenterDamage_damageCode_key" ON "RenterDamage"("damageCode");

-- CreateIndex
CREATE INDEX "RenterDamage_rentalId_idx" ON "RenterDamage"("rentalId");

-- CreateIndex
CREATE INDEX "RenterDamage_status_idx" ON "RenterDamage"("status");

-- CreateIndex
CREATE INDEX "RenterDamage_damageDate_idx" ON "RenterDamage"("damageDate");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalSale_disposalCode_key" ON "DisposalSale"("disposalCode");

-- CreateIndex
CREATE INDEX "DisposalSale_disposalId_idx" ON "DisposalSale"("disposalId");

-- CreateIndex
CREATE INDEX "DisposalSale_saleDate_idx" ON "DisposalSale"("saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPerformance_supplierId_key" ON "SupplierPerformance"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPerformance_supplierId_idx" ON "SupplierPerformance"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPerformance_riskLevel_idx" ON "SupplierPerformance"("riskLevel");

-- CreateIndex
CREATE INDEX "SupplierPerformance_isBlockedFromOrders_idx" ON "SupplierPerformance"("isBlockedFromOrders");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userDepartment_idx" ON "AuditLog"("userDepartment");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfiguration_configKey_key" ON "SystemConfiguration"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfiguration_configKey_idx" ON "SystemConfiguration"("configKey");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialReport_reportCode_key" ON "FinancialReport"("reportCode");

-- CreateIndex
CREATE INDEX "FinancialReport_reportType_idx" ON "FinancialReport"("reportType");

-- CreateIndex
CREATE INDEX "FinancialReport_periodStart_periodEnd_idx" ON "FinancialReport"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialReport_generatedAt_idx" ON "FinancialReport"("generatedAt");

-- CreateIndex
CREATE INDEX "FinancialReport_isScheduled_idx" ON "FinancialReport"("isScheduled");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardMetric_metricKey_key" ON "DashboardMetric"("metricKey");

-- CreateIndex
CREATE INDEX "DashboardMetric_metricKey_idx" ON "DashboardMetric"("metricKey");

-- CreateIndex
CREATE INDEX "DashboardMetric_metricType_idx" ON "DashboardMetric"("metricType");

-- CreateIndex
CREATE INDEX "DashboardMetric_periodType_idx" ON "DashboardMetric"("periodType");

-- CreateIndex
CREATE INDEX "DashboardMetric_calculatedAt_idx" ON "DashboardMetric"("calculatedAt");

-- CreateIndex
CREATE INDEX "FinanceNotification_recipientUserId_idx" ON "FinanceNotification"("recipientUserId");

-- CreateIndex
CREATE INDEX "FinanceNotification_isRead_idx" ON "FinanceNotification"("isRead");

-- CreateIndex
CREATE INDEX "FinanceNotification_notificationType_idx" ON "FinanceNotification"("notificationType");

-- CreateIndex
CREATE INDEX "FinanceNotification_createdAt_idx" ON "FinanceNotification"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceNotification_recipientDepartment_idx" ON "FinanceNotification"("recipientDepartment");

-- CreateIndex
CREATE UNIQUE INDEX "AttachedDocument_documentId_key" ON "AttachedDocument"("documentId");

-- CreateIndex
CREATE INDEX "AttachedDocument_documentId_idx" ON "AttachedDocument"("documentId");

-- CreateIndex
CREATE INDEX "AttachedDocument_relatedModule_relatedRecordId_idx" ON "AttachedDocument"("relatedModule", "relatedRecordId");

-- CreateIndex
CREATE INDEX "AttachedDocument_documentType_idx" ON "AttachedDocument"("documentType");

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RevenueSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_busTripCacheId_fkey" FOREIGN KEY ("busTripCacheId") REFERENCES "BusTripCache"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_loanPaymentId_fkey" FOREIGN KEY ("loanPaymentId") REFERENCES "LoanPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_installmentScheduleId_fkey" FOREIGN KEY ("installmentScheduleId") REFERENCES "InstallmentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_arId_fkey" FOREIGN KEY ("arId") REFERENCES "AccountsReceivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_busTripCacheId_fkey" FOREIGN KEY ("busTripCacheId") REFERENCES "BusTripCache"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_apId_fkey" FOREIGN KEY ("apId") REFERENCES "AccountsPayable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_installmentScheduleId_fkey" FOREIGN KEY ("installmentScheduleId") REFERENCES "InstallmentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacement" ADD CONSTRAINT "RefundReplacement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacement" ADD CONSTRAINT "RefundReplacement_refundMethodId_fkey" FOREIGN KEY ("refundMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundReplacement" ADD CONSTRAINT "RefundReplacement_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_paymentFrequencyId_fkey" FOREIGN KEY ("paymentFrequencyId") REFERENCES "LoanPaymentFrequencyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_periodTypeId_fkey" FOREIGN KEY ("periodTypeId") REFERENCES "BudgetPeriodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "BudgetRequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "BudgetRequestStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_accountTypeId_fkey" FOREIGN KEY ("accountTypeId") REFERENCES "AccountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryApproval" ADD CONSTRAINT "JournalEntryApproval_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLineItem" ADD CONSTRAINT "JournalLineItem_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLineItem" ADD CONSTRAINT "JournalLineItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InstallmentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForfeitedDeposit" ADD CONSTRAINT "ForfeitedDeposit_arId_fkey" FOREIGN KEY ("arId") REFERENCES "AccountsReceivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForfeitedDeposit" ADD CONSTRAINT "ForfeitedDeposit_convertedRevenueId_fkey" FOREIGN KEY ("convertedRevenueId") REFERENCES "Revenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_revenueId_fkey" FOREIGN KEY ("revenueId") REFERENCES "Revenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "Reimbursement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_refundReplacementId_fkey" FOREIGN KEY ("refundReplacementId") REFERENCES "RefundReplacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_loanPaymentId_fkey" FOREIGN KEY ("loanPaymentId") REFERENCES "LoanPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_budgetAllocationId_fkey" FOREIGN KEY ("budgetAllocationId") REFERENCES "BudgetAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_financialReportId_fkey" FOREIGN KEY ("financialReportId") REFERENCES "FinancialReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
