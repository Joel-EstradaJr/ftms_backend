// Revenue Types aligned with revised Prisma schema

export interface Revenue {
  id: number;
  revenueCode: string;
  sourceId: number;
  source: RevenueSource;
  description: string;
  amount: number;
  transactionDate: Date;
  paymentMethodId: number;
  paymentMethod: PaymentMethod;
  
  // Bus Trip Integration
  busTripCacheId: number | null;
  busTripCache?: BusTripCache | null;
  
  // External References
  externalRefId: string | null;
  externalRefType: string | null; // "RENTAL", "DISPOSAL", "FORFEITED_DEPOSIT", "LOAN_REPAYMENT", "RENTER_DAMAGE", "BUS_TRIP"
  
  // Loan Payment
  loanPaymentId: number | null;
  loanPayment?: LoanPayment | null;
  
  // Accounts Receivable
  isAccountsReceivable: boolean;
  arDueDate: Date | null;
  arPaidDate: Date | null;
  arStatus: string | null; // "PENDING", "PARTIAL", "PAID"
  arId: number | null;
  accountsReceivable?: AccountsReceivable | null;
  
  // Installment
  isInstallment: boolean;
  installmentScheduleId: number | null;
  installmentSchedule?: InstallmentSchedule | null;
  
  // Documents
  documentIds: string | null;
  
  // Journal Entry
  journalEntryId: number | null;
  journalEntry?: JournalEntry | null;
  
  // Audit
  createdBy: string;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  auditLogs?: AuditLog[];
}

export interface RevenueSource {
  id: number;
  sourceCode: string;
  name: string;
  description: string | null;
  isActive: boolean;
  accountCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: number;
  methodCode: string;
  methodName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusTripCache {
  id: number;
  assignmentId: string;
  tripRevenue: number;
  assignmentType: string;
  assignmentValue: number;
  // ... other bus trip fields
}

export interface LoanPayment {
  id: number;
  paymentCode: string;
  loanId: number;
  paymentNumber: number;
  scheduledDate: Date;
  paymentDate: Date | null;
  scheduledAmount: number;
  paidAmount: number;
  // ... other loan payment fields
}

export interface AccountsReceivable {
  id: number;
  arCode: string;
  debtorName: string;
  debtorType: string;
  debtorContact: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  agingCategory: string | null;
  lastPaymentDate: Date | null;
  documentIds: string | null;
  remarks: string | null;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstallmentSchedule {
  id: number;
  scheduleCode: string;
  type: string; // "REVENUE", "EXPENSE"
  totalAmount: number;
  numberOfPayments: number;
  paymentAmount: number;
  frequency: string;
  startDate: Date;
  endDate: Date;
  status: string; // "ACTIVE", "COMPLETED", "DEFAULTED", "CANCELLED"
  interestRate: number | null;
  totalInterest: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: number;
  journalCode: string;
  entryDate: Date;
  sourceModule: string;
  sourceRefId: string | null;
  status: string; // "DRAFT", "POSTED", "APPROVED", "VOID"
  fiscalPeriod: string | null;
  isAdjustingEntry: boolean;
  isReversingEntry: boolean;
  lineItems?: JournalLineItem[];
  documentIds: string | null;
  remarks: string | null;
  preparedBy: string;
  approvedBy: string | null;
  postedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLineItem {
  id: number;
  journalEntryId: number;
  accountId: number;
  account: ChartOfAccount;
  description: string | null;
  debitAmount: number;
  creditAmount: number;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartOfAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountTypeId: number;
  accountType: AccountType;
  normalBalance: string;
  isActive: boolean;
  parentAccountId: number | null;
  level: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountType {
  id: number;
  typeCode: string;
  typeName: string;
  description: string | null;
  normalBalance: string; // "DEBIT" or "CREDIT"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  userDepartment: string | null;
  action: string; // "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "EXPORT", "VIEW", "REVERSE"
  module: string;
  recordId: number | null;
  recordType: string | null;
  beforeData: any | null;
  afterData: any | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: Date;
}

// Form/DTO Types
export interface RevenueFormData {
  // Common Fields
  sourceId: number;
  description: string;
  amount: number;
  transactionDate?: string;
  paymentMethodId: number;
  documentIds?: string;
  remarks?: string;
  
  // Bus Trip
  busTripCacheId?: number;
  
  // External Reference
  externalRefType?: 'RENTAL' | 'DISPOSAL' | 'FORFEITED_DEPOSIT' | 'LOAN_REPAYMENT' | 'RENTER_DAMAGE' | 'BUS_TRIP';
  externalRefId?: string;
  
  // Loan Payment
  loanPaymentId?: number;
  
  // Accounts Receivable
  isAccountsReceivable?: boolean;
  arId?: number;
  arDueDate?: string;
  arPaidDate?: string;
  arStatus?: string;
  
  // Installment
  isInstallment?: boolean;
  installmentScheduleId?: number;
  installmentSchedule?: {
    numberOfPayments: number;
    paymentAmount: number;
    frequency: string;
    startDate: string;
    interestRate?: number;
  };
  
  // Journal Entry
  journalEntryId?: number;
  
  // Audit
  createdBy: string;
}

export interface RevenueListItem {
  id: number;
  revenueCode: string;
  transactionDate: Date;
  sourceName: string;
  amount: number;
  paymentMethodName: string;
  arStatus: string | null;
  externalRefType: string | null;
  journalEntryId: number | null;
  journalEntryStatus: string | null;
  isInstallment: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface RevenueFilters {
  sourceId?: number;
  externalRefType?: string;
  isAccountsReceivable?: boolean;
  isInstallment?: boolean;
  arStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}
