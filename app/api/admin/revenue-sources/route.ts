/**
 * Admin Revenue Sources API Route
 * Returns all available revenue sources for filtering
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/revenue-sources
 * List all revenue sources
 */
export async function GET() {
  try {
    const sources = await prisma.revenueSource.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      data: sources,
      count: sources.length
    });
  } catch (error) {
    console.error('[Admin] Error fetching revenue sources:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch revenue sources',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
