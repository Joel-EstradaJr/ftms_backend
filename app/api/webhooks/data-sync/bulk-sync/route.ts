/**
 * Bulk Sync Endpoint for Initial Cache Population
 * POST /api/webhooks/data-sync/bulk-sync
 * 
 * Used for initial cache population or full re-sync from external systems (HR, Operations, Inventory).
 * Accepts arrays of records and processes them in batches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/shared/auditLogger';

interface BulkSyncPayload {
  source: 'hr_employees' | 'hr_payroll' | 'op_bus_trips';
  data: any[];
  clearExisting?: boolean; // If true, clear cache before inserting
}

/**
 * POST /api/webhooks/data-sync/bulk-sync
 * Bulk sync all records from external system
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ipAddress = await getClientIp(req);

  try {
    const payload: BulkSyncPayload = await req.json();

    // Validate payload
    if (!payload.source || !Array.isArray(payload.data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload: missing source or data array',
        },
        { status: 400 }
      );
    }

    let result: any;

    switch (payload.source) {
      case 'hr_employees':
        result = await bulkSyncEmployees(payload.data, payload.clearExisting);
        break;

      case 'hr_payroll':
        result = await bulkSyncPayroll(payload.data, payload.clearExisting);
        break;

      case 'op_bus_trips':
        result = await bulkSyncBusTrips(payload.data, payload.clearExisting);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown source: ${payload.source}`,
          },
          { status: 400 }
        );
    }

    const processingTime = Date.now() - startTime;

    console.log(`[Bulk Sync] ${payload.source} - ${result.processed} records - ${processingTime}ms`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: 'webhook-system',
        userName: 'Webhook Bulk Sync',
        action: 'CREATE',
        module: 'WEBHOOK',
        recordId: 0,
        recordType: `${payload.source}_bulk`,
        description: `Bulk sync: ${payload.source} - ${result.processed} records`,
        ipAddress,
      },
    }).catch((error) => {
      console.error('Audit log creation failed:', error);
    });

    return NextResponse.json(
      {
        success: true,
        message: `${payload.source} bulk sync completed`,
        ...result,
        processingTime: `${processingTime}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Bulk Sync Error]', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bulk sync',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Bulk sync employees
 */
async function bulkSyncEmployees(employees: any[], clearExisting = false) {
  if (clearExisting) {
    await prisma.employeeCache.deleteMany({});
  }

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const emp of employees) {
    try {
      const existing = await prisma.employeeCache.findUnique({
        where: { employeeNumber: emp.employeeNumber },
      });

      await prisma.employeeCache.upsert({
        where: { employeeNumber: emp.employeeNumber },
        create: {
          employeeNumber: emp.employeeNumber,
          firstName: emp.firstName,
          middleName: emp.middleName || null,
          lastName: emp.lastName,
          phone: emp.phone || null,
          position: emp.position,
          departmentId: emp.departmentId,
          department: emp.department,
          lastSynced: new Date(),
        },
        update: {
          firstName: emp.firstName,
          middleName: emp.middleName || null,
          lastName: emp.lastName,
          phone: emp.phone || null,
          position: emp.position,
          departmentId: emp.departmentId,
          department: emp.department,
          lastSynced: new Date(),
        },
      });

      if (existing) {
        results.updated++;
      } else {
        results.created++;
      }
      results.processed++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Employee ${emp.employeeNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Bulk sync payroll
 */
async function bulkSyncPayroll(payrollRecords: any[], clearExisting = false) {
  if (clearExisting) {
    await prisma.payrollCache.deleteMany({});
  }

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const record of payrollRecords) {
    try {
      const existing = await prisma.payrollCache.findFirst({
        where: { employeeNumber: record.employeeNumber },
      });

      // Transform nested data
      const attendanceData = record.attendances?.map((att: any) => ({
        date: att.date,
        status: att.status,
      }));

      const benefitsData = record.benefits?.map((ben: any) => ({
        value: parseFloat(ben.value),
        frequency: ben.frequency,
        effectiveDate: ben.effectiveDate,
        endDate: ben.endDate || null,
        isActive: ben.isActive,
        name: ben.benefitType.name,
      }));

      const deductionsData = record.deductions?.map((ded: any) => ({
        type: ded.type,
        value: parseFloat(ded.value),
        frequency: ded.frequency,
        effectiveDate: ded.effectiveDate,
        endDate: ded.endDate || null,
        isActive: ded.isActive,
        name: ded.deductionType.name,
      }));

      if (existing) {
        await prisma.payrollCache.update({
          where: { id: existing.id },
          data: {
            firstName: record.firstName,
            middleName: record.middleName || null,
            lastName: record.lastName,
            suffix: record.suffix || null,
            employeeStatus: record.employeeStatus,
            hiredate: record.hiredate ? new Date(record.hiredate) : null,
            terminationDate: record.terminationDate ? new Date(record.terminationDate) : null,
            basicRate: parseFloat(record.basicRate),
            positionName: record.position.positionName,
            departmentName: record.position.department.departmentName,
            attendanceData: attendanceData as any,
            benefitsData: benefitsData as any,
            deductionsData: deductionsData as any,
            lastSynced: new Date(),
          },
        });
        results.updated++;
      } else {
        await prisma.payrollCache.create({
          data: {
            employeeNumber: record.employeeNumber,
            firstName: record.firstName,
            middleName: record.middleName || null,
            lastName: record.lastName,
            suffix: record.suffix || null,
            employeeStatus: record.employeeStatus,
            hiredate: record.hiredate ? new Date(record.hiredate) : null,
            terminationDate: record.terminationDate ? new Date(record.terminationDate) : null,
            basicRate: parseFloat(record.basicRate),
            positionName: record.position.positionName,
            departmentName: record.position.department.departmentName,
            attendanceData: attendanceData as any,
            benefitsData: benefitsData as any,
            deductionsData: deductionsData as any,
            lastSynced: new Date(),
          },
        });
        results.created++;
      }

      results.processed++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Payroll ${record.employeeNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Bulk sync bus trips
 */
async function bulkSyncBusTrips(trips: any[], clearExisting = false) {
  if (clearExisting) {
    await prisma.busTripCache.deleteMany({});
  }

  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const trip of trips) {
    try {
      const existing = await prisma.busTripCache.findUnique({
        where: { assignmentId: trip.assignment_id },
      });

      await prisma.busTripCache.upsert({
        where: { assignmentId: trip.assignment_id },
        create: {
          assignmentId: trip.assignment_id,
          busTripId: trip.bus_trip_id,
          busRoute: trip.bus_route,
          isRevenueRecorded: trip.is_revenue_recorded,
          isExpenseRecorded: trip.is_expense_recorded,
          dateAssigned: new Date(trip.date_assigned),
          tripFuelExpense: trip.trip_fuel_expense,
          tripRevenue: trip.trip_revenue,
          assignmentType: trip.assignment_type,
          assignmentValue: trip.assignment_value,
          paymentMethod: trip.payment_method,
          driverName: trip.driver_name,
          conductorName: trip.conductor_name,
          busPlateNumber: trip.bus_plate_number,
          busType: trip.bus_type,
          bodyNumber: trip.body_number,
          lastSynced: new Date(),
        },
        update: {
          busTripId: trip.bus_trip_id,
          busRoute: trip.bus_route,
          isRevenueRecorded: trip.is_revenue_recorded,
          isExpenseRecorded: trip.is_expense_recorded,
          dateAssigned: new Date(trip.date_assigned),
          tripFuelExpense: trip.trip_fuel_expense,
          tripRevenue: trip.trip_revenue,
          assignmentType: trip.assignment_type,
          assignmentValue: trip.assignment_value,
          paymentMethod: trip.payment_method,
          driverName: trip.driver_name,
          conductorName: trip.conductor_name,
          busPlateNumber: trip.bus_plate_number,
          busType: trip.bus_type,
          bodyNumber: trip.body_number,
          lastSynced: new Date(),
        },
      });

      if (existing) {
        results.updated++;
      } else {
        results.created++;
      }
      results.processed++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Bus Trip ${trip.assignment_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * GET /api/webhooks/data-sync/bulk-sync
 * Info endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    service: 'External Data Bulk Sync',
    version: '1.0.0',
    endpoint: '/api/webhooks/data-sync/bulk-sync',
    method: 'POST',
    description: 'Bulk sync all records from external systems (HR, Operations, Inventory) for initial cache population',
    payload: {
      source: 'hr_employees | hr_payroll | op_bus_trips',
      data: 'Array of records matching external API structure',
      clearExisting: 'Optional: boolean - Clear cache before inserting (default: false)',
    },
  });
}
