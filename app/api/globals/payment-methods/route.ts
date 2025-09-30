import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrSet } from '@/lib/serverCache';

// GET: List all active, non-deleted payment methods
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module');

  // When a module is provided, only return payment methods linked to that module
  const where: any = { is_deleted: false, is_active: true };
  const include: any = {};

  if (module) {
    include.module_links = true;
  }

  const cacheKey = `globals:payment-methods:${module || 'all'}`;
  const methodsRaw = await getOrSet(cacheKey, async () => (prisma as any).globalPaymentMethod.findMany({
    where,
    include,
    orderBy: { name: 'asc' }
  }));

  const methods = module
    ? methodsRaw.filter((m: any) => Array.isArray(m.module_links) && m.module_links.some((l: any) => l.module_name === module))
    : methodsRaw;

  // Strip module_links from response for cleanliness
  const sanitized = methods.map((m: any) => ({
    id: m.id,
    name: m.name,
    is_active: m.is_active,
    is_deleted: m.is_deleted,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));

  return new NextResponse(JSON.stringify(sanitized), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, s-maxage=60' }
  });
}
