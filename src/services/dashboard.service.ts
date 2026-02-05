import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface DateFilter {
    dateFilter?: 'Day' | 'Month' | 'Year' | 'Custom' | '';
    dateFrom?: string;
    dateTo?: string;
}

export interface DashboardSummary {
    revenue: {
        total: number;
        byCategory: Record<string, { name: string; amount: number; count: number }>;
    };
    expense: {
        total: number;
        byCategory: Record<string, { name: string; amount: number; count: number }>;
    };
    profit: number;
    periodLabel: string;
}

export interface MonthlyAggregate {
    month: string; // YYYY-MM
    year: number;
    monthNum: number;
    totalAmount: number;
    count: number;
    avgAmount: number;
}

export interface ForecastData {
    revenueAggregates: MonthlyAggregate[];
    expenseAggregates: MonthlyAggregate[];
    revenueTypes: { id: number; code: string; name: string }[];
    expenseTypes: { id: number; code: string; name: string }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateRange(filter: DateFilter): { startDate: Date | null; endDate: Date | null; label: string } {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let label = 'All Time';

    switch (filter.dateFilter) {
        case 'Day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            label = 'Today';
            break;
        case 'Month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
            break;
        case 'Year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            label = `Year ${now.getFullYear()}`;
            break;
        case 'Custom':
            if (filter.dateFrom) {
                startDate = new Date(filter.dateFrom);
            }
            if (filter.dateTo) {
                endDate = new Date(filter.dateTo);
                endDate.setHours(23, 59, 59);
            }
            label = filter.dateFrom && filter.dateTo
                ? `${filter.dateFrom} to ${filter.dateTo}`
                : 'Custom Range';
            break;
        default:
            // All time - no date filter
            break;
    }

    return { startDate, endDate, label };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DashboardService {
    /**
     * Get dashboard summary with revenue and expense totals by category
     * 
     * CRITICAL ACCOUNTING RULES:
     * 1. Only include records with accounting_status = 'POSTED' (not DRAFT, ADJUSTED, or REVERSED)
     * 2. For records WITHOUT receivable/payable/installment links: use the main amount field
     * 3. For records WITH receivable/payable/installment links: use only POSTED installment payments
     * 
     * This ensures dashboard reflects ACTUAL CASH MOVEMENT only, not expected/outstanding amounts.
     */
    static async getDashboardSummary(filter: DateFilter): Promise<DashboardSummary> {
        const { startDate, endDate, label } = getDateRange(filter);

        // Get revenue type names for categorization
        const revenueTypes = await prisma.revenue_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });
        const revenueTypeMap = new Map(revenueTypes.map(rt => [rt.id, rt]));

        // Get expense type names for categorization
        const expenseTypes = await prisma.expense_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });
        const expenseTypeMap = new Map(expenseTypes.map(et => [et.id, et]));

        // Initialize category accumulators
        const revenueByCategory: Record<string, { name: string; amount: number; count: number }> = {};
        const expenseByCategory: Record<string, { name: string; amount: number; count: number }> = {};
        let totalRevenue = 0;
        let totalExpense = 0;

        // ============================================================================
        // REVENUE CALCULATION - PART 1: Direct Revenue (no receivable/installment links)
        // ============================================================================
        // These are immediate cash revenues with no pending balance tracking
        const directRevenueWhere: Prisma.revenueWhereInput = {
            is_deleted: false,
            accounting_status: 'POSTED',
            // Must have NO receivable links
            receivable_id: null,
            driver_receivable_id: null,
            conductor_receivable_id: null,
            // Must have NO installment payments (checked via NOT having any)
            installment_payments: { none: {} },
        };

        if (startDate) {
            directRevenueWhere.date_recorded = { gte: startDate };
        }
        if (endDate) {
            directRevenueWhere.date_recorded = { 
                ...(directRevenueWhere.date_recorded as object || {}), 
                lte: endDate 
            };
        }

        const directRevenues = await prisma.revenue.findMany({
            where: directRevenueWhere,
            select: {
                revenue_type_id: true,
                amount: true,
            },
        });

        // Aggregate direct revenues by type
        for (const rev of directRevenues) {
            const type = revenueTypeMap.get(rev.revenue_type_id);
            if (type) {
                const amount = Number(rev.amount || 0);
                if (!revenueByCategory[type.name]) {
                    revenueByCategory[type.name] = { name: type.name, amount: 0, count: 0 };
                }
                revenueByCategory[type.name].amount += amount;
                revenueByCategory[type.name].count += 1;
                totalRevenue += amount;
            }
        }

        // ============================================================================
        // REVENUE CALCULATION - PART 2: Installment Payment Revenue
        // ============================================================================
        // For revenue with receivable/installment links, only count POSTED payments
        const installmentPaymentWhere: Prisma.revenue_installment_paymentWhereInput = {
            is_deleted: false,
            accounting_status: 'POSTED',
        };

        if (startDate) {
            installmentPaymentWhere.payment_date = { gte: startDate };
        }
        if (endDate) {
            installmentPaymentWhere.payment_date = { 
                ...(installmentPaymentWhere.payment_date as object || {}), 
                lte: endDate 
            };
        }

        const revenueInstallmentPayments = await prisma.revenue_installment_payment.findMany({
            where: installmentPaymentWhere,
            select: {
                amount_paid: true,
                revenue: {
                    select: {
                        revenue_type_id: true,
                        is_deleted: true,
                    },
                },
            },
        });

        // Aggregate installment payments by revenue type
        for (const payment of revenueInstallmentPayments) {
            // Skip if parent revenue is deleted
            if (payment.revenue.is_deleted) continue;

            const type = revenueTypeMap.get(payment.revenue.revenue_type_id);
            if (type) {
                const amount = Number(payment.amount_paid || 0);
                if (!revenueByCategory[type.name]) {
                    revenueByCategory[type.name] = { name: type.name, amount: 0, count: 0 };
                }
                revenueByCategory[type.name].amount += amount;
                revenueByCategory[type.name].count += 1;
                totalRevenue += amount;
            }
        }

        // ============================================================================
        // EXPENSE CALCULATION - PART 1: Direct Expense (no payable/installment links)
        // ============================================================================
        // These are immediate cash expenses with no pending payment tracking
        const directExpenseWhere: Prisma.expenseWhereInput = {
            is_deleted: false,
            accounting_status: 'POSTED',
            // Must have NO payable link
            payable_id: null,
            // Must have NO installment payments
            installment_payments: { none: {} },
        };

        if (startDate) {
            directExpenseWhere.date_recorded = { gte: startDate };
        }
        if (endDate) {
            directExpenseWhere.date_recorded = { 
                ...(directExpenseWhere.date_recorded as object || {}), 
                lte: endDate 
            };
        }

        const directExpenses = await prisma.expense.findMany({
            where: directExpenseWhere,
            select: {
                expense_type_id: true,
                amount: true,
            },
        });

        // Aggregate direct expenses by type
        for (const exp of directExpenses) {
            const type = expenseTypeMap.get(exp.expense_type_id);
            if (type) {
                const amount = Number(exp.amount || 0);
                if (!expenseByCategory[type.name]) {
                    expenseByCategory[type.name] = { name: type.name, amount: 0, count: 0 };
                }
                expenseByCategory[type.name].amount += amount;
                expenseByCategory[type.name].count += 1;
                totalExpense += amount;
            }
        }

        // ============================================================================
        // EXPENSE CALCULATION - PART 2: Installment Payment Expense
        // ============================================================================
        // For expense with payable/installment links, only count POSTED payments
        const expenseInstallmentPaymentWhere: Prisma.expense_installment_paymentWhereInput = {
            is_deleted: false,
            accounting_status: 'POSTED',
        };

        if (startDate) {
            expenseInstallmentPaymentWhere.payment_date = { gte: startDate };
        }
        if (endDate) {
            expenseInstallmentPaymentWhere.payment_date = { 
                ...(expenseInstallmentPaymentWhere.payment_date as object || {}), 
                lte: endDate 
            };
        }

        const expenseInstallmentPayments = await prisma.expense_installment_payment.findMany({
            where: expenseInstallmentPaymentWhere,
            select: {
                amount_paid: true,
                expense: {
                    select: {
                        expense_type_id: true,
                        is_deleted: true,
                    },
                },
            },
        });

        // Aggregate installment payments by expense type
        for (const payment of expenseInstallmentPayments) {
            // Skip if parent expense is deleted
            if (payment.expense.is_deleted) continue;

            const type = expenseTypeMap.get(payment.expense.expense_type_id);
            if (type) {
                const amount = Number(payment.amount_paid || 0);
                if (!expenseByCategory[type.name]) {
                    expenseByCategory[type.name] = { name: type.name, amount: 0, count: 0 };
                }
                expenseByCategory[type.name].amount += amount;
                expenseByCategory[type.name].count += 1;
                totalExpense += amount;
            }
        }

        logger.info(`Dashboard summary: Revenue=${totalRevenue}, Expense=${totalExpense}, Profit=${totalRevenue - totalExpense}`);

        return {
            revenue: {
                total: totalRevenue,
                byCategory: revenueByCategory,
            },
            expense: {
                total: totalExpense,
                byCategory: expenseByCategory,
            },
            profit: totalRevenue - totalExpense,
            periodLabel: label,
        };
    }

    /**
     * Get monthly aggregates for predictive analytics
     * 
     * CRITICAL ACCOUNTING RULES (same as dashboard summary):
     * 1. Only include records with accounting_status = 'POSTED'
     * 2. For records WITHOUT receivable/payable/installment links: use the main amount field
     * 3. For records WITH receivable/payable/installment links: use only POSTED installment payments
     */
    static async getForecastData(monthsBack: number = 12): Promise<ForecastData> {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        // ============================================================================
        // REVENUE AGGREGATES - PART 1: Direct Revenue (no receivable/installment)
        // ============================================================================
        const directRevenueRaw = await prisma.$queryRaw<Array<{
            month: Date;
            total_amount: bigint | number;
            count: bigint | number;
        }>>`
            SELECT 
                DATE_TRUNC('month', date_recorded) as month,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as count
            FROM revenue
            WHERE is_deleted = false
                AND date_recorded >= ${startDate}
                AND date_recorded IS NOT NULL
                AND accounting_status = 'POSTED'
                AND receivable_id IS NULL
                AND driver_receivable_id IS NULL
                AND conductor_receivable_id IS NULL
                AND id NOT IN (
                    SELECT DISTINCT revenue_id 
                    FROM revenue_installment_payment 
                    WHERE is_deleted = false
                )
            GROUP BY DATE_TRUNC('month', date_recorded)
            ORDER BY month
        `;

        // ============================================================================
        // REVENUE AGGREGATES - PART 2: Installment Payments
        // ============================================================================
        const revenueInstallmentRaw = await prisma.$queryRaw<Array<{
            month: Date;
            total_amount: bigint | number;
            count: bigint | number;
        }>>`
            SELECT 
                DATE_TRUNC('month', rip.payment_date) as month,
                COALESCE(SUM(rip.amount_paid), 0) as total_amount,
                COUNT(*) as count
            FROM revenue_installment_payment rip
            INNER JOIN revenue r ON rip.revenue_id = r.id AND r.is_deleted = false
            WHERE rip.is_deleted = false
                AND rip.payment_date >= ${startDate}
                AND rip.payment_date IS NOT NULL
                AND rip.accounting_status = 'POSTED'
            GROUP BY DATE_TRUNC('month', rip.payment_date)
            ORDER BY month
        `;

        // ============================================================================
        // EXPENSE AGGREGATES - PART 1: Direct Expense (no payable/installment)
        // ============================================================================
        const directExpenseRaw = await prisma.$queryRaw<Array<{
            month: Date;
            total_amount: bigint | number;
            count: bigint | number;
        }>>`
            SELECT 
                DATE_TRUNC('month', date_recorded) as month,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as count
            FROM expense
            WHERE is_deleted = false
                AND date_recorded >= ${startDate}
                AND date_recorded IS NOT NULL
                AND accounting_status = 'POSTED'
                AND payable_id IS NULL
                AND id NOT IN (
                    SELECT DISTINCT expense_id 
                    FROM expense_installment_payment 
                    WHERE is_deleted = false
                )
            GROUP BY DATE_TRUNC('month', date_recorded)
            ORDER BY month
        `;

        // ============================================================================
        // EXPENSE AGGREGATES - PART 2: Installment Payments
        // ============================================================================
        const expenseInstallmentRaw = await prisma.$queryRaw<Array<{
            month: Date;
            total_amount: bigint | number;
            count: bigint | number;
        }>>`
            SELECT 
                DATE_TRUNC('month', eip.payment_date) as month,
                COALESCE(SUM(eip.amount_paid), 0) as total_amount,
                COUNT(*) as count
            FROM expense_installment_payment eip
            INNER JOIN expense e ON eip.expense_id = e.id AND e.is_deleted = false
            WHERE eip.is_deleted = false
                AND eip.payment_date >= ${startDate}
                AND eip.payment_date IS NOT NULL
                AND eip.accounting_status = 'POSTED'
            GROUP BY DATE_TRUNC('month', eip.payment_date)
            ORDER BY month
        `;

        // Merge direct revenue and installment payments by month
        const revenueMerged = mergeMonthlyData(directRevenueRaw, revenueInstallmentRaw);
        const expenseMerged = mergeMonthlyData(directExpenseRaw, expenseInstallmentRaw);

        // Transform to MonthlyAggregate format
        const revenueAggregates: MonthlyAggregate[] = revenueMerged.map(row => {
            const date = new Date(row.month);
            return {
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                year: date.getFullYear(),
                monthNum: date.getMonth() + 1,
                totalAmount: row.totalAmount,
                count: row.count,
                avgAmount: row.count > 0 ? row.totalAmount / row.count : 0,
            };
        });

        const expenseAggregates: MonthlyAggregate[] = expenseMerged.map(row => {
            const date = new Date(row.month);
            return {
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                year: date.getFullYear(),
                monthNum: date.getMonth() + 1,
                totalAmount: row.totalAmount,
                count: row.count,
                avgAmount: row.count > 0 ? row.totalAmount / row.count : 0,
            };
        });

        // Get type definitions for frontend reference
        const revenueTypes = await prisma.revenue_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });

        const expenseTypes = await prisma.expense_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });

        logger.info(`Fetched forecast data: ${revenueAggregates.length} revenue months, ${expenseAggregates.length} expense months`);

        return {
            revenueAggregates,
            expenseAggregates,
            revenueTypes,
            expenseTypes,
        };
    }
}

// ============================================================================
// HELPER: Merge monthly data from direct records and installment payments
// ============================================================================
function mergeMonthlyData(
    directData: Array<{ month: Date; total_amount: bigint | number; count: bigint | number }>,
    installmentData: Array<{ month: Date; total_amount: bigint | number; count: bigint | number }>
): Array<{ month: Date; totalAmount: number; count: number }> {
    const monthMap = new Map<string, { month: Date; totalAmount: number; count: number }>();

    // Add direct data
    for (const row of directData) {
        const key = row.month.toISOString();
        monthMap.set(key, {
            month: row.month,
            totalAmount: Number(row.total_amount),
            count: Number(row.count),
        });
    }

    // Merge installment data
    for (const row of installmentData) {
        const key = row.month.toISOString();
        const existing = monthMap.get(key);
        if (existing) {
            existing.totalAmount += Number(row.total_amount);
            existing.count += Number(row.count);
        } else {
            monthMap.set(key, {
                month: row.month,
                totalAmount: Number(row.total_amount),
                count: Number(row.count),
            });
        }
    }

    // Sort by month and return
    return Array.from(monthMap.values()).sort((a, b) => a.month.getTime() - b.month.getTime());
}
