import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/idGenerator';

// GET: List all terms
export async function GET() {
  const terms = await prisma.globalTerms.findMany({ where: { is_deleted: false } });
  return NextResponse.json(terms);
}

// POST: Create a new term
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const id = await generateId('TERM');
  const term = await prisma.globalTerms.create({
    data: { id, name, is_deleted: false }
  });
  return NextResponse.json(term);
}

// PUT: Update a term
export async function PUT(req: NextRequest) {
  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const updated = await prisma.globalTerms.update({
    where: { id },
    data: { name }
  });
  return NextResponse.json(updated);
}

// DELETE: Soft delete a term
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await prisma.globalTerms.update({ where: { id }, data: { is_deleted: true } });
  return NextResponse.json({ success: true });
} 