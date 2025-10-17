/**
 * Webhook Receiver for External System Data Updates
 * POST /api/webhooks/data-sync
 * 
 * Receives webhook notifications from external systems (HR, Operations, Inventory)
 * and updates local cache tables:
 * 1. EmployeeCache - HR Employees data
 * 2. PayrollCache - HR Payroll data
 * 3. BusTripCache - Operations Bus Trip details
 * 4. Future: Inventory cache tables
 * 
 * This replaces the inefficient 5-minute polling with real-time push updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/shared/auditLogger';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface WebhookPayload {
  source: 'hr_employees' | 'hr_payroll' | 'op_bus_trips';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
  data: any;
  signature?: string; // Optional: for webhook authentication
}

interface EmployeeData {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  position: string;
  departmentId: number;
  department: string;
}

interface PayrollData {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  employeeStatus: string;
  hiredate?: string;
  terminationDate?: string;
  basicRate: string;
  position: {
    positionName: string;
    department: {
      departmentName: string;
    };
  };
  attendances?: Array<{
    date: string;
    status: string;
  }>;
  benefits?: Array<{
    value: string;
    frequency: string;
    effectiveDate: string;
    endDate?: string | null;
    isActive: boolean;
    benefitType: {
      name: string;
    };
  }>;
  deductions?: Array<{
    type: string;
    value: string;
    frequency: string;
    effectiveDate: string;
    endDate?: string | null;
    isActive: boolean;
    deductionType: {
      name: string;
    };
  }>;
}

interface BusTripData {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string;
  driver_name: string;
  conductor_name: string;
  bus_plate_number: string;
  bus_type: string;
  body_number: string;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate webhook signature (optional security measure)
 */
function validateSignature(payload: WebhookPayload, signature?: string): boolean {
  // TODO: Implement signature validation with shared secret
  // For now, we'll skip this and rely on network security
  // Example: HMAC-SHA256 verification
  if (process.env.WEBHOOK_SECRET && signature) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expectedSignature;
  }
  return true; // Skip validation if no secret configured
}

/**
 * Validate employee data structure
 */
function validateEmployeeData(data: any): data is EmployeeData {
  return (
    data &&
    typeof data.employeeNumber === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.position === 'string' &&
    typeof data.departmentId === 'number' &&
    typeof data.department === 'string'
  );
}

/**
 * Validate payroll data structure
 */
function validatePayrollData(data: any): data is PayrollData {
  return (
    data &&
    typeof data.employeeNumber === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.employeeStatus === 'string' &&
    typeof data.basicRate === 'string' &&
    data.position &&
    typeof data.position.positionName === 'string' &&
    data.position.department &&
    typeof data.position.department.departmentName === 'string'
  );
}

/**
 * Validate bus trip data structure
 */
function validateBusTripData(data: any): data is BusTripData {
  return (
    data &&
    typeof data.assignment_id === 'string' &&
    typeof data.bus_trip_id === 'string' &&
    typeof data.bus_route === 'string' &&
    typeof data.date_assigned === 'string' &&
    typeof data.trip_fuel_expense === 'number' &&
    typeof data.trip_revenue === 'number' &&
    typeof data.driver_name === 'string' &&
    typeof data.conductor_name === 'string'
  );
}

// ============================================
// UPSERT HANDLERS
// ============================================

/**
 * Upsert Employee Cache
 */
async function upsertEmployeeCache(data: EmployeeData, action: 'INSERT' | 'UPDATE' | 'DELETE') {
  if (action === 'DELETE') {
    // Soft delete: remove from cache
    await prisma.employeeCache.deleteMany({
      where: { employeeNumber: data.employeeNumber },
    });
    return { deleted: true, employeeNumber: data.employeeNumber };
  }

  // INSERT or UPDATE
  const upserted = await prisma.employeeCache.upsert({
    where: { employeeNumber: data.employeeNumber },
    create: {
      employeeNumber: data.employeeNumber,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      phone: data.phone || null,
      position: data.position,
      departmentId: data.departmentId,
      department: data.department,
      lastSynced: new Date(),
    },
    update: {
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      phone: data.phone || null,
      position: data.position,
      departmentId: data.departmentId,
      department: data.department,
      lastSynced: new Date(),
    },
  });

  return upserted;
}

/**
 * Upsert Payroll Cache
 */
async function upsertPayrollCache(data: PayrollData, action: 'INSERT' | 'UPDATE' | 'DELETE') {
  if (action === 'DELETE') {
    // Soft delete: remove from cache
    await prisma.payrollCache.deleteMany({
      where: { employeeNumber: data.employeeNumber },
    });
    return { deleted: true, employeeNumber: data.employeeNumber };
  }

  // Transform nested data for JSON storage
  const attendanceData = data.attendances?.map((att) => ({
    date: att.date,
    status: att.status,
  }));

  const benefitsData = data.benefits?.map((ben) => ({
    value: parseFloat(ben.value),
    frequency: ben.frequency,
    effectiveDate: ben.effectiveDate,
    endDate: ben.endDate || null,
    isActive: ben.isActive,
    name: ben.benefitType.name,
  }));

  const deductionsData = data.deductions?.map((ded) => ({
    type: ded.type,
    value: parseFloat(ded.value),
    frequency: ded.frequency,
    effectiveDate: ded.effectiveDate,
    endDate: ded.endDate || null,
    isActive: ded.isActive,
    name: ded.deductionType.name,
  }));

  // INSERT or UPDATE
  const existing = await prisma.payrollCache.findFirst({
    where: { employeeNumber: data.employeeNumber },
  });

  if (existing) {
    // UPDATE
    const updated = await prisma.payrollCache.update({
      where: { id: existing.id },
      data: {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        employeeStatus: data.employeeStatus,
        hiredate: data.hiredate ? new Date(data.hiredate) : null,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
        basicRate: parseFloat(data.basicRate),
        positionName: data.position.positionName,
        departmentName: data.position.department.departmentName,
        attendanceData: attendanceData as any,
        benefitsData: benefitsData as any,
        deductionsData: deductionsData as any,
        lastSynced: new Date(),
      },
    });
    return updated;
  } else {
    // INSERT
    const created = await prisma.payrollCache.create({
      data: {
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        suffix: data.suffix || null,
        employeeStatus: data.employeeStatus,
        hiredate: data.hiredate ? new Date(data.hiredate) : null,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
        basicRate: parseFloat(data.basicRate),
        positionName: data.position.positionName,
        departmentName: data.position.department.departmentName,
        attendanceData: attendanceData as any,
        benefitsData: benefitsData as any,
        deductionsData: deductionsData as any,
        lastSynced: new Date(),
      },
    });
    return created;
  }
}

/**
 * Upsert Bus Trip Cache
 */
async function upsertBusTripCache(data: BusTripData, action: 'INSERT' | 'UPDATE' | 'DELETE') {
  if (action === 'DELETE') {
    // Soft delete: remove from cache
    await prisma.busTripCache.deleteMany({
      where: { assignmentId: data.assignment_id },
    });
    return { deleted: true, assignmentId: data.assignment_id };
  }

  // INSERT or UPDATE
  const upserted = await prisma.busTripCache.upsert({
    where: { assignmentId: data.assignment_id },
    create: {
      assignmentId: data.assignment_id,
      busTripId: data.bus_trip_id,
      busRoute: data.bus_route,
      isRevenueRecorded: data.is_revenue_recorded,
      isExpenseRecorded: data.is_expense_recorded,
      dateAssigned: new Date(data.date_assigned),
      tripFuelExpense: data.trip_fuel_expense,
      tripRevenue: data.trip_revenue,
      assignmentType: data.assignment_type,
      assignmentValue: data.assignment_value,
      paymentMethod: data.payment_method,
      driverName: data.driver_name,
      conductorName: data.conductor_name,
      busPlateNumber: data.bus_plate_number,
      busType: data.bus_type,
      bodyNumber: data.body_number,
      lastSynced: new Date(),
    },
    update: {
      busTripId: data.bus_trip_id,
      busRoute: data.bus_route,
      isRevenueRecorded: data.is_revenue_recorded,
      isExpenseRecorded: data.is_expense_recorded,
      dateAssigned: new Date(data.date_assigned),
      tripFuelExpense: data.trip_fuel_expense,
      tripRevenue: data.trip_revenue,
      assignmentType: data.assignment_type,
      assignmentValue: data.assignment_value,
      paymentMethod: data.payment_method,
      driverName: data.driver_name,
      conductorName: data.conductor_name,
      busPlateNumber: data.bus_plate_number,
      busType: data.bus_type,
      bodyNumber: data.body_number,
      lastSynced: new Date(),
    },
  });

  return upserted;
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

/**
 * POST /api/webhooks/hr-updates
 * Webhook receiver for external system updates
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ipAddress = await getClientIp(req);

  try {
    // Parse request body
    const payload: WebhookPayload = await req.json();

    // Validate required fields
    if (!payload.source || !payload.action || !payload.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload: missing required fields (source, action, data)',
        },
        { status: 400 }
      );
    }

    // Optional: Validate webhook signature
    const signature = req.headers.get('x-webhook-signature');
    if (!validateSignature(payload, signature || undefined)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook signature',
        },
        { status: 401 }
      );
    }

    // Route to appropriate handler based on source
    let result: any;

    switch (payload.source) {
      case 'hr_employees':
        if (!validateEmployeeData(payload.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid employee data structure',
            },
            { status: 400 }
          );
        }
        result = await upsertEmployeeCache(payload.data, payload.action);
        break;

      case 'hr_payroll':
        if (!validatePayrollData(payload.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid payroll data structure',
            },
            { status: 400 }
          );
        }
        result = await upsertPayrollCache(payload.data, payload.action);
        break;

      case 'op_bus_trips':
        if (!validateBusTripData(payload.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid bus trip data structure',
            },
            { status: 400 }
          );
        }
        result = await upsertBusTripCache(payload.data, payload.action);
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

    // Log webhook event
    const processingTime = Date.now() - startTime;
    console.log(`[Webhook] ${payload.source} - ${payload.action} - ${processingTime}ms`, {
      source: payload.source,
      action: payload.action,
      recordId: result.id || result.employeeNumber || result.assignmentId,
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    // Create audit log (optional)
    await prisma.auditLog.create({
      data: {
        userId: 'webhook-system',
        userName: 'Webhook System',
        action: payload.action === 'INSERT' ? 'CREATE' : payload.action === 'DELETE' ? 'DELETE' : 'UPDATE',
        module: 'WEBHOOK',
        recordId: result.id || 0,
        recordType: payload.source,
        afterData: result as any,
        description: `Webhook: ${payload.source} ${payload.action} - ${result.employeeNumber || result.assignmentId || result.id}`,
        ipAddress,
      },
    }).catch((error) => {
      // Don't fail if audit log fails
      console.error('Audit log creation failed:', error);
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: `${payload.source} cache updated successfully`,
        action: payload.action,
        recordId: result.id || result.employeeNumber || result.assignmentId,
        processingTime: `${processingTime}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Webhook Error]', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/data-sync
 * Webhook health check and info endpoint
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    service: 'External Data Sync Webhook Receiver',
    version: '1.0.0',
    status: 'active',
    supportedSources: ['hr_employees', 'hr_payroll', 'op_bus_trips', 'inv_*'],
    supportedActions: ['INSERT', 'UPDATE', 'DELETE'],
    endpoint: '/api/webhooks/data-sync',
    method: 'POST',
    authentication: process.env.WEBHOOK_SECRET ? 'signature-based' : 'none',
    documentation: {
      payload: {
        source: 'hr_employees | hr_payroll | op_bus_trips',
        action: 'INSERT | UPDATE | DELETE',
        timestamp: 'ISO 8601 timestamp',
        data: 'Record data matching external API structure',
        signature: 'Optional: HMAC-SHA256 signature for authentication',
      },
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'Optional: Webhook signature',
      },
    },
  });
}
