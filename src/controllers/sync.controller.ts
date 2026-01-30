/**
 * SYNC CONTROLLER
 * 
 * Provides API endpoints for manual synchronization of external data
 */

import { Request, Response } from 'express';
import { syncExternalData } from '../../lib/sync';
import { syncDepartments } from '../../lib/sync/departmentSync';
import { busTripRevenueService } from '../services/busTripRevenue.service';
import { rentalRevenueService } from '../services/rentalRevenue.service';
import { logger } from '../config/logger';

/**
 * POST /api/sync/external
 * 
 * Manually trigger synchronization of all external data
 * This is a hard reload that fetches fresh data from all external systems
 * After sync, automatically processes unsynced bus trips to create revenue records
 */
export const triggerExternalDataSync = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[API] Manual external data sync triggered');

    // Sync departments first (no dependencies)
    logger.info('[SYNC] Syncing departments...');
    const departmentResult = await syncDepartments();

    const result = await syncExternalData();

    // Build sync summary
    const syncSummary = {
      success: result.success && departmentResult.success,
      startTime: result.startTime.toISOString(),
      endTime: result.endTime.toISOString(),
      totalDurationMs: result.totalDuration + departmentResult.duration,
      tables: {
        department_local: {
          success: departmentResult.success,
          inserted: departmentResult.inserted,
          updated: departmentResult.updated,
          softDeleted: departmentResult.softDeleted,
          errors: departmentResult.errors,
        },
        employee_local: {
          success: result.results.employees.success,
          inserted: result.results.employees.stats.inserted,
          updated: result.results.employees.stats.updated,
          softDeleted: result.results.employees.stats.softDeleted,
          errors: result.results.employees.stats.errors,
        },
        bus_local: {
          success: result.results.buses.success,
          inserted: result.results.buses.stats.inserted,
          updated: result.results.buses.stats.updated,
          softDeleted: result.results.buses.stats.softDeleted,
          errors: result.results.buses.stats.errors,
        },
        rental_local: {
          success: result.results.rentals.success,
          inserted: result.results.rentals.stats.inserted,
          updated: result.results.rentals.stats.updated,
          softDeleted: result.results.rentals.stats.softDeleted,
          errors: result.results.rentals.stats.errors,
        },
        rental_employee_local: {
          success: result.results.rentalEmployees.success,
          inserted: result.results.rentalEmployees.stats.inserted,
          updated: result.results.rentalEmployees.stats.updated,
          softDeleted: result.results.rentalEmployees.stats.softDeleted,
          errors: result.results.rentalEmployees.stats.errors,
        },
        bus_trip_local: {
          success: result.results.busTrips.success,
          inserted: result.results.busTrips.stats.inserted,
          updated: result.results.busTrips.stats.updated,
          softDeleted: result.results.busTrips.stats.softDeleted,
          errors: result.results.busTrips.stats.errors,
        },
        bus_trip_employee_local: {
          success: result.results.busTripEmployees.success,
          inserted: result.results.busTripEmployees.stats.inserted,
          updated: result.results.busTripEmployees.stats.updated,
          softDeleted: result.results.busTripEmployees.stats.softDeleted,
          errors: result.results.busTripEmployees.stats.errors,
        },
      },
    };

    // Automatically process unsynced bus trips to create revenue records
    logger.info('[SYNC] Processing unsynced bus trips for revenue creation...');
    let revenueResult = null;
    try {
      revenueResult = await busTripRevenueService.processUnsyncedTrips('system');
      logger.info(`[SYNC] Revenue processing complete: ${revenueResult.processed} processed, ${revenueResult.failed} failed`);
    } catch (revenueError) {
      logger.error('[SYNC] Revenue processing failed:', revenueError);
      revenueResult = {
        total: 0,
        processed: 0,
        failed: 0,
        error: revenueError instanceof Error ? revenueError.message : String(revenueError),
      };
    }

    // Automatically process unsynced rentals to create rental revenue records
    logger.info('[SYNC] Processing unsynced rentals for rental revenue creation...');
    let rentalRevenueResult = null;
    try {
      rentalRevenueResult = await rentalRevenueService.processUnsyncedRentals('system');
      logger.info(`[SYNC] Rental revenue processing complete: ${rentalRevenueResult.processed} processed, ${rentalRevenueResult.failed} failed`);
    } catch (rentalError) {
      logger.error('[SYNC] Rental revenue processing failed:', rentalError);
      rentalRevenueResult = {
        total: 0,
        processed: 0,
        failed: 0,
        error: rentalError instanceof Error ? rentalError.message : String(rentalError),
      };
    }

    // Combine results
    const overallSuccess = result.success &&
      revenueResult && revenueResult.failed === 0 &&
      rentalRevenueResult && rentalRevenueResult.failed === 0;

    if (overallSuccess) {
      res.status(200).json({
        status: 'success',
        message: 'External data synchronized and revenue records created successfully',
        data: {
          sync: syncSummary,
          revenue_processing: revenueResult,
          rental_revenue_processing: rentalRevenueResult,
        },
      });
    } else {
      res.status(207).json({
        status: 'partial_success',
        message: 'Sync completed with some issues - check details',
        data: {
          sync: syncSummary,
          revenue_processing: revenueResult,
          rental_revenue_processing: rentalRevenueResult,
        },
      });
    }
  } catch (error) {
    console.error('[API] Error triggering external data sync:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to synchronize external data',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * GET /api/sync/status
 * 
 * Get the current status of local data tables
 */
export const getSyncStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('../config/database');

    // Get counts for each local table
    const [
      departmentCount,
      departmentDeletedCount,
      employeeCount,
      employeeDeletedCount,
      busCount,
      busDeletedCount,
      rentalCount,
      rentalDeletedCount,
      rentalEmployeeCount,
      rentalEmployeeDeletedCount,
      busTripCount,
      busTripDeletedCount,
      busTripEmployeeCount,
      busTripEmployeeDeletedCount,
    ] = await Promise.all([
      prisma.department_local.count({ where: { is_deleted: false } }),
      prisma.department_local.count({ where: { is_deleted: true } }),
      prisma.employee_local.count({ where: { is_deleted: false } }),
      prisma.employee_local.count({ where: { is_deleted: true } }),
      prisma.bus_local.count({ where: { is_deleted: false } }),
      prisma.bus_local.count({ where: { is_deleted: true } }),
      prisma.rental_local.count({ where: { is_deleted: false } }),
      prisma.rental_local.count({ where: { is_deleted: true } }),
      prisma.rental_employee_local.count({ where: { is_deleted: false } }),
      prisma.rental_employee_local.count({ where: { is_deleted: true } }),
      prisma.bus_trip_local.count({ where: { is_deleted: false } }),
      prisma.bus_trip_local.count({ where: { is_deleted: true } }),
      prisma.bus_trip_employee_local.count({ where: { is_deleted: false } }),
      prisma.bus_trip_employee_local.count({ where: { is_deleted: true } }),
    ]);

    // Get last sync times
    const [
      lastDepartmentSync,
      lastEmployeeSync,
      lastBusSync,
      lastRentalSync,
      lastBusTripSync,
    ] = await Promise.all([
      prisma.department_local.findFirst({
        orderBy: { last_synced_at: 'desc' },
        select: { last_synced_at: true },
      }),
      prisma.employee_local.findFirst({
        orderBy: { last_synced_at: 'desc' },
        select: { last_synced_at: true },
      }),
      prisma.bus_local.findFirst({
        orderBy: { last_synced_at: 'desc' },
        select: { last_synced_at: true },
      }),
      prisma.rental_local.findFirst({
        orderBy: { last_synced_at: 'desc' },
        select: { last_synced_at: true },
      }),
      prisma.bus_trip_local.findFirst({
        orderBy: { last_synced_at: 'desc' },
        select: { last_synced_at: true },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        tables: {
          department_local: {
            activeRecords: departmentCount,
            softDeletedRecords: departmentDeletedCount,
            lastSyncedAt: lastDepartmentSync?.last_synced_at?.toISOString() || null,
          },
          employee_local: {
            activeRecords: employeeCount,
            softDeletedRecords: employeeDeletedCount,
            lastSyncedAt: lastEmployeeSync?.last_synced_at?.toISOString() || null,
          },
          bus_local: {
            activeRecords: busCount,
            softDeletedRecords: busDeletedCount,
            lastSyncedAt: lastBusSync?.last_synced_at?.toISOString() || null,
          },
          rental_local: {
            activeRecords: rentalCount,
            softDeletedRecords: rentalDeletedCount,
            lastSyncedAt: lastRentalSync?.last_synced_at?.toISOString() || null,
          },
          rental_employee_local: {
            activeRecords: rentalEmployeeCount,
            softDeletedRecords: rentalEmployeeDeletedCount,
          },
          bus_trip_local: {
            activeRecords: busTripCount,
            softDeletedRecords: busTripDeletedCount,
            lastSyncedAt: lastBusTripSync?.last_synced_at?.toISOString() || null,
          },
          bus_trip_employee_local: {
            activeRecords: busTripEmployeeCount,
            softDeletedRecords: busTripEmployeeDeletedCount,
          },
        },
      },
    });
  } catch (error) {
    console.error('[API] Error getting sync status:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync status',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * GET /api/sync/departments
 * 
 * Get all active departments from local database
 * Used by frontend to populate department dropdowns
 */
export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { getActiveDepartments } = await import('../../lib/sync/departmentSync');
    const departments = await getActiveDepartments();

    res.status(200).json({
      status: 'success',
      data: departments.map(d => ({
        id: d.id,
        name: d.department_name,
      })),
    });
  } catch (error) {
    console.error('[API] Error getting departments:', error);

    res.status(500).json({
      status: 'error',
      message: 'Failed to get departments',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
