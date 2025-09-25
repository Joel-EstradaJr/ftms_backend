// Deprecated: Receipt OCR API removed. This route returns 410 Gone.
import { NextResponse } from 'next/server';

export async function POST() { return NextResponse.json({ error: 'Receipts OCR API removed' }, { status: 410 }); }