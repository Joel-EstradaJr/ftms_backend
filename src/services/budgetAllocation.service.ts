// ============================================================================
// BUDGET ALLOCATION SERVICE - Handles department budget allocation operations
// ============================================================================

import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { budget_allocation_type } from '@prisma/client';

// ============================================================================
// DTOs and Interfaces
// ============================================================================

export interface DepartmentBudgetDTO {
    department_id: string;
    department_name: string;
    allocated_budget: number;
    used_budget: number;
    remaining_budget: number;
    last_update_date: string;
    budget_period: string;
    status: 'Active' | 'Exceeded';
}

export interface AllocateBudgetDTO {
    department_id: string;
    amount: number;
    period: string; // YYYY-MM format
    notes?: string;
}

export interface DeductBudgetDTO {
    department_id: string;
    amount: number;
    period: string; // YYYY-MM format
    notes?: string;
}

export interface AllocationHistoryDTO {
    allocation_id: string;
    department_id: string;
    type: 'Allocation' | 'Deduction';
    amount: number;
    date: string;
    allocated_by: string;
    notes: string;
    created_at: string;
    updated_at?: string;
}

export interface AllocationResult {
    allocation_id: number;
    new_allocated_budget: number;
    new_remaining_budget: number;
}

export interface HistoryFilters {
    type?: 'Allocation' | 'Deduction';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

// ============================================================================
// Budget Allocation Service Class
// ============================================================================

class BudgetAllocationService {
    /**
     * Get all departments with budget info for a specific period
     * @param period - Budget period in YYYY-MM format
     */
    async getDepartmentBudgetsByPeriod(period: string): Promise<DepartmentBudgetDTO[]> {
        try {
            // Parse period to get date range
            const [year, month] = period.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

            // Get all department budgets with their active cycles for the period
            const departmentBudgets = await prisma.department_budget.findMany({
                where: {
                    is_deleted: false,
                },
                include: {
                    cycles: {
                        where: {
                            start_date: {
                                lte: endDate,
                            },
                            OR: [
                                { end_date: null },
                                { end_date: { gte: startDate } },
                            ],
                            is_deleted: false,
                        },
                        orderBy: {
                            start_date: 'desc',
                        },
                        take: 1, // Get the most recent cycle for this period
                    },
                },
                orderBy: {
                    department_name: 'asc',
                },
            });

            // Map to DTO format
            return departmentBudgets.map((dept) => {
                const activeCycle = dept.cycles[0];

                // If no cycle exists for this period, use zeros
                const allocatedBudget = activeCycle
                    ? Number(activeCycle.starting_budget)
                    : 0;
                const usedBudget = activeCycle
                    ? Number(activeCycle.used_budget)
                    : 0;
                const remainingBudget = activeCycle
                    ? Number(activeCycle.remaining_budget)
                    : 0;

                return {
                    department_id: dept.department_id,
                    department_name: dept.department_name || dept.department_id,
                    allocated_budget: allocatedBudget,
                    used_budget: usedBudget,
                    remaining_budget: remainingBudget,
                    last_update_date: (activeCycle?.updated_at || dept.updated_at || dept.created_at).toISOString(),
                    budget_period: period,
                    status: remainingBudget < 0 ? 'Exceeded' : 'Active',
                };
            });
        } catch (error) {
            logger.error('[BudgetAllocationService] getDepartmentBudgetsByPeriod error:', error);
            throw error;
        }
    }

    /**
     * Allocate budget to a department (INCREASE)
     */
    async allocateBudget(data: AllocateBudgetDTO, userId: string): Promise<AllocationResult> {
        try {
            return await prisma.$transaction(async (tx) => {
                // Find the department budget
                const departmentBudget = await tx.department_budget.findUnique({
                    where: { department_id: data.department_id },
                });

                if (!departmentBudget) {
                    throw new Error(`Department with ID ${data.department_id} not found`);
                }

                // Parse period to find/create cycle
                const [year, month] = data.period.split('-').map(Number);
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);

                // Find or create budget cycle for this period
                let cycle = await tx.department_budget_cycle.findFirst({
                    where: {
                        budget_id: departmentBudget.id,
                        start_date: {
                            lte: endDate,
                        },
                        OR: [
                            { end_date: null },
                            { end_date: { gte: startDate } },
                        ],
                        is_deleted: false,
                    },
                });

                if (!cycle) {
                    // Create new cycle for this period
                    cycle = await tx.department_budget_cycle.create({
                        data: {
                            budget_id: departmentBudget.id,
                            cycle_type: 'MONTHLY',
                            start_date: startDate,
                            end_date: endDate,
                            starting_budget: 0,
                            used_budget: 0,
                            remaining_budget: 0,
                            is_active: true,
                            created_by: userId,
                        },
                    });
                }

                // Create allocation record
                const allocation = await tx.direct_budget_allocation.create({
                    data: {
                        budget_id: departmentBudget.id,
                        allocated_amount: data.amount,
                        allocation_date: new Date(),
                        allocated_by: userId,
                        budget_allocation_type: budget_allocation_type.INCREASE,
                        description: data.notes || 'Budget allocation',
                        created_by: userId,
                    },
                });

                // Update cycle budgets
                const newStartingBudget = Number(cycle.starting_budget) + data.amount;
                const newRemainingBudget = Number(cycle.remaining_budget) + data.amount;

                await tx.department_budget_cycle.update({
                    where: { id: cycle.id },
                    data: {
                        starting_budget: newStartingBudget,
                        remaining_budget: newRemainingBudget,
                        updated_by: userId,
                    },
                });

                // Update overall department budget
                const newTotalBudget = Number(departmentBudget.total_budget) + data.amount;
                const newDeptRemaining = Number(departmentBudget.remaining_budget) + data.amount;

                await tx.department_budget.update({
                    where: { id: departmentBudget.id },
                    data: {
                        total_budget: newTotalBudget,
                        remaining_budget: newDeptRemaining,
                        updated_by: userId,
                    },
                });

                return {
                    allocation_id: allocation.id,
                    new_allocated_budget: newStartingBudget,
                    new_remaining_budget: newRemainingBudget,
                };
            });
        } catch (error) {
            logger.error('[BudgetAllocationService] allocateBudget error:', error);
            throw error;
        }
    }

    /**
     * Deduct budget from a department (DECREASE)
     */
    async deductBudget(data: DeductBudgetDTO, userId: string): Promise<AllocationResult> {
        try {
            return await prisma.$transaction(async (tx) => {
                // Find the department budget
                const departmentBudget = await tx.department_budget.findUnique({
                    where: { department_id: data.department_id },
                });

                if (!departmentBudget) {
                    throw new Error(`Department with ID ${data.department_id} not found`);
                }

                // Parse period to find cycle
                const [year, month] = data.period.split('-').map(Number);
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);

                // Find budget cycle for this period
                const cycle = await tx.department_budget_cycle.findFirst({
                    where: {
                        budget_id: departmentBudget.id,
                        start_date: {
                            lte: endDate,
                        },
                        OR: [
                            { end_date: null },
                            { end_date: { gte: startDate } },
                        ],
                        is_deleted: false,
                    },
                });

                if (!cycle) {
                    throw new Error(`No budget cycle found for period ${data.period}`);
                }

                // Check if deduction amount is valid
                if (data.amount > Number(cycle.starting_budget)) {
                    throw new Error(`Cannot deduct more than allocated budget (${cycle.starting_budget})`);
                }

                // Create deduction record
                const allocation = await tx.direct_budget_allocation.create({
                    data: {
                        budget_id: departmentBudget.id,
                        allocated_amount: data.amount,
                        allocation_date: new Date(),
                        allocated_by: userId,
                        budget_allocation_type: budget_allocation_type.DECREASE,
                        description: data.notes || 'Budget deduction',
                        created_by: userId,
                    },
                });

                // Update cycle budgets
                const newStartingBudget = Number(cycle.starting_budget) - data.amount;
                const newRemainingBudget = Number(cycle.remaining_budget) - data.amount;

                await tx.department_budget_cycle.update({
                    where: { id: cycle.id },
                    data: {
                        starting_budget: newStartingBudget,
                        remaining_budget: newRemainingBudget,
                        updated_by: userId,
                    },
                });

                // Update overall department budget
                const newTotalBudget = Number(departmentBudget.total_budget) - data.amount;
                const newDeptRemaining = Number(departmentBudget.remaining_budget) - data.amount;

                await tx.department_budget.update({
                    where: { id: departmentBudget.id },
                    data: {
                        total_budget: newTotalBudget,
                        remaining_budget: newDeptRemaining,
                        updated_by: userId,
                    },
                });

                return {
                    allocation_id: allocation.id,
                    new_allocated_budget: newStartingBudget,
                    new_remaining_budget: newRemainingBudget,
                };
            });
        } catch (error) {
            logger.error('[BudgetAllocationService] deductBudget error:', error);
            throw error;
        }
    }

    /**
     * Get allocation history for a department
     */
    async getAllocationHistory(
        departmentId: string,
        filters?: HistoryFilters
    ): Promise<{ data: AllocationHistoryDTO[]; total: number }> {
        try {
            // Find department budget
            const departmentBudget = await prisma.department_budget.findUnique({
                where: { department_id: departmentId },
            });

            if (!departmentBudget) {
                throw new Error(`Department with ID ${departmentId} not found`);
            }

            // Build where clause
            const where: any = {
                budget_id: departmentBudget.id,
                is_deleted: false,
            };

            // Filter by type
            if (filters?.type) {
                where.budget_allocation_type = filters.type === 'Allocation'
                    ? budget_allocation_type.INCREASE
                    : budget_allocation_type.DECREASE;
            } else {
                // Exclude USAGE type - only show manual allocations/deductions
                where.budget_allocation_type = {
                    in: [budget_allocation_type.INCREASE, budget_allocation_type.DECREASE],
                };
            }

            // Filter by date range
            if (filters?.dateFrom) {
                where.allocation_date = {
                    ...where.allocation_date,
                    gte: new Date(filters.dateFrom),
                };
            }
            if (filters?.dateTo) {
                where.allocation_date = {
                    ...where.allocation_date,
                    lte: new Date(filters.dateTo),
                };
            }

            // Pagination
            const page = filters?.page || 1;
            const limit = filters?.limit || 20;
            const skip = (page - 1) * limit;

            // Get allocations with count
            const [allocations, total] = await Promise.all([
                prisma.direct_budget_allocation.findMany({
                    where,
                    orderBy: { allocation_date: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.direct_budget_allocation.count({ where }),
            ]);

            // Map to DTO format
            const data: AllocationHistoryDTO[] = allocations.map((alloc) => ({
                allocation_id: alloc.id.toString(),
                department_id: departmentId,
                type: alloc.budget_allocation_type === budget_allocation_type.INCREASE
                    ? 'Allocation'
                    : 'Deduction',
                amount: Number(alloc.allocated_amount),
                date: alloc.allocation_date.toISOString(),
                allocated_by: alloc.allocated_by || 'System',
                notes: alloc.description || '',
                created_at: alloc.created_at.toISOString(),
                updated_at: alloc.updated_at?.toISOString(),
            }));

            return { data, total };
        } catch (error) {
            logger.error('[BudgetAllocationService] getAllocationHistory error:', error);
            throw error;
        }
    }
}

export const budgetAllocationService = new BudgetAllocationService();
export default budgetAllocationService;
