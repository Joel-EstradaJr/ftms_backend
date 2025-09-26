import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Aggregate counts and latest last_synced_at per table
    const [btCount, btMax, empCount, empMax, prCount, prMax] = await Promise.all([
      (prisma as any).busTripCache.count(),
      (prisma as any).busTripCache.aggregate({ _max: { last_synced_at: true } }),
      (prisma as any).employeeCache.count(),
      (prisma as any).employeeCache.aggregate({ _max: { last_synced_at: true } }),
      (prisma as any).payrollCache.count(),
      (prisma as any).payrollCache.aggregate({ _max: { last_synced_at: true } }),
    ]);

    const body = {
      busTripCache: {
        count: btCount,
        last_synced_at: btMax?._max?.last_synced_at ?? null,
      },
      employeeCache: {
        count: empCount,
        last_synced_at: empMax?._max?.last_synced_at ?? null,
      },
      payrollCache: {
        count: prCount,
        last_synced_at: prMax?._max?.last_synced_at ?? null,
      },
      now: new Date().toISOString(),
    };

    const res = NextResponse.json(body, { status: 200 });
    // Always fresh
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('[api] cache.health error', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
