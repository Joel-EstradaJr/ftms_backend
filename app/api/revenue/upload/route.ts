import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.jfif', '.pdf', '.docx', '.csv', '.xlsx'];
const ALLOWED_MIME = new Set([
  'image/png','image/jpeg','image/jpg','image/pjpeg',
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const MAX_TOTAL = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const revenue_id = String(form.get('revenue_id') || '');
  if (!revenue_id) return NextResponse.json({ error: 'revenue_id is required' }, { status: 400 });
  const revenue = await prisma.revenueRecord.findUnique({ where: { revenue_id } });
  if (!revenue || revenue.is_deleted) return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });

  const files: File[] = [];
  for (const [key, val] of form.entries()) {
    if (key === 'files' && val instanceof File) files.push(val);
  }
  if (files.length === 0) return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });

  let totalSize = 0;
  for (const f of files) {
    const ext = path.extname(f.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
    if (!ALLOWED_MIME.has(f.type)) return NextResponse.json({ error: `Unsupported MIME type: ${f.type}` }, { status: 400 });
    totalSize += f.size;
  }
  if (totalSize > MAX_TOTAL) return NextResponse.json({ error: 'Total attachments exceed 50MB' }, { status: 400 });

  // Save files under public/uploads/revenue/{id}
  const baseDir = path.join(process.cwd(), 'public', 'uploads', 'revenue', revenue_id);
  await fs.mkdir(baseDir, { recursive: true });
  const created: any[] = [];
  for (const f of files) {
    const arrayBuffer = await f.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const clean = f.name.replace(/[^\w.-]/g, '_');
    const filePath = path.join(baseDir, clean);
    await fs.writeFile(filePath, buffer);
    const rel = path.posix.join('/uploads/revenue', revenue_id, clean);
    const att = await (prisma as any).attachment.create({
      data: {
        module_name: 'revenue',
        record_id: revenue_id,
        path: rel,
        original_name: f.name,
        mime_type: f.type,
        size_bytes: f.size,
      }
    });
    created.push(att);
  }
  return NextResponse.json({ attachments: created });
}
