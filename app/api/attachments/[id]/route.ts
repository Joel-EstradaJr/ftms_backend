import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const att = await (prisma as any).attachment.findUnique({ where: { id } });
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Return JSON metadata; for file download, client should use the path under /public
  return NextResponse.json(att);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const att = await (prisma as any).attachment.findUnique({ where: { id } });
    if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Attempt to remove file
    const filePath = path.join(process.cwd(), 'public', att.path.replace(/^\/+/, ''));
    try { await fs.unlink(filePath); } catch {}
    await (prisma as any).attachment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
