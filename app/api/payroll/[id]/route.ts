import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: payroll_id } = await params;
  if (!payroll_id) {
    return NextResponse.json({ success: false, error: 'Missing payroll_id' }, { status: 400 });
  }
  try {
    const record = await prisma.payrollRecord.findUnique({ where: { payroll_id } });
    if (!record) {
      return NextResponse.json({ success: false, error: 'Payroll record not found' }, { status: 404 });
    }
    const deleted = await prisma.payrollRecord.update({
      where: { payroll_id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: 'system', // TODO: Use actual user if available
      },
    });
    await prisma.auditLog.create({
      data: {
        action: 'DELETED',
        table_affected: 'PayrollRecord',
        record_id: payroll_id,
        performed_by: 'system', // TODO: Use actual user if available
        details: { old: record, new: deleted },
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 