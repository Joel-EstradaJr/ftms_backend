/**
 * Archive Cleanup Scheduled Job
 * 
 * Automatically hard deletes records that have been archived (is_deleted = true)
 * for 5 years or more. This ensures data retention compliance while maintaining
 * database performance.
 * 
 * Schedule: Runs daily at 2:00 AM
 * Retention Period: 5 years (configurable via ARCHIVE_RETENTION_YEARS env var)
 */

import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// Retention period in years (default: 5 years)
const RETENTION_YEARS = parseInt(process.env.ARCHIVE_RETENTION_YEARS || '5', 10);

interface CleanupResult {
  table: string;
  deletedCount: number;
  error?: string;
}

/**
 * Calculate the cutoff date for hard deletion
 * Records archived before this date will be permanently deleted
 */
function getCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  return cutoff;
}

/**
 * Clean up archived records from a specific table
 */
async function cleanupTable(
  tableName: string,
  deleteFunction: (cutoffDate: Date) => Promise<{ count: number }>
): Promise<CleanupResult> {
  try {
    const cutoffDate = getCutoffDate();
    const result = await deleteFunction(cutoffDate);
    
    if (result.count > 0) {
      logger.info(`[CLEANUP] ${tableName}: Permanently deleted ${result.count} records archived before ${cutoffDate.toISOString()}`);
    }
    
    return {
      table: tableName,
      deletedCount: result.count,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[CLEANUP] ${tableName}: Error during cleanup - ${errorMsg}`);
    return {
      table: tableName,
      deletedCount: 0,
      error: errorMsg,
    };
  }
}

/**
 * Run the archive cleanup job for all tables with archive support
 */
export async function runArchiveCleanup(): Promise<CleanupResult[]> {
  const cutoffDate = getCutoffDate();
  const results: CleanupResult[] = [];

  logger.info('============================================================');
  logger.info('[CLEANUP] Starting archive cleanup job');
  logger.info(`[CLEANUP] Retention period: ${RETENTION_YEARS} years`);
  logger.info(`[CLEANUP] Cutoff date: ${cutoffDate.toISOString()}`);
  logger.info('============================================================');

  // Account Types
  results.push(await cleanupTable('account_type', async (cutoff) => {
    return prisma.account_type.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Chart of Accounts
  results.push(await cleanupTable('chart_of_account', async (cutoff) => {
    return prisma.chart_of_account.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Journal Entry Lines (must be deleted before journal entries due to FK)
  results.push(await cleanupTable('journal_entry_line', async (cutoff) => {
    return prisma.journal_entry_line.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Journal Entries
  results.push(await cleanupTable('journal_entry', async (cutoff) => {
    return prisma.journal_entry.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Revenue Types
  results.push(await cleanupTable('revenue_type', async (cutoff) => {
    return prisma.revenue_type.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Receivables (must be deleted before revenues due to FK)
  results.push(await cleanupTable('receivable', async (cutoff) => {
    return prisma.receivable.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Revenue Installment Payments
  results.push(await cleanupTable('revenue_installment_payment', async (cutoff) => {
    return prisma.revenue_installment_payment.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Revenue Installment Schedules
  results.push(await cleanupTable('revenue_installment_schedule', async (cutoff) => {
    return prisma.revenue_installment_schedule.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Revenues
  results.push(await cleanupTable('revenue', async (cutoff) => {
    return prisma.revenue.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Expense Types
  results.push(await cleanupTable('expense_type', async (cutoff) => {
    return prisma.expense_type.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Payables (must be deleted before expenses due to FK)
  results.push(await cleanupTable('payable', async (cutoff) => {
    return prisma.payable.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Expense Installment Payments
  results.push(await cleanupTable('expense_installment_payment', async (cutoff) => {
    return prisma.expense_installment_payment.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Expense Installment Schedules
  results.push(await cleanupTable('expense_installment_schedule', async (cutoff) => {
    return prisma.expense_installment_schedule.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Expenses
  results.push(await cleanupTable('expense', async (cutoff) => {
    return prisma.expense.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Payroll Items
  results.push(await cleanupTable('payroll_item', async (cutoff) => {
    return prisma.payroll_item.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Payroll Attendance
  results.push(await cleanupTable('payroll_attendance', async (cutoff) => {
    return prisma.payroll_attendance.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Payrolls
  results.push(await cleanupTable('payroll', async (cutoff) => {
    return prisma.payroll.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Payroll Periods
  results.push(await cleanupTable('payroll_period', async (cutoff) => {
    return prisma.payroll_period.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Budget Usage
  results.push(await cleanupTable('budget_usage', async (cutoff) => {
    return prisma.budget_usage.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Direct Budget Allocations
  results.push(await cleanupTable('direct_budget_allocation', async (cutoff) => {
    return prisma.direct_budget_allocation.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Approved Budget Requests
  results.push(await cleanupTable('approved_budget_request', async (cutoff) => {
    return prisma.approved_budget_request.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Department Budget Cycles
  results.push(await cleanupTable('department_budget_cycle', async (cutoff) => {
    return prisma.department_budget_cycle.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Department Budgets
  results.push(await cleanupTable('department_budget', async (cutoff) => {
    return prisma.department_budget.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Purchase Request Item Finance
  results.push(await cleanupTable('purchase_request_item_finance', async (cutoff) => {
    return prisma.purchase_request_item_finance.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Purchase Request Approvals
  results.push(await cleanupTable('purchase_request_approval', async (cutoff) => {
    return prisma.purchase_request_approval.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Expense Adjustments
  results.push(await cleanupTable('expense_adjustment', async (cutoff) => {
    return prisma.expense_adjustment.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Disposal Revenues
  results.push(await cleanupTable('disposal_revenue', async (cutoff) => {
    return prisma.disposal_revenue.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Asset Accumulations
  results.push(await cleanupTable('asset_accumulation', async (cutoff) => {
    return prisma.asset_accumulation.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Fixed Assets
  results.push(await cleanupTable('fixed_asset', async (cutoff) => {
    return prisma.fixed_asset.deleteMany({
      where: {
        is_deleted: true,
        archived_at: { lt: cutoff },
      },
    });
  }));

  // Vendors - use deleted_at since vendor doesn't have archived_at
  results.push(await cleanupTable('vendor', async (cutoff) => {
    return prisma.vendor.deleteMany({
      where: {
        is_deleted: true,
        deleted_at: { lt: cutoff },
      },
    });
  }));

  // Summary
  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
  const tablesWithDeletions = results.filter(r => r.deletedCount > 0);
  const tablesWithErrors = results.filter(r => r.error);

  logger.info('============================================================');
  logger.info('[CLEANUP] Archive cleanup completed');
  logger.info(`[CLEANUP] Total records deleted: ${totalDeleted}`);
  logger.info(`[CLEANUP] Tables with deletions: ${tablesWithDeletions.length}`);
  if (tablesWithErrors.length > 0) {
    logger.warn(`[CLEANUP] Tables with errors: ${tablesWithErrors.length}`);
    tablesWithErrors.forEach(t => logger.warn(`  - ${t.table}: ${t.error}`));
  }
  logger.info('============================================================');

  return results;
}

/**
 * Initialize the archive cleanup scheduled job
 * Should be called after the server starts
 */
export function initArchiveCleanupJob(): void {
  logger.info('📅 Initializing archive cleanup scheduled job...');

  /**
   * Daily Archive Cleanup Job
   * 
   * Schedule: Every day at 2:00 AM
   * Cron Expression: '0 2 * * *'
   *   - 0: minute 0
   *   - 2: hour 2 (2 AM)
   *   - *: every day of month
   *   - *: every month
   *   - *: every day of week
   */
  const cleanupJob = cron.schedule('0 2 * * *', async () => {
    logger.info('🗑️ Starting daily archive cleanup job...');
    
    try {
      await runArchiveCleanup();
    } catch (error) {
      logger.error('❌ Archive cleanup job failed:', error);
    }
  }, {
    timezone: 'Asia/Manila' // Philippine timezone
  });

  // Start the scheduled job
  cleanupJob.start();

  logger.info(`✅ Archive cleanup job scheduled: Daily at 2:00 AM (Asia/Manila)`);
  logger.info(`   Retention period: ${RETENTION_YEARS} years`);
}

/**
 * Get cleanup statistics without performing deletion
 * Useful for preview/dashboard
 */
export async function getCleanupPreview(): Promise<{
  cutoffDate: Date;
  retentionYears: number;
  tables: { table: string; eligibleCount: number }[];
  totalEligible: number;
}> {
  const cutoffDate = getCutoffDate();
  const tables: { table: string; eligibleCount: number }[] = [];

  // Count eligible records for each table
  const countPromises = [
    prisma.account_type.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'account_type', eligibleCount: count })),
    prisma.chart_of_account.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'chart_of_account', eligibleCount: count })),
    prisma.journal_entry.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'journal_entry', eligibleCount: count })),
    prisma.revenue_type.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'revenue_type', eligibleCount: count })),
    prisma.revenue.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'revenue', eligibleCount: count })),
    prisma.expense_type.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'expense_type', eligibleCount: count })),
    prisma.expense.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'expense', eligibleCount: count })),
    prisma.payable.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'payable', eligibleCount: count })),
    prisma.receivable.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'receivable', eligibleCount: count })),
    prisma.payroll_period.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'payroll_period', eligibleCount: count })),
    prisma.payroll.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'payroll', eligibleCount: count })),
    prisma.vendor.count({ where: { is_deleted: true, deleted_at: { lt: cutoffDate } } }).then(count => ({ table: 'vendor', eligibleCount: count })),
    prisma.fixed_asset.count({ where: { is_deleted: true, archived_at: { lt: cutoffDate } } }).then(count => ({ table: 'fixed_asset', eligibleCount: count })),
  ];

  const results = await Promise.all(countPromises);
  tables.push(...results);

  const totalEligible = tables.reduce((sum, t) => sum + t.eligibleCount, 0);

  return {
    cutoffDate,
    retentionYears: RETENTION_YEARS,
    tables: tables.filter(t => t.eligibleCount > 0),
    totalEligible,
  };
}
