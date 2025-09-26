import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Health based on local cache presence only
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const count = await (prisma as any).busTripCache.count({ where: { date_assigned: { gte: since } } });
    const responseTime = Date.now() - startTime;
    return NextResponse.json({
      status: count > 0 ? 'healthy' : 'degraded',
      message: count > 0 ? 'Assignments cache populated' : 'Assignments cache empty or stale',
      recentDays: 7,
      records: count,
      timestamp: new Date().toISOString(),
      responseTime,
    }, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message: msg, responseTime }, { status: 200 });
  }
} 