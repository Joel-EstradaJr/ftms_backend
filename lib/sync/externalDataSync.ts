/**
 * EXTERNAL DATA SYNCHRONIZATION SERVICE
 * 
 * Comprehensive sync service for external system data:
 * - HR Employees → employee_local
 * - Inventory Buses → bus_local
 * - Operations Rentals → rental_local + rental_employee_local
 * - Operations Bus Trips → bus_trip_local + bus_trip_employee_local
 * 
 * Features:
 * - Parallel fetching of all external APIs
 * - Transactional upserts per table
 * - Soft delete handling (is_deleted flag)
 * - Preserves financial flags (is_revenue_recorded, is_expense_recorded)
 * - Retry logic for failed API calls
 * - Comprehensive logging
 */

import { PrismaClient, bus_trip_employee_role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ============================================================================
// EXTERNAL PAYLOAD INTERFACES
// ============================================================================

/**
 * HR Employee payload from HR System
 * Endpoint: ${HR_API_BASE_URL}${HR_EMPLOYEES_ENDPOINT}
 */
interface ExternalEmployeePayload {
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  position: string;
  barangay?: string | null;
  zipCode?: string | null;
  departmentId: number;
  department: string;
}

interface HREmployeesResponse {
  employees: ExternalEmployeePayload[];
}

/**
 * Bus payload from Inventory System
 * Endpoint: ${INV_API_BASE_URL}${INV_BUS_ENDPOINT}
 */
interface ExternalBusPayload {
  id: number;
  license_plate: string;
  body_number: string;
  type: string; // AIRCONDITIONED, ORDINARY
  capacity: number;
}

/**
 * Rental payload from Operations System
 * Endpoint: ${OP_API_BASE_URL}${OP_RENTAL_TRIPS_ENDPOINT}
 */
interface RentalEmployee {
  employee_id: string;
  employee_firstName: string | null;
  employee_middleName: string | null;
  employee_lastName: string | null;
  employee_position_name: string;
}

interface RentalDetails {
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

interface ExternalRentalPayload {
  assignment_id: string;
  bus_id: number;
  bus_plate_number: string;
  bus_type: string;
  body_number: string;
  rental_status: string;
  rental_details: RentalDetails;
  employees: RentalEmployee[];
}

/**
 * Bus Trip payload from Operations System
 * Endpoint: ${OP_API_BASE_URL}${OP_BUS_TRIPS_ENDPOINT}
 */
interface BusTripEmployee {
  employee_id: string;
  employee_firstName: string;
  employee_middleName: string | null;
  employee_lastName: string;
  employee_suffix: string | null;
}

interface ExternalBusTripPayload {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string; // BOUNDARY, PERCENTAGE
  assignment_value: number;
  payment_method: string; // Company_Cash, Reimbursement
  employee_driver: BusTripEmployee | null;
  employee_conductor: BusTripEmployee | null;
  bus_id: number;
  bus_plate_number: string;
  bus_type: string;
  body_number: string;
}

// ============================================================================
// SYNC RESULT INTERFACES
// ============================================================================

interface SyncStats {
  inserted: number;
  updated: number;
  softDeleted: number;
  errors: string[];
}

interface SyncResult {
  success: boolean;
  table: string;
  stats: SyncStats;
  duration: number;
}

interface FullSyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  results: {
    employees: SyncResult;
    buses: SyncResult;
    rentals: SyncResult;
    rentalEmployees: SyncResult;
    busTrips: SyncResult;
    busTripEmployees: SyncResult;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Fetch with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries: number = 1
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[SYNC] Fetching ${url} (attempt ${attempt + 1}/${retries + 1})`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[SYNC] Successfully fetched ${url}`);
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[SYNC] Fetch failed for ${url} (attempt ${attempt + 1}):`, lastError.message);
      
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed after all retries');
}

/**
 * Parse date string safely
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Convert number to Decimal for Prisma
 */
function toDecimal(value: number | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  return new Decimal(value);
}

// ============================================================================
// EMPLOYEE SYNC
// ============================================================================

async function syncEmployees(employees: ExternalEmployeePayload[]): Promise<SyncResult> {
  const startTime = Date.now();
  const stats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  
  try {
    const fetchedIds = new Set(employees.map(e => e.employeeNumber));
    
    await prisma.$transaction(async (tx) => {
      // Get existing records
      const existingRecords = await tx.employee_local.findMany({
        select: { employee_number: true },
      });
      const existingIds = new Set(existingRecords.map(r => r.employee_number));
      
      // Upsert each employee
      for (const emp of employees) {
        const isExisting = existingIds.has(emp.employeeNumber);
        
        await tx.employee_local.upsert({
          where: { employee_number: emp.employeeNumber },
          update: {
            first_name: emp.firstName,
            middle_name: emp.middleName || null,
            last_name: emp.lastName,
            phone: emp.phone || null,
            position: emp.position,
            barangay: emp.barangay || null,
            zip_code: emp.zipCode || null,
            department_id: emp.departmentId,
            department: emp.department,
            is_deleted: false,
            last_synced_at: new Date(),
          },
          create: {
            employee_number: emp.employeeNumber,
            first_name: emp.firstName,
            middle_name: emp.middleName || null,
            last_name: emp.lastName,
            phone: emp.phone || null,
            position: emp.position,
            barangay: emp.barangay || null,
            zip_code: emp.zipCode || null,
            department_id: emp.departmentId,
            department: emp.department,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });
        
        if (isExisting) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      }
      
      // Soft delete records not in payload
      const idsToSoftDelete = [...existingIds].filter(id => !fetchedIds.has(id));
      if (idsToSoftDelete.length > 0) {
        await tx.employee_local.updateMany({
          where: {
            employee_number: { in: idsToSoftDelete },
            is_deleted: false,
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        stats.softDeleted = idsToSoftDelete.length;
      }
    });
    
    console.log(`[SYNC] employee_local: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.softDeleted} soft deleted`);
    
    return {
      success: true,
      table: 'employee_local',
      stats,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(errorMsg);
    console.error('[SYNC] Error syncing employees:', errorMsg);
    
    return {
      success: false,
      table: 'employee_local',
      stats,
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// BUS SYNC
// ============================================================================

async function syncBuses(buses: ExternalBusPayload[]): Promise<SyncResult> {
  const startTime = Date.now();
  const stats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  
  try {
    // Convert bus_id to string for our schema
    const fetchedIds = new Set(buses.map(b => String(b.id)));
    
    await prisma.$transaction(async (tx) => {
      // Get existing records
      const existingRecords = await tx.bus_local.findMany({
        select: { bus_id: true },
      });
      const existingIds = new Set(existingRecords.map(r => r.bus_id));
      
      // Upsert each bus
      for (const bus of buses) {
        const busId = String(bus.id);
        const isExisting = existingIds.has(busId);
        
        await tx.bus_local.upsert({
          where: { bus_id: busId },
          update: {
            license_plate: bus.license_plate,
            body_number: bus.body_number,
            type: bus.type,
            capacity: bus.capacity,
            is_deleted: false,
            last_synced_at: new Date(),
          },
          create: {
            bus_id: busId,
            license_plate: bus.license_plate,
            body_number: bus.body_number,
            type: bus.type,
            capacity: bus.capacity,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });
        
        if (isExisting) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      }
      
      // Soft delete records not in payload
      const idsToSoftDelete = [...existingIds].filter(id => !fetchedIds.has(id));
      if (idsToSoftDelete.length > 0) {
        await tx.bus_local.updateMany({
          where: {
            bus_id: { in: idsToSoftDelete },
            is_deleted: false,
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        stats.softDeleted = idsToSoftDelete.length;
      }
    });
    
    console.log(`[SYNC] bus_local: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.softDeleted} soft deleted`);
    
    return {
      success: true,
      table: 'bus_local',
      stats,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(errorMsg);
    console.error('[SYNC] Error syncing buses:', errorMsg);
    
    return {
      success: false,
      table: 'bus_local',
      stats,
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================================
// RENTAL SYNC
// ============================================================================

async function syncRentals(rentals: ExternalRentalPayload[]): Promise<{ rental: SyncResult; rentalEmployee: SyncResult }> {
  const rentalStartTime = Date.now();
  const rentalStats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  const rentalEmployeeStats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  
  try {
    const fetchedRentalIds = new Set(rentals.map(r => r.assignment_id));
    
    // Build set of all employee assignments from payload
    const fetchedEmployeeAssignments = new Set<string>();
    for (const rental of rentals) {
      for (const emp of rental.employees) {
        fetchedEmployeeAssignments.add(`${rental.assignment_id}|${emp.employee_id}`);
      }
    }
    
    await prisma.$transaction(async (tx) => {
      // Get existing rental records
      const existingRentals = await tx.rental_local.findMany({
        select: { 
          assignment_id: true,
          is_revenue_recorded: true,
          is_expense_recorded: true,
        },
      });
      const existingRentalMap = new Map(
        existingRentals.map(r => [r.assignment_id, r])
      );
      
      // Get existing rental employee records
      const existingRentalEmployees = await tx.rental_employee_local.findMany({
        select: { assignment_id: true, employee_number: true },
      });
      const existingRentalEmployeeKeys = new Set(
        existingRentalEmployees.map(re => `${re.assignment_id}|${re.employee_number}`)
      );
      
      // Upsert each rental
      for (const rental of rentals) {
        const existing = existingRentalMap.get(rental.assignment_id);
        const busId = String(rental.bus_id);
        
        // Check if bus exists in bus_local
        const busExists = await tx.bus_local.findUnique({
          where: { bus_id: busId },
          select: { bus_id: true },
        });
        
        await tx.rental_local.upsert({
          where: { assignment_id: rental.assignment_id },
          update: {
            bus_id: busExists ? busId : null,
            rental_status: rental.rental_status,
            rental_package: rental.rental_details.rental_package,
            rental_start_date: parseDate(rental.rental_details.rental_start_date),
            rental_end_date: parseDate(rental.rental_details.rental_end_date),
            total_rental_amount: toDecimal(rental.rental_details.total_rental_amount),
            down_payment_amount: toDecimal(rental.rental_details.down_payment_amount),
            balance_amount: toDecimal(rental.rental_details.balance_amount),
            down_payment_date: parseDate(rental.rental_details.down_payment_date),
            full_payment_date: parseDate(rental.rental_details.full_payment_date),
            cancelled_at: parseDate(rental.rental_details.cancelled_at),
            cancellation_reason: rental.rental_details.cancellation_reason,
            // Preserve financial flags
            is_revenue_recorded: existing?.is_revenue_recorded ?? false,
            is_expense_recorded: existing?.is_expense_recorded ?? false,
            is_deleted: false,
            last_synced_at: new Date(),
          },
          create: {
            assignment_id: rental.assignment_id,
            bus_id: busExists ? busId : null,
            rental_status: rental.rental_status,
            rental_package: rental.rental_details.rental_package,
            rental_start_date: parseDate(rental.rental_details.rental_start_date),
            rental_end_date: parseDate(rental.rental_details.rental_end_date),
            total_rental_amount: toDecimal(rental.rental_details.total_rental_amount),
            down_payment_amount: toDecimal(rental.rental_details.down_payment_amount),
            balance_amount: toDecimal(rental.rental_details.balance_amount),
            down_payment_date: parseDate(rental.rental_details.down_payment_date),
            full_payment_date: parseDate(rental.rental_details.full_payment_date),
            cancelled_at: parseDate(rental.rental_details.cancelled_at),
            cancellation_reason: rental.rental_details.cancellation_reason,
            is_revenue_recorded: false,
            is_expense_recorded: false,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });
        
        if (existing) {
          rentalStats.updated++;
        } else {
          rentalStats.inserted++;
        }
        
        // Upsert rental employees
        for (const emp of rental.employees) {
          const key = `${rental.assignment_id}|${emp.employee_id}`;
          const empExists = existingRentalEmployeeKeys.has(key);
          
          // Check if employee exists in employee_local
          const employeeExists = await tx.employee_local.findUnique({
            where: { employee_number: emp.employee_id },
            select: { employee_number: true },
          });
          
          if (employeeExists) {
            await tx.rental_employee_local.upsert({
              where: {
                assignment_id_employee_number: {
                  assignment_id: rental.assignment_id,
                  employee_number: emp.employee_id,
                },
              },
              update: {
                is_deleted: false,
                last_synced_at: new Date(),
              },
              create: {
                assignment_id: rental.assignment_id,
                employee_number: emp.employee_id,
                is_deleted: false,
                last_synced_at: new Date(),
              },
            });
            
            if (empExists) {
              rentalEmployeeStats.updated++;
            } else {
              rentalEmployeeStats.inserted++;
            }
          } else {
            console.warn(`[SYNC] Skipping rental employee ${emp.employee_id} - not found in employee_local`);
          }
        }
      }
      
      // Soft delete rentals not in payload
      const rentalIdsToSoftDelete = [...existingRentalMap.keys()].filter(id => !fetchedRentalIds.has(id));
      if (rentalIdsToSoftDelete.length > 0) {
        await tx.rental_local.updateMany({
          where: {
            assignment_id: { in: rentalIdsToSoftDelete },
            is_deleted: false,
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        rentalStats.softDeleted = rentalIdsToSoftDelete.length;
      }
      
      // Soft delete rental employees not in payload
      const employeeKeysToSoftDelete = [...existingRentalEmployeeKeys].filter(
        key => !fetchedEmployeeAssignments.has(key)
      );
      for (const key of employeeKeysToSoftDelete) {
        const [assignmentId, employeeNumber] = key.split('|');
        await tx.rental_employee_local.update({
          where: {
            assignment_id_employee_number: {
              assignment_id: assignmentId,
              employee_number: employeeNumber,
            },
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        rentalEmployeeStats.softDeleted++;
      }
    });
    
    console.log(`[SYNC] rental_local: ${rentalStats.inserted} inserted, ${rentalStats.updated} updated, ${rentalStats.softDeleted} soft deleted`);
    console.log(`[SYNC] rental_employee_local: ${rentalEmployeeStats.inserted} inserted, ${rentalEmployeeStats.updated} updated, ${rentalEmployeeStats.softDeleted} soft deleted`);
    
    return {
      rental: {
        success: true,
        table: 'rental_local',
        stats: rentalStats,
        duration: Date.now() - rentalStartTime,
      },
      rentalEmployee: {
        success: true,
        table: 'rental_employee_local',
        stats: rentalEmployeeStats,
        duration: Date.now() - rentalStartTime,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    rentalStats.errors.push(errorMsg);
    rentalEmployeeStats.errors.push(errorMsg);
    console.error('[SYNC] Error syncing rentals:', errorMsg);
    
    return {
      rental: {
        success: false,
        table: 'rental_local',
        stats: rentalStats,
        duration: Date.now() - rentalStartTime,
      },
      rentalEmployee: {
        success: false,
        table: 'rental_employee_local',
        stats: rentalEmployeeStats,
        duration: Date.now() - rentalStartTime,
      },
    };
  }
}

// ============================================================================
// BUS TRIP SYNC
// ============================================================================

async function syncBusTrips(busTrips: ExternalBusTripPayload[]): Promise<{ busTrip: SyncResult; busTripEmployee: SyncResult }> {
  const startTime = Date.now();
  const busTripStats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  const busTripEmployeeStats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  
  try {
    // Build set of all trip keys from payload
    const fetchedTripKeys = new Set(
      busTrips.map(t => `${t.assignment_id}|${t.bus_trip_id}`)
    );
    
    // Build set of all employee assignments from payload
    const fetchedEmployeeAssignments = new Set<string>();
    for (const trip of busTrips) {
      if (trip.employee_driver?.employee_id) {
        fetchedEmployeeAssignments.add(
          `${trip.assignment_id}|${trip.bus_trip_id}|${trip.employee_driver.employee_id}|DRIVER`
        );
      }
      if (trip.employee_conductor?.employee_id) {
        fetchedEmployeeAssignments.add(
          `${trip.assignment_id}|${trip.bus_trip_id}|${trip.employee_conductor.employee_id}|CONDUCTOR`
        );
      }
    }
    
    await prisma.$transaction(async (tx) => {
      // Get existing bus trip records
      const existingTrips = await tx.bus_trip_local.findMany({
        select: {
          assignment_id: true,
          bus_trip_id: true,
          is_revenue_recorded: true,
          is_expense_recorded: true,
        },
      });
      const existingTripMap = new Map(
        existingTrips.map(t => [`${t.assignment_id}|${t.bus_trip_id}`, t])
      );
      
      // Get existing bus trip employee records
      const existingTripEmployees = await tx.bus_trip_employee_local.findMany({
        select: {
          assignment_id: true,
          bus_trip_id: true,
          employee_number: true,
          role: true,
        },
      });
      const existingTripEmployeeKeys = new Set(
        existingTripEmployees.map(
          te => `${te.assignment_id}|${te.bus_trip_id}|${te.employee_number}|${te.role}`
        )
      );
      
      // Upsert each bus trip
      for (const trip of busTrips) {
        const tripKey = `${trip.assignment_id}|${trip.bus_trip_id}`;
        const existing = existingTripMap.get(tripKey);
        const busId = String(trip.bus_id);
        
        // Check if bus exists in bus_local
        const busExists = await tx.bus_local.findUnique({
          where: { bus_id: busId },
          select: { bus_id: true },
        });
        
        await tx.bus_trip_local.upsert({
          where: {
            assignment_id_bus_trip_id: {
              assignment_id: trip.assignment_id,
              bus_trip_id: trip.bus_trip_id,
            },
          },
          update: {
            bus_id: busExists ? busId : null,
            bus_route: trip.bus_route,
            date_assigned: parseDate(trip.date_assigned),
            trip_fuel_expense: toDecimal(trip.trip_fuel_expense),
            trip_revenue: toDecimal(trip.trip_revenue),
            assignment_type: trip.assignment_type,
            assignment_value: toDecimal(trip.assignment_value),
            payment_method: trip.payment_method,
            // Preserve financial flags - only update if not already recorded
            is_revenue_recorded: existing?.is_revenue_recorded ?? trip.is_revenue_recorded,
            is_expense_recorded: existing?.is_expense_recorded ?? trip.is_expense_recorded,
            is_deleted: false,
            last_synced_at: new Date(),
          },
          create: {
            assignment_id: trip.assignment_id,
            bus_trip_id: trip.bus_trip_id,
            bus_id: busExists ? busId : null,
            bus_route: trip.bus_route,
            date_assigned: parseDate(trip.date_assigned),
            trip_fuel_expense: toDecimal(trip.trip_fuel_expense),
            trip_revenue: toDecimal(trip.trip_revenue),
            assignment_type: trip.assignment_type,
            assignment_value: toDecimal(trip.assignment_value),
            payment_method: trip.payment_method,
            is_revenue_recorded: trip.is_revenue_recorded,
            is_expense_recorded: trip.is_expense_recorded,
            is_deleted: false,
            last_synced_at: new Date(),
          },
        });
        
        if (existing) {
          busTripStats.updated++;
        } else {
          busTripStats.inserted++;
        }
        
        // Upsert driver
        if (trip.employee_driver?.employee_id) {
          const driverKey = `${trip.assignment_id}|${trip.bus_trip_id}|${trip.employee_driver.employee_id}|DRIVER`;
          const driverExists = existingTripEmployeeKeys.has(driverKey);
          
          // Check if employee exists in employee_local
          const employeeExists = await tx.employee_local.findUnique({
            where: { employee_number: trip.employee_driver.employee_id },
            select: { employee_number: true },
          });
          
          if (employeeExists) {
            await tx.bus_trip_employee_local.upsert({
              where: {
                assignment_id_bus_trip_id_employee_number: {
                  assignment_id: trip.assignment_id,
                  bus_trip_id: trip.bus_trip_id,
                  employee_number: trip.employee_driver.employee_id,
                },
              },
              update: {
                role: bus_trip_employee_role.DRIVER,
                is_deleted: false,
                last_synced_at: new Date(),
              },
              create: {
                assignment_id: trip.assignment_id,
                bus_trip_id: trip.bus_trip_id,
                employee_number: trip.employee_driver.employee_id,
                role: bus_trip_employee_role.DRIVER,
                is_deleted: false,
                last_synced_at: new Date(),
              },
            });
            
            if (driverExists) {
              busTripEmployeeStats.updated++;
            } else {
              busTripEmployeeStats.inserted++;
            }
          } else {
            console.warn(`[SYNC] Skipping bus trip driver ${trip.employee_driver.employee_id} - not found in employee_local`);
          }
        }
        
        // Upsert conductor
        if (trip.employee_conductor?.employee_id) {
          const conductorKey = `${trip.assignment_id}|${trip.bus_trip_id}|${trip.employee_conductor.employee_id}|CONDUCTOR`;
          const conductorExists = existingTripEmployeeKeys.has(conductorKey);
          
          // Check if employee exists in employee_local
          const employeeExists = await tx.employee_local.findUnique({
            where: { employee_number: trip.employee_conductor.employee_id },
            select: { employee_number: true },
          });
          
          if (employeeExists) {
            await tx.bus_trip_employee_local.upsert({
              where: {
                assignment_id_bus_trip_id_employee_number: {
                  assignment_id: trip.assignment_id,
                  bus_trip_id: trip.bus_trip_id,
                  employee_number: trip.employee_conductor.employee_id,
                },
              },
              update: {
                role: bus_trip_employee_role.CONDUCTOR,
                is_deleted: false,
                last_synced_at: new Date(),
              },
              create: {
                assignment_id: trip.assignment_id,
                bus_trip_id: trip.bus_trip_id,
                employee_number: trip.employee_conductor.employee_id,
                role: bus_trip_employee_role.CONDUCTOR,
                is_deleted: false,
                last_synced_at: new Date(),
              },
            });
            
            if (conductorExists) {
              busTripEmployeeStats.updated++;
            } else {
              busTripEmployeeStats.inserted++;
            }
          } else {
            console.warn(`[SYNC] Skipping bus trip conductor ${trip.employee_conductor.employee_id} - not found in employee_local`);
          }
        }
      }
      
      // Soft delete bus trips not in payload
      const tripKeysToSoftDelete = [...existingTripMap.keys()].filter(
        key => !fetchedTripKeys.has(key)
      );
      for (const key of tripKeysToSoftDelete) {
        const [assignmentId, busTripId] = key.split('|');
        await tx.bus_trip_local.update({
          where: {
            assignment_id_bus_trip_id: {
              assignment_id: assignmentId,
              bus_trip_id: busTripId,
            },
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        busTripStats.softDeleted++;
      }
      
      // Soft delete bus trip employees not in payload
      const employeeKeysToSoftDelete = [...existingTripEmployeeKeys].filter(
        key => !fetchedEmployeeAssignments.has(key)
      );
      for (const key of employeeKeysToSoftDelete) {
        const [assignmentId, busTripId, employeeNumber] = key.split('|');
        await tx.bus_trip_employee_local.update({
          where: {
            assignment_id_bus_trip_id_employee_number: {
              assignment_id: assignmentId,
              bus_trip_id: busTripId,
              employee_number: employeeNumber,
            },
          },
          data: {
            is_deleted: true,
            last_synced_at: new Date(),
          },
        });
        busTripEmployeeStats.softDeleted++;
      }
    });
    
    console.log(`[SYNC] bus_trip_local: ${busTripStats.inserted} inserted, ${busTripStats.updated} updated, ${busTripStats.softDeleted} soft deleted`);
    console.log(`[SYNC] bus_trip_employee_local: ${busTripEmployeeStats.inserted} inserted, ${busTripEmployeeStats.updated} updated, ${busTripEmployeeStats.softDeleted} soft deleted`);
    
    return {
      busTrip: {
        success: true,
        table: 'bus_trip_local',
        stats: busTripStats,
        duration: Date.now() - startTime,
      },
      busTripEmployee: {
        success: true,
        table: 'bus_trip_employee_local',
        stats: busTripEmployeeStats,
        duration: Date.now() - startTime,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    busTripStats.errors.push(errorMsg);
    busTripEmployeeStats.errors.push(errorMsg);
    console.error('[SYNC] Error syncing bus trips:', errorMsg);
    
    return {
      busTrip: {
        success: false,
        table: 'bus_trip_local',
        stats: busTripStats,
        duration: Date.now() - startTime,
      },
      busTripEmployee: {
        success: false,
        table: 'bus_trip_employee_local',
        stats: busTripEmployeeStats,
        duration: Date.now() - startTime,
      },
    };
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main synchronization function
 * Call this on server start or for manual hard reload
 */
export async function syncExternalData(): Promise<FullSyncResult> {
  const startTime = new Date();
  console.log('='.repeat(60));
  console.log(`[SYNC] Starting external data synchronization at ${startTime.toISOString()}`);
  console.log('='.repeat(60));
  
  // Build URLs from environment variables
  const hrEmployeesUrl = `${process.env.HR_API_BASE_URL}${process.env.HR_EMPLOYEES_ENDPOINT}`;
  const busesUrl = `${process.env.INV_API_BASE_URL}${process.env.INV_BUS_ENDPOINT}`;
  const rentalsUrl = `${process.env.OP_API_BASE_URL}${process.env.OP_RENTAL_TRIPS_ENDPOINT}`;
  const busTripsUrl = `${process.env.OP_API_BASE_URL}${process.env.OP_BUS_TRIPS_ENDPOINT}`;
  
  console.log('[SYNC] API Endpoints:');
  console.log(`  - HR Employees: ${hrEmployeesUrl}`);
  console.log(`  - Buses: ${busesUrl}`);
  console.log(`  - Rentals: ${rentalsUrl}`);
  console.log(`  - Bus Trips: ${busTripsUrl}`);
  console.log('');
  
  // Initialize results with empty stats
  const emptyStats: SyncStats = { inserted: 0, updated: 0, softDeleted: 0, errors: [] };
  const emptyResult = (table: string): SyncResult => ({
    success: false,
    table,
    stats: { ...emptyStats },
    duration: 0,
  });
  
  let employeesResult: SyncResult = emptyResult('employee_local');
  let busesResult: SyncResult = emptyResult('bus_local');
  let rentalsResult: SyncResult = emptyResult('rental_local');
  let rentalEmployeesResult: SyncResult = emptyResult('rental_employee_local');
  let busTripsResult: SyncResult = emptyResult('bus_trip_local');
  let busTripEmployeesResult: SyncResult = emptyResult('bus_trip_employee_local');
  
  try {
    // Fetch all external data in parallel
    console.log('[SYNC] Fetching external data from all APIs in parallel...');
    
    const [employeesResponse, busesData, rentalsData, busTripsData] = await Promise.all([
      fetchWithRetry<HREmployeesResponse>(hrEmployeesUrl).catch(err => {
        console.error('[SYNC] Failed to fetch employees:', err.message);
        return null;
      }),
      fetchWithRetry<ExternalBusPayload[]>(busesUrl).catch(err => {
        console.error('[SYNC] Failed to fetch buses:', err.message);
        return null;
      }),
      fetchWithRetry<ExternalRentalPayload[]>(rentalsUrl).catch(err => {
        console.error('[SYNC] Failed to fetch rentals:', err.message);
        return null;
      }),
      fetchWithRetry<ExternalBusTripPayload[]>(busTripsUrl).catch(err => {
        console.error('[SYNC] Failed to fetch bus trips:', err.message);
        return null;
      }),
    ]);
    
    console.log('');
    console.log('[SYNC] Fetch results:');
    console.log(`  - Employees: ${employeesResponse?.employees?.length ?? 'FAILED'}`);
    console.log(`  - Buses: ${busesData?.length ?? 'FAILED'}`);
    console.log(`  - Rentals: ${rentalsData?.length ?? 'FAILED'}`);
    console.log(`  - Bus Trips: ${busTripsData?.length ?? 'FAILED'}`);
    console.log('');
    
    // IMPORTANT: Sync in order to respect foreign key dependencies
    // 1. Employees first (no dependencies)
    // 2. Buses second (no dependencies)
    // 3. Rentals + RentalEmployees (depends on buses and employees)
    // 4. BusTrips + BusTripEmployees (depends on buses and employees)
    
    // Step 1: Sync Employees
    if (employeesResponse?.employees) {
      console.log('[SYNC] Step 1/4: Syncing employees...');
      employeesResult = await syncEmployees(employeesResponse.employees);
    } else {
      employeesResult.stats.errors.push('Failed to fetch employee data');
    }
    
    // Step 2: Sync Buses
    if (busesData) {
      console.log('[SYNC] Step 2/4: Syncing buses...');
      busesResult = await syncBuses(busesData);
    } else {
      busesResult.stats.errors.push('Failed to fetch bus data');
    }
    
    // Step 3: Sync Rentals (after employees and buses are synced)
    if (rentalsData) {
      console.log('[SYNC] Step 3/4: Syncing rentals...');
      const rentalResults = await syncRentals(rentalsData);
      rentalsResult = rentalResults.rental;
      rentalEmployeesResult = rentalResults.rentalEmployee;
    } else {
      rentalsResult.stats.errors.push('Failed to fetch rental data');
      rentalEmployeesResult.stats.errors.push('Failed to fetch rental data');
    }
    
    // Step 4: Sync Bus Trips (after employees and buses are synced)
    if (busTripsData) {
      console.log('[SYNC] Step 4/4: Syncing bus trips...');
      const busTripResults = await syncBusTrips(busTripsData);
      busTripsResult = busTripResults.busTrip;
      busTripEmployeesResult = busTripResults.busTripEmployee;
    } else {
      busTripsResult.stats.errors.push('Failed to fetch bus trip data');
      busTripEmployeesResult.stats.errors.push('Failed to fetch bus trip data');
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SYNC] Critical error during sync:', errorMsg);
    
    // Add error to all results if not already added
    [employeesResult, busesResult, rentalsResult, rentalEmployeesResult, busTripsResult, busTripEmployeesResult]
      .forEach(result => {
        if (result.stats.errors.length === 0) {
          result.stats.errors.push(`Critical error: ${errorMsg}`);
        }
      });
  }
  
  const endTime = new Date();
  const totalDuration = endTime.getTime() - startTime.getTime();
  
  // Determine overall success
  const allSuccessful = [
    employeesResult,
    busesResult,
    rentalsResult,
    rentalEmployeesResult,
    busTripsResult,
    busTripEmployeesResult,
  ].every(r => r.success);
  
  // Print summary
  console.log('');
  console.log('='.repeat(60));
  console.log('[SYNC] Synchronization Complete');
  console.log('='.repeat(60));
  console.log(`Start Time: ${startTime.toISOString()}`);
  console.log(`End Time: ${endTime.toISOString()}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log(`Overall Status: ${allSuccessful ? 'SUCCESS' : 'PARTIAL FAILURE'}`);
  console.log('');
  console.log('Results Summary:');
  console.log('-'.repeat(60));
  
  const printResult = (result: SyncResult) => {
    const status = result.success ? '✓' : '✗';
    console.log(`${status} ${result.table}:`);
    console.log(`    Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, Soft Deleted: ${result.stats.softDeleted}`);
    if (result.stats.errors.length > 0) {
      console.log(`    Errors: ${result.stats.errors.join('; ')}`);
    }
  };
  
  printResult(employeesResult);
  printResult(busesResult);
  printResult(rentalsResult);
  printResult(rentalEmployeesResult);
  printResult(busTripsResult);
  printResult(busTripEmployeesResult);
  
  console.log('='.repeat(60));
  
  return {
    success: allSuccessful,
    startTime,
    endTime,
    totalDuration,
    results: {
      employees: employeesResult,
      buses: busesResult,
      rentals: rentalsResult,
      rentalEmployees: rentalEmployeesResult,
      busTrips: busTripsResult,
      busTripEmployees: busTripEmployeesResult,
    },
  };
}

// Export types for external use
export type {
  ExternalEmployeePayload,
  ExternalBusPayload,
  ExternalRentalPayload,
  ExternalBusTripPayload,
  SyncStats,
  SyncResult,
  FullSyncResult,
};
