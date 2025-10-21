/**
 * BUS TRIP EXPENSE HELPER FUNCTIONS
 * Handles creation and management of expenses linked to bus trip assignments
 * Integrates with BusTripCache and calculates reimbursements based on assignment type
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Bus Trip Assignment Data Structure
 * Matches the payload from Operations system
 */
export interface BusTripAssignment {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string; // ISO date string
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: 'Percentage' | 'Boundary';
  assignment_value: number; // 0.0 - 1.0 for Percentage, flat amount for Boundary
  payment_method: 'Cash' | 'Reimbursement';
  driver_name: string;
  conductor_name: string;
  driver_employee_number?: string;
  conductor_employee_number?: string;
  bus_plate_number: string;
  bus_type: string;
  body_number: string;
  route_code?: string;
  trip_status?: string;
}

/**
 * Reimbursement Breakdown for Bus Trip Expense
 */
export interface ReimbursementBreakdown {
  driverAmount: number;
  conductorAmount: number;
  total: number;
}

/**
 * Bus Trip Expense Creation Parameters
 */
export interface CreateBusTripExpenseParams {
  busTripData: BusTripAssignment;
  categoryId: number; // ExpenseCategory.id (typically FUEL category)
  paymentMethodId: number; // PaymentMethod.id
  description?: string;
  createdBy: string;
  documentIds?: string; // Comma-separated document IDs
}

/**
 * Bus Trip Expense Result
 */
export interface BusTripExpenseResult {
  expense: any; // Expense record
  reimbursements: any[]; // Reimbursement records (if payment_method is Reimbursement)
  busTripCache: any; // Updated BusTripCache record
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validates if a bus trip assignment can have an expense recorded
 * @param assignmentId - Assignment ID from operations
 * @returns Validation result with error message if invalid
 */
export async function validateBusTripForExpense(
  assignmentId: string
): Promise<{ valid: boolean; error?: string; busTripCache?: any }> {
  try {
    // Check if bus trip exists in cache
    const busTripCache = await prisma.busTripCache.findUnique({
      where: { assignmentId },
    });

    if (!busTripCache) {
      return {
        valid: false,
        error: `Bus trip with assignment ID "${assignmentId}" not found in cache. Please sync from Operations first.`,
      };
    }

    // Check if expense already recorded
    if (busTripCache.isExpenseRecorded) {
      return {
        valid: false,
        error: `Expense has already been recorded for assignment ID "${assignmentId}".`,
        busTripCache,
      };
    }

    // Check if trip status is valid (if present)
    if (busTripCache.tripStatus && busTripCache.tripStatus !== 'COMPLETED') {
      return {
        valid: false,
        error: `Cannot record expense for assignment ID "${assignmentId}". Trip status is "${busTripCache.tripStatus}".`,
        busTripCache,
      };
    }

    return { valid: true, busTripCache };
  } catch (error) {
    console.error('Error validating bus trip for expense:', error);
    return {
      valid: false,
      error: 'Failed to validate bus trip. Please try again.',
    };
  }
}

/**
 * Validates if expense category exists and is active
 */
export async function validateExpenseCategory(
  categoryId: number
): Promise<{ valid: boolean; error?: string; category?: any }> {
  try {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return {
        valid: false,
        error: `Expense category with ID ${categoryId} not found.`,
      };
    }

    if (!category.isActive) {
      return {
        valid: false,
        error: `Expense category "${category.name}" is not active.`,
      };
    }

    return { valid: true, category };
  } catch (error) {
    console.error('Error validating expense category:', error);
    return {
      valid: false,
      error: 'Failed to validate expense category.',
    };
  }
}

/**
 * Validates if payment method exists and is active
 */
export async function validatePaymentMethod(
  paymentMethodId: number
): Promise<{ valid: boolean; error?: string; paymentMethod?: any }> {
  try {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      return {
        valid: false,
        error: `Payment method with ID ${paymentMethodId} not found.`,
      };
    }

    if (!paymentMethod.isActive) {
      return {
        valid: false,
        error: `Payment method "${paymentMethod.methodName}" is not active.`,
      };
    }

    return { valid: true, paymentMethod };
  } catch (error) {
    console.error('Error validating payment method:', error);
    return {
      valid: false,
      error: 'Failed to validate payment method.',
    };
  }
}

// ============================================
// REIMBURSEMENT CALCULATION
// ============================================

/**
 * Calculates reimbursement breakdown for driver and conductor
 * Based on assignment type (Percentage or Boundary)
 * 
 * For Percentage assignments:
 *   - Driver/Conductor get percentage of trip revenue minus fuel expense
 *   - Split 50/50 between driver and conductor
 * 
 * For Boundary assignments:
 *   - Driver/Conductor pay fixed boundary amount
 *   - Company covers fuel expense
 *   - No reimbursement needed
 * 
 * @param busTripData - Bus trip assignment data
 * @returns Reimbursement breakdown
 */
export function calculateReimbursement(
  busTripData: BusTripAssignment
): ReimbursementBreakdown {
  const {
    assignment_type,
    assignment_value,
    trip_revenue,
    trip_fuel_expense,
    payment_method,
  } = busTripData;

  // Only calculate reimbursement if payment method is Reimbursement
  if (payment_method !== 'Reimbursement') {
    return {
      driverAmount: 0,
      conductorAmount: 0,
      total: 0,
    };
  }

  let totalReimbursement = 0;

  if (assignment_type === 'Percentage') {
    // Percentage: (Revenue - Fuel) * Percentage = Driver/Conductor share
    // Company reimburses fuel expense
    totalReimbursement = trip_fuel_expense;
  } else if (assignment_type === 'Boundary') {
    // Boundary: Fixed amount paid upfront
    // Company covers fuel, no reimbursement needed
    totalReimbursement = 0;
  }

  // Split 50/50 between driver and conductor
  const driverAmount = Number((totalReimbursement / 2).toFixed(2));
  const conductorAmount = Number((totalReimbursement / 2).toFixed(2));

  return {
    driverAmount,
    conductorAmount,
    total: driverAmount + conductorAmount,
  };
}

/**
 * Gets reimbursement details for display purposes
 * @param busTripData - Bus trip assignment data
 * @returns Formatted reimbursement details
 */
export function getReimbursementDetails(busTripData: BusTripAssignment): {
  hasReimbursement: boolean;
  breakdown: ReimbursementBreakdown;
  explanation: string;
} {
  const breakdown = calculateReimbursement(busTripData);
  const hasReimbursement = breakdown.total > 0;

  let explanation = '';

  if (busTripData.payment_method === 'Cash') {
    explanation = 'Cash payment - No reimbursement needed. Fuel expense paid directly.';
  } else if (busTripData.assignment_type === 'Percentage') {
    explanation = `Percentage assignment (${(busTripData.assignment_value * 100).toFixed(1)}%) - Driver and conductor to be reimbursed for fuel expense of ₱${busTripData.trip_fuel_expense.toLocaleString()}, split equally.`;
  } else if (busTripData.assignment_type === 'Boundary') {
    explanation = `Boundary assignment (₱${busTripData.assignment_value.toLocaleString()}) - Company covers fuel directly. No reimbursement needed.`;
  }

  return {
    hasReimbursement,
    breakdown,
    explanation,
  };
}

// ============================================
// BUS TRIP CACHE SYNC
// ============================================

/**
 * Syncs or updates bus trip cache from operations data
 * @param busTripData - Bus trip assignment data
 * @returns Updated or created BusTripCache record
 */
export async function syncBusTripCache(
  busTripData: BusTripAssignment
): Promise<any> {
  try {
    const busTripCache = await prisma.busTripCache.upsert({
      where: { assignmentId: busTripData.assignment_id },
      update: {
        busTripId: busTripData.bus_trip_id,
        busRoute: busTripData.bus_route,
        isRevenueRecorded: busTripData.is_revenue_recorded,
        isExpenseRecorded: busTripData.is_expense_recorded,
        dateAssigned: new Date(busTripData.date_assigned),
        tripFuelExpense: new Decimal(busTripData.trip_fuel_expense),
        tripRevenue: new Decimal(busTripData.trip_revenue),
        assignmentType: busTripData.assignment_type,
        assignmentValue: new Decimal(busTripData.assignment_value),
        paymentMethod: busTripData.payment_method,
        driverName: busTripData.driver_name,
        conductorName: busTripData.conductor_name,
        driverEmployeeNumber: busTripData.driver_employee_number || null,
        conductorEmployeeNumber: busTripData.conductor_employee_number || null,
        busPlateNumber: busTripData.bus_plate_number,
        busType: busTripData.bus_type,
        bodyNumber: busTripData.body_number,
        routeCode: busTripData.route_code || null,
        tripStatus: busTripData.trip_status || 'COMPLETED',
        lastSynced: new Date(),
        updatedAt: new Date(),
      },
      create: {
        assignmentId: busTripData.assignment_id,
        busTripId: busTripData.bus_trip_id,
        busRoute: busTripData.bus_route,
        isRevenueRecorded: busTripData.is_revenue_recorded,
        isExpenseRecorded: busTripData.is_expense_recorded,
        dateAssigned: new Date(busTripData.date_assigned),
        tripFuelExpense: new Decimal(busTripData.trip_fuel_expense),
        tripRevenue: new Decimal(busTripData.trip_revenue),
        assignmentType: busTripData.assignment_type,
        assignmentValue: new Decimal(busTripData.assignment_value),
        paymentMethod: busTripData.payment_method,
        driverName: busTripData.driver_name,
        conductorName: busTripData.conductor_name,
        driverEmployeeNumber: busTripData.driver_employee_number || null,
        conductorEmployeeNumber: busTripData.conductor_employee_number || null,
        busPlateNumber: busTripData.bus_plate_number,
        busType: busTripData.bus_type,
        bodyNumber: busTripData.body_number,
        routeCode: busTripData.route_code || null,
        tripStatus: busTripData.trip_status || 'COMPLETED',
        lastSynced: new Date(),
      },
    });

    return busTripCache;
  } catch (error) {
    console.error('Error syncing bus trip cache:', error);
    throw new Error('Failed to sync bus trip cache');
  }
}

// ============================================
// EXPENSE CREATION
// ============================================

/**
 * Creates an expense record for a bus trip with reimbursements
 * Validates all inputs, creates expense, reimbursements, and updates cache
 * 
 * @param params - Expense creation parameters
 * @returns Created expense with reimbursements and updated cache
 */
export async function createBusTripExpense(
  params: CreateBusTripExpenseParams
): Promise<BusTripExpenseResult> {
  const { busTripData, categoryId, paymentMethodId, description, createdBy, documentIds } = params;

  try {
    // Step 1: Validate bus trip
    const busTripValidation = await validateBusTripForExpense(busTripData.assignment_id);
    if (!busTripValidation.valid) {
      throw new Error(busTripValidation.error);
    }

    // Step 2: Validate expense category
    const categoryValidation = await validateExpenseCategory(categoryId);
    if (!categoryValidation.valid) {
      throw new Error(categoryValidation.error);
    }

    // Step 3: Validate payment method
    const paymentMethodValidation = await validatePaymentMethod(paymentMethodId);
    if (!paymentMethodValidation.valid) {
      throw new Error(paymentMethodValidation.error);
    }

    // Step 4: Sync/update bus trip cache
    const busTripCache = await syncBusTripCache(busTripData);

    // Step 5: Calculate reimbursements
    const reimbursementBreakdown = calculateReimbursement(busTripData);
    const hasReimbursement = reimbursementBreakdown.total > 0;

    // Step 6: Create expense and reimbursements in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create expense record
      const expense = await tx.expense.create({
        data: {
          categoryId,
          description:
            description ||
            `Fuel expense for ${busTripData.bus_route} - ${busTripData.bus_plate_number} (${new Date(busTripData.date_assigned).toLocaleDateString()})`,
          amount: new Decimal(busTripData.trip_fuel_expense),
          transactionDate: new Date(busTripData.date_assigned),
          paymentMethodId,
          busTripCacheId: busTripCache.id,
          isReimbursement: hasReimbursement,
          documentIds: documentIds || null,
          createdBy,
        },
        include: {
          category: true,
          paymentMethod: true,
          busTripCache: true,
        },
      });

      // Create reimbursement records if applicable
      const reimbursements = [];
      if (hasReimbursement) {
        // Driver reimbursement
        const driverReimbursement = await tx.reimbursement.create({
          data: {
            expenseId: expense.id,
            employeeNumber: busTripData.driver_employee_number || 'UNKNOWN',
            employeeName: busTripData.driver_name,
            department: 'Operations',
            claimedAmount: new Decimal(reimbursementBreakdown.driverAmount),
            status: 'PENDING',
            remarks: `Fuel reimbursement for driver - ${busTripData.bus_route}`,
            createdBy,
          },
        });
        reimbursements.push(driverReimbursement);

        // Conductor reimbursement
        const conductorReimbursement = await tx.reimbursement.create({
          data: {
            expenseId: expense.id,
            employeeNumber: busTripData.conductor_employee_number || 'UNKNOWN',
            employeeName: busTripData.conductor_name,
            department: 'Operations',
            claimedAmount: new Decimal(reimbursementBreakdown.conductorAmount),
            status: 'PENDING',
            remarks: `Fuel reimbursement for conductor - ${busTripData.bus_route}`,
            createdBy,
          },
        });
        reimbursements.push(conductorReimbursement);
      }

      // Update bus trip cache - mark expense as recorded
      const updatedCache = await tx.busTripCache.update({
        where: { id: busTripCache.id },
        data: {
          isExpenseRecorded: true,
          updatedAt: new Date(),
        },
      });

      return { expense, reimbursements, busTripCache: updatedCache };
    });

    return result;
  } catch (error) {
    console.error('Error creating bus trip expense:', error);
    throw error;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Gets all expenses for a specific bus trip
 * @param assignmentId - Assignment ID from operations
 * @returns Array of expense records
 */
export async function getBusTripExpenses(assignmentId: string): Promise<any[]> {
  try {
    const busTripCache = await prisma.busTripCache.findUnique({
      where: { assignmentId },
    });

    if (!busTripCache) {
      return [];
    }

    const expenses = await prisma.expense.findMany({
      where: { busTripCacheId: busTripCache.id },
      include: {
        category: true,
        paymentMethod: true,
        reimbursements: {
          include: {
            paymentMethod: true,
          },
        },
        busTripCache: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return expenses;
  } catch (error) {
    console.error('Error getting bus trip expenses:', error);
    return [];
  }
}

/**
 * Checks if a bus trip has any pending reimbursements
 * @param assignmentId - Assignment ID from operations
 * @returns True if there are pending reimbursements
 */
export async function hasPendingReimbursements(assignmentId: string): Promise<boolean> {
  try {
    const busTripCache = await prisma.busTripCache.findUnique({
      where: { assignmentId },
    });

    if (!busTripCache) {
      return false;
    }

    const count = await prisma.reimbursement.count({
      where: {
        expense: {
          busTripCacheId: busTripCache.id,
        },
        status: 'PENDING',
      },
    });

    return count > 0;
  } catch (error) {
    console.error('Error checking pending reimbursements:', error);
    return false;
  }
}

/**
 * Gets summary of all bus trip expenses for a date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Summary statistics
 */
export async function getBusTripExpenseSummary(
  startDate: string,
  endDate: string
): Promise<{
  totalExpenses: number;
  totalAmount: number;
  totalReimbursements: number;
  pendingReimbursements: number;
  byCategory: Array<{ category: string; count: number; amount: number }>;
}> {
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        transactionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        busTripCacheId: { not: null },
      },
      include: {
        category: true,
        reimbursements: true,
      },
    });

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const allReimbursements = expenses.flatMap((exp) => exp.reimbursements);
    const totalReimbursements = allReimbursements.length;
    const pendingReimbursements = allReimbursements.filter((r) => r.status === 'PENDING').length;

    // Group by category
    const categoryMap = new Map<string, { count: number; amount: number }>();
    expenses.forEach((exp) => {
      const categoryName = exp.category.name;
      const existing = categoryMap.get(categoryName) || { count: 0, amount: 0 };
      categoryMap.set(categoryName, {
        count: existing.count + 1,
        amount: existing.amount + Number(exp.amount),
      });
    });

    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
    }));

    return {
      totalExpenses,
      totalAmount,
      totalReimbursements,
      pendingReimbursements,
      byCategory,
    };
  } catch (error) {
    console.error('Error getting bus trip expense summary:', error);
    return {
      totalExpenses: 0,
      totalAmount: 0,
      totalReimbursements: 0,
      pendingReimbursements: 0,
      byCategory: [],
    };
  }
}

/**
 * Formats bus trip assignment for display
 * @param busTripData - Bus trip assignment data
 * @returns Formatted display string
 */
export function formatBusTripDisplay(busTripData: BusTripAssignment): string {
  const date = new Date(busTripData.date_assigned).toLocaleDateString();
  return `${busTripData.bus_route} | ${busTripData.bus_plate_number} | ${date} | ₱${busTripData.trip_fuel_expense.toLocaleString()} fuel`;
}

/**
 * Formats assignment details for display
 * @param busTripData - Bus trip assignment data
 * @returns Formatted assignment details
 */
export function formatAssignmentDetails(busTripData: BusTripAssignment): string {
  if (busTripData.assignment_type === 'Percentage') {
    return `${(busTripData.assignment_value * 100).toFixed(1)}% of (Revenue - Fuel)`;
  } else {
    return `Boundary: ₱${busTripData.assignment_value.toLocaleString()}`;
  }
}

// Import Decimal for proper type handling
import { Decimal } from '@prisma/client/runtime/library';
