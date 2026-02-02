import { prisma } from '../config/database';
import { logger } from '../config/logger';

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
     * CRITICAL: Only includes records with accounting_status IN (POSTED, ADJUSTED)
     * This ensures dashboard reflects only financially recognized transactions
     */
    static async getDashboardSummary(filter: DateFilter): Promise<DashboardSummary> {
        const { startDate, endDate, label } = getDateRange(filter);

        // Build where clause for POSTED/ADJUSTED accounting entries only
        // This is critical for accurate financial reporting - only posted entries count
        const revenueWhere: any = { 
            is_deleted: false,
            accounting_status: { in: ['POSTED', 'ADJUSTED'] }
        };
        const expenseWhere: any = { 
            is_deleted: false,
            accounting_status: { in: ['POSTED', 'ADJUSTED'] }
        };
        
        if (startDate) {
            revenueWhere.date_recorded = { gte: startDate };
            expenseWhere.date_recorded = { gte: startDate };
        }
        if (endDate) {
            revenueWhere.date_recorded = { ...revenueWhere.date_recorded, lte: endDate };
            expenseWhere.date_recorded = { ...expenseWhere.date_recorded, lte: endDate };
        }

        // Get revenue by type - only POSTED/ADJUSTED
        const revenueGroups = await prisma.revenue.groupBy({
            by: ['revenue_type_id'],
            _sum: { amount: true },
            _count: true,
            where: revenueWhere,
        });

        // Get revenue type names
        const revenueTypes = await prisma.revenue_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });

        const revenueTypeMap = new Map(revenueTypes.map(rt => [rt.id, rt]));

        // Build revenue by category
        const revenueByCategory: Record<string, { name: string; amount: number; count: number }> = {};
        let totalRevenue = 0;

        for (const group of revenueGroups) {
            const type = revenueTypeMap.get(group.revenue_type_id);
            if (type) {
                const amount = Number(group._sum.amount || 0);
                revenueByCategory[type.name] = {
                    name: type.name,
                    amount,
                    count: group._count,
                };
                totalRevenue += amount;
            }
        }

        // Get expense by type - only POSTED/ADJUSTED
        const expenseGroups = await prisma.expense.groupBy({
            by: ['expense_type_id'],
            _sum: { amount: true },
            _count: true,
            where: expenseWhere,
        });

        // Get expense type names
        const expenseTypes = await prisma.expense_type.findMany({
            where: { is_deleted: false },
            select: { id: true, code: true, name: true },
        });

        const expenseTypeMap = new Map(expenseTypes.map(et => [et.id, et]));

        // Build expense by category
        const expenseByCategory: Record<string, { name: string; amount: number; count: number }> = {};
        let totalExpense = 0;

        for (const group of expenseGroups) {
            const type = expenseTypeMap.get(group.expense_type_id);
            if (type) {
                const amount = Number(group._sum.amount || 0);
                expenseByCategory[type.name] = {
                    name: type.name,
                    amount,
                    count: group._count,
                };
                totalExpense += amount;
            }
        }

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
     * CRITICAL: Only includes records with accounting_status IN (POSTED, ADJUSTED)
     */
    static async getForecastData(monthsBack: number = 12): Promise<ForecastData> {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        // Get revenue aggregates by month using raw query for date_trunc
        // Only include POSTED or ADJUSTED accounting entries
        const revenueRaw = await prisma.$queryRaw<Array<{
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
        AND accounting_status IN ('POSTED', 'ADJUSTED')
      GROUP BY DATE_TRUNC('month', date_recorded)
      ORDER BY month
    `;

        // Get expense aggregates by month
        // Only include POSTED or ADJUSTED accounting entries
        const expenseRaw = await prisma.$queryRaw<Array<{
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
        AND accounting_status IN ('POSTED', 'ADJUSTED')
      GROUP BY DATE_TRUNC('month', date_recorded)
      ORDER BY month
    `;

        // Transform revenue data
        const revenueAggregates: MonthlyAggregate[] = revenueRaw.map(row => {
            const date = new Date(row.month);
            const totalAmount = Number(row.total_amount);
            const count = Number(row.count);
            return {
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                year: date.getFullYear(),
                monthNum: date.getMonth() + 1,
                totalAmount,
                count,
                avgAmount: count > 0 ? totalAmount / count : 0,
            };
        });

        // Transform expense data
        const expenseAggregates: MonthlyAggregate[] = expenseRaw.map(row => {
            const date = new Date(row.month);
            const totalAmount = Number(row.total_amount);
            const count = Number(row.count);
            return {
                month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                year: date.getFullYear(),
                monthNum: date.getMonth() + 1,
                totalAmount,
                count,
                avgAmount: count > 0 ? totalAmount / count : 0,
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
