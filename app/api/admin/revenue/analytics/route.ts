/**
 * Admin Revenue Analytics API Route
 * Handles analytics calculation for revenue records
 * Admin-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/revenue/analytics
 * Get analytics for revenue records based on filters
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Build WHERE clause (same as main revenue API)
    const where: any = {};

    // Filter by source code (e.g., 'RENTAL')
    const sourceFilter = searchParams.get('sourceFilter');
    if (sourceFilter) {
      where.source = { sourceCode: sourceFilter };
    }

    // Filter by multiple sources (comma-separated IDs)
    const sources = searchParams.get('sources');
    if (sources) {
      const sourceIds = sources.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (sourceIds.length > 0) {
        where.sourceId = { in: sourceIds };
      }
    }

    // Filter by multiple payment methods (comma-separated IDs)
    const paymentMethods = searchParams.get('paymentMethods');
    if (paymentMethods) {
      const methodIds = paymentMethods.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (methodIds.length > 0) {
        where.paymentMethodId = { in: methodIds };
      }
    }

    // Date range filter
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) {
        where.transactionDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.transactionDate.lte = new Date(dateTo);
      }
    }

    // Amount range filter
    const amountFrom = searchParams.get('amountFrom');
    const amountTo = searchParams.get('amountTo');
    if (amountFrom || amountTo) {
      where.amount = {};
      if (amountFrom) {
        where.amount.gte = parseFloat(amountFrom);
      }
      if (amountTo) {
        where.amount.lte = parseFloat(amountTo);
      }
    }

    // Search filter (description, revenueCode)
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { revenueCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get all matching records for calculations
    const records = await prisma.revenue.findMany({
      where,
      select: {
        amount: true,
        transactionDate: true,
      },
    });

    // Calculate analytics
    const totalRevenue = records.reduce((sum, record) => sum + record.amount.toNumber(), 0);
    const recordCount = records.length;
    const activeRentals = recordCount; // Assume all rental revenues are active
    const averageRentalAmount = recordCount > 0 ? totalRevenue / recordCount : 0;

    // Calculate monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthlyRecords = records.filter(record =>
      record.transactionDate >= startOfMonth && record.transactionDate <= endOfMonth
    );
    const monthlyRevenue = monthlyRecords.reduce((sum, record) => sum + record.amount.toNumber(), 0);

    // Available buses - placeholder, would need bus table
    const availableBuses = 25; // TODO: Query from bus table where status = 'AVAILABLE'

    const analytics = {
      totalRevenue,
      activeRentals,
      availableBuses,
      monthlyRevenue,
      averageRentalAmount,
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}