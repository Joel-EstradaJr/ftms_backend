import { NextRequest, NextResponse } from 'next/server';

// GET: List all item units (deprecated)
export async function GET() {
  return NextResponse.json(
    { error: 'Item units API is deprecated or not available in current schema.' },
    { status: 501 }
  );
}

// POST: Create a new item unit
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Item units API is deprecated or not available in current schema.' },
    { status: 501 }
  );
}