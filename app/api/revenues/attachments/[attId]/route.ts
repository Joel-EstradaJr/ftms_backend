import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromDrive } from '@/lib/google/drive';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ attId: string }> }) {
  const { attId } = await params;
  const att = await (prisma as any).attachment.findUnique({ where: { id: attId } });
  if (!att || att.is_deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(att);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ attId: string }> }) {
  try {
    const { attId } = await params;
    const att = await (prisma as any).attachment.findUnique({ where: { id: attId } });
    if (!att || att.is_deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft delete in DB first
    await (prisma as any).attachment.update({ where: { id: attId }, data: { is_deleted: true } });

    // Try deleting from Drive if file_id exists
    if (att.file_id) {
      try { await deleteFromDrive(att.file_id); } catch {}
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
