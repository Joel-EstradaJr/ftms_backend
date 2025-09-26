import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

// GET: List all sources
export async function GET() {
  const sources = await (prisma as any).globalSource.findMany({
    where: { is_deleted: false, is_active: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(sources);
}

// POST: Create a new source
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body ?? {};
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const id = await generateId('SRC');
  const source = await prisma.globalSource.create({
    data: { id, name, is_deleted: false, is_active: true },
  });
  return NextResponse.json(source);
}

// PUT: Update a source
export async function PUT(req: NextRequest) {
  const { source_id, id: idFromBody, name } = await req.json();
  const id = idFromBody ?? source_id;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const updated = await prisma.globalSource.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json(updated);
}

// DELETE: Soft delete a source
export async function DELETE(req: NextRequest) {
  const { source_id, id: idFromBody } = await req.json();
  const id = idFromBody ?? source_id;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await prisma.globalSource.update({ where: { id }, data: { is_deleted: true } });
  return NextResponse.json({ success: true });
}