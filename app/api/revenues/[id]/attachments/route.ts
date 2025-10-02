import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToDrive } from '@/lib/google/drive';

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.jfif', '.pdf', '.docx', '.csv', '.xlsx'];
const ALLOWED_MIME = new Set([
  'image/png','image/jpeg','image/jpg','image/pjpeg',
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const MAX_TOTAL = 50 * 1024 * 1024; // 50MB per revenue

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: id, is_deleted: false }, orderBy: { uploaded_at: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate revenue exists
  const rev = await (prisma as any).revenueRecord.findUnique({ where: { revenue_id: id } });
  if (!rev || rev.is_deleted) return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });

  const form = await req.formData();
  const files: File[] = [];
  for (const [key, val] of form.entries()) {
    if (key === 'files' && val instanceof File) files.push(val);
  }
  if (files.length === 0) return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });

  // Enforce types and total size (including existing attachments)
  const existing = await (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: id, is_deleted: false } });
  const totalExisting = existing.reduce((s: number, a: any) => s + (a.size_bytes || 0), 0);
  let batchSize = 0;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const dotExt = `.${ext}`;
    if (!ALLOWED_EXT.includes(dotExt)) return NextResponse.json({ error: `Unsupported file type: ${dotExt}` }, { status: 400 });
    if (!ALLOWED_MIME.has(f.type)) return NextResponse.json({ error: `Unsupported MIME type: ${f.type}` }, { status: 400 });
    batchSize += f.size;
  }
  if (totalExisting + batchSize > MAX_TOTAL) return NextResponse.json({ error: 'Total attachments exceed 50MB per revenue' }, { status: 400 });

  const created: any[] = [];
  for (const f of files) {
    const arrayBuffer = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cleanName = f.name.replace(/[^\/\w\.-]/g, '_');
    const uploaded = await uploadToDrive({ name: cleanName, mimeType: f.type, buffer });
    const att = await (prisma as any).attachment.create({
      data: {
        module_name: 'revenue',
        record_id: id,
        file_id: uploaded.fileId,
        original_name: f.name,
        mime_type: f.type,
        size_bytes: f.size,
        path: null,
      }
    });
    created.push(att);
  }
  return NextResponse.json({ attachments: created });
}
