import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// Define proper types for the where clause
interface WhereClause {
  is_deleted: boolean;
  is_active?: boolean;
  module_links?: {
    some: { module_name: string };
  };
}

// GET: List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleParam = searchParams.get('module');

    const whereClause: WhereClause = { is_deleted: false, is_active: true };

    if (moduleParam) {
      whereClause.module_links = { some: { module_name: moduleParam } };
    }

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
        AND (${moduleParam}::text IS NULL OR EXISTS (
          SELECT 1 FROM "ModuleCategory" m2 WHERE m2.category_id = c.id AND m2.module_name = ${moduleParam}
        ))
      GROUP BY c.id, c.name, c.is_deleted, c.created_at, c.updated_at
      ORDER BY c.name ASC;
    `;

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST: Create a new category
export async function POST(req: NextRequest) {
  const { name, modules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  try {
    const newId = uuidv4();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "GlobalCategory" (id, name, is_active, is_deleted, created_at) VALUES ($1, $2, TRUE, FALSE, NOW());',
      newId,
      name
    );

    if (Array.isArray(modules) && modules.length > 0) {
      for (const m of modules as string[]) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "ModuleCategory" (id, module_name, category_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (module_name, category_id) DO NOTHING;',
          uuidv4(),
          m,
          newId
        );
      }
    }

    const createdRows = await prisma.$queryRaw<Array<{ id: string; name: string; is_deleted: boolean; created_at: Date; updated_at: Date | null }>>`
      SELECT id, name, is_deleted, created_at, updated_at FROM "GlobalCategory" WHERE id = ${newId} LIMIT 1;
    `;
    const created = createdRows[0];

    return NextResponse.json({
      category_id: created?.id ?? newId,
      name: created?.name ?? name,
      is_deleted: created?.is_deleted ?? false,
      created_at: created?.created_at ?? new Date(),
      updated_at: created?.updated_at ?? null,
      applicable_modules: Array.isArray(modules) ? modules : [],
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

// PUT: Update a category
export async function PUT(req: NextRequest) {
  const { id, name, is_active, modules } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    await prisma.$executeRawUnsafe(
      'UPDATE "GlobalCategory" SET name = COALESCE($2, name), is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $1;',
      id,
      name ?? null,
      typeof is_active === 'boolean' ? is_active : null
    );

    if (Array.isArray(modules)) {
      await prisma.$executeRawUnsafe('DELETE FROM "ModuleCategory" WHERE category_id = $1;', id);
      for (const m of modules as string[]) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO "ModuleCategory" (id, module_name, category_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (module_name, category_id) DO NOTHING;',
          uuidv4(),
          m,
          id
        );
      }
    }

    const updatedRows = await prisma.$queryRaw<Array<{ id: string; name: string; is_deleted: boolean; created_at: Date; updated_at: Date | null }>>`
      SELECT id, name, is_deleted, created_at, updated_at FROM "GlobalCategory" WHERE id = ${id} LIMIT 1;
    `;
    const updated = updatedRows[0];

    return NextResponse.json({
      category_id: updated?.id ?? id,
      name: updated?.name ?? name,
      is_deleted: updated?.is_deleted ?? false,
      created_at: updated?.created_at ?? new Date(),
      updated_at: updated?.updated_at ?? new Date(),
      applicable_modules: Array.isArray(modules) ? modules : undefined,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE: Soft delete a category
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
  await prisma.$executeRawUnsafe('UPDATE "GlobalCategory" SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1;', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}