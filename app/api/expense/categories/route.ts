/* ============================================================
 * EXPENSE CATEGORIES API ROUTE
 * ============================================================
 * Handles fetching all active expense categories
 * ============================================================ */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        categoryCode: true,
        name: true,
        description: true,
        department: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      { message: 'Failed to fetch expense categories' },
      { status: 500 }
    );
  }
}
