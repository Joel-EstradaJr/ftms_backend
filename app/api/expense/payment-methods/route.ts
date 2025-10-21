/* ============================================================
 * PAYMENT METHODS API ROUTE
 * ============================================================
 * Handles fetching all active payment methods
 * ============================================================ */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        methodCode: true,
        methodName: true,
        description: true,
      },
      orderBy: {
        methodName: 'asc',
      },
    });

    return NextResponse.json(paymentMethods, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}
