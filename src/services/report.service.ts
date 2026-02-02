/**
 * Report Service
 * 
 * Provides data for financial reports:
 * - Journal Entry Report (grouped transactions with scenario derivation)
 * - Income Statement Report (revenue vs expenses with computed totals)
 * - Financial Position Report (assets vs liabilities with computed totals)
 * - System Configuration (company info for report headers)
 * 
 * All data is derived from schema fields as mapped in UI-to-Schema alignment.
 * Scenario field is derived from revenue_type.name or expense_type.name per requirements.
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

// ============================================================================
// TYPES - Aligned with Frontend Types
// ============================================================================

// Journal Entry Report Types
export interface JournalEntryLine {
  date: string;
  scenario: string;  // Derived from revenue_type.name or expense_type.name
  accountCode: string;
  accountName: string;
  debit: number | null;
  credit: number | null;
}

export interface JournalTransaction {
  id: string;
  lines: JournalEntryLine[];
  remarks: string;
}

export interface JournalEntryReportFilters {
  dateFrom?: string;
  dateTo?: string;
  scenario?: string[];
  accountType?: string[];
  amountMin?: number;
  amountMax?: number;
  status?: string;
}

export interface JournalEntryReportResponse {
  transactions: JournalTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalDebit: number;
    totalCredit: number;
    transactionCount: number;
  };
}

// Income Statement Report Types
export interface IncomeStatementLine {
  accountName: string;
  amount: number;
}

export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementLine[];
  subtotal: number;
  isNegative?: boolean;
}

export interface IncomeStatementData {
  companyName: string;
  reportTitle: string;
  periodEnding: string;
  revenue: IncomeStatementSection;
  costOfService: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netOperatingIncome: number;
  otherIncome: IncomeStatementSection;
  netIncomeBeforeTax: number;
  incomeTaxProvision: number;
  netIncome: number;
}

// Financial Position Report Types
export interface FinancialPositionLine {
  accountName: string;
  amount: number;
}

export interface FinancialPositionSection {
  title: string;
  items: FinancialPositionLine[];
  subtotal: number;
}

export interface FinancialPositionData {
  companyName: string;
  reportTitle: string;
  asOfDate: string;
  currentAssets: FinancialPositionSection;
  nonCurrentAssets: FinancialPositionSection;
  totalAssets: number;
  currentLiabilities: FinancialPositionSection;
  longTermLiabilities: FinancialPositionSection;
  totalLiabilities: number;
}

// System Configuration Type
export interface SystemConfigurationData {
  companyName: string;
  configCode: string;
  minimumWage: number;
  driverSharePercentage: number;
  conductorSharePercentage: number;
}

// ============================================================================
// REPORT SERVICE
// ============================================================================

export class ReportService {
  /**
   * Get Journal Entry Report data
   * Groups journal entries with lines, derives scenario from linked revenue/expense types
   */
  static async getJournalEntryReport(
    filters: JournalEntryReportFilters,
    page = 1,
    limit = 10
  ): Promise<JournalEntryReportResponse> {
    try {
      // Build where clause
      const where: any = { 
        is_deleted: false,
        status: { in: ['POSTED', 'ADJUSTED'] }  // Only posted entries for reports
      };

      // Date range filtering
      if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
      }

      // Status filtering (override default if provided)
      if (filters.status) {
        where.status = filters.status;
      }

      const skip = (page - 1) * limit;

      // Fetch journal entries with lines and related data
      const [entries, total] = await Promise.all([
        prisma.journal_entry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            lines: {
              include: {
                account: {
                  include: {
                    account_type: true,
                  },
                },
              },
              orderBy: { line_number: 'asc' },
            },
            // Include linked revenue for scenario derivation
            revenues: {
              include: {
                revenue_type: true,
              },
              take: 1,
            },
            // Include linked expense for scenario derivation
            expenses: {
              include: {
                expense_type: true,
              },
              take: 1,
            },
          },
        }),
        prisma.journal_entry.count({ where }),
      ]);

      // Transform entries to frontend format
      const transactions: JournalTransaction[] = entries.map((entry) => {
        // Derive scenario from linked revenue_type or expense_type
        let scenario = 'Manual Entry';
        if (entry.revenues.length > 0 && entry.revenues[0].revenue_type) {
          scenario = entry.revenues[0].revenue_type.name;
        } else if (entry.expenses.length > 0 && entry.expenses[0].expense_type) {
          scenario = entry.expenses[0].expense_type.name;
        } else if (entry.entry_type === 'AUTO_GENERATED') {
          scenario = 'Auto Generated';
        }

        const lines: JournalEntryLine[] = entry.lines.map((line, index) => ({
          date: index === 0 ? formatDate(entry.date) : '',
          scenario: index === 0 ? scenario : '',
          accountCode: line.account.account_code,
          accountName: line.account.account_name,
          debit: parseFloat(line.debit.toString()) || null,
          credit: parseFloat(line.credit.toString()) || null,
        }));

        return {
          id: entry.code,
          lines,
          remarks: entry.description || '',
        };
      });

      // Apply post-query filters (scenario, accountType, amount range)
      let filteredTransactions = transactions;

      if (filters.scenario && filters.scenario.length > 0) {
        filteredTransactions = filteredTransactions.filter((txn) => {
          const txnScenario = txn.lines[0]?.scenario?.toLowerCase() || '';
          return filters.scenario!.some((s) => txnScenario.includes(s.toLowerCase()));
        });
      }

      if (filters.accountType && filters.accountType.length > 0) {
        filteredTransactions = filteredTransactions.filter((txn) => {
          return txn.lines.some((line) => {
            const accountCode = line.accountCode;
            return filters.accountType!.some((type) => {
              switch (type.toLowerCase()) {
                case 'asset':
                  return accountCode.startsWith('1');
                case 'liability':
                  return accountCode.startsWith('2');
                case 'revenue':
                  return accountCode.startsWith('3');
                case 'expense':
                  return accountCode.startsWith('4');
                case 'cash':
                  return accountCode.startsWith('10');
                case 'receivable':
                  return accountCode.startsWith('11');
                default:
                  return false;
              }
            });
          });
        });
      }

      if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
        const min = filters.amountMin || 0;
        const max = filters.amountMax || Infinity;
        filteredTransactions = filteredTransactions.filter((txn) => {
          return txn.lines.some((line) => {
            const amount = line.debit || line.credit || 0;
            return amount >= min && amount <= max;
          });
        });
      }

      // Calculate summary
      let totalDebit = 0;
      let totalCredit = 0;
      filteredTransactions.forEach((txn) => {
        txn.lines.forEach((line) => {
          totalDebit += line.debit || 0;
          totalCredit += line.credit || 0;
        });
      });

      return {
        transactions: filteredTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalDebit,
          totalCredit,
          transactionCount: filteredTransactions.length,
        },
      };
    } catch (error) {
      logger.error('Error fetching journal entry report:', error);
      throw error;
    }
  }

  /**
   * Get Income Statement Report data
   * Aggregates revenue and expense by account, computes all subtotals and totals
   */
  static async getIncomeStatementReport(
    dateFrom?: string,
    dateTo?: string
  ): Promise<IncomeStatementData> {
    try {
      // Get company name from system configuration
      const config = await prisma.system_configuration.findFirst({
        where: { is_active: true, is_deleted: false },
      });
      const companyName = config?.company_name || 'Company Name';

      // Build date filter
      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);

      // Get all posted journal entries with lines
      const journalLines = await prisma.journal_entry_line.findMany({
        where: {
          journal_entry: {
            is_deleted: false,
            status: { in: ['POSTED', 'ADJUSTED'] },
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
          is_deleted: false,
        },
        include: {
          account: {
            include: {
              account_type: true,
            },
          },
        },
      });

      // Aggregate by account
      const accountAggregates = new Map<string, { accountName: string; accountTypeId: number; balance: number }>();

      journalLines.forEach((line) => {
        const key = line.account.account_code;
        const existing = accountAggregates.get(key) || {
          accountName: line.account.account_name,
          accountTypeId: line.account.account_type_id,
          balance: 0,
        };

        // Calculate balance based on normal balance
        const debit = parseFloat(line.debit.toString());
        const credit = parseFloat(line.credit.toString());

        if (line.account.normal_balance === 'DEBIT') {
          existing.balance += debit - credit;
        } else {
          existing.balance += credit - debit;
        }

        accountAggregates.set(key, existing);
      });

      // Separate accounts by type (Revenue = 3, Expense = 4)
      const revenueAccounts: IncomeStatementLine[] = [];
      const expenseAccounts: IncomeStatementLine[] = [];

      accountAggregates.forEach((data) => {
        if (data.accountTypeId === 3) {
          // Revenue
          revenueAccounts.push({
            accountName: data.accountName,
            amount: Math.abs(data.balance),
          });
        } else if (data.accountTypeId === 4) {
          // Expense
          expenseAccounts.push({
            accountName: data.accountName,
            amount: Math.abs(data.balance),
          });
        }
      });

      // Categorize expenses into Cost of Service, Operating Expenses, and Other
      // Cost of Service: Operational expenses directly related to service delivery
      const costOfServiceKeywords = ['fuel', 'toll', 'parking', 'terminal', 'maintenance', 'driver', 'conductor', 'boundary', 'percentage'];
      const otherIncomeKeywords = ['interest', 'income', 'commission'];

      const costOfServiceItems: IncomeStatementLine[] = [];
      const operatingExpenseItems: IncomeStatementLine[] = [];
      const otherIncomeItems: IncomeStatementLine[] = [];

      expenseAccounts.forEach((item) => {
        const nameLower = item.accountName.toLowerCase();
        if (costOfServiceKeywords.some((kw) => nameLower.includes(kw))) {
          costOfServiceItems.push(item);
        } else {
          operatingExpenseItems.push(item);
        }
      });

      // Check for other income in revenue accounts
      revenueAccounts.forEach((item) => {
        const nameLower = item.accountName.toLowerCase();
        if (otherIncomeKeywords.some((kw) => nameLower.includes(kw))) {
          otherIncomeItems.push(item);
        }
      });

      // Filter out other income from main revenue
      const mainRevenueItems = revenueAccounts.filter(
        (item) => !otherIncomeKeywords.some((kw) => item.accountName.toLowerCase().includes(kw))
      );

      // Calculate totals
      const revenueSubtotal = mainRevenueItems.reduce((sum, item) => sum + item.amount, 0);
      const costOfServiceSubtotal = costOfServiceItems.reduce((sum, item) => sum + item.amount, 0);
      const grossProfit = revenueSubtotal - costOfServiceSubtotal;

      const operatingExpenseSubtotal = operatingExpenseItems.reduce((sum, item) => sum + item.amount, 0);
      const netOperatingIncome = grossProfit - operatingExpenseSubtotal;

      const otherIncomeSubtotal = otherIncomeItems.reduce((sum, item) => sum + item.amount, 0);
      const netIncomeBeforeTax = netOperatingIncome + otherIncomeSubtotal;

      // Income tax provision (standard 20% for simplicity)
      const incomeTaxProvision = netIncomeBeforeTax > 0 ? netIncomeBeforeTax * 0.2 : 0;
      const netIncome = netIncomeBeforeTax - incomeTaxProvision;

      // Format period string
      const periodEnding = formatPeriodEnding(dateFrom, dateTo);

      return {
        companyName,
        reportTitle: 'Income Statement',
        periodEnding,
        revenue: {
          title: 'TOTAL REVENUE',
          items: mainRevenueItems,
          subtotal: revenueSubtotal,
        },
        costOfService: {
          title: 'LESS: COST OF SERVICE',
          items: costOfServiceItems,
          subtotal: costOfServiceSubtotal,
          isNegative: true,
        },
        grossProfit,
        operatingExpenses: {
          title: 'LESS: OPERATING EXPENSES',
          items: operatingExpenseItems,
          subtotal: operatingExpenseSubtotal,
          isNegative: true,
        },
        netOperatingIncome,
        otherIncome: {
          title: 'OTHER INCOME',
          items: otherIncomeItems,
          subtotal: otherIncomeSubtotal,
        },
        netIncomeBeforeTax,
        incomeTaxProvision,
        netIncome,
      };
    } catch (error) {
      logger.error('Error fetching income statement report:', error);
      throw error;
    }
  }

  /**
   * Get Financial Position (Balance Sheet) Report data
   * Aggregates assets and liabilities by account, computes all totals
   * NOTE: Equity excluded per requirements
   */
  static async getFinancialPositionReport(asOfDate?: string): Promise<FinancialPositionData> {
    try {
      // Get company name from system configuration
      const config = await prisma.system_configuration.findFirst({
        where: { is_active: true, is_deleted: false },
      });
      const companyName = config?.company_name || 'Company Name';

      // Build date filter (all entries up to asOfDate)
      const dateFilter = asOfDate ? { lte: new Date(asOfDate) } : undefined;

      // Get all posted journal entries with lines
      const journalLines = await prisma.journal_entry_line.findMany({
        where: {
          journal_entry: {
            is_deleted: false,
            status: { in: ['POSTED', 'ADJUSTED'] },
            ...(dateFilter && { date: dateFilter }),
          },
          is_deleted: false,
        },
        include: {
          account: {
            include: {
              account_type: true,
            },
          },
        },
      });

      // Aggregate by account
      const accountAggregates = new Map<string, { 
        accountName: string; 
        accountCode: string;
        accountTypeId: number; 
        balance: number 
      }>();

      journalLines.forEach((line) => {
        const key = line.account.account_code;
        const existing = accountAggregates.get(key) || {
          accountName: line.account.account_name,
          accountCode: line.account.account_code,
          accountTypeId: line.account.account_type_id,
          balance: 0,
        };

        // Calculate balance based on normal balance
        const debit = parseFloat(line.debit.toString());
        const credit = parseFloat(line.credit.toString());

        if (line.account.normal_balance === 'DEBIT') {
          existing.balance += debit - credit;
        } else {
          existing.balance += credit - debit;
        }

        accountAggregates.set(key, existing);
      });

      // Categorize accounts
      const currentAssetItems: FinancialPositionLine[] = [];
      const nonCurrentAssetItems: FinancialPositionLine[] = [];
      const currentLiabilityItems: FinancialPositionLine[] = [];
      const longTermLiabilityItems: FinancialPositionLine[] = [];

      // Current asset codes: 1000-1199 (Cash + Receivables)
      // Non-current asset codes: 1200+ (Fixed Assets - DEFERRED)
      // Current liability codes: 2000-2199
      // Long-term liability codes: 2200+

      accountAggregates.forEach((data) => {
        const codeNum = parseInt(data.accountCode, 10);
        
        if (data.accountTypeId === 1) {
          // Assets
          if (codeNum < 1200) {
            currentAssetItems.push({
              accountName: data.accountName,
              amount: data.balance,
            });
          } else {
            nonCurrentAssetItems.push({
              accountName: data.accountName,
              amount: data.balance,
            });
          }
        } else if (data.accountTypeId === 2) {
          // Liabilities
          if (codeNum < 2200) {
            currentLiabilityItems.push({
              accountName: data.accountName,
              amount: Math.abs(data.balance),
            });
          } else {
            longTermLiabilityItems.push({
              accountName: data.accountName,
              amount: Math.abs(data.balance),
            });
          }
        }
        // Note: Revenue (3) and Expense (4) are not included in balance sheet
      });

      // Calculate subtotals
      const currentAssetsSubtotal = currentAssetItems.reduce((sum, item) => sum + item.amount, 0);
      const nonCurrentAssetsSubtotal = nonCurrentAssetItems.reduce((sum, item) => sum + item.amount, 0);
      const totalAssets = currentAssetsSubtotal + nonCurrentAssetsSubtotal;

      const currentLiabilitiesSubtotal = currentLiabilityItems.reduce((sum, item) => sum + item.amount, 0);
      const longTermLiabilitiesSubtotal = longTermLiabilityItems.reduce((sum, item) => sum + item.amount, 0);
      const totalLiabilities = currentLiabilitiesSubtotal + longTermLiabilitiesSubtotal;

      // Format as-of date string
      const asOfDateStr = asOfDate
        ? `As of ${formatDateLong(new Date(asOfDate))}`
        : `As of ${formatDateLong(new Date())}`;

      return {
        companyName,
        reportTitle: 'Statement of Financial Position',
        asOfDate: asOfDateStr,
        currentAssets: {
          title: 'Current Assets',
          items: currentAssetItems,
          subtotal: currentAssetsSubtotal,
        },
        nonCurrentAssets: {
          title: 'Non-Current Assets',
          items: nonCurrentAssetItems,
          subtotal: nonCurrentAssetsSubtotal,
        },
        totalAssets,
        currentLiabilities: {
          title: 'Current Liabilities',
          items: currentLiabilityItems,
          subtotal: currentLiabilitiesSubtotal,
        },
        longTermLiabilities: {
          title: 'Long-term Liabilities',
          items: longTermLiabilityItems,
          subtotal: longTermLiabilitiesSubtotal,
        },
        totalLiabilities,
      };
    } catch (error) {
      logger.error('Error fetching financial position report:', error);
      throw error;
    }
  }

  /**
   * Get System Configuration data for report headers
   */
  static async getSystemConfiguration(): Promise<SystemConfigurationData> {
    try {
      const config = await prisma.system_configuration.findFirst({
        where: { is_active: true, is_deleted: false },
      });

      if (!config) {
        // Return defaults if no configuration exists
        return {
          companyName: 'Company Name',
          configCode: 'DEFAULT',
          minimumWage: 600,
          driverSharePercentage: 50,
          conductorSharePercentage: 50,
        };
      }

      return {
        companyName: config.company_name || 'Company Name',
        configCode: config.config_code,
        minimumWage: parseFloat(config.minimum_wage.toString()),
        driverSharePercentage: parseFloat(config.driver_share_percentage.toString()),
        conductorSharePercentage: parseFloat(config.conductor_share_percentage.toString()),
      };
    } catch (error) {
      logger.error('Error fetching system configuration:', error);
      throw error;
    }
  }

  /**
   * Get Scenario options (for filter dropdown)
   * Returns unique revenue_type.name and expense_type.name values
   */
  static async getScenarioOptions(): Promise<string[]> {
    try {
      const [revenueTypes, expenseTypes] = await Promise.all([
        prisma.revenue_type.findMany({
          where: { is_deleted: false },
          select: { name: true },
        }),
        prisma.expense_type.findMany({
          where: { is_deleted: false },
          select: { name: true },
        }),
      ]);

      const scenarios = [
        ...revenueTypes.map((rt) => rt.name),
        ...expenseTypes.map((et) => et.name),
        'Manual Entry',
        'Auto Generated',
      ];

      return [...new Set(scenarios)].sort();
    } catch (error) {
      logger.error('Error fetching scenario options:', error);
      throw error;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDateLong(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatPeriodEnding(dateFrom?: string, dateTo?: string): string {
  if (!dateFrom && !dateTo) {
    return `For the Year Ended ${formatDateLong(new Date())}`;
  }
  
  if (dateFrom && dateTo) {
    return `For the Period ${formatDateLong(new Date(dateFrom))} to ${formatDateLong(new Date(dateTo))}`;
  }
  
  if (dateTo) {
    return `For the Period Ended ${formatDateLong(new Date(dateTo))}`;
  }
  
  return `From ${formatDateLong(new Date(dateFrom!))} to Present`;
}
