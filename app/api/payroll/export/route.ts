import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import ExcelJS from 'exceljs';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { start, end, payrollPeriod } = await req.json();
    if (!start || !end || !payrollPeriod) {
      return NextResponse.json({ success: false, error: 'Missing required params' }, { status: 400 });
    }

    // Fetch payroll records for the period
    const records = await prisma.payrollRecord.findMany({
      where: {
        payroll_start_date: new Date(start),
        payroll_end_date: new Date(end),
        payroll_period: payrollPeriod,
        is_deleted: false,
      },
      orderBy: { employee_name: 'asc' },
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll');

    // Header row (merged and styled)
    worksheet.mergeCells('A1:V1');
    worksheet.getCell('A1').value = `FOR PAYROLL PERIOD ${formatDate(start)} TO ${formatDate(end)}`;
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };

    // Column headers (row 2)
    worksheet.addRow([
      "EMPLOYEES' NAME", 'POS', 'DAYS OF WORK', 'BASIC RATE', 'BASIC PAY',
      'OVERTIME REG.', 'OVERTIME HOL.', 'SIL', 'H/P', '13TH',
      'REV.', 'SAFETY', 'ADDL', 'GROSS TOTAL EARNINGS',
      'PHIC', 'PAG-IBIG', 'SSS', 'CASH ADV.', 'DAMAGE/SHORT', 'TOTAL DED.', 'NET PAY', "EMPLOYEE'S SIGNATURE"
    ]);
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };

    // Data rows
    records.forEach((rec, idx) => {
      worksheet.addRow([
        rec.employee_name,
        rec.job_title || '',
        Number(rec.days_worked),
        Number(rec.basic_rate),
        Number(rec.basic_pay),
        Number(rec.overtime_regular),
        Number(rec.overtime_holiday),
        Number(rec.service_incentive_leave),
        Number(rec.holiday_pay),
        Number(rec.thirteenth_month_pay),
        Number(rec.revenue_benefit),
        Number(rec.safety_benefit),
        Number(rec.additional_benefits),
        Number(rec.gross_total_earnings),
        Number(rec.philhealth_deduction),
        Number(rec.pag_ibig_deduction),
        Number(rec.sss_deduction),
        Number(rec.cash_advance),
        Number(rec.damage_shortage),
        Number(rec.total_deductions),
        Number(rec.net_pay),
        '' // Signature column
      ]);
    });

    // Auto width
    (worksheet.columns ?? []).forEach((col) => {
      let maxLength = 10;
      col?.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        if (val.length > maxLength) maxLength = val.length;
      });
      if (col) col.width = maxLength + 2;
    });

    // Prepare buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=payroll_export_${start}_to_${end}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 