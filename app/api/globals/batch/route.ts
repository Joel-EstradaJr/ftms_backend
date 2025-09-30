import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrSet } from '@/lib/serverCache';

// Return categories, payment-statuses, and payment-methods for a module in one response
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const module = searchParams.get('module');
  const cacheKey = `globals:batch:${module || 'all'}`;

  try {
    const data = await getOrSet(cacheKey, async () => {
      // Categories with their module links
      const categories = await prisma.$queryRaw<Array<{
        category_id: string;
        name: string;
        is_deleted: boolean;
        created_at: Date;
        updated_at: Date | null;
        applicable_modules: string[];
      }>>`
        SELECT c.id AS category_id,
               c.name,
               c.is_deleted,
               c.created_at,
               c.updated_at,
               COALESCE(array_agg(mc.module_name ORDER BY mc.module_name)
                        FILTER (WHERE mc.module_name IS NOT NULL), '{}') AS applicable_modules
        FROM "GlobalCategory" c
        LEFT JOIN "ModuleCategory" mc ON mc.category_id = c.id
        WHERE c.is_deleted = false AND c.is_active = true
          AND (${module}::text IS NULL OR EXISTS (
            SELECT 1 FROM "ModuleCategory" m2 WHERE m2.category_id = c.id AND m2.module_name = ${module}
          ))
        GROUP BY c.id, c.name, c.is_deleted, c.created_at, c.updated_at
        ORDER BY c.name ASC;
      `;

      // Payment statuses
      const statuses = await (prisma as any).globalPaymentStatus.findMany({
        where: { is_deleted: false, is_active: true, ...(module ? { applicable_modules: { has: module } } : {}) },
        orderBy: { name: 'asc' }
      });

      // Payment methods (filter by module via join table if provided)
      const methodsRaw = await (prisma as any).globalPaymentMethod.findMany({
        where: { is_deleted: false, is_active: true },
        include: module ? { module_links: true } : undefined,
        orderBy: { name: 'asc' }
      });
      const methods = module
        ? methodsRaw.filter((m: any) => Array.isArray(m.module_links) && m.module_links.some((l: any) => l.module_name === module))
        : methodsRaw;
      const sanitizedMethods = methods.map((m: any) => ({
        id: m.id,
        name: m.name,
        is_active: m.is_active,
        is_deleted: m.is_deleted,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));

      return { categories, payment_statuses: statuses, payment_methods: sanitizedMethods };
    });

    // Short Cache-Control to help browsers reuse response during UI mounts
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
  } catch (error) {
    console.error('Error fetching batched globals:', error);
    return NextResponse.json({ error: 'Failed to fetch globals' }, { status: 500 });
  }
}
