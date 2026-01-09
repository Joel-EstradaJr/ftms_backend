// lib/revenues/busTripRevenue.ts
// Business logic for creating revenue from bus trips

import { prisma } from '@/lib/prisma';

export interface CreateBusTripRevenueParams {
  busTripCacheId: number;
  userId: string;
  overrideAmount?: number;
  remarks?: string;
}

/**
 * Create a revenue record from a bus trip cache entry
 * 
 * @param params - Parameters for creating the revenue
 * @returns The created revenue with relations
 * @throws Error if bus trip not found or already has revenue recorded
 */
export async function createRevenueFromBusTrip(params: CreateBusTripRevenueParams) {
  const { busTripCacheId, userId, overrideAmount, remarks } = params;

  // Fetch the bus trip by ID
  const busTrip = await prisma.busTripCache.findFirst({
    where: { id: busTripCacheId },
  });

  if (!busTrip) {
    throw new Error('Bus trip not found');
  }

  // Check if revenue already recorded (using camelCase from @map directive)
  if (busTrip.isRevenueRecorded) {
    throw new Error('Revenue already recorded for this bus trip');
  }

  // Find or create BUS_TRIP revenue source
  let revenueSource = await prisma.revenueSource.findFirst({
    where: { sourceCode: 'BUS_TRIP' },
  });

  if (!revenueSource) {
    // Create BUS_TRIP source if it doesn't exist
    revenueSource = await prisma.revenueSource.create({
      data: {
        sourceCode: 'BUS_TRIP',
        name: 'Bus Trip Revenue',
        description: 'Revenue from bus trip operations',
        isActive: true,
      },
    });
  }

  // Find default Cash payment method
  let paymentMethod = await prisma.paymentMethod.findFirst({
    where: { methodCode: 'CASH' },
  });

  if (!paymentMethod) {
    // Create Cash payment method if it doesn't exist
    paymentMethod = await prisma.paymentMethod.create({
      data: {
        methodCode: 'CASH',
        methodName: 'Cash',
        description: 'Cash payment',
        isActive: true,
      },
    });
  }

  // Format date for description
  const dateStr = busTrip.dateAssigned.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  // Determine amount (use override if provided, otherwise use trip revenue)
  const amount = overrideAmount ?? parseFloat(busTrip.tripRevenue.toString());

  // Create the revenue record
  const revenue = await prisma.revenue.create({
    data: {
      sourceId: revenueSource.id,
      description: `Bus Trip Revenue - ${busTrip.busRoute} on ${dateStr}`,
      amount,
      transactionDate: busTrip.dateAssigned,
      paymentMethodId: paymentMethod.id,
      busTripCacheId: busTrip.id,
      externalRefType: 'BUS_TRIP',
      externalRefId: busTrip.assignmentId,
      createdBy: userId,
      remarks,
    },
    include: {
      source: true,
      paymentMethod: true,
      busTripCache: true,
    },
  });

  // Update the bus trip cache to mark revenue as recorded
  await prisma.busTripCache.update({
    where: { assignmentId: busTrip.assignmentId },
    data: { isRevenueRecorded: true },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      userId,
      userName: userId,
      action: 'CREATE',
      module: 'REVENUE',
      recordId: revenue.id,
      recordType: 'Revenue',
      description: `Created revenue ${revenue.revenueCode} from bus trip ${busTrip.assignmentId}`,
      afterData: {
        revenueCode: revenue.revenueCode,
        amount: revenue.amount.toString(),
        busTripId: busTrip.assignmentId,
        busRoute: busTrip.busRoute,
      },
      revenueId: revenue.id,
    },
  });

  return { revenue };
}

/**
 * Check if a bus trip already has revenue recorded
 * 
 * @param assignmentId - Assignment ID of the bus trip
 * @returns True if revenue is already recorded
 */
export async function isBusTripRevenueRecorded(assignmentId: string): Promise<boolean> {
  const busTrip = await prisma.busTripCache.findUnique({
    where: { assignmentId },
    select: { isRevenueRecorded: true },
  });

  return busTrip?.isRevenueRecorded ?? false;
}

/**
 * Get available bus trips (without revenue recorded)
 * 
 * @param filters - Optional filters for assignment type, date range, etc.
 * @returns Array of bus trips available for revenue creation
 */
export async function getAvailableBusTrips(filters?: {
  assignmentType?: string;
  startDate?: Date;
  endDate?: Date;
  driverEmployeeNumber?: string;
  limit?: number;
}) {
  const where: any = {
    isRevenueRecorded: false,
  };

  if (filters?.assignmentType) {
    where.assignmentType = filters.assignmentType;
  }

  if (filters?.startDate || filters?.endDate) {
    where.dateAssigned = {};
    if (filters.startDate) {
      where.dateAssigned.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.dateAssigned.lte = filters.endDate;
    }
  }

  if (filters?.driverEmployeeNumber) {
    where.driverEmployeeNumber = filters.driverEmployeeNumber;
  }

  return prisma.busTripCache.findMany({
    where,
    orderBy: { dateAssigned: 'desc' },
    take: filters?.limit ?? 100,
  });
}
