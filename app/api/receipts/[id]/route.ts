// Deprecated: Receipts API removed. This route returns 410 Gone.
import { NextResponse } from 'next/server';

export async function GET() { return NextResponse.json({ error: 'Receipts API removed' }, { status: 410 }); }
export async function PUT() { return NextResponse.json({ error: 'Receipts API removed' }, { status: 410 }); }
export async function DELETE() { return NextResponse.json({ error: 'Receipts API removed' }, { status: 410 }); }