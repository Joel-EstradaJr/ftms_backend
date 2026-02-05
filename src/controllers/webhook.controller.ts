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
 * 
 * AUTO-REVENUE GENERATION:
 * - New bus trips received via webhook will automatically generate Revenue records
 * - New rentals received via webhook will automatically generate Rental Revenue records
 * - This ensures no manual intervention is required for revenue tracking
 */

import { Request, Response } from 'express';
import { PrismaClient, bus_trip_employee_role } from '@prisma/client';
import { busTripRevenueService } from '../services/busTripRevenue.service';
import { rentalRevenueService } from '../services/rentalRevenue.service';
import { AuditLogClient, AuditEntityTypes } from '../integrations/audit/audit.client';
import { logger } from '../config/logger';

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
// BUS TRIP CREATE WEBHOOK (WITH AUTO-REVENUE GENERATION)
// ============================================================================

/**
 * Full Bus Trip webhook payload from Operations System (for creation)
 */
interface BusTripCreateWebhookPayload {
  assignment_id: string;
  bus_trip_id: string;
  bus_id: string;
  bus_route: string;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string; // BOUNDARY, PERCENTAGE
  assignment_value: number;
  payment_method: string; // Company_Cash, Reimbursement
  is_revenue_recorded?: boolean;
  is_expense_recorded?: boolean;
  is_active?: boolean;
  // Employee data
  employee_driver?: {
    employee_id: string;
    employee_firstName: string;
    employee_middleName?: string | null;
    employee_lastName: string;
    employee_suffix?: string | null;
    is_active?: boolean;
  } | null;
  employee_conductor?: {
    employee_id: string;
    employee_firstName: string;
    employee_middleName?: string | null;
    employee_lastName: string;
    employee_suffix?: string | null;
    is_active?: boolean;
  } | null;
}

interface BusTripCreateWebhookResponse {
  success: boolean;
  message: string;
  data?: {
    bus_trip: {
      assignment_id: string;
      bus_trip_id: string;
      is_active: boolean;
      is_revenue_recorded: boolean;
    };
    revenue?: {
      id: number;
      code: string;
      amount: number;
      payment_status: string;
      has_receivables: boolean;
    };
    journal_entry?: {
      id: number;
      code: string;
      status: string;
    };
  };
  error?: string;
}

/**
 * Handle bus trip CREATE webhook from Operations System
 * This endpoint creates a new bus trip record AND auto-generates revenue
 * 
 * Endpoint: POST /api/webhooks/bus-trip/create
 * 
 * CRITICAL BUSINESS RULE:
 * Every new bus trip MUST have a corresponding Revenue record.
 * This webhook ensures that revenue is generated automatically upon trip creation.
 */
export async function handleBusTripCreateWebhook(
  req: Request<{}, {}, BusTripCreateWebhookPayload>,
  res: Response<BusTripCreateWebhookResponse>
) {
  const payload = req.body;

  // Validate required fields for creation
  if (!payload.assignment_id || !payload.bus_trip_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: assignment_id and bus_trip_id',
    });
  }

  if (!payload.bus_id || !payload.date_assigned || payload.trip_revenue === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields for bus trip creation: bus_id, date_assigned, trip_revenue',
    });
  }

  try {
    logger.info(`[WEBHOOK] Creating Bus Trip: ${payload.assignment_id}/${payload.bus_trip_id} with auto-revenue generation`);

    // Check if bus trip already exists
    const existing = await prisma.bus_trip_local.findUnique({
      where: {
        assignment_id_bus_trip_id: {
          assignment_id: payload.assignment_id,
          bus_trip_id: payload.bus_trip_id,
        },
      },
    });

    if (existing) {
      // If already exists and revenue is recorded, just return success
      if (existing.is_revenue_recorded) {
        return res.status(200).json({
          success: true,
          message: `Bus Trip ${payload.assignment_id}/${payload.bus_trip_id} already exists with revenue recorded`,
          data: {
            bus_trip: {
              assignment_id: existing.assignment_id,
              bus_trip_id: existing.bus_trip_id,
              is_active: existing.is_active,
              is_revenue_recorded: existing.is_revenue_recorded,
            },
          },
        });
      }
      // Otherwise, skip to revenue generation below
    }

    // Create bus trip record in transaction
    const busTrip = await prisma.$transaction(async (tx) => {
      // Check if bus exists
      const busExists = await tx.bus_local.findUnique({
        where: { bus_id: payload.bus_id },
        select: { bus_id: true },
      });

      // Upsert bus trip
      const trip = await tx.bus_trip_local.upsert({
        where: {
          assignment_id_bus_trip_id: {
            assignment_id: payload.assignment_id,
            bus_trip_id: payload.bus_trip_id,
          },
        },
        update: {
          bus_id: busExists ? payload.bus_id : null,
          bus_route: payload.bus_route,
          date_assigned: parseDate(payload.date_assigned),
          trip_fuel_expense: payload.trip_fuel_expense,
          trip_revenue: payload.trip_revenue,
          assignment_type: payload.assignment_type,
          assignment_value: payload.assignment_value,
          payment_method: payload.payment_method,
          is_active: payload.is_active ?? true,
          is_deleted: false,
          last_synced_at: new Date(),
        },
        create: {
          assignment_id: payload.assignment_id,
          bus_trip_id: payload.bus_trip_id,
          bus_id: busExists ? payload.bus_id : null,
          bus_route: payload.bus_route,
          date_assigned: parseDate(payload.date_assigned),
          trip_fuel_expense: payload.trip_fuel_expense,
          trip_revenue: payload.trip_revenue,
          assignment_type: payload.assignment_type,
          assignment_value: payload.assignment_value,
          payment_method: payload.payment_method,
          is_revenue_recorded: false, // Will be set to true after revenue generation
          is_expense_recorded: payload.is_expense_recorded ?? false,
          is_active: payload.is_active ?? true,
          is_deleted: false,
          last_synced_at: new Date(),
        },
      });

      // Upsert driver employee assignment
      if (payload.employee_driver?.employee_id) {
        const driverExists = await tx.employee_local.findUnique({
          where: { employee_number: payload.employee_driver.employee_id },
          select: { employee_number: true },
        });

        if (driverExists) {
          await tx.bus_trip_employee_local.upsert({
            where: {
              assignment_id_bus_trip_id_employee_number: {
                assignment_id: payload.assignment_id,
                bus_trip_id: payload.bus_trip_id,
                employee_number: payload.employee_driver.employee_id,
              },
            },
            update: {
              role: bus_trip_employee_role.DRIVER,
              is_active: payload.employee_driver.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
            create: {
              assignment_id: payload.assignment_id,
              bus_trip_id: payload.bus_trip_id,
              employee_number: payload.employee_driver.employee_id,
              role: bus_trip_employee_role.DRIVER,
              is_active: payload.employee_driver.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
          });
        }
      }

      // Upsert conductor employee assignment
      if (payload.employee_conductor?.employee_id) {
        const conductorExists = await tx.employee_local.findUnique({
          where: { employee_number: payload.employee_conductor.employee_id },
          select: { employee_number: true },
        });

        if (conductorExists) {
          await tx.bus_trip_employee_local.upsert({
            where: {
              assignment_id_bus_trip_id_employee_number: {
                assignment_id: payload.assignment_id,
                bus_trip_id: payload.bus_trip_id,
                employee_number: payload.employee_conductor.employee_id,
              },
            },
            update: {
              role: bus_trip_employee_role.CONDUCTOR,
              is_active: payload.employee_conductor.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
            create: {
              assignment_id: payload.assignment_id,
              bus_trip_id: payload.bus_trip_id,
              employee_number: payload.employee_conductor.employee_id,
              role: bus_trip_employee_role.CONDUCTOR,
              is_active: payload.employee_conductor.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
          });
        }
      }

      return trip;
    });

    // AUTO-GENERATE REVENUE (critical business rule)
    // Only generate if not already recorded
    let revenueData = null;
    let journalEntryData = null;

    if (!busTrip.is_revenue_recorded) {
      try {
        logger.info(`[WEBHOOK] Auto-generating revenue for bus trip ${payload.assignment_id}/${payload.bus_trip_id}`);
        
        const revenue = await busTripRevenueService.createRevenue(
          {
            assignment_id: payload.assignment_id,
            bus_trip_id: payload.bus_trip_id,
          },
          'webhook_system', // System user for webhook-generated records
          { username: 'Webhook System', role: 'SYSTEM' }
        );

        revenueData = {
          id: revenue.id,
          code: revenue.code,
          amount: Number(revenue.remittance?.amount_remitted ?? 0),
          payment_status: revenue.payment_status,
          has_receivables: !!(revenue.shortage_details?.driver_receivable || revenue.shortage_details?.conductor_receivable),
        };

        if (revenue.journal_entry) {
          journalEntryData = {
            id: revenue.journal_entry.id,
            code: revenue.journal_entry.code,
            status: revenue.journal_entry.status,
          };
        }

        logger.info(`[WEBHOOK] Successfully created revenue ${revenue.code} for bus trip ${payload.assignment_id}/${payload.bus_trip_id}`);
      } catch (revenueError) {
        // Log error but don't fail the webhook - the bus trip was created
        logger.error(`[WEBHOOK] Failed to auto-generate revenue for bus trip ${payload.assignment_id}/${payload.bus_trip_id}:`, revenueError);
        // Revenue can be generated later via manual process or retry
      }
    }

    // Re-fetch the bus trip to get updated is_revenue_recorded status
    const updatedBusTrip = await prisma.bus_trip_local.findUnique({
      where: {
        assignment_id_bus_trip_id: {
          assignment_id: payload.assignment_id,
          bus_trip_id: payload.bus_trip_id,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: revenueData 
        ? `Bus Trip created and revenue auto-generated successfully`
        : `Bus Trip created (revenue generation pending)`,
      data: {
        bus_trip: {
          assignment_id: updatedBusTrip!.assignment_id,
          bus_trip_id: updatedBusTrip!.bus_trip_id,
          is_active: updatedBusTrip!.is_active,
          is_revenue_recorded: updatedBusTrip!.is_revenue_recorded,
        },
        ...(revenueData && { revenue: revenueData }),
        ...(journalEntryData && { journal_entry: journalEntryData }),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[WEBHOOK] Error handling bus trip create webhook:`, error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing bus trip create webhook',
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

// ============================================================================
// DEPARTMENT WEBHOOK HANDLER
// ============================================================================

/**
 * Department webhook payload from HR System
 */
interface DepartmentWebhookPayload {
  id: number;
  is_active: boolean;
  // Optional full data for upsert
  department_name?: string;
}

/**
 * Handle department webhook from HR System
 * Endpoint: POST /api/webhooks/department
 */
export async function handleDepartmentWebhook(
  req: Request<{}, {}, DepartmentWebhookPayload>,
  res: Response<WebhookResponse>
) {
  const { id, is_active, ...optionalData } = req.body;

  // Validate required fields
  if (!id || typeof id !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: id (must be number)',
    });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid required field: is_active (must be boolean)',
    });
  }

  try {
    console.log(`[WEBHOOK] Department: ${id}, is_active: ${is_active}`);

    // Check if department exists
    const existing = await prisma.department_local.findUnique({
      where: { id },
    });

    if (!existing) {
      // If full data provided, create new record
      if (optionalData.department_name) {
        const created = await prisma.department_local.create({
          data: {
            id,
            department_name: optionalData.department_name,
            is_active,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Department record created via webhook',
          data: {
            record_id: String(created.id),
            is_active: created.is_active,
            last_synced_at: created.last_synced_at,
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: `Department ${id} not found. Provide department_name to create new record.`,
      });
    }

    // Update existing record - NEVER modify is_deleted
    const updated = await prisma.department_local.update({
      where: { id },
      data: {
        is_active,
        // Optionally update other fields if provided
        ...(optionalData.department_name && { department_name: optionalData.department_name }),
        last_synced_at: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Department ${id} ${is_active ? 'activated' : 'deactivated'} via webhook`,
      data: {
        record_id: String(updated.id),
        is_active: updated.is_active,
        last_synced_at: updated.last_synced_at,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] Error handling department webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing department webhook',
      error: errorMsg,
    });
  }
}

// ============================================================================
// RENTAL CREATE WEBHOOK (WITH AUTO-REVENUE GENERATION)
// ============================================================================

/**
 * Rental employee info from Operations System
 */
interface RentalEmployeeInfo {
  employee_id: string;
  employee_firstName: string | null;
  employee_middleName?: string | null;
  employee_lastName: string | null;
  employee_position_name?: string;
  is_active?: boolean;
}

/**
 * Rental details from Operations System
 */
interface RentalDetailsPayload {
  rental_package: string;
  rental_start_date: string | null;
  rental_end_date: string | null;
  total_rental_amount: number;
  down_payment_amount: number | null;
  balance_amount: number | null;
  down_payment_date: string | null;
  full_payment_date: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

/**
 * Full Rental CREATE webhook payload from Operations System
 * Matches the external rental API format
 */
interface RentalCreateWebhookPayload {
  assignment_id: string;
  bus_id: number;
  bus_plate_number?: string;
  bus_type?: string;
  body_number?: string;
  rental_status: string;
  rental_details: RentalDetailsPayload;
  employees: RentalEmployeeInfo[];
  is_active?: boolean;
}

/**
 * Rental CREATE webhook response
 */
interface RentalCreateWebhookResponse {
  success: boolean;
  message: string;
  data?: {
    rental: {
      assignment_id: string;
      is_active: boolean;
      is_revenue_recorded: boolean;
    };
    revenue?: {
      id: number;
      code: string;
      amount: number;
      payment_status: string;
      has_receivable: boolean;
    };
    journal_entry?: {
      id: number;
      code: string;
      status: string;
    };
  };
  error?: string;
}

/**
 * Handle rental CREATE webhook from Operations System
 * This endpoint creates a new rental record AND auto-generates revenue
 * 
 * Endpoint: POST /api/webhooks/rental/create
 * 
 * CRITICAL BUSINESS RULE:
 * Every new rental MUST have a corresponding Revenue record.
 * This webhook ensures that revenue is generated automatically upon rental creation.
 */
export async function handleRentalCreateWebhook(
  req: Request<{}, {}, RentalCreateWebhookPayload>,
  res: Response<RentalCreateWebhookResponse>
) {
  const payload = req.body;

  // Validate required fields
  if (!payload.assignment_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: assignment_id',
    });
  }

  if (!payload.rental_details) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: rental_details',
    });
  }

  if (payload.rental_details.total_rental_amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field: rental_details.total_rental_amount',
    });
  }

  try {
    logger.info(`[WEBHOOK] Creating Rental: ${payload.assignment_id} with auto-revenue generation`);

    // Check if rental already exists
    const existing = await prisma.rental_local.findUnique({
      where: { assignment_id: payload.assignment_id },
    });

    if (existing) {
      // If already exists and revenue is recorded, just return success
      if (existing.is_revenue_recorded) {
        return res.status(200).json({
          success: true,
          message: `Rental ${payload.assignment_id} already exists with revenue recorded`,
          data: {
            rental: {
              assignment_id: existing.assignment_id,
              is_active: existing.is_active,
              is_revenue_recorded: existing.is_revenue_recorded,
            },
          },
        });
      }
      // Otherwise, skip to revenue generation below
    }

    // Convert bus_id to string for bus_local lookup
    const busId = String(payload.bus_id);

    // Create rental record in transaction
    const rental = await prisma.$transaction(async (tx) => {
      // Check if bus exists
      const busExists = await tx.bus_local.findUnique({
        where: { bus_id: busId },
        select: { bus_id: true },
      });

      // Upsert rental
      const rentalRecord = await tx.rental_local.upsert({
        where: { assignment_id: payload.assignment_id },
        update: {
          bus_id: busExists ? busId : null,
          rental_status: payload.rental_status,
          rental_package: payload.rental_details.rental_package,
          rental_start_date: parseDate(payload.rental_details.rental_start_date),
          rental_end_date: parseDate(payload.rental_details.rental_end_date),
          total_rental_amount: payload.rental_details.total_rental_amount,
          down_payment_amount: payload.rental_details.down_payment_amount,
          balance_amount: payload.rental_details.balance_amount,
          down_payment_date: parseDate(payload.rental_details.down_payment_date),
          full_payment_date: parseDate(payload.rental_details.full_payment_date),
          cancelled_at: parseDate(payload.rental_details.cancelled_at),
          cancellation_reason: payload.rental_details.cancellation_reason,
          is_active: payload.is_active ?? true,
          is_deleted: false,
          last_synced_at: new Date(),
        },
        create: {
          assignment_id: payload.assignment_id,
          bus_id: busExists ? busId : null,
          rental_status: payload.rental_status,
          rental_package: payload.rental_details.rental_package,
          rental_start_date: parseDate(payload.rental_details.rental_start_date),
          rental_end_date: parseDate(payload.rental_details.rental_end_date),
          total_rental_amount: payload.rental_details.total_rental_amount,
          down_payment_amount: payload.rental_details.down_payment_amount,
          balance_amount: payload.rental_details.balance_amount,
          down_payment_date: parseDate(payload.rental_details.down_payment_date),
          full_payment_date: parseDate(payload.rental_details.full_payment_date),
          cancelled_at: parseDate(payload.rental_details.cancelled_at),
          cancellation_reason: payload.rental_details.cancellation_reason,
          is_revenue_recorded: false, // Will be set to true after revenue generation
          is_expense_recorded: false,
          is_active: payload.is_active ?? true,
          is_deleted: false,
          last_synced_at: new Date(),
        },
      });

      // Upsert employee assignments
      for (const emp of payload.employees || []) {
        if (!emp.employee_id) continue;

        // Check if employee exists in employee_local
        const employeeExists = await tx.employee_local.findUnique({
          where: { employee_number: emp.employee_id },
          select: { employee_number: true },
        });

        if (employeeExists) {
          await tx.rental_employee_local.upsert({
            where: {
              assignment_id_employee_number: {
                assignment_id: payload.assignment_id,
                employee_number: emp.employee_id,
              },
            },
            update: {
              is_active: emp.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
            create: {
              assignment_id: payload.assignment_id,
              employee_number: emp.employee_id,
              is_active: emp.is_active ?? true,
              is_deleted: false,
              last_synced_at: new Date(),
            },
          });
        } else {
          logger.warn(`[WEBHOOK] Skipping rental employee ${emp.employee_id} - not found in employee_local`);
        }
      }

      return rentalRecord;
    });

    // Audit log for rental creation
    await AuditLogClient.logCreate(
      'Rental Local',
      { id: rental.assignment_id },
      {
        assignment_id: rental.assignment_id,
        bus_id: rental.bus_id,
        rental_status: rental.rental_status,
        total_rental_amount: rental.total_rental_amount,
        down_payment_amount: rental.down_payment_amount,
        balance_amount: rental.balance_amount,
      },
      { id: 'webhook_system', name: 'Webhook System', role: 'SYSTEM' },
      req
    );

    // AUTO-GENERATE REVENUE (critical business rule)
    // Only generate if not already recorded
    let revenueData = null;
    let journalEntryData = null;

    if (!rental.is_revenue_recorded) {
      try {
        logger.info(`[WEBHOOK] Auto-generating revenue for rental ${payload.assignment_id}`);
        
        // Use processUnsyncedRentals to handle the revenue creation properly
        // This will create revenue, receivable (if balance exists), and journal entry
        const revenue = await rentalRevenueService.createRentalRevenue(
          {
            assignment_id: payload.assignment_id,
            payment_method: 'CASH', // Default payment method
            down_payment_amount: Number(payload.rental_details.down_payment_amount || 0),
          },
          'webhook_system', // System user for webhook-generated records
          { username: 'Webhook System', role: 'SYSTEM' },
          req
        );

        revenueData = {
          id: revenue.id,
          code: revenue.code,
          amount: Number(revenue.amount),
          payment_status: revenue.payment_status,
          has_receivable: !!revenue.receivable,
        };

        if (revenue.journal_entry) {
          journalEntryData = {
            id: revenue.journal_entry.id,
            code: revenue.journal_entry.code,
            status: revenue.journal_entry.status,
          };
        }

        logger.info(`[WEBHOOK] Successfully created rental revenue ${revenue.code} for rental ${payload.assignment_id}`);
      } catch (revenueError) {
        // Log error but don't fail the webhook - the rental was created
        logger.error(`[WEBHOOK] Failed to auto-generate revenue for rental ${payload.assignment_id}:`, revenueError);
        // Revenue can be generated later via manual process or retry
      }
    }

    // Build response
    const responseData: RentalCreateWebhookResponse['data'] = {
      rental: {
        assignment_id: rental.assignment_id,
        is_active: rental.is_active,
        is_revenue_recorded: rental.is_revenue_recorded || !!revenueData,
      },
    };

    if (revenueData) {
      responseData.revenue = revenueData;
    }

    if (journalEntryData) {
      responseData.journal_entry = journalEntryData;
    }

    const statusCode = existing ? 200 : 201;
    const message = revenueData
      ? `Rental ${existing ? 'updated' : 'created'} and revenue auto-generated successfully`
      : `Rental ${existing ? 'updated' : 'created'} successfully (revenue generation pending)`;

    return res.status(statusCode).json({
      success: true,
      message,
      data: responseData,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[WEBHOOK] Error handling rental create webhook:`, errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error processing rental create webhook',
      error: errorMsg,
    });
  }
}
