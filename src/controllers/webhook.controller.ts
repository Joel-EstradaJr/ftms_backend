/**
 * WEBHOOK CONTROLLER
 * 
 * Handles incoming webhook events from external systems (HR, Inventory, Operations)
 * to update is_active status of _local records.
 * 
 * Key principles:
 * - is_active: External lifecycle control (set by external systems via webhooks)
 * - is_deleted: Internal lifecycle control (never modified by webhooks)
 * - Inactive records can still be used for historical references
 * - Deleted records are excluded from all usage
 */

import { Request, Response } from 'express';
import { PrismaClient, bus_trip_employee_role } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// WEBHOOK PAYLOAD INTERFACES
// ============================================================================

/**
 * Employee webhook payload from HR System
 */
interface EmployeeWebhookPayload {
  employee_number: string;
  is_active: boolean;
  // Optional full data for upsert
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  phone?: string | null;
  position?: string;
  barangay?: string | null;
  zip_code?: string | null;
  department_id?: number;
  department?: string;
}

/**
 * Bus webhook payload from Inventory System
 */
interface BusWebhookPayload {
  bus_id: string;
  is_active: boolean;
  // Optional full data for upsert
  license_plate?: string;
  body_number?: string;
  type?: string;
  capacity?: number;
}

/**
 * Rental webhook payload from Operations System
 */
interface RentalWebhookPayload {
  assignment_id: string;
  is_active: boolean;
  // Optional full data for upsert
  bus_id?: string;
  rental_status?: string;
  rental_package?: string;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  total_rental_amount?: number;
  down_payment_amount?: number | null;
  balance_amount?: number | null;
  down_payment_date?: string | null;
  full_payment_date?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

/**
 * Bus Trip webhook payload from Operations System
 */
interface BusTripWebhookPayload {
  assignment_id: string;
  bus_trip_id: string;
  is_active: boolean;
  // Optional full data for upsert
  bus_id?: string;
  bus_route?: string;
  date_assigned?: string;
  trip_fuel_expense?: number;
  trip_revenue?: number;
  assignment_type?: string;
  assignment_value?: number;
  payment_method?: string;
}

/**
 * Generic webhook response
 */
interface WebhookResponse {
  success: boolean;
  message: string;
  data?: {
    record_id: string | { assignment_id: string; bus_trip_id: string };
    is_active: boolean;
    last_synced_at: Date;
  };
  error?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle employee webhook from HR System
 * Endpoint: POST /api/webhooks/employee
 */
export async function handleEmployeeWebhook(
  req: Request<{}, {}, EmployeeWebhookPayload>,
  res: Response<WebhookResponse>
) {
  const { employee_number, is_active, ...optionalData } = req.body;

  // Validate required fields
  if (!employee_number) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: employee_number',
    });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: is_active (must be boolean)',
    });
  }

  try {
    console.log(`[WEBHOOK] Employee: ${employee_number}, is_active: ${is_active}`);

    // Check if employee exists
    const existing = await prisma.employee_local.findUnique({
      where: { employee_number },
    });

    if (!existing) {
      // If full data provided, create new record
      if (optionalData.first_name && optionalData.last_name) {
        const created = await prisma.employee_local.create({
          data: {
            employee_number,
            first_name: optionalData.first_name,
            middle_name: optionalData.middle_name || null,
            last_name: optionalData.last_name,
            phone: optionalData.phone || null,
            position: optionalData.position || null,
            barangay: optionalData.barangay || null,
            zip_code: optionalData.zip_code || null,
            department_id: optionalData.department_id || null,
            department: optionalData.department || null,
            is_active,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Employee record created via webhook',
          data: {
            record_id: created.employee_number,
            is_active: created.is_active,
            last_synced_at: created.last_synced_at,
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: `Employee ${employee_number} not found. Provide full employee data to create new record.`,
      });
    }

    // Update existing record - NEVER modify is_deleted
    const updated = await prisma.employee_local.update({
      where: { employee_number },
      data: {
        is_active,
        // Optionally update other fields if provided
        ...(optionalData.first_name && { first_name: optionalData.first_name }),
        ...(optionalData.middle_name !== undefined && { middle_name: optionalData.middle_name }),
        ...(optionalData.last_name && { last_name: optionalData.last_name }),
        ...(optionalData.phone !== undefined && { phone: optionalData.phone }),
        ...(optionalData.position && { position: optionalData.position }),
        ...(optionalData.barangay !== undefined && { barangay: optionalData.barangay }),
        ...(optionalData.zip_code !== undefined && { zip_code: optionalData.zip_code }),
        ...(optionalData.department_id && { department_id: optionalData.department_id }),
        ...(optionalData.department && { department: optionalData.department }),
        last_synced_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Employee ${employee_number} ${is_active ? 'activated' : 'deactivated'} via webhook`,
      data: {
        record_id: updated.employee_number,
        is_active: updated.is_active,
        last_synced_at: updated.last_synced_at,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Error handling employee webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing employee webhook',
      error: errorMsg,
    });
  }
}

/**
 * Handle bus webhook from Inventory System
 * Endpoint: POST /api/webhooks/bus
 */
export async function handleBusWebhook(
  req: Request<{}, {}, BusWebhookPayload>,
  res: Response<WebhookResponse>
) {
  const { bus_id, is_active, ...optionalData } = req.body;

  // Validate required fields
  if (!bus_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: bus_id',
    });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: is_active (must be boolean)',
    });
  }

  try {
    console.log(`[WEBHOOK] Bus: ${bus_id}, is_active: ${is_active}`);

    // Check if bus exists
    const existing = await prisma.bus_local.findUnique({
      where: { bus_id: String(bus_id) },
    });

    if (!existing) {
      // If full data provided, create new record
      if (optionalData.license_plate && optionalData.body_number) {
        const created = await prisma.bus_local.create({
          data: {
            bus_id: String(bus_id),
            license_plate: optionalData.license_plate,
            body_number: optionalData.body_number,
            type: optionalData.type || null,
            capacity: optionalData.capacity || null,
            is_active,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Bus record created via webhook',
          data: {
            record_id: created.bus_id,
            is_active: created.is_active,
            last_synced_at: created.last_synced_at,
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: `Bus ${bus_id} not found. Provide full bus data to create new record.`,
      });
    }

    // Update existing record - NEVER modify is_deleted
    const updated = await prisma.bus_local.update({
      where: { bus_id: String(bus_id) },
      data: {
        is_active,
        // Optionally update other fields if provided
        ...(optionalData.license_plate && { license_plate: optionalData.license_plate }),
        ...(optionalData.body_number && { body_number: optionalData.body_number }),
        ...(optionalData.type && { type: optionalData.type }),
        ...(optionalData.capacity && { capacity: optionalData.capacity }),
        last_synced_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Bus ${bus_id} ${is_active ? 'activated' : 'deactivated'} via webhook`,
      data: {
        record_id: updated.bus_id,
        is_active: updated.is_active,
        last_synced_at: updated.last_synced_at,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Error handling bus webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing bus webhook',
      error: errorMsg,
    });
  }
}

/**
 * Handle rental webhook from Operations System
 * Endpoint: POST /api/webhooks/rental
 */
export async function handleRentalWebhook(
  req: Request<{}, {}, RentalWebhookPayload>,
  res: Response<WebhookResponse>
) {
  const { assignment_id, is_active, ...optionalData } = req.body;

  // Validate required fields
  if (!assignment_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: assignment_id',
    });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: is_active (must be boolean)',
    });
  }

  try {
    console.log(`[WEBHOOK] Rental: ${assignment_id}, is_active: ${is_active}`);

    // Check if rental exists
    const existing = await prisma.rental_local.findUnique({
      where: { assignment_id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Rental ${assignment_id} not found. Use full sync to create new records.`,
      });
    }

    // Update existing record - NEVER modify is_deleted or financial flags
    const updated = await prisma.rental_local.update({
      where: { assignment_id },
      data: {
        is_active,
        // Optionally update other fields if provided (excluding financial flags)
        ...(optionalData.bus_id && { bus_id: optionalData.bus_id }),
        ...(optionalData.rental_status && { rental_status: optionalData.rental_status }),
        ...(optionalData.rental_package && { rental_package: optionalData.rental_package }),
        ...(optionalData.rental_start_date !== undefined && { rental_start_date: parseDate(optionalData.rental_start_date) }),
        ...(optionalData.rental_end_date !== undefined && { rental_end_date: parseDate(optionalData.rental_end_date) }),
        ...(optionalData.total_rental_amount !== undefined && { total_rental_amount: optionalData.total_rental_amount }),
        ...(optionalData.down_payment_amount !== undefined && { down_payment_amount: optionalData.down_payment_amount }),
        ...(optionalData.balance_amount !== undefined && { balance_amount: optionalData.balance_amount }),
        ...(optionalData.down_payment_date !== undefined && { down_payment_date: parseDate(optionalData.down_payment_date) }),
        ...(optionalData.full_payment_date !== undefined && { full_payment_date: parseDate(optionalData.full_payment_date) }),
        ...(optionalData.cancelled_at !== undefined && { cancelled_at: parseDate(optionalData.cancelled_at) }),
        ...(optionalData.cancellation_reason !== undefined && { cancellation_reason: optionalData.cancellation_reason }),
        last_synced_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Rental ${assignment_id} ${is_active ? 'activated' : 'deactivated'} via webhook`,
      data: {
        record_id: updated.assignment_id,
        is_active: updated.is_active,
        last_synced_at: updated.last_synced_at,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Error handling rental webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing rental webhook',
      error: errorMsg,
    });
  }
}

/**
 * Handle bus trip webhook from Operations System
 * Endpoint: POST /api/webhooks/bus-trip
 */
export async function handleBusTripWebhook(
  req: Request<{}, {}, BusTripWebhookPayload>,
  res: Response<WebhookResponse>
) {
  const { assignment_id, bus_trip_id, is_active, ...optionalData } = req.body;

  // Validate required fields
  if (!assignment_id || !bus_trip_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: assignment_id and bus_trip_id',
    });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: is_active (must be boolean)',
    });
  }

  try {
    console.log(`[WEBHOOK] Bus Trip: ${assignment_id}/${bus_trip_id}, is_active: ${is_active}`);

    // Check if bus trip exists
    const existing = await prisma.bus_trip_local.findUnique({
      where: {
        assignment_id_bus_trip_id: {
          assignment_id,
          bus_trip_id,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Bus Trip ${assignment_id}/${bus_trip_id} not found. Use full sync to create new records.`,
      });
    }

    // Update existing record - NEVER modify is_deleted or financial flags
    const updated = await prisma.bus_trip_local.update({
      where: {
        assignment_id_bus_trip_id: {
          assignment_id,
          bus_trip_id,
        },
      },
      data: {
        is_active,
        // Optionally update other fields if provided (excluding financial flags)
        ...(optionalData.bus_id && { bus_id: optionalData.bus_id }),
        ...(optionalData.bus_route && { bus_route: optionalData.bus_route }),
        ...(optionalData.date_assigned && { date_assigned: parseDate(optionalData.date_assigned) }),
        ...(optionalData.trip_fuel_expense !== undefined && { trip_fuel_expense: optionalData.trip_fuel_expense }),
        ...(optionalData.trip_revenue !== undefined && { trip_revenue: optionalData.trip_revenue }),
        ...(optionalData.assignment_type && { assignment_type: optionalData.assignment_type }),
        ...(optionalData.assignment_value !== undefined && { assignment_value: optionalData.assignment_value }),
        ...(optionalData.payment_method && { payment_method: optionalData.payment_method }),
        last_synced_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Bus Trip ${assignment_id}/${bus_trip_id} ${is_active ? 'activated' : 'deactivated'} via webhook`,
      data: {
        record_id: { assignment_id: updated.assignment_id, bus_trip_id: updated.bus_trip_id },
        is_active: updated.is_active,
        last_synced_at: updated.last_synced_at,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Error handling bus trip webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing bus trip webhook',
      error: errorMsg,
    });
  }
}

// ============================================================================
// BATCH WEBHOOK HANDLERS
// ============================================================================

interface BatchWebhookPayload<T> {
  records: T[];
}

interface BatchWebhookResponse {
  success: boolean;
  message: string;
  summary: {
    total: number;
    processed: number;
    failed: number;
  };
  results: {
    record_id: string | { assignment_id: string; bus_trip_id: string };
    success: boolean;
    message: string;
  }[];
}

/**
 * Handle batch employee webhook from HR System
 * Endpoint: POST /api/webhooks/employees/batch
 */
export async function handleBatchEmployeeWebhook(
  req: Request<{}, {}, BatchWebhookPayload<EmployeeWebhookPayload>>,
  res: Response<BatchWebhookResponse>
) {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid field: records (must be non-empty array)',
      summary: { total: 0, processed: 0, failed: 0 },
      results: [],
    });
  }

  console.log(`[WEBHOOK] Batch employee update: ${records.length} records`);

  const results: BatchWebhookResponse['results'] = [];
  let processed = 0;
  let failed = 0;

  for (const record of records) {
    try {
      if (!record.employee_number || typeof record.is_active !== 'boolean') {
        results.push({
          record_id: record.employee_number || 'unknown',
          success: false,
          message: 'Missing employee_number or is_active',
        });
        failed++;
        continue;
      }

      await prisma.employee_local.update({
        where: { employee_number: record.employee_number },
        data: {
          is_active: record.is_active,
          last_synced_at: new Date(),
        },
      });

      results.push({
        record_id: record.employee_number,
        success: true,
        message: `${record.is_active ? 'activated' : 'deactivated'}`,
      });
      processed++;
    } catch (error) {
      results.push({
        record_id: record.employee_number || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  return res.status(failed === records.length ? 400 : 200).json({
    success: failed < records.length,
    message: `Batch processed: ${processed} succeeded, ${failed} failed`,
    summary: {
      total: records.length,
      processed,
      failed,
    },
    results,
  });
}

/**
 * Handle batch bus webhook from Inventory System
 * Endpoint: POST /api/webhooks/buses/batch
 */
export async function handleBatchBusWebhook(
  req: Request<{}, {}, BatchWebhookPayload<BusWebhookPayload>>,
  res: Response<BatchWebhookResponse>
) {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid field: records (must be non-empty array)',
      summary: { total: 0, processed: 0, failed: 0 },
      results: [],
    });
  }

  console.log(`[WEBHOOK] Batch bus update: ${records.length} records`);

  const results: BatchWebhookResponse['results'] = [];
  let processed = 0;
  let failed = 0;

  for (const record of records) {
    try {
      if (!record.bus_id || typeof record.is_active !== 'boolean') {
        results.push({
          record_id: record.bus_id || 'unknown',
          success: false,
          message: 'Missing bus_id or is_active',
        });
        failed++;
        continue;
      }

      await prisma.bus_local.update({
        where: { bus_id: String(record.bus_id) },
        data: {
          is_active: record.is_active,
          last_synced_at: new Date(),
        },
      });

      results.push({
        record_id: String(record.bus_id),
        success: true,
        message: `${record.is_active ? 'activated' : 'deactivated'}`,
      });
      processed++;
    } catch (error) {
      results.push({
        record_id: String(record.bus_id) || 'unknown',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  return res.status(failed === records.length ? 400 : 200).json({
    success: failed < records.length,
    message: `Batch processed: ${processed} succeeded, ${failed} failed`,
    summary: {
      total: records.length,
      processed,
      failed,
    },
    results,
  });
}
