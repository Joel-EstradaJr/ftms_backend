import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Inventory API removed' },
    { status: 410 }
  );
}
