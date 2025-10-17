/**
 * Admin Payment Methods API Route
 * Returns all available payment methods for filtering
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/payment-methods
 * List all payment methods
 */
export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: {
        methodName: 'asc'
      }
    });

    return NextResponse.json({
      data: methods,
      count: methods.length
    });
  } catch (error) {
    console.error('[Admin] Error fetching payment methods:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payment methods',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
