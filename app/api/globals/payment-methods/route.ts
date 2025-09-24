import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all active, non-deleted payment methods
export async function GET() {
  const methods = await (prisma as any).globalPaymentMethod.findMany({
    where: { is_deleted: false, is_active: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(methods);
}
