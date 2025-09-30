import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXT = ['png','jpg','jpeg','jfif','pdf','docx','csv','xlsx'];
const ALLOWED_MIME = [
  'image/png','image/jpeg','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const module = url.searchParams.get('module');
    const record_id = url.searchParams.get('record_id');
    if (!module || !record_id) return NextResponse.json({ error: 'module and record_id are required' }, { status: 400 });

    const formData = await req.formData();
    const files = formData.getAll('files');
    if (!files || files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });

    // Validate sizes/types and enforce total limit
    let totalBytes = 0;
    const toSave: { file: File; buffer: Buffer; ext: string; mime: string; name: string; size: number }[] = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const file = f as File;
      const name = file.name || 'upload.bin';
      const size = file.size || 0;
      const mime = (file.type || '').toLowerCase();
      const ext = path.extname(name).replace('.', '').toLowerCase();
      if (!ALLOWED_EXT.includes(ext) || (mime && !ALLOWED_MIME.includes(mime))) {
        return NextResponse.json({ error: `Invalid file type for ${name}` }, { status: 400 });
      }
      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) return NextResponse.json({ error: 'Total upload size exceeds 50MB' }, { status: 400 });
      const arrayBuf = await file.arrayBuffer();
      toSave.push({ file, buffer: Buffer.from(arrayBuf), ext, mime, name, size });
    }

    // Save to public/uploads/{module}/{record_id}/
    const baseDir = path.join(process.cwd(), 'public', 'uploads', module, record_id);
    fs.mkdirSync(baseDir, { recursive: true });
    const saved: any[] = [];
    for (const item of toSave) {
      const fileName = `${Date.now()}_${item.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(baseDir, fileName);
      fs.writeFileSync(filePath, item.buffer);
      const dbRecord = await (prisma as any).attachment.create({
        data: {
          module_name: module,
          record_id,
          path: `/uploads/${module}/${record_id}/${fileName}`,
          original_name: item.name,
          mime_type: item.mime || 'application/octet-stream',
          size_bytes: item.size,
        }
      });
      saved.push(dbRecord);
    }

    return NextResponse.json({ uploaded: saved });
  } catch (e: any) {
    console.error('Attachment upload failed:', e);
    return NextResponse.json({ error: 'Upload failed', details: e?.message || String(e) }, { status: 500 });
  }
}
