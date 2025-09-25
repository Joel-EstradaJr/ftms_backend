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
  const { name, applicable_modules } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const source_id = await generateId('SRC');
  const source = await prisma.globalSource.create({
    data: { source_id, name, applicable_modules, is_deleted: false }
  });
  return NextResponse.json(source);
}

// PUT: Update a source
export async function PUT(req: NextRequest) {
  const { source_id, name, applicable_modules } = await req.json();
  if (!source_id) return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
  const updated = await prisma.globalSource.update({
    where: { source_id },
    data: { name, applicable_modules }
  });
  return NextResponse.json(updated);
}

// DELETE: Soft delete a source
export async function DELETE(req: NextRequest) {
  const { source_id } = await req.json();
  if (!source_id) return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
  await prisma.globalSource.update({ where: { source_id }, data: { is_deleted: true } });
  return NextResponse.json({ success: true });
} 