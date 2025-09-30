import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadDriveFileBuffer } from '@/lib/google/drive';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ attId: string }> }) {
  const { attId } = await params;
  const att = await (prisma as any).attachment.findUnique({ where: { id: attId } });
  if (!att || att.is_deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!att.file_id) return NextResponse.json({ error: 'Attachment not stored in Drive' }, { status: 400 });
  const { buffer, mimeType, name } = await downloadDriveFileBuffer(att.file_id);
    const body = new Uint8Array(buffer);
    return new Response(body, {
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${(name || att.original_name || 'file').replace(/"/g, '')}"`
    }
  });
}
