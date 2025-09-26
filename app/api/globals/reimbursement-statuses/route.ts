import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get('module');

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    is_deleted: boolean;
    created_at: Date;
    updated_at: Date | null;
    applicable_modules: string[];
  }>>`
    SELECT s.id,
           s.name,
           s.is_deleted,
           s.created_at,
           s.updated_at,
           COALESCE(array_agg(ms.module_name ORDER BY ms.module_name)
                    FILTER (WHERE ms.module_name IS NOT NULL), '{}') AS applicable_modules
    FROM "GlobalReimbursementStatus" s
    LEFT JOIN "ModuleReimbursementStatus" ms ON ms.reimbursement_status_id = s.id
    WHERE s.is_deleted = false AND s.is_active = true
      AND (${moduleParam}::text IS NULL OR EXISTS (
        SELECT 1 FROM "ModuleReimbursementStatus" m2 WHERE m2.reimbursement_status_id = s.id AND m2.module_name = ${moduleParam}
      ))
    GROUP BY s.id
    ORDER BY s.name ASC;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, modules, is_active } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const id = uuidv4();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "GlobalReimbursementStatus" (id, name, is_active, is_deleted, created_at) VALUES ($1, $2, COALESCE($3, TRUE), FALSE, NOW());',
    id,
    name,
    typeof is_active === 'boolean' ? is_active : null
  );

  if (Array.isArray(modules)) {
    for (const m of modules as string[]) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "ModuleReimbursementStatus" (id, module_name, reimbursement_status_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (module_name, reimbursement_status_id) DO NOTHING;',
        uuidv4(),
        m,
        id
      );
    }
  }

  return NextResponse.json({ success: true, id });
}

export async function PUT(req: NextRequest) {
  const { id, name, is_active, modules } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.$executeRawUnsafe(
    'UPDATE "GlobalReimbursementStatus" SET name = COALESCE($2, name), is_active = COALESCE($3, is_active), updated_at = NOW() WHERE id = $1;',
    id,
    name ?? null,
    typeof is_active === 'boolean' ? is_active : null
  );

  if (Array.isArray(modules)) {
    await prisma.$executeRawUnsafe('DELETE FROM "ModuleReimbursementStatus" WHERE reimbursement_status_id = $1;', id);
    for (const m of modules as string[]) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "ModuleReimbursementStatus" (id, module_name, reimbursement_status_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (module_name, reimbursement_status_id) DO NOTHING;',
        uuidv4(),
        m,
        id
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await prisma.$executeRawUnsafe('UPDATE "GlobalReimbursementStatus" SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1;', id);
  return NextResponse.json({ success: true });
}
